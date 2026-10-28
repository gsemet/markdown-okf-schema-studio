/**
 * The render clock of the host harnesses. The host times each MyST render with `performance.now()`
 * and lengthens the render debounce to twice the last render time (at least 40 ms, see
 * `BuildQueue.currentDebounceMs`). Under a harness the debounce runs on the `node:test` mock clock,
 * which moves only when a test ticks it; a render time read from the wall clock mixed the two: a
 * first render slowed past 20 ms (a cold engine in a fresh process, a busy CI runner) made the next
 * debounce longer than the 40 ms the test moved, so the render never started and the wait for its
 * patch timed out.
 *
 * While a harness runs, `performance.now()` stands still: a render takes no time on the test's
 * clock, like every other step between two ticks, and the debounce is the one the test states.
 * `wallNow` is the real clock, for the harness's own bound on how long a wait may last.
 */

/** The real monotonic clock (ms), unaffected by `freezeRenderClock`. */
export const wallNow: () => number = performance.now.bind(performance);

/** Stops `performance.now()` at its current value until `releaseRenderClock`. */
export function freezeRenderClock(): void {
  const frozen = wallNow();
  Object.defineProperty(performance, "now", { configurable: true, writable: true, value: () => frozen });
}

/** Gives `performance.now()` back its real clock. */
export function releaseRenderClock(): void {
  Reflect.deleteProperty(performance, "now");
}
