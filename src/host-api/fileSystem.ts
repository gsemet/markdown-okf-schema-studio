/**
 * The `FileSystem` port: asynchronous file access by file system path. The interface lives in the
 * core (`src/core/files/fileSystem.ts`), which asks it; this module is where the hosts import it
 * from to implement it.
 */
export {
  isFileNotFound,
  readTextFile,
  type FileKind,
  type FileStat,
  type FileSystem,
} from "../core/files/fileSystem";
