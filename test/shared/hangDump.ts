/**
 * Hang dump of the real-window tests (hangWatchdog.ts): what the machine, VS Code and the window
 * held when a step, a call or a whole launch stopped making progress. Written by the extension
 * host (step or call timeout) and by the launcher (frozen host or renderer), into
 * `out/reports/e2e/hang-dumps/<timestamp>-<step>/`, which the integration job uploads.
 *
 * Every part is bounded by DUMP_STEP_TIMEOUT_MS and failure-tolerant: a part that fails or times
 * out is listed in `dump-errors.txt` and the dump goes on. The whole dump is bounded too.
 *
 * No vscode: the host passes its window state as `hostState`. Playwright is loaded only for the
 * CDP screenshot.
 */
import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

import { E2E_REPORT_ROOT } from "../reportPaths";
import { DUMP_LOG_TAIL_LINES, DUMP_STEP_TIMEOUT_MS, DUMP_TOTAL_TIMEOUT_MS, safeName } from "./hangWatchdog";

export const HANG_DUMP_ROOT = path.join(E2E_REPORT_ROOT, "hang-dumps");

export interface ProcessEntry {
  readonly pid: number;
  readonly ppid: number;
  readonly args: string;
}

/** Runs a command with a timeout; resolves its stdout, rejects on failure or timeout. */
export function runCommand(command: string, args: readonly string[], timeoutMs: number = DUMP_STEP_TIMEOUT_MS): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    execFile(command, [...args], { timeout: timeoutMs, killSignal: "SIGKILL", maxBuffer: 32 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) reject(new Error(`${command} ${args.join(" ")}: ${error.message}${stderr ? `\n${stderr}` : ""}`));
        else resolve(stdout);
      });
  });
}

/** Every process of the machine (pid, parent pid, command line). */
export async function listProcesses(): Promise<ProcessEntry[]> {
  const output = await runCommand("ps", ["-A", "-o", "pid=,ppid=,args="]);
  return output.split("\n").flatMap((line) => {
    const match = /^\s*(\d+)\s+(\d+)\s+(.*)$/u.exec(line);
    return match ? [{ pid: Number(match[1]), ppid: Number(match[2]), args: match[3] }] : [];
  });
}

/**
 * The processes of one VS Code launch: the given roots, every process whose command line holds one
 * of `matchers` (the launch's user-data directory), and all their descendants. Never the caller.
 */
export function processTree(processes: readonly ProcessEntry[], rootPids: readonly number[],
  matchers: readonly string[], excludePids: readonly number[] = [process.pid]): ProcessEntry[] {
  const selected = new Set<number>(rootPids);
  for (const entry of processes) {
    if (matchers.some((matcher) => matcher !== "" && entry.args.includes(matcher))) selected.add(entry.pid);
  }
  let grew = true;
  while (grew) {
    grew = false;
    for (const entry of processes) {
      if (!selected.has(entry.pid) && selected.has(entry.ppid)) {
        selected.add(entry.pid);
        grew = true;
      }
    }
  }
  for (const pid of excludePids) selected.delete(pid);
  return processes.filter((entry) => selected.has(entry.pid));
}

export interface HangDumpRequest {
  /** The step (or launch) that hung: names the folder. */
  readonly step: string;
  /** Why the dump was written (the timeout error text). */
  readonly reason: string;
  /** Parent of the dump folders (default out/reports/e2e/hang-dumps). */
  readonly root?: string;
  /** The launch's VS Code user-data directory: its `logs/` tree is copied (tails). */
  readonly userDataDirectory?: string;
  readonly heartbeatFile?: string;
  /** Loopback CDP port of the window, for the target list and the screenshots. */
  readonly cdpPort?: number | string;
  /** Window state from the extension host (window.state, tabs). */
  readonly hostState?: () => unknown;
  /** VS Code process roots and command-line markers (see processTree). */
  readonly rootPids?: readonly number[];
  readonly processMatchers?: readonly string[];
  /** Off in unit tests: no CDP connection, no root-window capture. */
  readonly screenshots?: boolean;
  readonly partTimeoutMs?: number;
  readonly now?: Date;
}

async function bounded<T>(label: string, timeoutMs: number, errors: string[], part: () => Promise<T>): Promise<T | undefined> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      part(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`timed out after ${timeoutMs} ms`)), timeoutMs);
      }),
    ]);
  } catch (error) {
    errors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

function newDumpDirectory(root: string, step: string, now: Date): string {
  const stamp = now.toISOString().replace(/[-:]/gu, "").replace(".", "");
  const base = path.join(root, `${stamp}-${safeName(step)}`);
  for (let index = 1; ; index += 1) {
    const candidate = index === 1 ? base : `${base}-${index}`;
    if (!fs.existsSync(candidate)) {
      fs.mkdirSync(candidate, { recursive: true });
      return candidate;
    }
  }
}

function logFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".log"))
    .map((entry) => path.join(entry.parentPath, entry.name));
}

/** Copies the last DUMP_LOG_TAIL_LINES lines of every `*.log` below `<userData>/logs`. */
export function copyLogTails(userDataDirectory: string, target: string, lines: number = DUMP_LOG_TAIL_LINES): number {
  const logsRoot = path.join(userDataDirectory, "logs");
  const files = logFiles(logsRoot);
  if (files.length === 0) return 0;
  fs.mkdirSync(target, { recursive: true });
  for (const file of files) {
    const all = fs.readFileSync(file, "utf8").split("\n");
    if (all.at(-1) === "") all.pop();
    const tail = `${all.slice(-lines).join("\n")}\n`;
    const name = path.relative(logsRoot, file).split(path.sep).join("__");
    fs.writeFileSync(path.join(target, name), tail);
  }
  return files.length;
}

async function psForest(): Promise<string> {
  try {
    return await runCommand("ps", ["-eo", "pid,ppid,etime,stat,pcpu,rss,args", "--forest"]);
  } catch {
    return runCommand("ps", ["-axo", "pid,ppid,etime,stat,pcpu,rss,args"]); // macOS: no --forest
  }
}

async function cdpScreenshots(port: number | string, directory: string, timeoutMs: number, errors: string[]): Promise<void> {
  const targets = await bounded("CDP target list", timeoutMs, errors, async () => {
    const response = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(timeoutMs) });
    return response.text();
  });
  if (targets === undefined) return;
  fs.writeFileSync(path.join(directory, "cdp-targets.json"), targets);
  const { chromium } = await import("playwright-core");
  const browser = await bounded("CDP connection", timeoutMs, errors, () =>
    chromium.connectOverCDP(`http://127.0.0.1:${port}`, { timeout: timeoutMs }));
  if (browser === undefined) return;
  try {
    const pages = browser.contexts().flatMap((context) => context.pages()).slice(0, 4);
    for (const [index, page] of pages.entries()) {
      await bounded(`CDP screenshot of ${page.url()}`, timeoutMs, errors, () =>
        page.screenshot({ path: path.join(directory, `screenshot-cdp-${index + 1}.png`), timeout: timeoutMs }));
    }
  } finally {
    await bounded("CDP disconnect", timeoutMs, errors, () => browser.close());
  }
}

async function rootWindowCapture(directory: string, timeoutMs: number, errors: string[]): Promise<void> {
  if (!process.env.DISPLAY) return;
  const has = async (tool: string): Promise<boolean> =>
    (await bounded(`which ${tool}`, timeoutMs, [], () => runCommand("sh", ["-c", `command -v ${tool}`], timeoutMs))) !== undefined;
  if (await has("import")) {
    await bounded("root window capture (import)", timeoutMs, errors, () =>
      runCommand("import", ["-window", "root", path.join(directory, "screen-root.png")], timeoutMs));
  } else if (await has("xwd")) {
    await bounded("root window capture (xwd)", timeoutMs, errors, () =>
      runCommand("xwd", ["-root", "-silent", "-out", path.join(directory, "screen-root.xwd")], timeoutMs));
  }
}

async function writeParts(request: HangDumpRequest, directory: string, errors: string[]): Promise<void> {
  const timeoutMs = request.partTimeoutMs ?? DUMP_STEP_TIMEOUT_MS;
  const write = (name: string, content: string): void => fs.writeFileSync(path.join(directory, name), content);
  const forest = await bounded("ps --forest", timeoutMs, errors, psForest);
  if (forest !== undefined) write("ps-forest.txt", forest);
  const tree = await bounded("VS Code process tree", timeoutMs, errors, async () =>
    processTree(await listProcesses(), request.rootPids ?? [], request.processMatchers ?? []));
  if (tree !== undefined) write("ps-vscode.txt", tree.map((entry) => `${entry.pid}\t${entry.ppid}\t${entry.args}`).join("\n") + "\n");
  if (request.userDataDirectory !== undefined) {
    const copied = await bounded("VS Code log tails", 2 * timeoutMs, errors, async () =>
      copyLogTails(request.userDataDirectory!, path.join(directory, "logs")));
    if (copied === 0) errors.push(`VS Code log tails: no *.log under ${request.userDataDirectory}/logs`);
  }
  if (request.hostState !== undefined) {
    const state = await bounded("extension host state", timeoutMs, errors, async () => request.hostState!());
    if (state !== undefined) write("host-state.json", JSON.stringify(state, null, 2));
  }
  if (request.heartbeatFile !== undefined && fs.existsSync(request.heartbeatFile)) {
    fs.copyFileSync(request.heartbeatFile, path.join(directory, "heartbeat.json"));
  }
  if (request.screenshots !== false) {
    if (request.cdpPort !== undefined && String(request.cdpPort) !== "") {
      await bounded("CDP screenshots", 8 * timeoutMs, errors, () => cdpScreenshots(request.cdpPort!, directory, timeoutMs, errors));
    }
    await bounded("root window capture", 3 * timeoutMs, errors, () => rootWindowCapture(directory, timeoutMs, errors));
  }
}

/**
 * Writes a hang dump and returns its folder. Never throws: whatever could not be collected is
 * listed in `dump-errors.txt`.
 */
export async function writeHangDump(request: HangDumpRequest): Promise<string> {
  const directory = newDumpDirectory(request.root ?? HANG_DUMP_ROOT, request.step, request.now ?? new Date());
  const errors: string[] = [];
  fs.writeFileSync(path.join(directory, "summary.json"), JSON.stringify({
    step: request.step, reason: request.reason, createdAt: (request.now ?? new Date()).toISOString(),
    pid: process.pid, userDataDirectory: request.userDataDirectory ?? null, cdpPort: request.cdpPort ?? null,
    heartbeatFile: request.heartbeatFile ?? null,
  }, null, 2));
  await bounded("hang dump", DUMP_TOTAL_TIMEOUT_MS, errors, () => writeParts(request, directory, errors));
  fs.writeFileSync(path.join(directory, "dump-errors.txt"), errors.length === 0 ? "none\n" : `${errors.join("\n")}\n`);
  console.error(`HANG DUMP written: ${directory}${errors.length === 0 ? "" : ` (${errors.length} part(s) failed, see dump-errors.txt)`}`);
  return directory;
}
