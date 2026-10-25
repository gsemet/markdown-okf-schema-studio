/**
 * Bounded waits of the flush that runs before the preview leaves a document (CR 025). A dead or
 * busy page must never block a navigation, so every wait ends after a timeout. This module must
 * not import `vscode`.
 */

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-205
/** Longest wait for the page to answer a flush request, and for the host to apply its saves. */
export const FLUSH_WAIT_MS = 1500;

const POLL_MS = 5;

/** Resolves true once `isSettled()` holds, or false when `timeoutMs` passed first. */
export function waitForSettled(
  isSettled: () => boolean,
  timeoutMs: number = FLUSH_WAIT_MS,
  pollMs: number = POLL_MS,
): Promise<boolean> {
  if (isSettled()) {
    return Promise.resolve(true);
  }
  return new Promise<boolean>((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const poll = (): void => {
      if (isSettled()) {
        resolve(true);
      } else if (Date.now() >= deadline) {
        resolve(false);
      } else {
        setTimeout(poll, pollMs);
      }
    };
    setTimeout(poll, pollMs);
  });
}

/** Resolves true when `answered` settles within `timeoutMs`, false on the timeout; never rejects. */
export function waitForAnswer(answered: Promise<unknown>, timeoutMs: number = FLUSH_WAIT_MS): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    const done = (): void => {
      clearTimeout(timer);
      resolve(true);
    };
    answered.then(done, done);
  });
}

/**
 * The switch requests of one panel while a flush is pending: every request is queued, only the
 * latest one is applied, when the last queued run settles (A -> B -> A ends on A).
 */
export class LatestRequest<T> {
  private latest: T | undefined;
  private pending = 0;

  get idle(): boolean {
    return this.pending === 0;
  }

  request(value: T): void {
    this.latest = value;
    this.pending += 1;
  }

  /** One queued run ended: returns the value to apply when this was the last run, else undefined. */
  settle(): T | undefined {
    this.pending = Math.max(0, this.pending - 1);
    return this.pending === 0 ? this.latest : undefined;
  }
}

/**
 * The warning shown when the host could not save the text a flush carried. The page is about to be
 * replaced, so its in-page error would never be seen; `what` names the field or block.
 */
export function flushRefusalMessage(what: string, reason: string): string {
  const detail = reason.replace(/\s+/gu, " ").trim().replace(/\.$/u, "");
  return `Markdown OKF-Schema Studio could not save the text you typed in ${what}: ${detail}. `
    + "That text was not saved.";
}
