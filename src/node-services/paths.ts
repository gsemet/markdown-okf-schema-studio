/**
 * Synchronous path checks of the host on Node: the canonical form of a path and whether a source
 * file exists. They run inside synchronous decisions of the preview session (is the source still
 * there, is this watcher event about the shown file), so they stay synchronous; the asynchronous
 * file access goes through the `FileSystem` port.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

/** `path` with its symbolic links resolved, or `path.resolve(path)` when it cannot be resolved. */
export function canonicalPath(filePath: string): string {
  try {
    return fs.realpathSync(filePath);
  } catch {
    return path.resolve(filePath);
  }
}

/** True when `filePath` is an existing file (not a directory). */
export function sourceExists(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

/** The name of the user of the operating system (the last fallback of a comment author). */
export function osUserName(): string {
  return os.userInfo().username;
}
