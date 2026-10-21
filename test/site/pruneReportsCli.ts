import { execFileSync } from "node:child_process";
import * as path from "node:path";
import { EXTENSION_ROOT, REPORTS_ROOT } from "../reportPaths";
import { DEFAULT_KEEP, applyPrune, planPrune, pointerProtectedFolders, type PruneKindPlan } from "./reportPruner";

export function trackedReportFiles(): string[] {
  try {
    const output = execFileSync("git", ["ls-files", "-z", "--", "out/reports"], { cwd: EXTENSION_ROOT, encoding: "utf8" });
    return output.split("\0").filter(Boolean).map((file) => path.join(EXTENSION_ROOT, file));
  } catch {
    return [];
  }
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
