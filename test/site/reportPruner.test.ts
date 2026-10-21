import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import test from "node:test";

import { applyPrune, planPrune, pointerProtectedFolders } from "./reportPruner";

function fixture(): { reports: string; screenshots: string; cleanup: () => void } {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "pruner-"));
  const reports = path.join(base, "out", "reports");
  const screenshots = path.join(reports, "e2e", "screenshots");
  fs.mkdirSync(screenshots, { recursive: true });
  return { reports, screenshots, cleanup: () => fs.rmSync(base, { recursive: true, force: true }) };
}

function run(screenshots: string, name: string, ageSeconds: number): string {
  const directory = path.join(screenshots, name);
  fs.mkdirSync(directory);
  fs.writeFileSync(path.join(directory, "01.png"), "x");
  const time = new Date(Date.now() - ageSeconds * 1000);
  fs.utimesSync(directory, time, time);
  return directory;
}

test("keeps the latest N per kind and plans the others for removal", () => {
  const { reports, screenshots, cleanup } = fixture();
  try {
    for (let index = 0; index < 5; index += 1) run(screenshots, `real-input-a${index}`, index * 10);
    for (let index = 0; index < 2; index += 1) run(screenshots, `scroll-e2e-b${index}`, index * 10);
    fs.mkdirSync(path.join(screenshots, "visual"));
    fs.writeFileSync(path.join(screenshots, "INDEX.md"), "x");
    const plans = planPrune({ reportsRoot: reports, keep: 3 });
    const realInput = plans.find((plan) => plan.kind === "real-input")!;
    assert.deepEqual(realInput.kept, ["real-input-a0", "real-input-a1", "real-input-a2"]);
    assert.deepEqual(realInput.removed, ["real-input-a3", "real-input-a4"]);
    assert.deepEqual(plans.find((plan) => plan.kind === "scroll-e2e")!.removed, []);
    assert.equal(plans.some((plan) => plan.removed.includes("visual")), false);
  } finally {
    cleanup();
  }
});

test("a dry run (plan only) deletes nothing; apply deletes exactly the planned folders", () => {
  const { reports, screenshots, cleanup } = fixture();
  try {
    for (let index = 0; index < 4; index += 1) run(screenshots, `reload-e2e-c${index}`, index * 10);
    const plans = planPrune({ reportsRoot: reports, keep: 2 });
    assert.equal(fs.readdirSync(screenshots).length, 4);
    assert.equal(applyPrune(plans, reports), 2);
    assert.deepEqual(fs.readdirSync(screenshots).sort(), ["reload-e2e-c0", "reload-e2e-c1"]);
  } finally {
    cleanup();
  }
});

test("never removes a folder a LATEST pointer names or one that holds a tracked file", () => {
  const { reports, screenshots, cleanup } = fixture();
  try {
    for (let index = 0; index < 4; index += 1) run(screenshots, `checkbox-e2e-d${index}`, index * 10);
    fs.writeFileSync(path.join(reports, "e2e", "CHECKBOX-LATEST.md"), "[Ordered captures](screenshots/checkbox-e2e-d3/INDEX.md)\n");
    const tracked = path.join(screenshots, "checkbox-e2e-d2", "01.png");
    const protectedPaths = pointerProtectedFolders(reports);
    assert.deepEqual(protectedPaths, [path.join(screenshots, "checkbox-e2e-d3")]);
    const [plan] = planPrune({ reportsRoot: reports, keep: 1, protectedPaths, trackedPaths: [tracked] });
    assert.deepEqual(plan!.removed, ["checkbox-e2e-d1"]);
    assert.deepEqual([...plan!.protected].sort(), ["checkbox-e2e-d2", "checkbox-e2e-d3"]);
  } finally {
    cleanup();
  }
});

test("refuses a scan directory or a reports root outside out/reports", () => {
  const { reports, cleanup } = fixture();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "outside-"));
  try {
    run(outside, "real-input-zz", 0);
    assert.throws(() => planPrune({ reportsRoot: reports, keep: 1, scanDirs: [outside] }), /outside/u);
    assert.throws(() => planPrune({ reportsRoot: outside, keep: 1 }), /not an out\/reports directory/u);
    assert.throws(() => planPrune({ reportsRoot: reports, keep: 0 }), /keep must be/u);
    assert.throws(() => applyPrune([], outside), /not an out\/reports directory/u);
  } finally {
    cleanup();
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test("a symlinked run folder pointing outside is neither planned nor followed", () => {
  const { reports, screenshots, cleanup } = fixture();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "outside-"));
  try {
    run(screenshots, "real-input-e0", 0);
    fs.mkdirSync(path.join(outside, "keep-me"));
    fs.symlinkSync(path.join(outside, "keep-me"), path.join(screenshots, "real-input-link"));
    const plans = planPrune({ reportsRoot: reports, keep: 1 });
    assert.deepEqual(plans.flatMap((plan) => [...plan.kept, ...plan.removed]), ["real-input-e0"]);
    assert.ok(fs.existsSync(path.join(outside, "keep-me")));
    // A hand-made plan naming the symlink is skipped by apply.
    applyPrune([{ kind: "real-input", dir: screenshots, kept: [], protected: [], removed: ["real-input-link"] }], reports);
    assert.ok(fs.existsSync(path.join(outside, "keep-me")));
  } finally {
    cleanup();
    fs.rmSync(outside, { recursive: true, force: true });
  }
});
