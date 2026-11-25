// Tests of the scenario checks: resolveChecks (defaults, refusals) and takeLines (the take's lines of check.json).
// Node built-ins only: no ffmpeg, no VS Code, no network.
import assert from "node:assert/strict";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

import { resolveChecks, takeLines } from "./check.mjs";

const scenarioOf = (clip) => pathToFileURL(fileURLToPath(new URL(`../../clips/${clip}/scenario.mjs`, import.meta.url))).href;

test("resolveChecks gives the defaults and keeps what the scenario declares", () => {
  assert.deepEqual(resolveChecks(undefined), { editMode: "off", paste: true });
  assert.deepEqual(resolveChecks({}), { editMode: "off", paste: true });
  assert.deepEqual(resolveChecks({ editMode: "on", paste: false }), { editMode: "on", paste: false });
  assert.deepEqual(resolveChecks({ editMode: "on" }), { editMode: "on", paste: true });
});

test("resolveChecks refuses an unknown key and a value out of range, naming scenario.mjs", () => {
  assert.throws(() => resolveChecks({ edit: "on" }), { message: /^scenario\.mjs: checks\.edit is not a known check/u });
  assert.throws(() => resolveChecks({ editMode: "edit" }), { message: /^scenario\.mjs: checks\.editMode must be "on" or "off", got "edit"/u });
  assert.throws(() => resolveChecks({ paste: "no" }), { message: /^scenario\.mjs: checks\.paste must be true or false, got "no"/u });
  assert.throws(() => resolveChecks("on"), { message: /^scenario\.mjs: checks must be an object/u });
});

test("takeLines on a raw copy take gives the three lines of today, all passing", () => {
  const verify = { passed: true, notes: { readingMode: "off", pasteWidgets: 0 } };
  const lines = takeLines(verify);
  assert.deepEqual(
    lines.map((line) => line.name),
    ["scenario verify passed", "no paste-options widget after the paste", "Studio in reading mode at the start"],
  );
  assert.ok(lines.every((line) => line.ok));
  assert.deepEqual(takeLines({ ...verify, checks: { editMode: "off", paste: true } }), lines);
});

test("takeLines on a take with no paste in edit mode gives no paste line and the edit mode line", () => {
  const verify = { passed: true, checks: { editMode: "on", paste: false }, notes: { readingMode: "on" } };
  const lines = takeLines(verify);
  assert.deepEqual(
    lines.map((line) => line.name),
    ["scenario verify passed", "Studio in edit mode at the start"],
  );
  assert.ok(lines.every((line) => line.ok));
});

test("takeLines fails the start mode line when Studio was in the other mode, and the paste line on a widget", () => {
  const wrong = takeLines({ passed: true, checks: { editMode: "on", paste: false }, notes: { readingMode: "off" } });
  assert.equal(wrong.find((line) => line.name === "Studio in edit mode at the start").ok, false);
  const widget = takeLines({ passed: true, notes: { readingMode: "off", pasteWidgets: 1 } });
  assert.equal(widget.find((line) => line.name === "no paste-options widget after the paste").ok, false);
  assert.equal(takeLines({ passed: false, notes: { readingMode: "off", pasteWidgets: 0 } })[0].ok, false);
});

test("the shipped scenarios declare their checks: the drag clip edit mode with no paste, the raw copy clip the defaults", async () => {
  const drag = await import(scenarioOf("drag-list-item"));
  assert.deepEqual(resolveChecks(drag.checks), { editMode: "on", paste: false });
  const raw = await import(scenarioOf("raw-copy-balance-edges"));
  assert.deepEqual(resolveChecks(raw.checks), { editMode: "off", paste: true });
  const exported = await import(scenarioOf("export-html"));
  assert.deepEqual(resolveChecks(exported.checks), { editMode: "off", paste: false });
});
