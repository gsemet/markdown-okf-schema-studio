/**
 * The page's view of its host on top of a {@link HostTransport}: messages, and the saved state with
 * the write throttle of PERF-08. Webview state written while scrolling is throttled: at most one
 * write per {@link STATE_THROTTLE_MS}, the last one always written (trailing, and when the page is
 * hidden). Every other write goes through at once and replaces a pending one; a read sees the
 * pending state. The host's copy of the scroll state (`previewState`) follows the same rule; a
 * `previewScroll`, which moves the text editor, is never held back.
 */

import type { HostTransport } from "./hostTransport";

/** Shortest time between two throttled state writes, and between two throttled state messages. */
export const STATE_THROTTLE_MS = 100;

/** The saved state of a page: a plain object the host keeps across reloads. */
export type PageSavedState = Record<string, unknown>;

/** Messages and saved state as the page features use them (the `vscode` object of the runtime). */
export interface PageHostApi {
  /** Sends a page-to-host message at once. */
  postMessage(message: unknown): void;
  /** The saved state, including a throttled write that is still pending. */
  getState(): PageSavedState | undefined;
  /** Writes the saved state at once; a pending throttled write is dropped. */
  setState(state: unknown): void;
}

/** {@link PageHostApi} plus the throttled writes and their flushes. */
export interface PageHost {
  /** What the features post and save through. */
  readonly api: PageHostApi;
  /** Writes the saved state, at most once per {@link STATE_THROTTLE_MS} (the last write wins). */
  setStateThrottled(state: PageSavedState): void;
  /** Writes a pending throttled state now (the page is hidden). */
  flushPendingState(): void;
  /** Posts a state message, at most once per {@link STATE_THROTTLE_MS} (the last one wins). */
  postStateMessageThrottled(message: unknown): void;
  /** Posts a pending throttled state message now. */
  flushStateMessage(): void;
}

/** The timers and clock the throttle uses (the page's window). */
export type PageHostClock = Pick<Window, "setTimeout" | "clearTimeout"> & {
  readonly performance?: { now?(): number };
};

/** A {@link PageHost} over a transport, with the window's timers and clock. */
export function createPageHost(transport: HostTransport, window: PageHostClock): PageHost {
  const throttleClock = (): number => window.performance?.now?.() ?? Date.now();
  let pendingState: PageSavedState | undefined;
  let pendingStateTimer: number | undefined;
  let lastStateWrite = Number.NEGATIVE_INFINITY;
  function cancelPendingState(): void {
    if (pendingStateTimer !== undefined) window.clearTimeout(pendingStateTimer);
    pendingStateTimer = undefined;
    pendingState = undefined;
  }
  function flushPendingState(): void {
    const state = pendingState;
    cancelPendingState();
    if (state !== undefined) {
      lastStateWrite = throttleClock();
      transport.setState?.(state);
    }
  }
  // @implements_req SwRS-MDOKFSTUDIO-LIFE-125
  function setStateThrottled(state: PageSavedState): void {
    const now = throttleClock();
    if (pendingStateTimer === undefined && now - lastStateWrite >= STATE_THROTTLE_MS) {
      lastStateWrite = now;
      transport.setState?.(state);
      return;
    }
    pendingState = state;
    if (pendingStateTimer === undefined) {
      pendingStateTimer = window.setTimeout(flushPendingState, Math.max(0, STATE_THROTTLE_MS - (now - lastStateWrite)));
    }
  }
  const api: PageHostApi = {
    postMessage: (message) => transport.postMessage(message),
    getState: () => pendingState !== undefined ? pendingState : transport.getState?.() as PageSavedState | undefined,
    setState: (state) => {
      cancelPendingState();
      lastStateWrite = throttleClock();
      transport.setState?.(state);
    },
  };
  let pendingStateMessage: unknown;
  let pendingStateMessageTimer: number | undefined;
  let lastStateMessage = Number.NEGATIVE_INFINITY;
  function flushStateMessage(): void {
    const message = pendingStateMessage;
    if (pendingStateMessageTimer !== undefined) window.clearTimeout(pendingStateMessageTimer);
    pendingStateMessageTimer = undefined;
    pendingStateMessage = undefined;
    if (message !== undefined) {
      lastStateMessage = throttleClock();
      api.postMessage(message);
    }
  }
  function postStateMessageThrottled(message: unknown): void {
    const now = throttleClock();
    if (pendingStateMessageTimer === undefined && now - lastStateMessage >= STATE_THROTTLE_MS) {
      lastStateMessage = now;
      api.postMessage(message);
      return;
    }
    pendingStateMessage = message;
    if (pendingStateMessageTimer === undefined) {
      pendingStateMessageTimer = window.setTimeout(flushStateMessage, Math.max(0, STATE_THROTTLE_MS - (now - lastStateMessage)));
    }
  }
  return { api, setStateThrottled, flushPendingState, postStateMessageThrottled, flushStateMessage };
}
