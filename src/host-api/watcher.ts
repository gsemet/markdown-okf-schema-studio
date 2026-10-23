/**
 * The `Watcher` port: notifications when files are created, changed or deleted. Hosts without
 * file events may poll; events can come late or twice, so every consumer debounces.
 */

import type { Disposable, HostEvent } from "./events";

/** A watch on a set of files; events carry the file system path that changed. */
export interface FileWatcher extends Disposable {
  readonly onDidCreate: HostEvent<string>;
  readonly onDidChange: HostEvent<string>;
  readonly onDidDelete: HostEvent<string>;
}

/** Creates file watches. */
export interface Watcher {
  /**
   * Watches the files matching the glob `pattern` below the folder `base` (a file system path), or
   * in every workspace folder when `base` is undefined.
   */
  watch(base: string | undefined, pattern: string): FileWatcher;
}
