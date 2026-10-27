/**
 * The `Logger` port: where the extension reports a failure nobody is waiting for (a background
 * write that rejected, a debounced refresh that threw). VS Code: an output channel; the memory
 * host: a list a test reads.
 */

/** Writes diagnostic lines the reader can find later; it never throws. */
export interface Logger {
  /** Reports a failure, with the error that caused it when there is one. */
  error(message: string, error?: unknown): void;
  /** Reports a condition worth knowing that is not a failure. */
  warn(message: string): void;
  /** Reports a step of the normal flow. */
  info(message: string): void;
}

/** The text of an error for a log line (the stack when it has one). */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? `${error.name}: ${error.message}`;
  }
  return String(error);
}

// @implements_req SwRS-MDOKFSTUDIO-LIFE-002
/**
 * Starts `work` and does not wait for it: a rejection is logged under `context` instead of
 * becoming an unhandled rejection (`undefined`, from an optional call, is ignored). Use it where a `void` promise used to be.
 */
export function fireAndForget(logger: Logger, work: PromiseLike<unknown> | undefined, context: string): void {
  work?.then(undefined, (error: unknown) => {
    logger.error(`${context} failed.`, error);
  });
}
