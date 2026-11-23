/**
 * The file access the frontmatter links need, as a narrow port owned by the core: the stem index
 * and the link resolution read files only through it. The host's `FileSystem` port satisfies it
 * structurally (the core does not import `host-api`), so a session passes `host.files`.
 */

/** What a path points to; a symbolic link reports the kind of its target. */
export type LinkFileKind = "file" | "directory" | "other";

/** The asynchronous file operations of link resolution and of the Markdown stem index. */
export interface LinkFiles {
  /** Metadata of `path` (symbolic links followed); rejects when it does not exist. */
  stat(path: string): Promise<{ kind: LinkFileKind; size: number; mtimeMs?: number }>;
  /** The bytes of a file. */
  readFile(path: string): Promise<Uint8Array>;
  /** The entries of a directory: name and kind. */
  readDirectory(path: string): Promise<Array<[string, LinkFileKind]>>;
  /** True when `path` itself is a symbolic link (not followed); false when it does not exist. */
  isSymbolicLink(path: string): Promise<boolean>;
  /** The canonical path: symbolic links resolved. */
  realpath(path: string): Promise<string>;
}
