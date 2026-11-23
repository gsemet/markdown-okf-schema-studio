/**
 * A memory file system seen through the paths of this platform. The core builds paths with
 * `node:path`, so on Windows a request is `C:\w\a.png` while the memory file system holds POSIX
 * paths; this view maps one to the other so a test runs on every platform.
 */
import * as path from "node:path";

import type { FileSystem } from "../../src/host-api/fileSystem";
import { createMemoryFileSystem, type MemoryFileSystem } from "../../src/host-memory/memoryFileSystem";

const toPosix = (value: string): string => value.replace(/^[A-Za-z]:/u, "").split(path.sep).join("/");
const toPlatform = (value: string): string => path.resolve(value);

export interface PlatformMemoryFileSystem extends FileSystem {
  readonly memory: MemoryFileSystem;
  addFile(file: string, text: string): void;
  addSymlink(link: string, target: string): void;
  addDirectory(directory: string): void;
}

/** An empty memory file system whose methods take and give the paths of this platform. */
export function createPlatformMemoryFileSystem(): PlatformMemoryFileSystem {
  const memory = createMemoryFileSystem();
  return {
    memory,
    addFile: (file, text) => memory.addFile(toPosix(file), text),
    addDirectory: (directory) => memory.addDirectory(toPosix(directory)),
    addSymlink: (link, target) => memory.addSymlink(toPosix(link), toPosix(target)),
    stat: (file) => memory.stat(toPosix(file)),
    readFile: (file) => memory.readFile(toPosix(file)),
    writeFile: (file, data) => memory.writeFile(toPosix(file), data),
    readDirectory: (directory) => memory.readDirectory(toPosix(directory)),
    rename: (from, to, options) => memory.rename(toPosix(from), toPosix(to), options),
    delete: (file) => memory.delete(toPosix(file)),
    isSymbolicLink: (file) => memory.isSymbolicLink(toPosix(file)),
    realpath: async (file) => toPlatform(await memory.realpath(toPosix(file))),
  };
}
