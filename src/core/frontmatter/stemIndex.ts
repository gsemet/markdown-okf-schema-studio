import * as path from "../path/hostPath";
import type { LinkFiles } from "./linkFiles";

const EXCLUDED_DIRECTORY_NAMES = new Set([
  "node_modules",
  ".git",
  "_build",
  ".venv",
  "out",
  "dist",
  "output",
]);

export interface MarkdownStemLookup {
  paths: readonly string[];
  escaped: boolean;
  unavailable: boolean;
}

async function canonicalRoot(files: LinkFiles, candidate: string): Promise<string> {
  const resolved = path.resolve(candidate);
  try {
    return await files.realpath(resolved);
  } catch {
    return resolved;
  }
}

async function canonicalRoots(files: LinkFiles, roots: readonly string[]): Promise<string[]> {
  return [...new Set(await Promise.all(roots.map((root) => canonicalRoot(files, root))))];
}

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

/** The number of folder steps between two folders (0 for the same folder). */
function folderDistance(from: string, to: string): number {
  const relative = path.relative(from, to);
  if (relative === "") return 0;
  return path.isAbsolute(relative) ? Number.MAX_SAFE_INTEGER : relative.split(path.sep).length;
}

function byCodeUnit(first: string, second: string): number {
  return first < second ? -1 : first > second ? 1 : 0;
}

function isExcludedDirectory(name: string): boolean {
  return name.startsWith(".") || EXCLUDED_DIRECTORY_NAMES.has(name);
}

/** An index of Markdown filename stems under one root set, built once by {@link MarkdownStemIndex.build}. */
export class MarkdownStemIndex {
  readonly roots: readonly string[];

  private readonly candidatesByStem = new Map<string, { path: string; root: string }[]>();
  private readonly pathsByStem = new Map<string, string[]>();

  private constructor(roots: readonly string[]) {
    this.roots = roots;
  }

  /** Walks the roots through `files` (awaiting each folder, so the event loop is never blocked) and indexes the stems. */
  static async build(files: LinkFiles, roots: readonly string[]): Promise<MarkdownStemIndex> {
    const index = new MarkdownStemIndex(await canonicalRoots(files, roots));
    for (const root of index.roots) {
      await index.visit(files, root, root);
    }
    return index;
  }

  async get(files: LinkFiles, stem: string): Promise<readonly string[]> {
    return (await this.lookup(files, stem)).paths;
  }

  /** Returns the indexed stems, sorted, at most `limit` (all by default). Read-only: no file system access. */
  stems(limit = Number.POSITIVE_INFINITY): string[] {
    const max = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : limit > 0 ? this.candidatesByStem.size : 0;
    return [...this.candidatesByStem.keys()].sort().slice(0, max);
  }

  /**
   * Returns the indexed stems closest to `directory` first, at most `limit`: the stems of that
   * folder, then by the number of folder steps to the file, then alphabetically. A stem found in
   * several folders counts once, at its closest folder. Only `directory` itself is resolved
   * through `files`.
   */
  // @implements_req SwRS-MDOKFSTUDIO-FMEDIT-010
  async nearestStems(files: LinkFiles, directory: string, limit: number): Promise<string[]> {
    const max = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : limit > 0 ? this.candidatesByStem.size : 0;
    const from = await canonicalRoot(files, directory);
    return [...this.candidatesByStem].map(([stem, candidates]) => ({
      stem,
      distance: Math.min(...candidates.map((candidate) => folderDistance(from, path.dirname(candidate.path)))),
    }))
      .sort((first, second) => first.distance - second.distance || byCodeUnit(first.stem, second.stem))
      .slice(0, max)
      .map((entry) => entry.stem);
  }

  async pathsForStem(files: LinkFiles, stem: string): Promise<readonly string[]> {
    return this.get(files, stem);
  }

  async lookup(files: LinkFiles, stem: string): Promise<MarkdownStemLookup> {
    const candidates = this.candidatesByStem.get(stem) ?? [];
    const matches: string[] = [];
    let escaped = false;
    let unavailable = false;
    for (const candidate of candidates) {
      try {
        const realPath = await files.realpath(candidate.path);
        if ((await files.stat(realPath)).kind !== "file") continue;
        if (!isWithin(candidate.root, realPath)) {
          escaped = true;
          continue;
        }
        if (!matches.includes(realPath)) matches.push(realPath);
      } catch {
        unavailable = true;
      }
    }
    this.pathsByStem.set(stem, matches);
    return {
      paths: matches,
      escaped,
      unavailable,
    };
  }

  // @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-055
  private async visit(files: LinkFiles, directory: string, realRoot: string): Promise<void> {
    let entries: Awaited<ReturnType<LinkFiles["readDirectory"]>>;
    try {
      entries = await files.readDirectory(directory);
    } catch {
      return;
    }
    for (const [name, kind] of entries) {
      const candidate = path.join(directory, name);
      if (kind === "directory") {
        if (isExcludedDirectory(name)) continue;
        // The port reports a symbolic link to a folder as a folder: never descend into one.
        if (await files.isSymbolicLink(candidate)) continue;
        await this.visit(files, candidate, realRoot);
        continue;
      }
      const stem = path.basename(name, ".md");
      if (path.extname(name) !== ".md" || stem !== name.slice(0, -3)) continue;
      const matches = this.candidatesByStem.get(stem) ?? [];
      matches.push({ path: candidate, root: realRoot });
      this.candidatesByStem.set(stem, matches);
    }
  }
}

interface CachedStemIndex {
  promise: Promise<MarkdownStemIndex>;
  roots: readonly string[];
  revision: string;
}

const cachedIndexes = new Map<string, CachedStemIndex>();

/** Counts the invalidations: an index whose build an invalidation overtook is not served as fresh. */
let invalidationGeneration = 0;

async function rootRevision(files: LinkFiles, roots: readonly string[]): Promise<string> {
  const parts = await Promise.all(roots.map(async (root) => {
    try {
      const stat = await files.stat(root);
      return `${root}:${stat.mtimeMs ?? ""}:${stat.size}`;
    } catch {
      return `${root}:unavailable`;
    }
  }));
  return parts.join("\u0000");
}

/**
 * The stem index of a root set: built on first use, cached and shared by concurrent callers (one
 * walk, not one per caller). The cache is dropped by {@link invalidateStemIndex} (a watcher event)
 * or when the metadata of a root changes. It is not built ahead of the first request: the walk
 * awaits the port, so it never blocks the event loop, and a workspace that uses no stem link is
 * never walked.
 */
export async function getCachedMarkdownStemIndex(
  files: LinkFiles,
  roots: readonly string[],
): Promise<MarkdownStemIndex> {
  let index: MarkdownStemIndex | undefined;
  // One retry: an index whose build an invalidation overtook is discarded and rebuilt once.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const startedAt = invalidationGeneration;
    const canonical = (await canonicalRoots(files, roots)).sort();
    const key = canonical.join("\u0000");
    const revision = await rootRevision(files, canonical);
    let cached = cachedIndexes.get(key);
    if (cached?.revision !== revision) {
      const promise = MarkdownStemIndex.build(files, canonical);
      const entry: CachedStemIndex = { promise, roots: canonical, revision };
      cachedIndexes.set(key, entry);
      // A failed build is never kept.
      promise.catch(() => {
        if (cachedIndexes.get(key) === entry) cachedIndexes.delete(key);
      });
      cached = entry;
    }
    index = await cached.promise;
    if (cachedIndexes.get(key) === cached || startedAt === invalidationGeneration) return index;
  }
  return index as MarkdownStemIndex;
}

/**
 * Invalidates the cached indexes containing a root (the canonical path of the watched folder), or
 * all of them when omitted. Synchronous: a build in flight finishes but is never served as fresh.
 */
export function invalidateStemIndex(root?: string): void {
  invalidationGeneration += 1;
  if (root === undefined) {
    cachedIndexes.clear();
    return;
  }
  const resolved = path.resolve(root);
  for (const [key, cached] of cachedIndexes) {
    if (cached.roots.includes(resolved)) cachedIndexes.delete(key);
  }
}
