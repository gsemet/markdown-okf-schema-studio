import * as assert from "node:assert/strict";
import { test } from "node:test";

import { installHostRequests } from "../../src/webview/hostRequests";

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
