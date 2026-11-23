import * as path from "../path/hostPath";

import { readTextFile, type FileSystem } from "../files/fileSystem";
import { parseConf, type ParsedConf } from "./confParser";

/** How long a lookup stays trusted before the disk is checked again. */
 const CONF_RECHECK_MS = 2000;

/** Checked in the workspace root when no conf.py is found above the document (decision D29). */
const FALLBACK_CANDIDATES = [
  "docs/conf.py", "doc/conf.py", "sphinx/conf.py", "source/conf.py", "docs/source/conf.py",
];

/** What the locator asks of the file system: the existence and the text of a `conf.py`. */
export type ConfFiles = Pick<FileSystem, "stat" | "readFile">;

export interface ConfLocatorOptions {
  files: ConfFiles;
  now?: () => number;
}

interface DirectoryEntry {
  /** The conf.py found for this folder and above, or null when there is none. */
  confPath: string | null;
  checkedAt: number;
}

interface FileEntry {
  mtimeMs: number;
  size: number;
  checkedAt: number;
  conf: ParsedConf;
}

async function statRegularFile(
  files: ConfFiles,
  file: string,
): Promise<{ mtimeMs: number; size: number } | undefined> {
  try {
    const stat = await files.stat(file);
    return stat.kind === "file" ? { mtimeMs: stat.mtimeMs ?? 0, size: stat.size } : undefined;
  } catch {
    return undefined;
  }
}

function isInside(root: string, directory: string): boolean {
  const relative = path.relative(root, directory);
  return relative === "" || !relative.startsWith("..") && !path.isAbsolute(relative);
}

export interface ConfLocator {
  /**
   * The MyST extensions the nearest `conf.py` enables, or undefined when nothing can be said:
   * no `conf.py`, a file that cannot be read with certainty, or a project without a MyST parser.
   */
  enabledMystExtensions(documentPath: string, workspaceRoot: string): Promise<ReadonlySet<string> | undefined>;
  /** The `conf.py` that governs the document (ancestor walk, then the D29 fallback), if any. */
  locate(documentPath: string, workspaceRoot: string): Promise<string | undefined>;
  invalidate(): void;
}

export function createConfLocator(options: ConfLocatorOptions): ConfLocator {
  const now = options.now ?? Date.now;
  const statFile = (file: string): Promise<{ mtimeMs: number; size: number } | undefined> =>
    statRegularFile(options.files, file);
  const readFile = (file: string): Promise<string> => readTextFile(options.files as FileSystem, file);
  const directories = new Map<string, DirectoryEntry>();
  const files = new Map<string, FileEntry>();
  // Bumped by `invalidate`: a lookup that started before it must not store its (stale) answer.
  let generation = 0;

  /** Common Sphinx source folders under the workspace root; exactly one candidate counts. */
  async function findFallback(root: string): Promise<string | null> {
    const found: string[] = [];
    for (const relative of FALLBACK_CANDIDATES) {
      const candidate = path.join(root, ...relative.split("/"));
      if (await statFile(candidate)) found.push(candidate);
    }
    return found.length === 1 ? found[0] : null;
  }

  // @implements_req SwRS-MDOKFSTUDIO-MYST-066
  async function findConf(directory: string, root: string): Promise<string | null> {
    const cached = directories.get(directory);
    if (cached && now() - cached.checkedAt < CONF_RECHECK_MS) {
      return cached.confPath;
    }
    const started = generation;
    let confPath: string | null = null;
    // A document outside the workspace folder only looks at its own folder.
    const limit = isInside(root, directory) ? root : directory;
    for (let current = directory; ; current = path.dirname(current)) {
      const candidate = path.join(current, "conf.py");
      if (await statFile(candidate)) {
        confPath = candidate;
        break;
      }
      if (current === limit || path.dirname(current) === current) {
        break;
      }
    }
    if (confPath === null && isInside(root, directory)) {
      confPath = await findFallback(root);
    }
    if (started === generation) directories.set(directory, { confPath, checkedAt: now() });
    return confPath;
  }

  async function readConf(confPath: string): Promise<ParsedConf | undefined> {
    const cached = files.get(confPath);
    if (cached && now() - cached.checkedAt < CONF_RECHECK_MS) {
      return cached.conf;
    }
    const started = generation;
    const stat = await statFile(confPath);
    if (!stat) {
      if (started === generation) files.delete(confPath);
      return undefined;
    }
    if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
      cached.checkedAt = now();
      return cached.conf;
    }
    let conf: ParsedConf;
    try {
      conf = parseConf(await readFile(confPath));
    } catch {
      conf = { extensions: [], mystExtensions: [], certain: false };
    }
    if (started === generation) files.set(confPath, { mtimeMs: stat.mtimeMs, size: stat.size, checkedAt: now(), conf });
    return conf;
  }

  return {
    async enabledMystExtensions(documentPath, workspaceRoot) {
      const directory = path.dirname(path.resolve(documentPath));
      const confPath = await findConf(directory, path.resolve(workspaceRoot));
      if (confPath === null) {
        return undefined;
      }
      const conf = await readConf(confPath);
      if (!conf || !conf.certain
        || !conf.extensions.some((name) => name === "myst_parser" || name === "myst_nb")) {
        return undefined;
      }
      return new Set(conf.mystExtensions);
    },
    async locate(documentPath, workspaceRoot) {
      return (await findConf(path.dirname(path.resolve(documentPath)), path.resolve(workspaceRoot))) ?? undefined;
    },
    invalidate() {
      generation += 1;
      directories.clear();
      files.clear();
    },
  };
}

let shared: { files: ConfFiles; locator: ConfLocator } | undefined;

/** The shared (cached) locator of `files`; a host has one file system, so one locator lives. */
function sharedLocator(files: ConfFiles): ConfLocator {
  if (shared?.files !== files) shared = { files, locator: createConfLocator({ files }) };
  return shared.locator;
}

/** The enabled MyST extensions for a document, from the shared (cached) lookup. */
export function enabledMystExtensionsFor(
  files: ConfFiles,
  documentPath: string,
  workspaceRoot: string,
): Promise<ReadonlySet<string> | undefined> {
  return sharedLocator(files).enabledMystExtensions(documentPath, workspaceRoot);
}

/** The `conf.py` that governs a document, from the shared (cached) lookup. */
export function locateConfFor(
  files: ConfFiles,
  documentPath: string,
  workspaceRoot: string,
): Promise<string | undefined> {
  return sharedLocator(files).locate(documentPath, workspaceRoot);
}

/** Drops every cached lookup; called when a `conf.py` is created, changed or deleted. */
export function invalidateConfCache(): void {
  shared?.locator.invalidate();
}
