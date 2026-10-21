import { execFileSync } from "node:child_process";
import * as path from "node:path";
import { EXTENSION_ROOT, REPORTS_ROOT } from "../reportPaths";
import { DEFAULT_KEEP, applyPrune, planPrune, pointerProtectedFolders, type PruneKindPlan } from "./reportPruner";

type GitRunner = (args: readonly string[]) => string;

const runGit: GitRunner = (args) => execFileSync("git", [...args], { cwd: EXTENSION_ROOT, encoding: "utf8" });

/**
 * Git-tracked files under `out/reports`. When git fails the tracked-file guard cannot work: warn
 * and throw, so nothing is pruned (an empty list would silently switch the guard off).
 */
export function trackedReportFiles(git: GitRunner = runGit): string[] {
  try {
    const output = git(["ls-files", "-z", "--", "out/reports"]);
    return output.split("\0").filter(Boolean).map((file) => path.join(EXTENSION_ROOT, file));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`git ls-files failed (${reason}): refusing to prune, tracked report files cannot be protected.`);
    throw new Error(`refusing to prune: git ls-files failed (${reason})`);
  }
}

/** The automatic call of `review:finish` never keeps fewer than two runs per kind. */
export const AUTOMATIC_MIN_KEEP = 2;

export function automaticKeep(environment: NodeJS.ProcessEnv = process.env): number {
  return Math.max(AUTOMATIC_MIN_KEEP, keepFromArguments([], environment));
}

/** Keep count: `--keep N`, else `STUDIO_E2E_KEEP_RUNS`, else 5. */
export function keepFromArguments(argv: readonly string[], environment: NodeJS.ProcessEnv = process.env): number {
  const flag = argv.indexOf("--keep");
  const raw = flag >= 0 ? argv[flag + 1] : environment.STUDIO_E2E_KEEP_RUNS;
  const keep = raw === undefined || raw === "" ? DEFAULT_KEEP : Number(raw);
  if (!Number.isInteger(keep) || keep < 1) throw new Error(`invalid keep count: ${raw}`);
  return keep;
}

export function pruneReports(keep: number, dryRun: boolean): PruneKindPlan[] {
  const plans = planPrune({
    reportsRoot: REPORTS_ROOT,
    keep,
    protectedPaths: pointerProtectedFolders(REPORTS_ROOT),
    trackedPaths: trackedReportFiles(),
  });
  const verb = dryRun ? "would remove" : "removed";
  for (const plan of plans) {
    console.log(`${plan.kind}: keep ${plan.kept.length} (${plan.protected.length} protected), ${verb} ${plan.removed.length}`);
  }
  if (!dryRun) applyPrune(plans, REPORTS_ROOT);
  const total = plans.reduce((count, plan) => count + plan.removed.length, 0);
  console.log(`${dryRun ? "Dry run: nothing deleted. Would remove" : "Removed"} ${total} old run folders under out/reports (keep ${keep} per kind).`);
  return plans;
}

if (require.main === module) {
  try {
    pruneReports(keepFromArguments(process.argv.slice(2)), process.argv.includes("--dry-run"));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
