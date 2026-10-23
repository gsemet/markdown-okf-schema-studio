import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import test from "node:test";

const script = path.join(process.cwd(), "scripts", "e2e-campaign.mjs");
const hoursAgo = (hours: number): string => new Date(Date.now() - hours * 3_600_000).toISOString();

function workspace(): { root: string; e2e: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "e2e-campaign-"));
  const e2e = path.join(root, "out", "reports", "e2e");
  fs.mkdirSync(path.join(e2e, "screenshots"), { recursive: true });
  return { root, e2e };
}

function run(root: string, ...args: string[]): { status: number | null; stdout: string; stderr: string } {
  const environment = { ...process.env };
  delete environment.STUDIO_E2E_RUN_ID;
  delete environment.STUDIO_E2E_COMMAND;
  const result = spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: "utf8", env: environment });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function writeCampaign(e2e: string, stage: string, runId: string, startedAt: string): void {
  fs.writeFileSync(path.join(e2e, `campaign-${stage}.json`), JSON.stringify({ runId, startedAt, command: `just ci-${stage}` }));
}

test("a stage does not adopt the run id of a stale sibling campaign", () => {
  const { root, e2e } = workspace();
  writeCampaign(e2e, "integration", "run-old", hoursAgo(3));
  assert.doesNotMatch(run(root, "begin", "visual").stdout, /run-old/u);
});

test("a stage adopts the run id of a recent sibling campaign", () => {
  const { root, e2e } = workspace();
  writeCampaign(e2e, "integration", "run-fresh", hoursAgo(0.5));
  assert.match(run(root, "begin", "visual").stdout, /run-fresh/u);
});

test("starting a stage again invalidates its previous manifest and records a fresh start", () => {
  const { root, e2e } = workspace();
  writeCampaign(e2e, "visual", "run-1", hoursAgo(1));
  const manifest = path.join(e2e, "screenshots", "run-manifest.json");
  const review = path.join(e2e, "review.json");
  fs.writeFileSync(manifest, JSON.stringify({ status: "passed", runId: "run-1" }));
  fs.writeFileSync(review, JSON.stringify({ status: "passed" }));
  assert.equal(run(root, "begin", "visual").status, 0);
  assert.equal(fs.existsSync(manifest), false);
  assert.equal(fs.existsSync(review), false);
  const campaign = JSON.parse(fs.readFileSync(path.join(e2e, "campaign-visual.json"), "utf8")) as { runId: string; startedAt: string };
  assert.equal(campaign.runId, "run-1");
  assert.ok(Date.now() - Date.parse(campaign.startedAt) < 60_000);
});

test("the report fails when the two stages started more than two hours apart", () => {
  const { root, e2e } = workspace();
  writeCampaign(e2e, "visual", "run-1", hoursAgo(5));
  writeCampaign(e2e, "integration", "run-1", hoursAgo(1));
  const result = run(root, "report");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /minutes apart/u);
});

test("the visual-only report needs only the visual stage and lists the real VS Code stage as skipped", () => {
  const { root, e2e } = workspace();
  const now = hoursAgo(0.1);
  writeCampaign(e2e, "visual", "run-v", now);
  fs.writeFileSync(path.join(e2e, "screenshots", "run-manifest.json"), JSON.stringify({ status: "passed", startedAt: now, completedAt: now }));
  fs.writeFileSync(path.join(e2e, "review.json"), JSON.stringify({ status: "passed", startedAt: now, completedAt: now }));
  const result = run(root, "report", "--visual-only");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /skipped integration/u);
  const manifest = JSON.parse(fs.readFileSync(path.join(e2e, "e2e-manifest.json"), "utf8")) as { status: string; skipped: string[]; stages: { name: string }[] };
  assert.equal(manifest.status, "passed");
  assert.deepEqual(manifest.skipped, ["integration"]);
  assert.deepEqual(manifest.stages.map((stage) => stage.name), ["visual", "review-index"]);
  // The full report still requires the integration stage.
  assert.equal(run(root, "report").status, 1);
});

test("the visual-only report fails when the visual stage failed or did not run", () => {
  const { root, e2e } = workspace();
  assert.equal(run(root, "report", "--visual-only").status, 1);
  writeCampaign(e2e, "visual", "run-v", hoursAgo(0.1));
  fs.writeFileSync(path.join(e2e, "screenshots", "run-manifest.json"), JSON.stringify({ status: "failed" }));
  fs.writeFileSync(path.join(e2e, "review.json"), JSON.stringify({ status: "failed" }));
  assert.equal(run(root, "report", "--visual-only").status, 1);
});
