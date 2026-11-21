import * as assert from "node:assert/strict";
import { mock, test } from "node:test";

import { markProgress } from "../shared/hangWatchdog";
import { formatScenarioTrace, withFailureTrace } from "../shared/realWindowTrace";

// The fields the collectors of paste-url and drop-files put in the snapshot.
const SNAPSHOT = {
  preview: {
    phase: "ready", requestId: 4, documentVersion: 3, webviewReady: true, deferredWorkPending: false,
    blockEditOpen: false, pageEditorOpen: false, contentPatches: 1, htmlAssignments: 2, panelActive: true,
  },
  source: { version: 3, text: "Read the guide\n" },
  frame: { found: true, editMode: "true" },
  tabs: [{ label: "paste.md", inputType: "TabInputText" }],
  failures: ["link: got 1, wanted 2"],
};

function captureErrors(): { lines: string[]; restore(): void } {
  const lines: string[] = [];
  const spy = mock.method(console, "error", (...parts: unknown[]) => { lines.push(parts.join(" ")); });
  return { lines, restore: () => spy.mock.restore() };
}

test("CR 454: formatScenarioTrace gives one line, a prefix and valid JSON with every field", () => {
  const line = formatScenarioTrace("paste-url", SNAPSHOT);
  assert.ok(!line.includes("\n"));
  assert.ok(line.startsWith("paste-url failure trace: "));
  assert.deepEqual(JSON.parse(line.slice("paste-url failure trace: ".length)), SNAPSHOT);
});

test("CR 454: a failing body prints its error, then the trace once, and rethrows the same error", async () => {
  const captured = captureErrors();
  const original = new Error("the body failed");
  try {
    markProgress("after the first paste");
    await assert.rejects(withFailureTrace("drop-files", () => SNAPSHOT, async () => { throw original; }), (error) => error === original);
  } finally {
    captured.restore();
  }
  assert.equal(captured.lines.length, 2);
  assert.ok(captured.lines[0]!.startsWith("drop-files failed: Error: the body failed"));
  assert.ok(captured.lines[1]!.startsWith("drop-files failure trace: "));
  const trace = JSON.parse(captured.lines[1]!.slice("drop-files failure trace: ".length));
  assert.deepEqual(trace, { ...SNAPSHOT, lastProgress: "after the first paste" });
});

test("CR 454: a passing body returns its value and prints nothing", async () => {
  const captured = captureErrors();
  try {
    assert.equal(await withFailureTrace("paste-url", () => SNAPSHOT, async () => 7), 7);
  } finally {
    captured.restore();
  }
  assert.deepEqual(captured.lines, []);
});

test("CR 454: a collector that never settles gives a collectError after the bound, and the scenario's error stays", async () => {
  const captured = captureErrors();
  const original = new Error("the body failed");
  const started = Date.now();
  try {
    await assert.rejects(
      withFailureTrace("paste-url", () => new Promise<never>(() => undefined), async () => { throw original; }, 50),
      (error) => error === original,
    );
  } finally {
    captured.restore();
  }
  assert.ok(Date.now() - started < 4_000, "the bound, not the default 5 s, applied");
  assert.equal(captured.lines.length, 2);
  const trace = JSON.parse(captured.lines[1]!.slice("paste-url failure trace: ".length));
  assert.match(trace.collectError, /TIMEOUT: paste-url failure trace did not return within 50 ms/u);
});

test("CR 454: a collector that throws is printed in the trace and never replaces the scenario's error", async () => {
  const captured = captureErrors();
  const original = new Error("the body failed");
  try {
    await assert.rejects(
      withFailureTrace("paste-url", () => { throw new Error("collector broke"); }, async () => { throw original; }),
      (error) => error === original,
    );
  } finally {
    captured.restore();
  }
  assert.equal(captured.lines.length, 2);
  const trace = JSON.parse(captured.lines[1]!.slice("paste-url failure trace: ".length));
  assert.match(trace.collectError, /collector broke/u);
});
