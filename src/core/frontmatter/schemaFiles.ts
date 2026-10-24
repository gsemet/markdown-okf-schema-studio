/**
 * The `SchemaFiles` port: the synchronous file access of the frontmatter schema discovery. The
 * frontmatter analysis runs synchronously inside a render, so it cannot use the asynchronous
 * `FileSystem` port; the host hands this narrow, read-only view instead (Node's file system in a
 * Node host, see `src/node-services/schemaFiles.ts`). Every method answers "no" or empty for a path
 * it cannot read, except `readText`, which throws.
 */

/** Read-only, synchronous access to the files of a bundle's schema directory. */
export interface SchemaFiles {
  /** True when `path` is a directory (following symbolic links); false when it cannot be read. */
  isDirectory(path: string): boolean;
  /** True when `path` is a file (following symbolic links); false when it cannot be read. */
  isFile(path: string): boolean;
  /** The names of the files (not directories) of `directory`; empty when it cannot be read. */
  listFiles(directory: string): string[];
  /** The UTF-8 text of the file at `path`; throws when it cannot be read. */
  readText(path: string): string;
}
