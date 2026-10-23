/**
 * The `FileSystem` port: asynchronous file access by file system path. The core never reads or
 * writes a file directly; it asks this port, so a host can serve files from a workspace API, a
 * sandbox or memory.
 */

/** What a path points to. A symbolic link reports the kind of its target. */
export type FileKind = "file" | "directory" | "other";

/** Metadata of a path. */
export interface FileStat {
  kind: FileKind;
  /** Size in bytes. */
  size: number;
}

/** File access by absolute file system path. Every method rejects when the operation fails. */
export interface FileSystem {
  /** Metadata of `path`; rejects with a not-found error (see {@link isFileNotFound}) when it does not exist. */
  stat(path: string): Promise<FileStat>;
  /** The bytes of a file. */
  readFile(path: string): Promise<Uint8Array>;
  /** Creates or replaces a file with `data`. */
  writeFile(path: string, data: Uint8Array): Promise<void>;
  /** The entries of a directory: name and kind. */
  readDirectory(path: string): Promise<Array<[string, FileKind]>>;
  /** Renames `from` to `to`. Without `overwrite`, rejects when `to` exists. */
  rename(from: string, to: string, options?: { overwrite?: boolean }): Promise<void>;
  /** The canonical path: symbolic links resolved. */
  realpath(path: string): Promise<string>;
}

/**
 * True for the error a {@link FileSystem} rejects with when a path does not exist, whichever host
 * produced it (a Node `ENOENT`, a VS Code `FileNotFound`).
 */
export function isFileNotFound(error: unknown): boolean {
  const code = (error as { code?: unknown } | undefined)?.code;
  return code === "ENOENT" || code === "FileNotFound";
}

/** Reads a file as UTF-8 text. */
export async function readTextFile(files: FileSystem, path: string): Promise<string> {
  return new TextDecoder().decode(await files.readFile(path));
}
