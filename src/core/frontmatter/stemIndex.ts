import * as fs from "node:fs";
import * as path from "node:path";

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

function canonicalRoot(candidate: string): string {
  const resolved = path.resolve(candidate);
  try {
    return fs.realpathSync(resolved);
  } catch {
    return resolved;
  }
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

/** An eagerly-built index of Markdown filename stems under one root set. */
export class MarkdownStemIndex {
  readonly roots: readonly string[];

  private readonly candidatesByStem = new Map<string, { path: string; root: string }[]>();
  private readonly pathsByStem = new Map<string, string[]>();

  constructor(roots: readonly string[]) {
    this.roots = [...new Set(roots.map(canonicalRoot))];
    this.build();
  }

  get(stem: string): readonly string[] {
    return this.lookup(stem).paths;
  }

  /** Returns the indexed stems, sorted, at most `limit` (all by default). Read-only: no file system access. */
  stems(limit = Number.POSITIVE_INFINITY): string[] {
    const max = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : limit > 0 ? this.candidatesByStem.size : 0;
    return [...this.candidatesByStem.keys()].sort().slice(0, max);
  }

  /**
   * Returns the indexed stems closest to `directory` first, at most `limit`: the stems of that
   * folder, then by the number of folder steps to the file, then alphabetically. A stem found in
   * several folders counts once, at its closest folder. Read-only: no file system access.
   */
  // @implements_req SwRS-MDOKFSTUDIO-FMEDIT-010
  nearestStems(directory: string, limit: number): string[] {
    const max = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : limit > 0 ? this.candidatesByStem.size : 0;
    const from = canonicalRoot(directory);
    return [...this.candidatesByStem].map(([stem, candidates]) => ({
      stem,
      distance: Math.min(...candidates.map((candidate) => folderDistance(from, path.dirname(candidate.path)))),
    }))
      .sort((first, second) => first.distance - second.distance || byCodeUnit(first.stem, second.stem))
      .slice(0, max)
      .map((entry) => entry.stem);
  }

  pathsForStem(stem: string): readonly string[] {
    return this.get(stem);
  }

  lookup(stem: string): MarkdownStemLookup {
    const candidates = this.candidatesByStem.get(stem) ?? [];
    const matches: string[] = [];
    let escaped = false;
    let unavailable = false;
    for (const candidate of candidates) {
      try {
        const realPath = fs.realpathSync(candidate.path);
        if (!fs.statSync(realPath).isFile()) continue;
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

  private build(): void {
    for (const root of this.roots) {
      this.visit(root, root);
    }
  }

  // @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-055
  private visit(directory: string, realRoot: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const candidate = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (isExcludedDirectory(entry.name)) continue;
        this.visit(candidate, realRoot);
        continue;
      }
      const stem = path.basename(entry.name, ".md");
      if ((!entry.isFile() && !entry.isSymbolicLink())
        || path.extname(entry.name) !== ".md"
        || stem !== entry.name.slice(0, -3)) {
        continue;
      }
      const matches = this.candidatesByStem.get(stem) ?? [];
      matches.push({ path: candidate, root: realRoot });
      this.candidatesByStem.set(stem, matches);
    }
  }
}

interface CachedStemIndex {
  index: MarkdownStemIndex;
  revision: string;
}

const cachedIndexes = new Map<string, CachedStemIndex>();

function cacheKey(roots: readonly string[]): string {
  return [...new Set(roots.map(canonicalRoot))].sort().join("\u0000");
}

function rootRevision(roots: readonly string[]): string {
  return [...new Set(roots.map(canonicalRoot))].sort().map((root) => {
    try {
      const stat = fs.statSync(root);
      return `${root}:${stat.mtimeMs}:${stat.ctimeMs}:${stat.size}`;
    } catch {
      return `${root}:unavailable`;
    }
  }).join("\u0000");
}

export function getCachedMarkdownStemIndex(roots: readonly string[]): MarkdownStemIndex {
  const key = cacheKey(roots);
  const revision = rootRevision(roots);
  const cached = cachedIndexes.get(key);
  if (cached?.revision === revision) return cached.index;
  const index = new MarkdownStemIndex(roots);
  cachedIndexes.set(key, { index, revision });
  return index;
}

/** Invalidates cached indexes containing a root, or all cached indexes when omitted. */
export function invalidateStemIndex(root?: string): void {
  if (root === undefined) {
    cachedIndexes.clear();
    return;
  }
  const canonical = canonicalRoot(root);
  for (const [key, cached] of cachedIndexes) {
    if (cached.index.roots.includes(canonical)) cachedIndexes.delete(key);
  }
}
