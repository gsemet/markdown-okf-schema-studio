// Gives each standalone CI stage (ci-visual, ci-integration) its own campaign identity and merges
// their manifests (ci-report).
//
//   eval "$(node scripts/e2e-campaign.mjs begin visual)"   exports STUDIO_E2E_* for the stage and
//                                                          writes out/reports/e2e/campaign-visual.json
//   node scripts/e2e-campaign.mjs report                   writes e2e-manifest.json and tests-e2e.xml
//   node scripts/e2e-campaign.mjs report --visual-only     the same for the visual stage alone: the
//                                                          real VS Code stage (integration) did not
//                                                          run, which the manifest records as skipped
//
// Both stages share a run id, never a start time: each records its real start, and the report
// validates every stage against its own identity. A stage always records a fresh start time and
// deletes its previous manifest, so old evidence is never validated. The run id is, in order of
// precedence: STUDIO_E2E_RUN_ID (the CI workflow sets it once per run), the stage's own campaign
// file or the other stage's, each only when it started less than two hours ago, then a new random
// id. `ci-report` fails when the two stages started further apart than that. `just clean` resets all.
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { writeJUnit } from "./run-e2e.mjs";

const reportRoot = path.join(process.cwd(), "out", "reports", "e2e");
const stageNames = ["visual", "integration"];
const maxCampaignAgeMs = 2 * 60 * 60 * 1000;
const stageManifest = {
  visual: path.join(reportRoot, "screenshots", "run-manifest.json"),
  integration: path.join(reportRoot, "integration-manifest.json"),
};
const campaignPath = (stage) => path.join(reportRoot, `campaign-${stage}.json`);

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
  if (!stageNames.includes(stage)) throw new Error(`unknown stage "${stage}"; expected ${stageNames.join(" or ")}`);
  const sibling = stageNames.find((name) => name !== stage);
  const now = Date.now();
  const own = recent(validCampaign(readJson(campaignPath(stage))), now);
  const other = recent(validCampaign(readJson(campaignPath(sibling))), now);
  const runId = process.env.STUDIO_E2E_RUN_ID || own?.runId || other?.runId || randomUUID();
  const campaign = {
    runId,
    startedAt: new Date(now).toISOString(),
    command: process.env.STUDIO_E2E_COMMAND || `just ci-${stage}`,
  };
  // A new start invalidates this stage's previous evidence and the merged outputs built from it.
  for (const stale of [stageManifest[stage], path.join(reportRoot, "review.json"), path.join(reportRoot, "e2e-manifest.json")]) {
    rmSync(stale, { force: true });
  }
  mkdirSync(reportRoot, { recursive: true });
  writeFileSync(campaignPath(stage), `${JSON.stringify(campaign, null, 2)}\n`);
  const quote = (value) => `'${String(value).replaceAll("'", "'\\''")}'`;
  console.log(`export STUDIO_E2E_RUN_ID=${quote(campaign.runId)}`);
  console.log(`export STUDIO_E2E_STARTED_AT=${quote(campaign.startedAt)}`);
  console.log(`export STUDIO_E2E_COMMAND=${quote(campaign.command)}`);
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
    error: passed ? undefined : (manifest.error ?? (manifest.failures?.length ? manifest.failures.join("; ") : `${name} manifest status is ${manifest.status}`)),
  };
}

/**
 * The pull request path of CI runs only the simulated stages (static, visual); the real VS Code
 * stage is a manual job. `--visual-only` reports that path: only the visual stage and the review
 * index are required, and the integration stage is listed as skipped, never as passed.
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
  console.log("skipped integration: the real VS Code stage did not run (manual heavy CI job)");
  const status = stages.every((stage) => stage.status === "passed") ? "passed" : "failed";
  writeFileSync(path.join(reportRoot, "e2e-manifest.json"), JSON.stringify({
    status,
    command: visualCampaign.command,
    runId: visualCampaign.runId,
    startedAt: visualCampaign.startedAt,
    completedAt: new Date().toISOString(),
    stages,
    skipped: ["integration"],
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
  const missing = stageNames.filter((name) => !validCampaign(readJson(campaignPath(name))));
  if (missing.length > 0) {
    console.error(`ci-report: no campaign identity for ${missing.join(" and ")}; run ci-${missing.join(" and ci-")} first`);
    process.exitCode = 1;
    return;
  }
  const gap = Math.abs(Date.parse(visualCampaign.startedAt) - Date.parse(integrationCampaign.startedAt));
  if (!(gap < maxCampaignAgeMs)) {
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
  console.error("usage: e2e-campaign.mjs begin <visual|integration>|report [--visual-only]");
  process.exitCode = 2;
}
