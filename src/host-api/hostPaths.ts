/**
 * The `HostPaths` port: the synchronous path facts the preview session decides with (is the source
 * still there, is this watcher event about the shown file, who is the user). They stay synchronous
 * because they run inside synchronous decisions; the asynchronous file access goes through the
 * `FileSystem` port. A host without a disk answers from its own model.
 */

export interface HostPaths {
  /** `path` with its symbolic links resolved; the resolved (absolute) path when it cannot be. */
  canonicalPath(path: string): string;
  /** True when `path` is an existing file (not a directory). */
  sourceExists(path: string): boolean;
  /** The name of the user of the host (the last fallback of a comment author); undefined: unknown. */
  userName(): string | undefined;
}
