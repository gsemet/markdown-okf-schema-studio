import { currentProgress, withTimeout } from "./hangWatchdog";

/** What a real-window scenario's collector gathers when the scenario fails (JSON-serializable). */
export type ScenarioSnapshot = Record<string, unknown>;

/** Overall bound of the collector: the harness bounds each of its calls, not the whole collection. */
export const FAILURE_TRACE_BOUND_MS = 5_000;

/** The one line a failed scenario prints after its error: `<scenario> failure trace: <JSON>`. */
export function formatScenarioTrace(name: string, snapshot: ScenarioSnapshot): string {
  return `${name} failure trace: ${JSON.stringify(snapshot)}`;
}

function describeError(error: unknown): string {
  return error instanceof Error ? (error.stack ?? error.message) : String(error);
}

/**
 * Runs `body`. When it throws, prints the error (`<name> failed: ...`), then the trace that `collect`
 * gathers within `boundMs` as a whole, and rethrows the original error unchanged. A timeout or an
 * error of `collect` goes into the trace as `collectError` and never replaces the scenario's error.
 * The trace carries the last progress marker the step recorded before the failure.
 */
export async function withFailureTrace<T>(
  name: string,
  collect: () => ScenarioSnapshot | Promise<ScenarioSnapshot>,
  body: () => Promise<T>,
  boundMs: number = FAILURE_TRACE_BOUND_MS,
): Promise<T> {
  try {
    return await body();
  } catch (error) {
    const lastProgress = currentProgress().marker;
    console.error(`${name} failed: ${describeError(error)}`);
    let snapshot: ScenarioSnapshot;
    try {
      snapshot = { ...await withTimeout(`${name} failure trace`, boundMs, Promise.resolve().then(collect)), lastProgress };
    } catch (collectError) {
      snapshot = { collectError: String(collectError), lastProgress };
    }
    console.error(formatScenarioTrace(name, snapshot));
    throw error;
  }
}
