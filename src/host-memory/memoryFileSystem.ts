/**
 * A {@link FileSystem} in memory, for unit tests and hosts without a disk (a sandboxed canvas).
 * Paths are POSIX paths; a directory exists when a file below it does or it was created. A symbolic
 * link exists only when {@link MemoryFileSystem.addSymlink} made it: `stat`, `readFile`,
 * `readDirectory` and `realpath` follow it (a dangling or looping link is an error, as on disk),
 * `isSymbolicLink` tells it. Host-neutral: no host API, no DOM, no Node built-ins.
 */

import type { FileKind, FileStat, FileSystem } from "../host-api/fileSystem";

/** An in-memory file system with a way to put files in it. */
export interface MemoryFileSystem extends FileSystem {
  /** Creates or replaces a text file (UTF-8), creating its directories. */
  addFile(path: string, text: string, mtimeMs?: number): void;
  /** Creates an empty directory and its parents. */
  addDirectory(path: string): void;
  /**
   * Creates a symbolic link at `path` to `target` (an absolute path, or one relative to the folder
   * of the link), creating the folder of the link. The target need not exist.
   */
  addSymlink(path: string, target: string): void;
  /** True when `path` is a file (not a directory); synchronous, for the `HostPaths` port. */
  fileExists(path: string): boolean;
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

/** The most links one path may go through before it counts as a loop (as the kernel's limit). */
const MAX_LINK_HOPS = 40;

function segmentsOf(path: string): string[] {
  return normalizePosixPath(path).split("/").filter((segment) => segment !== "");
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
  const modified = new Map<string, number>();
  const links = new Map<string, string>();

  const addDirectory = (path: string): void => {
    for (let current: string | undefined = normalizePosixPath(path); current !== undefined; current = parentOf(current)) {
      directories.add(current);
    }
  };
  const kindAt = (path: string): FileKind | undefined =>
    files.has(path) ? "file" : directories.has(path) ? "directory" : undefined;
  /** The path with every link in it replaced by its target (`followFinal`: the last one too). */
  const resolveLinks = (path: string, original: string, followFinal = true): string => {
    let pending = segmentsOf(path);
    let resolved: string[] = [];
    let hops = 0;
    while (pending.length > 0) {
      const [segment, ...rest] = pending;
      const candidate = `/${[...resolved, segment].join("/")}`;
      const target = links.get(candidate);
      if (target !== undefined && (rest.length > 0 || followFinal)) {
        hops += 1;
        if (hops > MAX_LINK_HOPS) {
          throw Object.assign(new Error(`ELOOP: too many symbolic links, '${original}'`), { code: "ELOOP" });
        }
        pending = [...segmentsOf(target), ...rest];
        resolved = [];
      } else {
        resolved.push(segment);
        pending = rest;
      }
    }
    return `/${resolved.join("/")}`;
  };
  const followed = (path: string): string => resolveLinks(path, path);
  const write = (path: string, data: Uint8Array): void => {
    const target = normalizePosixPath(path);
    const parent = parentOf(target);
    if (parent === undefined || !directories.has(parent)) throw notFound(path);
    if (directories.has(target)) throw Object.assign(new Error(`EISDIR: '${path}'`), { code: "EISDIR" });
    files.set(target, new Uint8Array(data));
    modified.set(target, Date.now());
  };

  return {
    addFile(path, text, mtimeMs) {
      const target = normalizePosixPath(path);
      const parent = parentOf(target);
      if (parent !== undefined) addDirectory(parent);
      files.set(target, new TextEncoder().encode(text));
      modified.set(target, mtimeMs ?? Date.now());
    },
    addDirectory,
    addSymlink(path, target) {
      const link = normalizePosixPath(path);
      const parent = parentOf(link);
      if (parent !== undefined) addDirectory(parent);
      links.set(link, normalizePosixPath(target.startsWith("/") ? target : `${parent ?? "/"}/${target}`));
    },
    fileExists(path) {
      try {
        return files.has(followed(path));
      } catch {
        return false;
      }
    },
    async stat(path): Promise<FileStat> {
      const target = followed(path);
      const kind = kindAt(target);
      if (!kind) throw notFound(path);
      const mtimeMs = modified.get(target);
      return { kind, size: files.get(target)?.length ?? 0, ...(mtimeMs === undefined ? {} : { mtimeMs }) };
    },
    async readFile(path) {
      const data = files.get(followed(path));
      if (!data) throw notFound(path);
      return new Uint8Array(data);
    },
    async writeFile(path, data) {
      write(path, data);
    },
    async readDirectory(path) {
      const target = followed(path);
      if (!directories.has(target)) throw notFound(path);
      const prefix = target === "/" ? "/" : `${target}/`;
      const entries = new Map<string, FileKind>();
      for (const candidate of [...files.keys(), ...directories, ...links.keys()]) {
        if (!candidate.startsWith(prefix) || candidate === target) continue;
        const name = candidate.slice(prefix.length);
        if (name.includes("/")) continue;
        if (links.has(candidate)) {
          // A link reports the kind of its target, "other" when the target is missing (as on disk).
          try {
            entries.set(name, kindAt(followed(candidate)) ?? "other");
          } catch {
            entries.set(name, "other");
          }
        } else {
          entries.set(name, files.has(candidate) ? "file" : "directory");
        }
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
      modified.delete(source);
    },
    async delete(path) {
      const target = resolveLinks(path, path, false);
      if (links.delete(target)) return;
      if (!files.delete(target)) throw notFound(path);
      modified.delete(target);
    },
    async isSymbolicLink(path) {
      const target = normalizePosixPath(path);
      const parent = parentOf(target);
      if (parent === undefined) return false;
      return links.has(`${followed(parent) === "/" ? "" : followed(parent)}/${target.slice(parent === "/" ? 1 : parent.length + 1)}`);
    },
    async realpath(path) {
      const target = followed(path);
      if (!kindAt(target)) throw notFound(path);
      return target;
    },
  };
}
