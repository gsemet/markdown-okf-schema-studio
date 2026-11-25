import * as assert from "node:assert/strict";
import { test } from "node:test";

import { installHostRequests } from "../../../src/page/modules/hostRequests";

interface Timer { id: number; at: number; run: () => void }

function setup() {
  const posted: Array<Record<string, unknown>> = [];
  const timers: Timer[] = [];
  let sequence = 0;
  const window = {
    setTimeout: (run: () => void, at: number) => { timers.push({ id: ++sequence, at, run }); return sequence; },
    clearTimeout: (id: number) => { const at = timers.findIndex((t) => t.id === id); if (at >= 0) timers.splice(at, 1); },
  } as unknown as Window & typeof globalThis;
  let ids = 0;
  const requests = installHostRequests(window, {
    post: (message) => posted.push(message),
    nextEditId: () => `host-${++ids}`,
  });
  return { requests, posted, timers };
}

// @tests_req SwRS-MDOKFSTUDIO-TRUST-090#S1
// @tests_req SwRS-MDOKFSTUDIO-TRUST-090#S3
test("ask posts the type and payload with a fresh edit id and answers by edit id", () => {
  const { requests, posted } = setup();
  const results: unknown[] = [];
  requests.ask("previewListTargets", {}, {}, (result) => results.push(result));
  assert.deepEqual(posted, [{ type: "previewListTargets", editId: "host-1" }]);
  assert.equal(requests.receive({ type: "previewListTargetsResult", editId: "other", ok: true }), false);
  assert.equal(requests.receive({ type: "previewListCitationsResult", editId: "host-1", ok: true }), false,
    "a result of another type does not answer");
  assert.equal(requests.receive({ type: "previewListTargetsResult", editId: "host-1", ok: true, items: [1] }), true);
  assert.deepEqual(results, [{ type: "previewListTargetsResult", editId: "host-1", ok: true, items: [1] }]);
  assert.equal(requests.receive({ type: "previewListTargetsResult", editId: "host-1", ok: true }), false,
    "answered once only");
});

test("a request without an answer times out with an error result", () => {
  const { requests, timers } = setup();
  const results: Array<{ ok?: boolean; reason?: string }> = [];
  requests.ask("previewListCitations", {}, { timeoutMs: 6000 }, (result) => results.push(result));
  assert.equal(timers[0].at, 6000);
  timers[0].run();
  assert.equal(results.length, 1);
  assert.equal(results[0].ok, false);
  assert.match(String(results[0].reason), /did not answer/u);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-047
test("a dialog request keeps the editor's blur suspended until it is answered, even on a timeout", () => {
  const { requests, timers } = setup();
  assert.equal(requests.isDialogOpen(), false);
  requests.ask("previewPickDocument", {}, { dialog: true }, () => undefined);
  assert.equal(requests.isDialogOpen(), true);
  requests.receive({ type: "previewPickDocumentResult", editId: "host-1", ok: true, path: "a" });
  assert.equal(requests.isDialogOpen(), false);
  requests.ask("previewPickDocument", {}, { dialog: true }, () => undefined);
  requests.ask("previewPickDocument", {}, { dialog: true }, () => undefined);
  assert.equal(requests.isDialogOpen(), true);
  timers[timers.length - 1].run();
  assert.equal(requests.isDialogOpen(), true, "the other dialog is still open");
  requests.cancelAll();
  assert.equal(requests.isDialogOpen(), false);
});

test("a list request never suspends the blur", () => {
  const { requests } = setup();
  requests.ask("previewListTargets", {}, {}, () => undefined);
  assert.equal(requests.isDialogOpen(), false);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-090#S4
// @tests_req SwRS-MDOKFSTUDIO-TRUST-090#S5
test("with no timeout given, a list request waits 6 seconds and a dialog request 10 minutes", () => {
  const { requests, timers } = setup();
  requests.ask("previewListTargets", {}, {}, () => undefined);
  requests.ask("previewPickImage", {}, { dialog: true }, () => undefined);
  assert.deepEqual(timers.map((timer) => timer.at), [6000, 600000]);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-090#S1
// @tests_req SwRS-MDOKFSTUDIO-TRUST-090#S3
test("an answer that comes after the timeout is not taken and calls nothing again", () => {
  const { requests, timers } = setup();
  const results: Array<Record<string, unknown>> = [];
  requests.ask("previewListTargets", {}, {}, (result) => results.push(result as Record<string, unknown>));
  timers[0]!.run();
  assert.deepEqual(results, [{ ok: false, reason: "The editor did not answer. Try again." }]);
  assert.equal(requests.receive({ type: "previewListTargetsResult", editId: "host-1", ok: true }), false);
  assert.equal(results.length, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-090#S1
// @tests_req SwRS-MDOKFSTUDIO-TRUST-090#S3
test("after cancelAll no callback runs, for an answer or for a timer", () => {
  const { requests, timers } = setup();
  let calls = 0;
  requests.ask("previewListTargets", {}, {}, () => { calls += 1; });
  const timer = timers[0]!;
  requests.cancelAll();
  assert.equal(timers.length, 0, "the timer is cleared");
  assert.equal(requests.receive({ type: "previewListTargetsResult", editId: "host-1", ok: true }), false);
  timer.run();
  assert.equal(calls, 0);
});
