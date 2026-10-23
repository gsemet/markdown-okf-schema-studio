import assert from "node:assert/strict";
import { test } from "node:test";

import { installHostRequests } from "../../src/webview/hostRequests";
import {
  installPlantUmlFileRequests,
  PLANTUML_FILE_REQUEST_EVENT,
  type PlantUmlFileRequestDetail,
} from "../../src/webview/plantumlFileRequests";

type Answer = Parameters<PlantUmlFileRequestDetail["respond"]>[0];

/** The page side: a document with listeners, host requests with manual timers, the posted messages. */
function page() {
  const listeners = new Map<string, Array<(event: unknown) => void>>();
  const timers = new Map<number, () => void>();
  let nextTimer = 0;
  const fakeWindow = {
    setTimeout: (callback: () => void) => { nextTimer += 1; timers.set(nextTimer, callback); return nextTimer; },
    clearTimeout: (id: number) => { timers.delete(id); },
  } as unknown as Window & typeof globalThis;
  const posted: Array<Record<string, unknown>> = [];
  let sequence = 0;
  const requests = installHostRequests(fakeWindow, {
    nextEditId: () => `plantuml-${++sequence}`,
    post: (message) => posted.push({ ...message, documentId: "doc", documentVersion: 2, requestId: 7 }),
  });
  const document = {
    addEventListener: (type: string, listener: (event: unknown) => void) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
  };
  installPlantUmlFileRequests(document as unknown as Document, requests, 10000);
  const ask = (request: unknown): { detail: PlantUmlFileRequestDetail; answers: Answer[] } => {
    const answers: Answer[] = [];
    const detail = { request, accepted: false, respond: (answer: Answer) => answers.push(answer) } as PlantUmlFileRequestDetail;
    for (const listener of listeners.get(PLANTUML_FILE_REQUEST_EVENT) ?? []) listener({ detail });
    return { detail, answers };
  };
  const expireTimers = (): void => { for (const callback of [...timers.values()]) callback(); };
  return { ask, posted, requests, expireTimers };
}

test("a file request of the PlantUML bundle becomes a registered host message and the answer comes back", () => {
  const { ask, posted, requests } = page();
  const { detail, answers } = ask({ path: "styles/common.puml", from: null });

  assert.equal(detail.accepted, true, "the bundle knows the page took the request");
  assert.deepEqual(posted, [{
    type: "previewPlantUmlInclude",
    path: "styles/common.puml",
    from: null,
    editId: "plantuml-1",
    documentId: "doc",
    documentVersion: 2,
    requestId: 7,
  }]);
  assert.equal(requests.receive({ type: "previewPlantUmlIncludeResult", editId: "plantuml-1", ok: true, id: "/docs/styles/common.puml", text: "A -> B" }), true);
  assert.deepEqual(answers, [{ ok: true, id: "/docs/styles/common.puml", text: "A -> B" }]);
});

test("refusals, stale answers and timeouts reach the bundle as reasons, once", () => {
  const { ask, requests, expireTimers } = page();
  const refused = ask({ path: "../secret.puml", from: "/docs/a.puml" });
  assert.equal(requests.receive({ type: "previewPlantUmlIncludeResult", editId: "plantuml-99", ok: true, id: "/x", text: "x" }), false,
    "an answer to another (older) request is ignored");
  requests.receive({ type: "previewPlantUmlIncludeResult", editId: "plantuml-1", ok: false, reason: "PlantUML file ../secret.puml is outside the folders the preview reads." });
  assert.deepEqual(refused.answers, [{ ok: false, reason: "PlantUML file ../secret.puml is outside the folders the preview reads." }]);
  assert.equal(requests.receive({ type: "previewPlantUmlIncludeResult", editId: "plantuml-1", ok: true, id: "/x", text: "x" }), false,
    "a second answer to the same request is ignored");

  const malformed = ask({ path: "a.puml", from: null });
  requests.receive({ type: "previewPlantUmlIncludeResult", editId: "plantuml-2", ok: true, id: 5 });
  assert.deepEqual(malformed.answers, [{ ok: false, reason: "a.puml could not be read." }]);

  const silent = ask({ path: "slow.puml", from: null });
  expireTimers();
  assert.deepEqual(silent.answers, [{ ok: false, reason: "The editor did not answer. Try again." }]);
});

test("a malformed request is left alone and a non-string from is sent as null", () => {
  const { ask, posted } = page();
  const ignored = ask({ path: 5, from: null });
  assert.equal(ignored.detail.accepted, false);
  assert.equal(posted.length, 0);
  ask({ path: "a.puml", from: { evil: true } });
  assert.equal(posted[0]?.from, null);
});
