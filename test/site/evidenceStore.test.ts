import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import test from "node:test";

import type { CaptureEntry } from "../shared/captureRegistry";
import { EvidenceStore, resolveClip } from "../shared/evidenceStore";

const registry: readonly CaptureEntry[] = [
  { id: "gfm/r01-one", group: "gfm", suite: "checkbox", legacy: "01", locks: "One locks.", clip: "window" },
  { id: "gfm/r02-two", group: "gfm", suite: "checkbox", legacy: "02", locks: "Two locks.", clip: "preview" },
  { id: "gfm/r03-three", group: "gfm", suite: "checkbox", legacy: "03", locks: "Three locks.", capture: false, clip: "window" },
  { id: "myst/r01-other", group: "myst", suite: "reload", legacy: "x", locks: "Other.", clip: "window" },
];

function temporaryRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "evidence-store-test-"));
}

function store(root: string, instanceId = "20260101T000000Z-aaaa1111"): EvidenceStore {
  return new EvidenceStore({ suite: "checkbox", screenshotRoot: root, registry, instanceId, environment: { STUDIO_E2E_RUN_ID: "campaign-7" } });
}

test("the run folder keeps the suite prefix and is unique per store", () => {
  const root = temporaryRoot();
  try {
    const first = store(root);
    const second = store(root);
    assert.notEqual(first.directory, second.directory);
    assert.match(path.basename(first.directory), /^checkbox-e2e-/u);
    assert.equal(path.dirname(first.directory), root);
    assert.match(fs.readFileSync(path.join(first.directory, "INDEX.md"), "utf8"), /^# checkbox capture order/u);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("unknown ids and ids of another suite are rejected", () => {
  const root = temporaryRoot();
  try {
    const evidence = store(root);
    assert.throws(() => evidence.paths("gfm/r99-nope"), /Unregistered checkbox capture "gfm\/r99-nope"/u);
    assert.throws(() => evidence.paths("myst/r01-other"), /Unregistered checkbox capture/u);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("record writes the notes below the group folder, the INDEX line and the manifest entry", () => {
  const root = temporaryRoot();
  try {
    const evidence = store(root);
    const paths = evidence.paths("gfm/r01-one");
    assert.equal(paths.png, path.join(evidence.directory, "gfm", "r01-one.png"));
    assert.throws(() => evidence.record("gfm/r01-one", { note: "n" }), /before its PNG was written/u);
    fs.writeFileSync(paths.png!, "png");
    const record = evidence.record("gfm/r01-one", { note: "Reading mode.", json: { checks: ["a"] }, markdown: "Details.\n" });
    assert.deepEqual({ ...record, capturedAt: "x" }, {
      id: "gfm/r01-one", group: "gfm", suite: "checkbox", png: "gfm/r01-one.png", note: "gfm/r01-one.md",
      json: "gfm/r01-one.json", clip: "window", capturedAt: "x",
    });
    const note = fs.readFileSync(paths.note, "utf8");
    assert.match(note, /^# gfm\/r01-one\n\nReading mode\.\n\n\*\*Locks:\*\* One locks\.\n\nDetails\./u);
    const sidecar = JSON.parse(fs.readFileSync(paths.json, "utf8"));
    assert.equal(sidecar.summary, "Reading mode.");
    assert.deepEqual(sidecar.checks, ["a"]);
    assert.equal(sidecar.info.id, "gfm/r01-one");
    assert.equal(sidecar.info.runId, "campaign-7");
    assert.equal(sidecar.info.instanceId, "20260101T000000Z-aaaa1111");
    assert.match(fs.readFileSync(path.join(evidence.directory, "INDEX.md"), "utf8"), /- \[gfm\/r01-one\]\(gfm\/r01-one\.md\): \[image\]\(gfm\/r01-one\.png\)/u);
    assert.throws(() => evidence.record("gfm/r01-one", { note: "again" }), /taken twice/u);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("an assertion-only entry writes the notes but no PNG and is not required", () => {
  const root = temporaryRoot();
  try {
    const evidence = store(root);
    const paths = evidence.paths("gfm/r03-three");
    assert.equal(paths.png, null);
    const record = evidence.record("gfm/r03-three", { note: "Escape keeps the text." });
    assert.equal(record.png, null);
    assert.ok(!fs.existsSync(path.join(evidence.directory, "gfm", "r03-three.png")));
    assert.match(fs.readFileSync(paths.note, "utf8"), /Assertion-only/u);
    assert.deepEqual(evidence.missing(), ["gfm/r01-one", "gfm/r02-two"]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("assertComplete fails while a registered capture of the suite is missing, and manifest lists the captures", () => {
  const root = temporaryRoot();
  try {
    const evidence = store(root);
    for (const id of ["gfm/r01-one", "gfm/r02-two"]) {
      fs.writeFileSync(evidence.paths(id).png!, "png");
      evidence.record(id, { note: id });
    }
    evidence.assertComplete();
    const partial = store(root);
    fs.writeFileSync(partial.paths("gfm/r01-one").png!, "png");
    partial.record("gfm/r01-one", { note: "only one" });
    assert.throws(() => partial.assertComplete(), /1 registered checkbox capture\(s\) not taken: gfm\/r02-two/u);
    evidence.writeManifest({ runId: "campaign-7", status: "passed", captures: 99 });
    const manifest = JSON.parse(fs.readFileSync(path.join(evidence.directory, "manifest.json"), "utf8"));
    assert.equal(manifest.status, "passed");
    assert.equal(manifest.runId, "campaign-7");
    assert.equal(manifest.instanceId, "20260101T000000Z-aaaa1111");
    assert.deepEqual(manifest.captures.map((entry: { id: string }) => entry.id), ["gfm/r01-one", "gfm/r02-two"]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("resolveClip crops to the frame inside the viewport and gives up on unusable rectangles", () => {
  const viewport = { width: 1440, height: 900 };
  assert.deepEqual(resolveClip({ x: 700.4, y: 30.2, width: 600.1, height: 800 }, viewport), { x: 700, y: 30, width: 601, height: 801 });
  assert.deepEqual(resolveClip({ x: 1000, y: 0, width: 800, height: 1000 }, viewport), { x: 1000, y: 0, width: 440, height: 900 });
  assert.deepEqual(resolveClip({ x: -20, y: 0, width: 220, height: 100 }, null), { x: 0, y: 0, width: 200, height: 100 });
  assert.equal(resolveClip(null, viewport), undefined);
  assert.equal(resolveClip({ x: 0, y: 0, width: 0, height: 500 }, viewport), undefined);
  assert.equal(resolveClip({ x: 1500, y: 0, width: 200, height: 500 }, viewport), undefined, "off screen");
  assert.equal(resolveClip({ x: Number.NaN, y: 0, width: 200, height: 500 }, viewport), undefined);
});
