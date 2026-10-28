/**
 * The `LinkedTargetWatcher` port: a direct watch of one linked target file, beside the host's
 * `Watcher` (which can lag behind or miss a write inside a workspace folder).
 */

/** What a direct watch of one linked target holds, for the test snapshot and failure messages. */
export interface LinkedTargetWatchState {
  /**
   * `watching` while the watch is armed; `failed` when it could not be armed or broke (then
   * `error` says why); `closed` after dispose.
   */
  status: "watching" | "failed" | "closed";
  /** The error code (or message) that stopped the watch, when `status` is `failed`. */
  error?: string;
  /** How many events naming the target (or unnamed) the watch delivered. */
  events: number;
}

export interface LinkedTargetWatch {
  state(): LinkedTargetWatchState;
  dispose(): void;
}

/** Creates direct watches of linked target files. */
export interface LinkedTargetWatcher {
  /**
   * Watches the file `target` (a file system path); armed when the call returns. Never throws: a
   * target that cannot be watched gives no events and its state says why.
   */
  watch(target: string, onEvent: () => void): LinkedTargetWatch;
}
