/**
 * Hang watchdog of the real-window tests (CI rules 11 and 12): thresholds, named timeouts, the
 * step runner of the extension host and the heartbeat it writes for the launcher.
 *
 * A heavy CI run once hung for 28 minutes after a step printed its last line, with nothing
 * bounded by a timeout. Two layers make the next hang fail fast and explain itself:
 *
 * - in the extension host, `runStep` bounds each suite step and `withTimeout` bounds a single
 *   awaited VS Code call; both write a dump (hangDump.ts) and reject with the step name and the
 *   last progress marker;
 * - in the launcher (launchWatchdog.ts), a stale heartbeat file or a launch past its deadline
 *   means a frozen host or renderer whose own timers no longer fire: the launcher dumps, kills the
 *   VS Code process tree and fails the launch.
 *
 * No vscode, no playwright: unit-testable.
 */
import * as fs from "node:fs";
import * as path from "node:path";

import { E2E_REPORT_ROOT } from "../reportPaths";

/** How often the extension host rewrites its heartbeat file. */
export const HEARTBEAT_INTERVAL_MS = 5_000;
/** A launch whose heartbeat has not changed for this long (after the first one) is frozen. */
export const HEARTBEAT_STALE_MS = 90_000;
/** Default hard deadline of one VS Code launch (`STUDIO_LAUNCH_TIMEOUT_MS` overrides it). */
export const LAUNCH_DEADLINE_MS = 15 * 60_000;
/** How often the launcher checks the heartbeat and the deadline. */
export const WATCHDOG_POLL_MS = 2_000;
/** Bound of one awaited VS Code API or CDP call that normally returns in well under a second. */
export const VSCODE_CALL_TIMEOUT_MS = 60_000;
/** Default budget of a suite step (healthy steps take seconds, see STEP_BUDGETS_MS). */
export const STEP_BUDGET_DEFAULT_MS = 3 * 60_000;
/**
 * Steps that take minutes when healthy. Heavy CI integration job (main b71f, 2026-10-28): the
 * real-input step took about 100 s for 37 of its 85 captures, so about 5 minutes in full; the
 * whole trusted window takes 265 to 400 s locally and about 1.1 times that on CI.
 */
export const STEP_BUDGETS_MS: Readonly<Record<string, number>> = {
  "real-input": 10 * 60_000,
  "preview-editing": 10 * 60_000,
  // Suites without inner steps run as one step (WHOLE_SUITE_STEPS). The scroll window takes about
  // 2 minutes (115 s locally, 126 s on CI); the Restricted Mode and standalone windows seconds.
  "scroll-sync-suite": 5 * 60_000,
  "untrusted-suite": 2 * 60_000,
  "standalone-suite": 2 * 60_000,
};
/** Suites whose whole body is one watchdog step (they have no `step()` inside). */
export const WHOLE_SUITE_STEPS: readonly string[] = ["scroll-sync-suite", "untrusted-suite", "standalone-suite"];
/**
 * Deadline of the reload campaign: it drives its window from the launcher (no heartbeat), so the
 * deadline is its only guard. Healthy: about 10 s (9.2 s locally).
 */
export const RELOAD_LAUNCH_DEADLINE_MS = 3 * 60_000;
/** Steps that the stress mode repeats N times: bounded by the launch deadline only. */
const STRESS_STEPS: readonly string[] = ["real-input", "untrusted-suite"];
/** Bound of each command or capture of a dump, and of the whole dump. */
export const DUMP_STEP_TIMEOUT_MS = 5_000;
export const DUMP_TOTAL_TIMEOUT_MS = 60_000;
/** Lines kept from the end of each VS Code log file in a dump. */
export const DUMP_LOG_TAIL_LINES = 300;

/** The launch deadline from `STUDIO_LAUNCH_TIMEOUT_MS` (a positive integer of milliseconds). */
export function launchDeadlineMs(environment: NodeJS.ProcessEnv = process.env): number {
  const raw = environment.STUDIO_LAUNCH_TIMEOUT_MS?.trim();
  if (raw === undefined || raw === "") return LAUNCH_DEADLINE_MS;
  if (!/^\d+$/u.test(raw) || Number(raw) <= 0) {
    throw new Error(`STUDIO_LAUNCH_TIMEOUT_MS must be a positive number of milliseconds, got "${raw}".`);
  }
  return Number(raw);
}

/**
 * Budget of a step. The stress mode repeats the real-input scenarios (trusted window) and the
 * Restricted Mode captures N times in one step, so those steps are bounded by the launch deadline.
 */
export function stepBudgetMs(step: string, environment: NodeJS.ProcessEnv = process.env): number {
  if (STRESS_STEPS.includes(step) && ["stress", "toc-loop"].includes(environment.STUDIO_REAL_INPUT_SCENARIO ?? "")) {
    return launchDeadlineMs(environment);
  }
  return STEP_BUDGETS_MS[step] ?? STEP_BUDGET_DEFAULT_MS;
}

/** What the watchdog knows about the running step: the heartbeat writes it, a timeout names it. */
export interface WatchdogProgress {
  suite: string;
  step: string;
  stepStartedAt: number;
  marker: string;
  markerAt: number;
}

const progress: WatchdogProgress = { suite: "", step: "(before the first step)", stepStartedAt: Date.now(), marker: "(none)", markerAt: Date.now() };

export function currentProgress(): Readonly<WatchdogProgress> {
  return { ...progress };
}

/** Records the last thing the running step started; a timeout error names it. */
export function markProgress(marker: string): void {
  progress.marker = marker;
  progress.markerAt = Date.now();
}

/** What a timeout passes to the dump handler. */
export interface HangReport {
  readonly kind: "step" | "call";
  readonly step: string;
  readonly label: string;
  readonly timeoutMs: number;
  readonly marker: string;
}

/** Writes a dump for a timeout and returns its folder (or undefined); must not throw. */
export type HangHandler = (report: HangReport) => Promise<string | undefined>;

let hangHandler: HangHandler | undefined;

/** Installs the dump writer used by `runStep` and `withTimeout` (undefined removes it). */
export function setHangHandler(handler: HangHandler | undefined): void {
  hangHandler = handler;
}

async function reportHang(report: HangReport): Promise<string> {
  if (hangHandler === undefined) return "no dump (no handler installed)";
  try {
    return (await hangHandler(report)) ?? "no dump (the dump writer returned no folder)";
  } catch (error) {
    return `no dump (${String(error)})`;
  }
}

/**
 * Awaits `promise` for at most `timeoutMs`. On timeout it writes a dump and rejects with an error
 * naming `label`, so a VS Code call that never returns says which call it was.
 */
export async function withTimeout<T>(label: string, timeoutMs: number, promise: PromiseLike<T>): Promise<T> {
  markProgress(`waiting for ${label}`);
  let timer: NodeJS.Timeout | undefined;
  const timedOut = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const step = progress.step;
      void reportHang({ kind: "call", step, label, timeoutMs, marker: label }).then((dump) =>
        reject(new Error(`TIMEOUT: ${label} did not return within ${timeoutMs} ms (step ${step}); dump: ${dump}`)));
    }, timeoutMs);
  });
  try {
    const value = await Promise.race([Promise.resolve(promise), timedOut]);
    markProgress(`returned: ${label}`);
    return value;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Runs one suite step within `timeoutMs`, logging `STEP start` / `STEP done` lines so the CI log
 * shows where a run stopped. On timeout it writes a dump and rejects with the step name and the
 * last progress marker. The step itself cannot be cancelled: the suite fails and VS Code exits.
 */
export async function runStep<T>(name: string, timeoutMs: number, fn: () => Promise<T>,
  log: (line: string) => void = console.log): Promise<T> {
  const startedAt = Date.now();
  progress.step = name;
  progress.stepStartedAt = startedAt;
  markProgress("step started");
  log(`STEP start: ${name}`);
  let timer: NodeJS.Timeout | undefined;
  const timedOut = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const marker = progress.marker;
      void reportHang({ kind: "step", step: name, label: name, timeoutMs, marker }).then((dump) =>
        reject(new Error(`STEP TIMEOUT: ${name} did not finish within ${timeoutMs} ms; `
          + `last progress marker: ${marker}; dump: ${dump}`)));
    }, timeoutMs);
  });
  try {
    const value = await Promise.race([fn(), timedOut]);
    log(`STEP done: ${name} (${Date.now() - startedAt} ms)`);
    return value;
  } catch (error) {
    log(`STEP failed: ${name} (${Date.now() - startedAt} ms): ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/** Heartbeat file of one launch: the launcher passes it to the host as `STUDIO_HEARTBEAT_FILE`. */
export function heartbeatFileFor(instanceId: string, suite: string, root: string = E2E_REPORT_ROOT): string {
  return path.join(root, `heartbeat-${safeName(instanceId)}-${safeName(suite.replace(/\.js$/u, ""))}.json`);
}

/** Content of the heartbeat file. */
export interface Heartbeat extends WatchdogProgress {
  readonly pid: number;
  readonly time: number;
}

/** Writes the heartbeat file (atomically, through a rename). Write errors are ignored. */
export function writeHeartbeat(file: string, now: number = Date.now()): void {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const heartbeat: Heartbeat = { ...progress, pid: process.pid, time: now };
    const temporary = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(heartbeat, null, 2));
    fs.renameSync(temporary, file);
  } catch {
    // A heartbeat is a diagnostic: a read-only or full disk must not fail a run.
  }
}

/** Reads a heartbeat file; undefined when it is missing or half written. */
export function readHeartbeat(file: string): Heartbeat | undefined {
  try {
    const value = JSON.parse(fs.readFileSync(file, "utf8")) as Heartbeat;
    return typeof value.time === "number" ? value : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Starts the heartbeat of a suite: it writes `file` now and every HEARTBEAT_INTERVAL_MS until
 * `stop`. A suite that has finished stops it, so a VS Code that never exits goes stale too.
 */
export function startHeartbeat(suite: string, file: string | undefined,
  intervalMs: number = HEARTBEAT_INTERVAL_MS): { stop(): void } {
  progress.suite = suite;
  if (file === undefined || file === "") return { stop: () => undefined };
  writeHeartbeat(file);
  const timer = setInterval(() => writeHeartbeat(file), intervalMs);
  timer.unref();
  return { stop: () => clearInterval(timer) };
}

/** Why the launcher stops a launch, or undefined while it is healthy. */
export type WatchdogVerdict =
  | { readonly kind: "stale"; readonly silentMs: number }
  | { readonly kind: "deadline"; readonly elapsedMs: number }
  | undefined;

/**
 * The launcher's decision: past the deadline, or no heartbeat change for `staleMs` after the first
 * one. Before the first heartbeat only the deadline applies (VS Code may start slowly).
 */
export function watchdogVerdict(state: {
  readonly now: number;
  readonly startedAt: number;
  readonly lastHeartbeatAt: number | undefined;
  readonly staleMs: number;
  readonly deadlineMs: number;
}): WatchdogVerdict {
  const elapsedMs = state.now - state.startedAt;
  if (elapsedMs > state.deadlineMs) return { kind: "deadline", elapsedMs };
  if (state.lastHeartbeatAt !== undefined) {
    const silentMs = state.now - state.lastHeartbeatAt;
    if (silentMs > state.staleMs) return { kind: "stale", silentMs };
  }
  return undefined;
}

/** A folder-name-safe version of a step name. */
export function safeName(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]+/gu, "-").replace(/^-+|-+$/gu, "").slice(0, 60) || "unknown";
}
