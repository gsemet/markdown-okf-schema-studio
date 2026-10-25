import * as fs from "node:fs";
import * as path from "node:path";

import { parseConf, type ParsedConf } from "./confParser";

/** How long a lookup stays trusted before the disk is checked again. */
export const CONF_RECHECK_MS = 2000;

/** Checked in the workspace root when no conf.py is found above the document (decision D29). */
const FALLBACK_CANDIDATES = [
  "docs/conf.py", "doc/conf.py", "sphinx/conf.py", "source/conf.py", "docs/source/conf.py",
];

export interface ConfLocatorOptions {
  now?: () => number;
  readFile?: (file: string) => string;
  statFile?: (file: string) => { mtimeMs: number; size: number } | undefined;
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

function defaultStat(file: string): { mtimeMs: number; size: number } | undefined {
  try {
    const stat = fs.statSync(file);
    return stat.isFile() ? { mtimeMs: stat.mtimeMs, size: stat.size } : undefined;
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
  enabledMystExtensions(documentPath: string, workspaceRoot: string): ReadonlySet<string> | undefined;
  /** The `conf.py` that governs the document (ancestor walk, then the D29 fallback), if any. */
  locate(documentPath: string, workspaceRoot: string): string | undefined;
  invalidate(): void;
}

export function createConfLocator(options: ConfLocatorOptions = {}): ConfLocator {
  const now = options.now ?? Date.now;
  const readFile = options.readFile ?? ((file: string): string => fs.readFileSync(file, "utf8"));
  const statFile = options.statFile ?? defaultStat;
  const directories = new Map<string, DirectoryEntry>();
  const files = new Map<string, FileEntry>();

  /** Common Sphinx source folders under the workspace root; exactly one candidate counts. */
  function findFallback(root: string): string | null {
    const found = FALLBACK_CANDIDATES
      .map((relative) => path.join(root, ...relative.split("/")))
      .filter((candidate) => statFile(candidate));
    return found.length === 1 ? found[0] : null;
  }

  // @implements_req SwRS-MDOKFSTUDIO-MYST-066
  function findConf(directory: string, root: string): string | null {
    const cached = directories.get(directory);
    if (cached && now() - cached.checkedAt < CONF_RECHECK_MS) {
      return cached.confPath;
    }
    let confPath: string | null = null;
    // A document outside the workspace folder only looks at its own folder.
    const limit = isInside(root, directory) ? root : directory;
    for (let current = directory; ; current = path.dirname(current)) {
      const candidate = path.join(current, "conf.py");
      if (statFile(candidate)) {
        confPath = candidate;
        break;
      }
      if (current === limit || path.dirname(current) === current) {
        break;
      }
    }
    if (confPath === null && isInside(root, directory)) {
      confPath = findFallback(root);
    }
    directories.set(directory, { confPath, checkedAt: now() });
    return confPath;
  }

  function readConf(confPath: string): ParsedConf | undefined {
    const cached = files.get(confPath);
    if (cached && now() - cached.checkedAt < CONF_RECHECK_MS) {
      return cached.conf;
    }
    const stat = statFile(confPath);
    if (!stat) {
      files.delete(confPath);
      return undefined;
    }
    if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
      cached.checkedAt = now();
      return cached.conf;
    }
    let conf: ParsedConf;
    try {
      conf = parseConf(readFile(confPath));
    } catch {
      conf = { extensions: [], mystExtensions: [], certain: false };
    }
    files.set(confPath, { mtimeMs: stat.mtimeMs, size: stat.size, checkedAt: now(), conf });
    return conf;
  }

  return {
    enabledMystExtensions(documentPath, workspaceRoot) {
      const directory = path.dirname(path.resolve(documentPath));
      const confPath = findConf(directory, path.resolve(workspaceRoot));
      if (confPath === null) {
        return undefined;
      }
      const conf = readConf(confPath);
      if (!conf || !conf.certain
        || !conf.extensions.some((name) => name === "myst_parser" || name === "myst_nb")) {
        return undefined;
      }
      return new Set(conf.mystExtensions);
    },
    locate(documentPath, workspaceRoot) {
      return findConf(path.dirname(path.resolve(documentPath)), path.resolve(workspaceRoot)) ?? undefined;
    },
    invalidate() {
      directories.clear();
      files.clear();
    },
  };
}

const sharedLocator = createConfLocator();

/** The enabled MyST extensions for a document, from the shared (cached) lookup. */
export function enabledMystExtensionsFor(
  documentPath: string,
  workspaceRoot: string,
): ReadonlySet<string> | undefined {
  return sharedLocator.enabledMystExtensions(documentPath, workspaceRoot);
}

/** The `conf.py` that governs a document, from the shared (cached) lookup. */
export function locateConfFor(documentPath: string, workspaceRoot: string): string | undefined {
  return sharedLocator.locate(documentPath, workspaceRoot);
}

/** Drops every cached lookup; called when a `conf.py` is created, changed or deleted. */
export function invalidateConfCache(): void {
  sharedLocator.invalidate();
}
