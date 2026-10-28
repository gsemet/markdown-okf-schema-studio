/**
 * Launcher side of the hang watchdog (hangWatchdog.ts). It watches one VS Code launch from the
 * parent Node process, where timers still fire when the extension host or the renderer is frozen:
 * no heartbeat change for HEARTBEAT_STALE_MS after the first one, or a launch past its deadline,
 * means a hang. It then writes a dump (hangDump.ts) while the launch directories still exist,
 * SIGKILLs the VS Code process tree and fails the launch with the last heartbeat step.
 *
 * No vscode: unit-testable against any child process.
 */
import * as fs from "node:fs";

import { HANG_DUMP_ROOT, listProcesses, processTree, writeHangDump, type ProcessEntry } from "./hangDump";
import {
  HEARTBEAT_STALE_MS,
  launchDeadlineMs,
  readHeartbeat,
  WATCHDOG_POLL_MS,
  watchdogVerdict,
  type Heartbeat,
} from "./hangWatchdog";

export interface LaunchWatchdogOptions {
  /** Names the launch in errors and in the dump folder (for example the suite file). */
  readonly name: string;
  /** Heartbeat file the extension host writes; undefined = deadline only (no host suite). */
  readonly heartbeatFile?: string;
  /** The launch's user-data directory: its logs go in the dump, its processes are matched by it. */
  readonly userDataDirectory?: string;
  readonly cdpPort?: number | string;
  /** Pid of the spawned VS Code, when the launcher spawned it itself. */
  readonly rootPid?: () => number | undefined;
  /** Command-line markers of the launch's processes (default: the user-data directory). */
  readonly processMatchers?: readonly string[];
  readonly staleMs?: number;
  readonly deadlineMs?: number;
  readonly pollMs?: number;
  readonly dumpRoot?: string;
  /** Off in unit tests (no CDP, no root-window capture). */
  readonly screenshots?: boolean;
  readonly log?: (line: string) => void;
}

/** Kills (SIGKILL) the processes of a launch; returns the pids it signalled. */
export async function killProcessTree(rootPids: readonly number[], matchers: readonly string[]): Promise<number[]> {
  let processes: ProcessEntry[];
  try {
    processes = await listProcesses();
  } catch {
    processes = [];
  }
  const pids = new Set(processTree(processes, rootPids, matchers).map((entry) => entry.pid));
  for (const pid of rootPids) pids.add(pid);
  pids.delete(process.pid);
  const killed: number[] = [];
  for (const pid of pids) {
    try {
      process.kill(pid, "SIGKILL");
      killed.push(pid);
    } catch {
      // Already gone.
    }
  }
  return killed;
}

function describeHeartbeat(heartbeat: Heartbeat | undefined): string {
  return heartbeat === undefined
    ? "no heartbeat was ever written (the suite did not start)"
    : `last heartbeat step: ${heartbeat.step}, marker: ${heartbeat.marker} (suite ${heartbeat.suite}, host pid ${heartbeat.pid})`;
}

/**
 * Runs `launch` under the watchdog. Resolves or rejects as the launch does, unless the watchdog
 * fires first: then the launch is dumped and killed, and this rejects with the reason.
 */
export async function watchLaunch<T>(options: LaunchWatchdogOptions, launch: Promise<T>): Promise<T> {
  const staleMs = options.staleMs ?? HEARTBEAT_STALE_MS;
  const deadlineMs = options.deadlineMs ?? launchDeadlineMs();
  const pollMs = options.pollMs ?? WATCHDOG_POLL_MS;
  const log = options.log ?? ((line: string) => console.error(line));
  const startedAt = Date.now();
  let lastHeartbeat: Heartbeat | undefined;
  let lastHeartbeatAt: number | undefined;
  let timer: NodeJS.Timeout | undefined;
  let firing = false;
  launch.catch(() => undefined); // the launch fails once the watchdog kills it: the watchdog reports why
  const fired = new Promise<never>((_, reject) => {
    const poll = async (): Promise<void> => {
      if (firing) return;
      if (options.heartbeatFile !== undefined) {
        const heartbeat = readHeartbeat(options.heartbeatFile);
        if (heartbeat !== undefined && heartbeat.time !== lastHeartbeat?.time) {
          lastHeartbeat = heartbeat;
          lastHeartbeatAt = Date.now();
        }
      }
      const verdict = watchdogVerdict({ now: Date.now(), startedAt, lastHeartbeatAt, staleMs, deadlineMs });
      if (verdict === undefined) return;
      firing = true;
      clearInterval(timer);
      const reason = verdict.kind === "stale"
        ? `LAUNCH HANG: ${options.name}: no extension host heartbeat for ${Math.round(verdict.silentMs / 1000)} s `
          + `(frozen extension host or renderer); ${describeHeartbeat(lastHeartbeat)}`
        : `LAUNCH TIMEOUT: ${options.name} exceeded its ${deadlineMs} ms deadline (STUDIO_LAUNCH_TIMEOUT_MS); `
          + describeHeartbeat(lastHeartbeat);
      log(reason);
      // Read when firing: a launcher that spawns VS Code itself knows its directories only then.
      const matchers = options.processMatchers ?? (options.userDataDirectory ? [options.userDataDirectory] : []);
      const rootPid = options.rootPid?.();
      const rootPids = rootPid === undefined ? [] : [rootPid];
      let dump: string;
      try {
        dump = await writeHangDump({
          root: options.dumpRoot ?? HANG_DUMP_ROOT,
          step: lastHeartbeat?.step ?? options.name,
          reason,
          userDataDirectory: options.userDataDirectory,
          heartbeatFile: options.heartbeatFile,
          cdpPort: options.cdpPort,
          rootPids,
          processMatchers: matchers,
          screenshots: options.screenshots,
        });
      } catch (error) {
        dump = `no dump (${String(error)})`;
      }
      const killed = await killProcessTree(rootPids, matchers);
      reject(new Error(`${reason}; dump: ${dump}; killed VS Code processes: ${killed.join(", ") || "none found"}`));
    };
    timer = setInterval(() => void poll(), pollMs);
  });
  try {
    return await Promise.race([launch, fired]);
  } finally {
    clearInterval(timer);
  }
}

/** Removes a heartbeat file left by an earlier launch, so it cannot count as this one's. */
export function resetHeartbeat(file: string): void {
  fs.rmSync(file, { force: true });
}
