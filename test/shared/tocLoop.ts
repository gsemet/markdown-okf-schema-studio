/**
 * Knobs of the `toc` repro loop (`just ci-toc-loop`, CI input `toc_loop`): the scenario that once
 * failed with "Edit mode did not switch" runs again and again in one VS Code window, and a delay
 * the environment asks for is injected around the edit toggle's clicks, to widen a race window.
 * Both default to off, so a normal run is unchanged.
 *
 * - `STUDIO_TOC_LOOP`: rounds of the `toc-loop` scenario, an integer from 1 to `MAX_TOC_LOOP`.
 * - `STUDIO_TOGGLE_DELAY_MS`: upper bound of a random delay, 0 to `MAX_TOGGLE_DELAY_MS` (default 0).
 *   It only acts when `STUDIO_REAL_INPUT_SCENARIO` is `toc-loop`, so a stray variable never slows
 *   the normal integration job.
 *
 * `MAX_TOC_LOOP` is what fits the 30-minute launch deadline of the `toc-loop` step.
 */
export const MAX_TOC_LOOP = 40;
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
