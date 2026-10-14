import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const extensionRoot = process.cwd();
const reportRoot = path.join(extensionRoot, "out", "reports", "e2e");
const campaignCommand = "npm run test:e2e";

function runStage(name, command, environment = {}) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", command], {
    cwd: extensionRoot,
    stdio: "inherit",
    env: { ...process.env, ...environment },
  });
  const exitCode = result.error ? 1 : result.status ?? 1;
  return {
    name,
    command: `npm run ${command}`,
    status: exitCode === 0 ? "passed" : "failed",
    exitCode,
    startedAt,
    completedAt: new Date().toISOString(),
    error: result.error?.message,
  };
}

function failedStage(name, command, error) {
  const now = new Date().toISOString();
  return { name, command: `npm run ${command}`, status: "failed", exitCode: 1, startedAt: now, completedAt: now, error };
}

function readCampaignIdentity() {
  const campaign = JSON.parse(readFileSync(path.join(reportRoot, "review-start.json"), "utf8"));
  if (typeof campaign.runId !== "string" || typeof campaign.startedAt !== "string" || campaign.command !== campaignCommand) {
    throw new Error("review:begin did not write a valid current campaign identity");
  }
  return campaign;
}

export function runCampaignStages({ stageRunner = runStage, campaignReader = readCampaignIdentity } = {}) {
  const begin = stageRunner("review-begin", "review:begin", { STUDIO_E2E_COMMAND: campaignCommand });
  const stages = [begin];
  let campaign;
  if (begin.status === "passed") {
    try {
      campaign = campaignReader();
    } catch (error) {
      stages.push(failedStage("review-identity", "review:begin", error instanceof Error ? error.message : String(error)));
    }
  }
  if (campaign) {
    const campaignEnvironment = {
      STUDIO_E2E_RUN_ID: campaign.runId,
      STUDIO_E2E_STARTED_AT: campaign.startedAt,
      STUDIO_E2E_COMMAND: campaign.command,
    };
    stages.push(stageRunner("visual", "test:visual", campaignEnvironment));
    stages.push(stageRunner("integration", "test:integration", campaignEnvironment));
    stages.push(stageRunner("review-index", "review:finish", campaignEnvironment));
  }
  return { campaign, stages };
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function writeJUnit(stages) {
  const failures = stages.filter((stage) => stage.status !== "passed");
  const cases = stages.map((stage) => stage.status === "passed"
    ? `    <testcase classname="e2e" name="${escapeXml(stage.name)}"/>`
    : `    <testcase classname="e2e" name="${escapeXml(stage.name)}"><failure message="exit ${stage.exitCode}">${escapeXml(stage.error ?? `${stage.command} failed`)}</failure></testcase>`);
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<testsuites tests="${stages.length}" failures="${failures.length}" errors="0">`,
    `  <testsuite name="Markdown OKF-Schema Studio E2E" tests="${stages.length}" failures="${failures.length}" errors="0">`,
    ...cases,
    "  </testsuite>",
    "</testsuites>",
    "",
  ].join("\n");
  writeFileSync(path.join(reportRoot, "tests-e2e.xml"), xml);
}

function main() {
  mkdirSync(reportRoot, { recursive: true });
  const runnerStartedAt = new Date().toISOString();
  const { campaign, stages } = runCampaignStages();
  const status = stages.every((stage) => stage.status === "passed") ? "passed" : "failed";
  writeFileSync(path.join(reportRoot, "e2e-manifest.json"), JSON.stringify({
    status,
    command: campaignCommand,
    runId: campaign?.runId ?? null,
    startedAt: campaign?.startedAt ?? runnerStartedAt,
    completedAt: new Date().toISOString(),
    stages,
  }, null, 2) + "\n");
  writeJUnit(stages);
  if (status !== "passed") process.exitCode = 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) main();
