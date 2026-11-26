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
  return runWith(root, {}, ...args);
}

function runWith(root: string, extra: Record<string, string>, ...args: string[]): { status: number | null; stdout: string; stderr: string } {
  const environment: NodeJS.ProcessEnv = { ...process.env };
  delete environment.STUDIO_E2E_RUN_ID;
  delete environment.STUDIO_E2E_COMMAND;
  Object.assign(environment, extra);
  const result = spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: "utf8", env: environment });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function writeCampaign(e2e: string, stage: string, runId: string, startedAt: string, extra: Record<string, unknown> = {}): void {
  fs.writeFileSync(path.join(e2e, `campaign-${stage}.json`), JSON.stringify({ runId, startedAt, command: `just ci-${stage}`, ...extra }));
}

function writePassedStages(e2e: string): void {
  const now = hoursAgo(0.1);
  const passed = JSON.stringify({ status: "passed", startedAt: now, completedAt: now });
  fs.writeFileSync(path.join(e2e, "screenshots", "run-manifest.json"), passed);
  fs.writeFileSync(path.join(e2e, "integration-manifest.json"), passed);
  fs.writeFileSync(path.join(e2e, "review.json"), passed);
}

/** An acceptance file in the checkout: its group must then report. */
function writeAcceptanceFile(root: string, name: string): void {
  const folder = path.join(root, "test", "integration", "acceptance");
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, `${name}.acceptance.ts`), "");
}

const groupManifestPath = (root: string, group: string): string =>
  path.join(root, "out", "reports", "acceptance", group, "acceptance-manifest.json");

function writeGroup(root: string, group: string, extra: Record<string, unknown> = {}): void {
  const now = hoursAgo(0.1);
  fs.mkdirSync(path.dirname(groupManifestPath(root, group)), { recursive: true });
  fs.writeFileSync(groupManifestPath(root, group), JSON.stringify({
    status: "passed", runId: "run-1", campaignStartedAt: now, startedAt: now, completedAt: now, pinnedRunId: false, ...extra,
  }));
}

interface AcceptanceReport { status: number | null; stdout: string; stages: Record<string, string>; groups: Record<string, string> }

/** A report whose visual and integration stages passed an hour ago in run-1, then the acceptance groups given. */
function reportAcceptance(root: string, e2e: string): AcceptanceReport {
  writeCampaign(e2e, "visual", "run-1", hoursAgo(1));
  writeCampaign(e2e, "integration", "run-1", hoursAgo(0.5));
  writePassedStages(e2e);
  const result = run(root, "report");
  const manifest = JSON.parse(fs.readFileSync(path.join(e2e, "e2e-manifest.json"), "utf8")) as { stages: { name: string; status: string }[] };
  const merged = JSON.parse(fs.readFileSync(path.join(root, "out", "reports", "acceptance", "acceptance-manifest.json"), "utf8")) as { groups: { scope: string; status: string }[] };
  return {
    status: result.status,
    stdout: result.stdout,
    stages: Object.fromEntries(manifest.stages.map((stage) => [stage.name, stage.status])),
    groups: Object.fromEntries(merged.groups.map((group) => [group.scope, group.status])),
  };
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

test("the visual-only report needs only the visual stage and lists the real VS Code stages as skipped", () => {
  const { root, e2e } = workspace();
  const now = hoursAgo(0.1);
  writeCampaign(e2e, "visual", "run-v", now);
  fs.writeFileSync(path.join(e2e, "screenshots", "run-manifest.json"), JSON.stringify({ status: "passed", startedAt: now, completedAt: now }));
  fs.writeFileSync(path.join(e2e, "review.json"), JSON.stringify({ status: "passed", startedAt: now, completedAt: now }));
  const result = run(root, "report", "--visual-only");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /skipped integration/u);
  assert.match(result.stdout, /skipped acceptance/u);
  const manifest = JSON.parse(fs.readFileSync(path.join(e2e, "e2e-manifest.json"), "utf8")) as { status: string; skipped: string[]; stages: { name: string }[] };
  assert.equal(manifest.status, "passed");
  assert.deepEqual(manifest.skipped, ["integration", "acceptance"]);
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

// @tests_req SwRS-MDOKFSTUDIO-CORE-076#S3
// @tests_req SwRS-MDOKFSTUDIO-CORE-076#S6
test("the report names each failed check of a visual manifest", () => {
  const { root, e2e } = workspace();
  writeCampaign(e2e, "visual", "run-v", hoursAgo(0.1));
  fs.writeFileSync(path.join(e2e, "review.json"), JSON.stringify({ status: "passed" }));
  const manifest = path.join(e2e, "screenshots", "run-manifest.json");
  fs.writeFileSync(manifest, JSON.stringify({ status: "failed", failures: [{ page: "home", detail: "blank" }, { page: "toc", detail: "overflow" }] }));
  const objects = run(root, "report", "--visual-only");
  assert.equal(objects.status, 1);
  assert.match(objects.stdout, /FAILED visual: home: blank; toc: overflow/);
  assert.doesNotMatch(objects.stdout, /\[object Object\]/);
  fs.writeFileSync(manifest, JSON.stringify({ status: "failed", failures: ["first", "second"] }));
  assert.match(run(root, "report", "--visual-only").stdout, /FAILED visual: first; second/);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-076#S1
// @tests_req SwRS-MDOKFSTUDIO-CORE-076#S2
test("a stage records that its run id was pinned by the CI workflow", () => {
  const { root, e2e } = workspace();
  assert.equal(runWith(root, { STUDIO_E2E_RUN_ID: "4242" }, "begin", "visual").status, 0);
  const pinned = JSON.parse(fs.readFileSync(path.join(e2e, "campaign-visual.json"), "utf8")) as Record<string, unknown>;
  assert.equal(pinned.runId, "4242");
  assert.equal(pinned.pinnedRunId, true);
  assert.equal(run(root, "begin", "integration").status, 0);
  const local = JSON.parse(fs.readFileSync(path.join(e2e, "campaign-integration.json"), "utf8")) as Record<string, unknown>;
  assert.equal(local.runId, "4242");
  assert.equal(local.pinnedRunId, undefined);
});

// "Re-run failed jobs" re-runs integration in the same CI run, possibly hours later, while visual
// (not re-run) keeps its attempt-1 start: one run id pinned by the workflow is one campaign.
// @tests_req SwRS-MDOKFSTUDIO-CORE-076#S2
// @tests_req SwRS-MDOKFSTUDIO-CORE-076#S6
test("the report accepts stages started hours apart when both carry the same pinned CI run id", () => {
  const { root, e2e } = workspace();
  writeCampaign(e2e, "visual", "4242", hoursAgo(26), { pinnedRunId: true });
  writeCampaign(e2e, "integration", "4242", hoursAgo(1), { pinnedRunId: true });
  writePassedStages(e2e);
  writeAcceptanceFile(root, "trust-security");
  writeGroup(root, "trust-security", { runId: "4242", pinnedRunId: true, campaignStartedAt: hoursAgo(1) });
  const result = run(root, "report");
  assert.equal(result.status, 0, result.stderr);
  const manifest = JSON.parse(fs.readFileSync(path.join(e2e, "e2e-manifest.json"), "utf8")) as { status: string; runId: string };
  assert.equal(manifest.status, "passed");
  assert.equal(manifest.runId, "4242");
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-076#S1
// @tests_req SwRS-MDOKFSTUDIO-CORE-076#S2
test("the two-hour limit still applies unless both stages carry the same pinned run id", () => {
  for (const [visual, integration] of [
    [{ runId: "4242", pinned: true }, { runId: "4243", pinned: true }],
    [{ runId: "4242", pinned: true }, { runId: "4242", pinned: false }],
    [{ runId: "4242", pinned: false }, { runId: "4242", pinned: false }],
  ]) {
    const { root, e2e } = workspace();
    writeCampaign(e2e, "visual", visual.runId, hoursAgo(5), visual.pinned ? { pinnedRunId: true } : {});
    writeCampaign(e2e, "integration", integration.runId, hoursAgo(1), integration.pinned ? { pinnedRunId: true } : {});
    writePassedStages(e2e);
    const result = run(root, "report");
    assert.equal(result.status, 1, JSON.stringify({ visual, integration }));
    assert.match(result.stderr, /minutes apart/u);
  }
});

// A CI report job has the group manifests of the shards and no campaign-acceptance.json.
// @tests_req SwRS-MDOKFSTUDIO-CORE-076#S9
test("the report merges the group manifests and needs no acceptance campaign file", () => {
  const { root, e2e } = workspace();
  // A plain .acceptance.ts file and its window-kind siblings are one group.
  for (const name of ["trust-security", "trust-security.restricted", "navigation"]) writeAcceptanceFile(root, name);
  writeGroup(root, "trust-security");
  writeGroup(root, "navigation");
  assert.equal(fs.existsSync(path.join(e2e, "campaign-acceptance.json")), false);
  const report = reportAcceptance(root, e2e);
  assert.equal(report.status, 0, report.stdout);
  assert.deepEqual(report.stages, { visual: "passed", integration: "passed", acceptance: "passed", "review-index": "passed" });
  assert.deepEqual(report.groups, { navigation: "passed", "trust-security": "passed" });
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-076#S9
test("the report fails naming a group whose manifest is missing, failed or of another campaign", () => {
  for (const [name, extra, message] of [
    ["missing", undefined, /navigation: its manifest is missing/u],
    ["failed", { status: "failed", launches: [{ file: "navigation.acceptance", status: "failed" }] },
      /navigation: its manifest status is failed \(navigation\.acceptance\)/u],
    ["cut short", { status: "running" }, /navigation: its manifest status is running/u],
    ["old", { campaignStartedAt: hoursAgo(5) }, /navigation: it belongs to another campaign/u],
    ["undated", { campaignStartedAt: undefined }, /navigation: it belongs to another campaign/u],
    ["another pinned run", { runId: "4243", pinnedRunId: true, campaignStartedAt: hoursAgo(5) }, /navigation: it belongs to another campaign/u],
  ] as const) {
    const { root, e2e } = workspace();
    for (const group of ["trust-security", "navigation"]) writeAcceptanceFile(root, group);
    writeGroup(root, "trust-security");
    if (extra) writeGroup(root, "navigation", extra);
    const report = reportAcceptance(root, e2e);
    assert.equal(report.status, 1, name);
    assert.match(report.stdout, message, name);
    assert.equal(report.stages.acceptance, "failed", name);
    assert.deepEqual(report.groups, { navigation: "failed", "trust-security": "passed" }, name);
  }
});

// A manifest left for a group the checkout has no file for is not evidence of anything.
// @tests_req SwRS-MDOKFSTUDIO-CORE-076#S9
test("the report fails when the checkout has no acceptance file at all", () => {
  const { root, e2e } = workspace();
  writeGroup(root, "trust-security");
  const report = reportAcceptance(root, e2e);
  assert.equal(report.status, 1);
  assert.match(report.stdout, /FAILED acceptance: no acceptance file under test\/integration\/acceptance\//u);
});

// "Re-run failed jobs" re-runs one shard hours later in the same CI run.
// @tests_req SwRS-MDOKFSTUDIO-CORE-076#S2
// @tests_req SwRS-MDOKFSTUDIO-CORE-076#S9
test("a group of the pinned CI run is accepted hours after the visual stage", () => {
  for (const [integrationPinned, status] of [[true, 0], [false, 1]] as const) {
    const { root, e2e } = workspace();
    writeAcceptanceFile(root, "trust-security");
    writeGroup(root, "trust-security", { runId: "4242", pinnedRunId: true, campaignStartedAt: hoursAgo(0.1) });
    writeCampaign(e2e, "visual", "4242", hoursAgo(26), { pinnedRunId: true });
    // Without the pin on the integration stage, the visual and integration stages must be close.
    writeCampaign(e2e, "integration", "4242", hoursAgo(integrationPinned ? 25 : 26), integrationPinned ? { pinnedRunId: true } : {});
    writePassedStages(e2e);
    const result = run(root, "report");
    assert.equal(result.status, status, result.stdout);
    if (status === 1) assert.match(result.stdout, /another campaign/u);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-076#S9
test("starting the acceptance stage again deletes every group manifest and the merged one", () => {
  const { root, e2e } = workspace();
  writeCampaign(e2e, "visual", "run-1", hoursAgo(0.5));
  writeGroup(root, "trust-security");
  writeGroup(root, "navigation");
  const merged = path.join(root, "out", "reports", "acceptance", "acceptance-manifest.json");
  fs.writeFileSync(merged, "{}");
  const result = run(root, "begin", "acceptance");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /run-1/u);
  for (const stale of [merged, groupManifestPath(root, "trust-security"), groupManifestPath(root, "navigation")]) {
    assert.equal(fs.existsSync(stale), false, stale);
  }
  const campaign = JSON.parse(fs.readFileSync(path.join(e2e, "campaign-acceptance.json"), "utf8")) as { command: string };
  assert.equal(campaign.command, "just ci-acceptance");
  const unknown = run(root, "begin", "stress");
  assert.notEqual(unknown.status, 0);
  assert.match(unknown.stderr, /unknown stage "stress"; expected visual, integration or acceptance/u);
});
