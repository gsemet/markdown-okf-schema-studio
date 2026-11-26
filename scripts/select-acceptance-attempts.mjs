// Keeps, for each e2e group, the reports of the newest attempt of its acceptance shard. `just
// ci-report` calls it before `e2e-campaign.mjs report`.
//
//   node scripts/select-acceptance-attempts.mjs
//
// The CI report job downloads every `e2e-acceptance-<group>-attempt-<n>` artifact into its own
// folder of out/ci-artifacts/acceptance/ (never merged: "Re-run failed jobs" leaves several
// attempts of a group). download-artifact extracts a single matching artifact straight into that
// folder instead. Both layouts are read, and each group's acceptance/<group>/ folder replaces
// out/reports/acceptance/<group>/. The newest attempt wins even when it holds no report: an older
// attempt never stands in for it, and the report then fails on the missing group. Without any
// download (a local ci-report) nothing changes.
import { cpSync, existsSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";

const downloads = path.join(process.cwd(), "out", "ci-artifacts", "acceptance");
const reports = path.join(process.cwd(), "out", "reports", "acceptance");
const ARTIFACT = /^e2e-acceptance-(?<group>[a-z0-9-]+)-attempt-(?<attempt>\d+)$/u;

function folders(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

// @implements_req SwRS-MDOKFSTUDIO-CORE-076
/** Where each group's reports come from. */
function newestAttempts() {
  const newest = new Map();
  for (const name of folders(downloads)) {
    const artifact = ARTIFACT.exec(name)?.groups;
    if (!artifact) continue;
    const attempt = Number(artifact.attempt);
    if (newest.has(artifact.group) && newest.get(artifact.group).attempt > attempt) continue;
    newest.set(artifact.group, {
      group: artifact.group,
      attempt,
      source: path.join(downloads, name, "acceptance", artifact.group),
      origin: `attempt ${attempt} (${name})`,
    });
  }
  if (newest.size > 0) return [...newest.values()];
  const single = path.join(downloads, "acceptance");
  return folders(single).map((group) => ({ group, source: path.join(single, group), origin: "the only downloaded artifact" }));
}

const selected = newestAttempts();
if (selected.length === 0) console.log("acceptance: no downloaded artifact to select from");
for (const { group, source, origin } of selected) {
  const destination = path.join(reports, group);
  rmSync(destination, { recursive: true, force: true });
  if (!existsSync(source)) {
    console.log(`acceptance ${group}: ${origin} holds no report of the group`);
    continue;
  }
  cpSync(source, destination, { recursive: true });
  console.log(`acceptance ${group}: kept ${origin}`);
}
