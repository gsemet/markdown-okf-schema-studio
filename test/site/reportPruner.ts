/**
 * Prunes old e2e run folders under `out/reports`: keeps the latest N per kind (folder prefix),
 * never the folders a LATEST pointer names, never a folder that holds a git-tracked file, never a
 * folder modified in the last 15 minutes (a suite may still write it), and
 * never anything outside `out/reports` (symlinks included).
 */
import * as fs from "node:fs";
import * as path from "node:path";

export const DEFAULT_KEEP = 5;

/** A run folder modified within this window may belong to a suite that is still writing it. */
export const RECENT_PROTECTION_MS = 15 * 60 * 1000;

/** The run folders of the real-window suites: `<kind>-<random suffix>`. */
export const RUN_FOLDER_PATTERN = /^(checkbox-e2e|frontmatter-e2e|real-input|reload-e2e|scroll-e2e|standalone-e2e|untrusted-e2e)-[A-Za-z0-9_]+$/u;

export interface PruneOptions {
  /** `<repo>/out/reports`. */
  readonly reportsRoot: string;
  /** Latest folders kept per kind. */
  readonly keep: number;
  /** Directories holding run folders; each must be inside `reportsRoot`. Default `e2e/screenshots`. */
  readonly scanDirs?: readonly string[];
  /** Absolute folders never removed (LATEST pointers). */
  readonly protectedPaths?: readonly string[];
  /** Absolute paths of git-tracked files: a folder holding one is never removed. */
  readonly trackedPaths?: readonly string[];
  /** Folders modified within this many ms are kept (default 15 minutes; 0 disables). */
  readonly recentMs?: number;
  /** Clock for the recent-folder rule (default `Date.now()`). */
  readonly now?: number;
}

export interface PruneKindPlan {
  readonly kind: string;
  readonly dir: string;
  readonly kept: readonly string[];
  /** Kept although outside the latest N (pointer, tracked file or modified in the last 15 minutes). */
  readonly protected: readonly string[];
  readonly removed: readonly string[];
}

function realOrSelf(target: string): string {
  try {
    return fs.realpathSync(target);
  } catch {
    return path.resolve(target);
  }
}

function isInside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

/** Throws unless `reportsRoot` is a directory named `reports` inside a directory named `out`. */
export function assertReportsRoot(reportsRoot: string): string {
  const resolved = realOrSelf(reportsRoot);
  if (path.basename(resolved) !== "reports" || path.basename(path.dirname(resolved)) !== "out") {
    throw new Error(`refusing to prune ${reportsRoot}: not an out/reports directory`);
  }
  return resolved;
}

function assertInsideReports(reportsRoot: string, target: string): string {
  const resolved = realOrSelf(target);
  if (!isInside(reportsRoot, resolved)) {
    throw new Error(`refusing to prune ${target}: outside ${reportsRoot}`);
  }
  return resolved;
}

function kindOf(name: string): string {
  return RUN_FOLDER_PATTERN.exec(name)![1]!;
}

export function planPrune(options: PruneOptions): PruneKindPlan[] {
  if (!Number.isInteger(options.keep) || options.keep < 1) throw new Error("keep must be an integer >= 1");
  const root = assertReportsRoot(options.reportsRoot);
  const scanDirs = (options.scanDirs ?? [path.join(options.reportsRoot, "e2e", "screenshots")])
    .map((dir) => assertInsideReports(root, dir));
  const protectedSet = new Set((options.protectedPaths ?? []).map((entry) => realOrSelf(entry)));
  const tracked = (options.trackedPaths ?? []).map((entry) => realOrSelf(entry));
  const recentSince = (options.now ?? Date.now()) - (options.recentMs ?? RECENT_PROTECTION_MS);
  const plans: PruneKindPlan[] = [];
  for (const dir of scanDirs) {
    if (!fs.existsSync(dir)) continue;
    const byKind = new Map<string, { name: string; mtime: number }[]>();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      // Symlinks and files are never run folders for the pruner.
      if (!entry.isDirectory() || !RUN_FOLDER_PATTERN.test(entry.name)) continue;
      const full = path.join(dir, entry.name);
      const list = byKind.get(kindOf(entry.name)) ?? [];
      list.push({ name: entry.name, mtime: fs.statSync(full).mtimeMs });
      byKind.set(kindOf(entry.name), list);
    }
    for (const [kind, folders] of [...byKind.entries()].sort(([first], [second]) => first.localeCompare(second))) {
      folders.sort((first, second) => second.mtime - first.mtime || second.name.localeCompare(first.name));
      const kept: string[] = [];
      const guarded: string[] = [];
      const removed: string[] = [];
      for (const [position, folder] of folders.entries()) {
        const full = path.join(dir, folder.name);
        if (position < options.keep) kept.push(folder.name);
        else if (
          folder.mtime > recentSince
          || protectedSet.has(realOrSelf(full))
          || tracked.some((file) => isInside(full, file))
        ) {
          kept.push(folder.name);
          guarded.push(folder.name);
        } else removed.push(folder.name);
      }
      plans.push({ kind, dir, kept, protected: guarded, removed });
    }
  }
  return plans;
}

/** Deletes the planned folders (re-checks each one is a real directory inside `out/reports`). */
export function applyPrune(plans: readonly PruneKindPlan[], reportsRoot: string): number {
  const root = assertReportsRoot(reportsRoot);
  let removed = 0;
  for (const plan of plans) {
    for (const name of plan.removed) {
      const full = path.join(plan.dir, name);
      let stat: fs.Stats;
      try {
        stat = fs.lstatSync(full);
      } catch (error) {
        // Already gone (a concurrent prune): nothing to do, go on with the rest.
        if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
        throw error;
      }
      if (!stat.isDirectory() || stat.isSymbolicLink() || !RUN_FOLDER_PATTERN.test(name)) continue;
      assertInsideReports(root, full);
      fs.rmSync(full, { recursive: true, force: true });
      removed += 1;
    }
  }
  return removed;
}

/** Run folders named by the LATEST pointer files under `out/reports/e2e` (and its `screenshots`). */
export function pointerProtectedFolders(reportsRoot: string): string[] {
  const protectedFolders = new Set<string>();
  for (const dir of [path.join(reportsRoot, "e2e"), path.join(reportsRoot, "e2e", "screenshots")]) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile() || !/LATEST\.md$/u.test(entry.name)) continue;
      const content = fs.readFileSync(path.join(dir, entry.name), "utf8");
      for (const match of content.matchAll(/\]\(([^)]+)\)/gu)) {
        const target = match[1]!;
        if (/^[a-z]+:/iu.test(target)) continue;
        protectedFolders.add(path.resolve(dir, path.dirname(target)));
      }
    }
  }
  return [...protectedFolders];
}
