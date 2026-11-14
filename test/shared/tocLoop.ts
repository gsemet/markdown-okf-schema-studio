/**
 * Knobs of the `toc` repro loop (`just ci-toc-loop`, CI input `toc_loop`): the scenario that once
 * failed with "Edit mode did not switch" runs again and again in one VS Code window, and a delay
 * the environment asks for is injected around the edit toggle's clicks, to widen a race window.
 * Both default to off, so a normal run is unchanged.
 *
 * - `STUDIO_TOC_LOOP`: rounds of the `toc-loop` scenario, an integer from 1 to `MAX_TOC_LOOP`.
 * - `STUDIO_TOC_LOOP_STEPS`: the steps of a round, comma-separated names of `TOC_LOOP_STEP_NAMES`
 *   (default `readme-html,toc,myst-blocks`): the three steps that reopen the side bar in their
 *   cleanup, in the order the trusted suite runs them (CR 328). It replaces the former
 *   `STUDIO_TOC_AFTER_README_HTML`.
 * - `STUDIO_TOC_LOOP_CONTROL`: `1` closes the side bar before each step, so the step starts with
 *   the side bar already closed (the control of the adjacency); `0` or empty is off.
 * - `STUDIO_TOGGLE_DELAY_MS`: upper bound of a random delay, 0 to `MAX_TOGGLE_DELAY_MS` (default 0).
 *   It only acts when `STUDIO_REAL_INPUT_SCENARIO` is `toc-loop`, so a stray variable never slows
 *   the normal integration job.
 *
 * `MAX_TOC_LOOP` rounds of the default three steps fit the computed launch deadline
 * (`tocLoopDeadlineMs`) inside the `toc-loop` step.
 */
export const MAX_TOC_LOOP = 40;
export const TOC_LOOP_STEP_NAMES = ["readme-html", "toc", "myst-blocks"] as const;
export type TocLoopStepName = (typeof TOC_LOOP_STEP_NAMES)[number];
/** Most steps in one round: twice the default list. */
export const MAX_TOC_LOOP_STEPS = 6;
/** Window start before the first round (as the stress runs: measured about 30 s, bounded by the heartbeat). */
export const TOC_LOOP_START_MS = 2 * 60_000;
/**
 * Budget of one step run of the loop. Not measured on the loop yet (the stress scenarios take 4 s,
 * these steps open a preview, switch two themes and close it): a deliberately wide 12 s, so 40
 * rounds of three steps (120 runs) get 26 minutes, under the 35-minute step of the workflow.
 */
export const TOC_LOOP_STEP_BUDGET_MS = 12_000;
/** Ceiling of the launch deadline of the loop: under the workflow step's 35 minutes, so the watchdog fires first. */
export const TOC_LOOP_DEADLINE_CEILING_MS = 30 * 60_000;
export const MAX_TOGGLE_DELAY_MS = 2_000;

function integerKnob(raw: string | undefined, name: string, min: number, max: number, fallback: number): number {
  const text = raw?.trim() ?? "";
  if (text === "") return fallback;
  const value = Number(text);
  if (!/^\d+$/u.test(text) || !Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer from ${min} to ${max}, got "${text}"`);
  }
  return value;
}

export function tocLoopRounds(environment: { STUDIO_TOC_LOOP?: string } = process.env): number {
  return integerKnob(environment.STUDIO_TOC_LOOP, "STUDIO_TOC_LOOP", 1, MAX_TOC_LOOP, 1);
}

export function tocLoopSteps(environment: { STUDIO_TOC_LOOP_STEPS?: string } = process.env): TocLoopStepName[] {
  const text = environment.STUDIO_TOC_LOOP_STEPS?.trim() ?? "";
  if (text === "") return [...TOC_LOOP_STEP_NAMES];
  const names = text.split(",").map((name) => name.trim());
  const unknown = names.filter((name) => !(TOC_LOOP_STEP_NAMES as readonly string[]).includes(name));
  if (unknown.length > 0 || names.length > MAX_TOC_LOOP_STEPS) {
    throw new Error(`STUDIO_TOC_LOOP_STEPS must be 1 to ${MAX_TOC_LOOP_STEPS} comma-separated names of `
      + `${TOC_LOOP_STEP_NAMES.join(", ")}, got "${text}"`);
  }
  return names as TocLoopStepName[];
}

export function tocLoopControl(environment: { STUDIO_TOC_LOOP_CONTROL?: string } = process.env): boolean {
  const text = environment.STUDIO_TOC_LOOP_CONTROL?.trim() ?? "";
  if (text === "" || text === "0") return false;
  if (text === "1") return true;
  throw new Error(`STUDIO_TOC_LOOP_CONTROL must be 0 or 1 (empty means 0), got "${text}"`);
}

/** Launch deadline of a loop of `rounds` rounds of `steps` steps, capped. */
export function tocLoopDeadlineMs(rounds: number, steps: number): number {
  return Math.min(TOC_LOOP_DEADLINE_CEILING_MS, TOC_LOOP_START_MS + rounds * steps * TOC_LOOP_STEP_BUDGET_MS);
}

export function toggleDelayMaxMs(environment: { STUDIO_TOGGLE_DELAY_MS?: string } = process.env): number {
  return integerKnob(environment.STUDIO_TOGGLE_DELAY_MS, "STUDIO_TOGGLE_DELAY_MS", 0, MAX_TOGGLE_DELAY_MS, 0);
}

/** Pauses for a random time up to the injected maximum; returns the milliseconds waited (0: off). */
export async function injectToggleDelay(
  environment: { STUDIO_TOGGLE_DELAY_MS?: string; STUDIO_REAL_INPUT_SCENARIO?: string } = process.env,
  random: () => number = Math.random,
): Promise<number> {
  if (environment.STUDIO_REAL_INPUT_SCENARIO !== "toc-loop") return 0;
  const max = toggleDelayMaxMs(environment);
  if (max === 0) return 0;
  const ms = Math.floor(random() * (max + 1));
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
  return ms;
}

/** Outcome of the rounds, for the log and the summary file. */
export interface TocLoopTally {
  rounds: number;
  passed: number;
  failed: number;
  /** Failure message of each failed round, with its round number. */
  failures: string[];
}

export function tocLoopSummary(tally: TocLoopTally): string {
  return `toc-loop: ${tally.rounds} round(s), ${tally.passed} clean, ${tally.failed} failed`;
}

/** The line a loop launch prints before its window opens: the deadline and where it comes from. */
export function tocLoopDeadlineLine(
  deadline: number,
  rounds: number,
  steps: readonly string[],
  fromEnvironment: boolean,
): string {
  if (fromEnvironment) return `toc-loop: launch deadline ${deadline} ms (STUDIO_LAUNCH_TIMEOUT_MS)`;
  const capped = TOC_LOOP_START_MS + rounds * steps.length * TOC_LOOP_STEP_BUDGET_MS > TOC_LOOP_DEADLINE_CEILING_MS;
  return `toc-loop: launch deadline ${deadline} ms (${rounds} rounds x ${steps.length} steps, `
    + `ceiling ${TOC_LOOP_DEADLINE_CEILING_MS} ms)${capped ? "; capped: lower the rounds or the steps" : ""}`;
}
