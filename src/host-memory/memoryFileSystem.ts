/**
 * A {@link FileSystem} in memory, for unit tests and hosts without a disk (a sandboxed canvas).
 * Paths are POSIX paths; a directory exists when a file below it does or it was created. There
 * are no symbolic links: `realpath` normalises the path and checks that it exists. Host-neutral:
 * no host API, no DOM, no Node built-ins.
 */

import type { FileKind, FileStat, FileSystem } from "../host-api/fileSystem";

/** An in-memory file system with a way to put files in it. */
export interface MemoryFileSystem extends FileSystem {
  /** Creates or replaces a text file (UTF-8), creating its directories. */
  addFile(path: string, text: string): void;
  /** Creates an empty directory and its parents. */
  addDirectory(path: string): void;
}

function notFound(path: string): Error {
  return Object.assign(new Error(`ENOENT: no such file or directory, '${path}'`), { code: "ENOENT" });
}

/** Normalises a POSIX path: one slash between segments, `.` and `..` resolved, no trailing slash. */
export function normalizePosixPath(path: string): string {
  const segments: string[] = [];
  for (const segment of path.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") segments.pop();
    else segments.push(segment);
  }
  return `/${segments.join("/")}`;
}

function parentOf(path: string): string | undefined {
  if (path === "/") return undefined;
  const index = path.lastIndexOf("/");
  return index <= 0 ? "/" : path.slice(0, index);
}

/** Creates an empty in-memory file system (only `/` exists). */
export function createMemoryFileSystem(): MemoryFileSystem {
  const files = new Map<string, Uint8Array>();
  const directories = new Set<string>(["/"]);

  const addDirectory = (path: string): void => {
    for (let current: string | undefined = normalizePosixPath(path); current !== undefined; current = parentOf(current)) {
      directories.add(current);
    }
  };
  const kindAt = (path: string): FileKind | undefined =>
    files.has(path) ? "file" : directories.has(path) ? "directory" : undefined;
  const write = (path: string, data: Uint8Array): void => {
    const target = normalizePosixPath(path);
    const parent = parentOf(target);
    if (parent === undefined || !directories.has(parent)) throw notFound(path);
    if (directories.has(target)) throw Object.assign(new Error(`EISDIR: '${path}'`), { code: "EISDIR" });
    files.set(target, new Uint8Array(data));
  };

  return {
    addFile(path, text) {
      const target = normalizePosixPath(path);
      const parent = parentOf(target);
      if (parent !== undefined) addDirectory(parent);
      files.set(target, new TextEncoder().encode(text));
    },
    addDirectory,
    async stat(path): Promise<FileStat> {
      const target = normalizePosixPath(path);
      const kind = kindAt(target);
      if (!kind) throw notFound(path);
      return { kind, size: files.get(target)?.length ?? 0 };
    },
    async readFile(path) {
      const data = files.get(normalizePosixPath(path));
      if (!data) throw notFound(path);
      return new Uint8Array(data);
    },
    async writeFile(path, data) {
      write(path, data);
    },
    async readDirectory(path) {
      const target = normalizePosixPath(path);
      if (!directories.has(target)) throw notFound(path);
      const prefix = target === "/" ? "/" : `${target}/`;
      const entries = new Map<string, FileKind>();
      for (const candidate of [...files.keys(), ...directories]) {
        if (!candidate.startsWith(prefix) || candidate === target) continue;
        const name = candidate.slice(prefix.length);
        if (name.includes("/")) continue;
        entries.set(name, files.has(candidate) ? "file" : "directory");
      }
      return [...entries].sort(([left], [right]) => left.localeCompare(right));
    },
    async rename(from, to, options) {
      const source = normalizePosixPath(from);
      const target = normalizePosixPath(to);
      const data = files.get(source);
      if (!data) throw notFound(from);
      if (options?.overwrite !== true && kindAt(target) !== undefined) {
        throw Object.assign(new Error(`EEXIST: '${to}'`), { code: "EEXIST" });
      }
      write(target, data);
      files.delete(source);
    },
    async realpath(path) {
      const target = normalizePosixPath(path);
      if (!kindAt(target)) throw notFound(path);
      return target;
    },
  };
}
