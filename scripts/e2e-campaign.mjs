// Gives each standalone CI stage (ci-visual, ci-integration, ci-acceptance) its own campaign
// identity and merges their manifests (ci-report).
//
//   eval "$(node scripts/e2e-campaign.mjs begin visual)"   exports STUDIO_E2E_* for the stage and
//                                                          writes out/reports/e2e/campaign-visual.json
//   node scripts/e2e-campaign.mjs report                   writes e2e-manifest.json, tests-e2e.xml and
//                                                          out/reports/acceptance/acceptance-manifest.json
//   node scripts/e2e-campaign.mjs report --visual-only     the same for the visual stage alone: the
//                                                          real VS Code stages (integration,
//                                                          acceptance) did not run, which the
//                                                          manifest records as skipped
//
// The stages share a run id, never a start time: each records its real start, and the report
// validates every stage against its own identity. A stage always records a fresh start time and
// deletes its previous manifests, so old evidence is never validated. The run id is, in order of
// precedence: STUDIO_E2E_RUN_ID (the CI workflow sets it once per run), the stage's own campaign
// file or another stage's, each only when it started less than two hours ago, then a new random
// id. `ci-report` fails when the visual and integration stages started further apart than that,
// except when both carry the same run id pinned by STUDIO_E2E_RUN_ID (recorded as `pinnedRunId`):
// the CI workflow pins its run id, which "Re-run failed jobs" keeps, so integration re-run hours
// after visual is still the same campaign. `just clean` resets all.
//
// The acceptance stage runs one shard per e2e group. Each group manifest carries its own campaign
// identity, which the report reads from there only (a CI report job has no campaign-acceptance.json);
// the same two rules apply to it, against the visual campaign.
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { writeJUnit } from "./run-e2e.mjs";

const reportRoot = path.join(process.cwd(), "out", "reports", "e2e");
const acceptanceRoot = path.join(process.cwd(), "out", "reports", "acceptance");
const acceptanceSources = path.join(process.cwd(), "test", "integration", "acceptance");
const stageNames = ["visual", "integration", "acceptance"];
// The stages whose campaign file `report` reads.
const reportedCampaigns = ["visual", "integration"];
const maxCampaignAgeMs = 2 * 60 * 60 * 1000;
const groupManifest = (group) => path.join(acceptanceRoot, group, "acceptance-manifest.json");
const mergedAcceptance = path.join(acceptanceRoot, "acceptance-manifest.json");
const campaignPath = (stage) => path.join(reportRoot, `campaign-${stage}.json`);

function groupFolders() {
  if (!existsSync(acceptanceRoot)) return [];
  return readdirSync(acceptanceRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

/** The evidence a new start of the stage invalidates. */
function stageManifests(stage) {
  if (stage === "visual") return [path.join(reportRoot, "screenshots", "run-manifest.json")];
  if (stage === "integration") return [path.join(reportRoot, "integration-manifest.json")];
  return [mergedAcceptance, ...groupFolders().map(groupManifest)];
}

function readJson(file) {
  try {
    return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : undefined;
  } catch {
    return undefined;
  }
}

function validCampaign(value) {
  return value && typeof value.runId === "string" && typeof value.startedAt === "string" && typeof value.command === "string"
    ? value
    : undefined;
}

function recent(campaign, now) {
  const age = now - Date.parse(campaign?.startedAt);
  return campaign && age >= 0 && age < maxCampaignAgeMs ? campaign : undefined;
}

function begin(stage) {
  if (!stageNames.includes(stage)) {
    throw new Error(`unknown stage "${stage}"; expected ${stageNames.slice(0, -1).join(", ")} or ${stageNames.at(-1)}`);
  }
  const now = Date.now();
  const own = recent(validCampaign(readJson(campaignPath(stage))), now);
  const other = stageNames.filter((name) => name !== stage)
    .map((name) => recent(validCampaign(readJson(campaignPath(name))), now))
    .find(Boolean);
  const pinned = Boolean(process.env.STUDIO_E2E_RUN_ID);
  const runId = process.env.STUDIO_E2E_RUN_ID || own?.runId || other?.runId || randomUUID();
  const campaign = {
    runId,
    startedAt: new Date(now).toISOString(),
    command: process.env.STUDIO_E2E_COMMAND || `just ci-${stage}`,
    ...(pinned ? { pinnedRunId: true } : {}),
  };
  // A new start invalidates this stage's previous evidence and the merged outputs built from it.
  for (const stale of [...stageManifests(stage), path.join(reportRoot, "review.json"), path.join(reportRoot, "e2e-manifest.json")]) {
    rmSync(stale, { force: true });
  }
  mkdirSync(reportRoot, { recursive: true });
  writeFileSync(campaignPath(stage), `${JSON.stringify(campaign, null, 2)}\n`);
  const quote = (value) => `'${String(value).replaceAll("'", "'\\''")}'`;
  console.log(`export STUDIO_E2E_RUN_ID=${quote(campaign.runId)}`);
  console.log(`export STUDIO_E2E_STARTED_AT=${quote(campaign.startedAt)}`);
  console.log(`export STUDIO_E2E_COMMAND=${quote(campaign.command)}`);
}

// @implements_req SwRS-MDOKFSTUDIO-CORE-076
function failureText(failure) {
  if (typeof failure === "string") return failure;
  if (failure && typeof failure === "object" && "page" in failure) return `${failure.page}: ${failure.detail}`;
  return JSON.stringify(failure);
}

function stageFrom(name, command, manifest, missing, campaign) {
  const now = new Date().toISOString();
  if (!manifest) {
    return { name, command, status: "failed", exitCode: 1, startedAt: campaign.startedAt, completedAt: now, error: missing };
  }
  const passed = manifest.status === "passed";
  return {
    name,
    command,
    status: passed ? "passed" : "failed",
    exitCode: passed ? 0 : 1,
    startedAt: manifest.startedAt ?? campaign.startedAt,
    completedAt: manifest.completedAt ?? now,
    error: passed ? undefined : (manifest.error ?? (manifest.failures?.length ? manifest.failures.map(failureText).join("; ") : `${name} manifest status is ${manifest.status}`)),
  };
}

/** The groups that must report: those with an acceptance file in this checkout, the CI matrix. */
function expectedGroups() {
  if (!existsSync(acceptanceSources)) return [];
  const files = readdirSync(acceptanceSources).filter((name) => name.endsWith(".acceptance.ts"));
  return [...new Set(files.map((name) => name.split(".")[0]))].sort();
}

/** What is wrong with the manifest of one group, or undefined. */
function groupProblem(manifest, visualCampaign, integrationCampaign) {
  if (!manifest) return "its manifest is missing (ci-acceptance did not run for it or its reports were not downloaded)";
  if (manifest.status !== "passed") {
    const failed = (manifest.launches ?? []).filter((launch) => launch.status !== "passed").map((launch) => launch.file);
    return `its manifest status is ${manifest.status}${failed.length > 0 ? ` (${failed.join(", ")})` : ""}`;
  }
  const samePinnedRun = [visualCampaign, integrationCampaign, manifest]
    .every((identity) => identity.pinnedRunId === true && identity.runId === visualCampaign.runId);
  const gap = Math.abs(Date.parse(manifest.campaignStartedAt) - Date.parse(visualCampaign.startedAt));
  if (samePinnedRun || gap < maxCampaignAgeMs) return undefined;
  return `it belongs to another campaign (run id ${manifest.runId}, started ${manifest.campaignStartedAt}); rerun the stages after \`just clean\``;
}

// @implements_req SwRS-MDOKFSTUDIO-CORE-076
/** The acceptance stage of the report, and the merged manifest of its groups. */
function acceptanceStage(visualCampaign, integrationCampaign, campaign) {
  const groups = expectedGroups().map((group) => {
    const manifest = readJson(groupManifest(group));
    const problem = groupProblem(manifest, visualCampaign, integrationCampaign);
    return { ...manifest, scope: group, status: problem ? "failed" : "passed", ...(problem ? { error: problem } : {}) };
  });
  const error = groups.length === 0
    ? "no acceptance file under test/integration/acceptance/"
    : groups.filter((group) => group.error).map((group) => `${group.scope}: ${group.error}`).join("; ");
  const status = error ? "failed" : "passed";
  const startedAt = groups.map((group) => group.startedAt).filter(Boolean).sort()[0] ?? campaign.startedAt;
  const completedAt = groups.map((group) => group.completedAt).filter(Boolean).sort().at(-1) ?? new Date().toISOString();
  mkdirSync(acceptanceRoot, { recursive: true });
  writeFileSync(mergedAcceptance, `${JSON.stringify({ status, runId: campaign.runId, startedAt, completedAt, groups }, null, 2)}\n`);
  return {
    name: "acceptance", command: "just ci-acceptance", status, exitCode: error ? 1 : 0,
    startedAt, completedAt, error: error || undefined,
  };
}

/**
 * The pull request path of CI runs only the simulated stages (static, visual); the real VS Code
 * stages are manual jobs. `--visual-only` reports that path: only the visual stage and the review
 * index are required, and the integration and acceptance stages are listed as skipped, never as
 * passed.
 */
function reportVisualOnly() {
  const visualCampaign = validCampaign(readJson(campaignPath("visual")));
  if (!visualCampaign) {
    console.error("ci-report: no campaign identity for visual; run ci-visual first");
    process.exitCode = 1;
    return;
  }
  const visual = readJson(path.join(reportRoot, "screenshots", "run-manifest.json"));
  const review = readJson(path.join(reportRoot, "review.json"));
  const stages = [
    stageFrom("visual", "just ci-visual", visual, "visual manifest is missing (ci-visual did not run or its reports were not downloaded)", visualCampaign),
    stageFrom("review-index", "npm run review:finish -- --visual-only", review, "review.json is missing (review:finish did not run)", visualCampaign),
  ];
  for (const stage of stages) {
    console.log(`${stage.status === "passed" ? "ok    " : "FAILED"} ${stage.name}${stage.error ? `: ${stage.error}` : ""}`);
  }
  const skipped = ["integration", "acceptance"];
  for (const name of skipped) console.log(`skipped ${name}: the real VS Code stage did not run (manual heavy CI job)`);
  const status = stages.every((stage) => stage.status === "passed") ? "passed" : "failed";
  writeFileSync(path.join(reportRoot, "e2e-manifest.json"), JSON.stringify({
    status,
    command: visualCampaign.command,
    runId: visualCampaign.runId,
    startedAt: visualCampaign.startedAt,
    completedAt: new Date().toISOString(),
    stages,
    skipped,
  }, null, 2) + "\n");
  writeJUnit(stages);
  if (status !== "passed") process.exitCode = 1;
}

function report() {
  if (process.argv.includes("--visual-only")) {
    reportVisualOnly();
    return;
  }
  const visualCampaign = validCampaign(readJson(campaignPath("visual")));
  const integrationCampaign = validCampaign(readJson(campaignPath("integration")));
  const missing = reportedCampaigns.filter((name) => !validCampaign(readJson(campaignPath(name))));
  if (missing.length > 0) {
    console.error(`ci-report: no campaign identity for ${missing.join(" and ")}; run ci-${missing.join(" and ci-")} first`);
    process.exitCode = 1;
    return;
  }
  const gap = Math.abs(Date.parse(visualCampaign.startedAt) - Date.parse(integrationCampaign.startedAt));
  const sameCiRun = visualCampaign.pinnedRunId === true && integrationCampaign.pinnedRunId === true
    && visualCampaign.runId === integrationCampaign.runId;
  if (Number.isNaN(gap) || (!sameCiRun && !(gap < maxCampaignAgeMs))) {
    console.error(`ci-report: the visual and integration stages started ${Math.round(gap / 60000)} minutes apart (limit ${maxCampaignAgeMs / 60000}); rerun both after \`just clean\``);
    process.exitCode = 1;
    return;
  }
  const campaign = {
    runId: integrationCampaign.runId,
    startedAt: [visualCampaign.startedAt, integrationCampaign.startedAt].sort()[0],
    command: integrationCampaign.command,
  };
  const visual = readJson(path.join(reportRoot, "screenshots", "run-manifest.json"));
  const integration = readJson(path.join(reportRoot, "integration-manifest.json"));
  const review = readJson(path.join(reportRoot, "review.json"));
  const stages = [
    stageFrom("visual", "just ci-visual", visual, "visual manifest is missing (ci-visual did not run or its reports were not downloaded)", visualCampaign),
    stageFrom("integration", "just ci-integration", integration, "integration manifest is missing (ci-integration did not run or its reports were not downloaded)", integrationCampaign),
    acceptanceStage(visualCampaign, integrationCampaign, campaign),
    stageFrom("review-index", "npm run review:finish", review, "review.json is missing (review:finish did not run)", campaign),
  ];
  for (const stage of stages) {
    console.log(`${stage.status === "passed" ? "ok    " : "FAILED"} ${stage.name}${stage.error ? `: ${stage.error}` : ""}`);
  }
  const status = stages.every((stage) => stage.status === "passed") ? "passed" : "failed";
  writeFileSync(path.join(reportRoot, "e2e-manifest.json"), JSON.stringify({
    status,
    command: campaign.command,
    runId: campaign.runId,
    startedAt: campaign.startedAt,
    completedAt: new Date().toISOString(),
    stages,
  }, null, 2) + "\n");
  writeJUnit(stages);
  if (status !== "passed") process.exitCode = 1;
}

const mode = process.argv[2];
if (mode === "begin") begin(process.argv[3]);
else if (mode === "report") report();
else {
  console.error("usage: e2e-campaign.mjs begin <visual|integration|acceptance>|report [--visual-only]");
  process.exitCode = 2;
}
