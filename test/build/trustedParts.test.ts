import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { heartbeatFileFor } from "../shared/hangWatchdog";
import { watchLaunch } from "../shared/launchWatchdog";
import { TRUSTED_PART_STEPS, trustedLaunch, trustedLaunches, trustedPartFromEnvironment } from "../shared/trustedParts";

/** The 55 steps of the trusted run when it was one launch, in its order. */
const SINGLE_LAUNCH_STEPS: readonly string[] = [
  "setup", "preview-smoke", "project-features", "hostile-html", "stock-coexistence", "open-at-line",
  "open-at-line-probe", "open-at-line-studio", "checkbox-toggle", "radio-choice", "table-empty-column",
  "edit-toolbar-cover", "tall-block-scroll", "block-actions", "find-in-preview", "real-input", "preview-editing",
  "edit-keys", "save-key", "grid-card-editor-blur", "paste-url", "drop-files", "window-switch-keys",
  "preview-history", "export-html", "palette-mode", "label-rename", "inline-thread", "block-move",
  "block-clipboard", "empty-blocks", "blank-lines", "myst-pickers", "image-picker", "image-paste",
  "incoming-changes", "update-glow", "review-comments", "comment-write", "comment-contrast", "comment-title",
  "readme-html", "toc", "myst-blocks", "comment-anchors", "generic-markdown", "dirty-snapshots",
  "source-mapping", "diff-preview", "diff-preview-scroll", "side-preview-jump", "lifecycle", "myst-diagnostics",
  "serializer", "workspace-disposal",
];
/** Every launch starts with them, so they are the only steps that run twice. */
const OPENING_STEPS: readonly string[] = ["setup", "preview-smoke"];
const OWN_WINDOW_STEPS: readonly string[] = ["real-input", "preview-editing"];

test("CR-509: parts 1 and 2 together hold every step of the single trusted launch exactly once, in order", () => {
  assert.equal(SINGLE_LAUNCH_STEPS.length, 55);
  assert.equal(new Set(SINGLE_LAUNCH_STEPS).size, 55);
  assert.deepEqual([...TRUSTED_PART_STEPS["1"]], SINGLE_LAUNCH_STEPS.filter((name) => !OWN_WINDOW_STEPS.includes(name)));
  assert.deepEqual([...TRUSTED_PART_STEPS["2"]], [...OPENING_STEPS, ...OWN_WINDOW_STEPS]);
  const run: readonly string[] = [...TRUSTED_PART_STEPS["1"], ...TRUSTED_PART_STEPS["2"]];
  for (const name of SINGLE_LAUNCH_STEPS) {
    assert.equal(run.filter((candidate) => candidate === name).length, OPENING_STEPS.includes(name) ? 2 : 1, name);
  }
  assert.equal(run.length, SINGLE_LAUNCH_STEPS.length + OPENING_STEPS.length, "a part holds an unknown step");
});

test("CR-509: STUDIO_TRUSTED_PART selects the part; an unknown or missing value fails at once", () => {
  assert.equal(trustedPartFromEnvironment({ STUDIO_TRUSTED_PART: "1" }), "1");
  assert.equal(trustedPartFromEnvironment({ STUDIO_TRUSTED_PART: "2" }), "2");
  for (const unknown of ["0", "3", "both", " 1", "toString"]) {
    const message = new RegExp(`STUDIO_TRUSTED_PART must be 1 or 2, got "${unknown}"`, "u");
    assert.throws(() => trustedPartFromEnvironment({ STUDIO_TRUSTED_PART: unknown }), message);
    assert.throws(() => trustedPartFromEnvironment({ STUDIO_TRUSTED_PART: unknown, STUDIO_REAL_INPUT_SCENARIO: "stress" }), message);
  }
  assert.throws(() => trustedPartFromEnvironment({}), /STUDIO_TRUSTED_PART is not set/u);
  assert.throws(() => trustedPartFromEnvironment({ STUDIO_TRUSTED_PART: "" }), /STUDIO_TRUSTED_PART is not set/u);
});

test("CR-509: a STUDIO_REAL_INPUT_SCENARIO run stays one launch with no part", () => {
  for (const scenario of ["stress", "probe", "drop-files", ""]) {
    assert.equal(trustedPartFromEnvironment({ STUDIO_REAL_INPUT_SCENARIO: scenario }), undefined);
    assert.equal(trustedPartFromEnvironment({ STUDIO_REAL_INPUT_SCENARIO: scenario, STUDIO_TRUSTED_PART: "1" }), undefined);
    assert.deepEqual(trustedLaunches({ STUDIO_REAL_INPUT_SCENARIO: scenario }), [{
      part: undefined, suiteFile: "trusted-suite.js", name: "trusted-suite.js", suite: "trusted-suite",
      dumpLabel: undefined, runsPreviewEditing: false,
    }]);
  }
});

test("CR-509: the full run is two trusted launches with distinct launch names, heartbeat files and dump labels", () => {
  const launches = trustedLaunches({});
  assert.deepEqual(launches, [trustedLaunch("1"), trustedLaunch("2")]);
  assert.deepEqual(launches.map((launch) => launch.part), ["1", "2"]);
  assert.deepEqual(launches.map((launch) => launch.suiteFile), ["trusted-suite.js", "trusted-suite.js"]);
  assert.deepEqual(launches.map((launch) => launch.name), ["trusted-suite.js part 1/2", "trusted-suite.js part 2/2"]);
  assert.deepEqual(launches.map((launch) => path.basename(heartbeatFileFor("run", launch.suite, "reports"))),
    ["heartbeat-run-trusted-suite-part-1.json", "heartbeat-run-trusted-suite-part-2.json"]);
  assert.deepEqual(launches.map((launch) => launch.dumpLabel), ["trusted-part-1", "trusted-part-2"]);
  assert.deepEqual(launches.map((launch) => launch.runsPreviewEditing), [false, true]);
});

/** The dump folder of a launch that passes its deadline while `step` runs. */
async function deadlineDumpFolder(step: string, dumpLabel: string | undefined): Promise<string> {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "studio-parts-test-"));
  try {
    const heartbeatFile = path.join(directory, "heartbeat.json");
    fs.writeFileSync(heartbeatFile, JSON.stringify({ suite: "trusted-suite", step, marker: "(none)", pid: 0, time: Date.now() }));
    const dumpRoot = path.join(directory, "hang-dumps");
    await assert.rejects(watchLaunch({
      name: "trusted-suite.js", dumpLabel, heartbeatFile, staleMs: 60_000, deadlineMs: 100, pollMs: 20,
      dumpRoot, screenshots: false, log: () => undefined,
    }, new Promise<never>(() => undefined)), /LAUNCH TIMEOUT: trusted-suite\.js/u);
    const folders = fs.readdirSync(dumpRoot);
    assert.equal(folders.length, 1);
    return folders[0];
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test("CR-509: a trusted part's launch dump folder names the part before the step; other folders are unchanged", async () => {
  assert.match(await deadlineDumpFolder("open-at-line-probe", "trusted-part-1"), /Z-trusted-part-1-open-at-line-probe$/u);
  // The folder name is cut at 60 characters: the part is in front of the step, so it stays.
  assert.match(await deadlineDumpFolder("a-very-long-step-name-".repeat(5), "trusted-part-2"), /Z-trusted-part-2-a-very-long-step-name-/u);
  assert.match(await deadlineDumpFolder("open-at-line-probe", undefined), /Z-open-at-line-probe$/u);
});
