/**
 * The {@link FileSystem} port on Node's `fs/promises`: the file access of every host that runs
 * the core in Node (the VS Code extension host, a future headless Node host).
 */

import { realpath as jsRealpath } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { promisify } from "node:util";

import type { FileKind, FileStat, FileSystem } from "../host-api/fileSystem";

/**
 * The JS `fs.realpath` (not `fs.realpath.native`, which `fs/promises` uses): it gives the same path
 * as `fs.realpathSync`, which the rest of the extension uses for canonical paths. It keeps the case
 * of the input on a case-insensitive file system, and resolves `subst`/mapped Windows drives the way
 * `fs.realpathSync` does.
 */
const realpathLikeSync = promisify(jsRealpath);

function kindOf(entry: { isFile(): boolean; isDirectory(): boolean }): FileKind {
  return entry.isFile() ? "file" : entry.isDirectory() ? "directory" : "other";
}

/** A {@link FileSystem} on the local disk. `stat` follows symbolic links, as `fs.stat` does. */
export function createNodeFileSystem(): FileSystem {
  return {
    async stat(file): Promise<FileStat> {
      const stat = await fs.stat(file);
      return { kind: kindOf(stat), size: stat.size };
    },
    async readFile(file) {
      return new Uint8Array(await fs.readFile(file));
    },
    async writeFile(file, data) {
      await fs.writeFile(file, data);
    },
    async readDirectory(directory) {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      return Promise.all(entries.map(async (entry): Promise<[string, FileKind]> => {
        if (!entry.isSymbolicLink()) return [entry.name, kindOf(entry)];
        try {
          return [entry.name, kindOf(await fs.stat(path.join(directory, entry.name)))];
        } catch {
          return [entry.name, "other"];
        }
      }));
    },
    async rename(from, to, options) {
      if (options?.overwrite !== true) {
        const exists = await fs.stat(to).then(() => true, () => false);
        if (exists) {
          throw Object.assign(new Error(`The file ${to} already exists.`), { code: "EEXIST" });
        }
      }
      await fs.rename(from, to);
    },
    async delete(file) {
      await fs.unlink(file);
    },
    /** Resolves symbolic links like `fs.realpathSync` (the JS implementation, see {@link realpathLikeSync}). */
    realpath(file) {
      return realpathLikeSync(file);
    },
  };
}
