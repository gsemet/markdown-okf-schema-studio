/**
 * Host side of the save key (CR 312): the command goes to the focused preview, and the save request
 * of the page saves the document only after the texts the page sent before it reached the document.
 * The real `PreviewManager` runs over an in-memory document store whose edits and saves are
 * recorded, and whose edits can be slowed.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import type { HostServices } from "../../src/host-api/index";
import { nodeHostPorts } from "./nodeHostPorts";
import type { PanelGroups } from "../../src/host-api/previewPanel";
import { createMemoryDocumentStore } from "../../src/host-memory/memoryDocumentStore";
import { FLUSH_WAIT_MS } from "../../src/core/preview/flushWait";
import { PreviewManager } from "../../src/session/previewManager";
import { PreviewSession } from "../../src/session/previewSession";

const MARKDOWN = "# Title\n\nFirst paragraph.\n\nSecond paragraph.\n";
const delay = (ms: number): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function settle(): Promise<void> {
  for (let index = 0; index < 20; index += 1) {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
}

function fixture(options: { editDelayMs?: number; pagePosts?: boolean } = {}) {
  const store = createMemoryDocumentStore();
  const document = store.add("file:///w/a.md", MARKDOWN, "/w/a.md");
  const saves: Array<{ text: string; dirtyBefore: boolean }> = [];
  const originalSave = store.save.bind(store);
  store.save = async (target) => {
    saves.push({ text: target.getText(), dirtyBefore: target.isDirty });
    return originalSave(target);
  };
  const originalApply = store.applyEdits.bind(store);
  store.applyEdits = async (target, edits, applyOptions) => {
    if (options.editDelayMs) await delay(options.editDelayMs);
    return originalApply(target, edits, applyOptions);
  };
  const host = {
    ...nodeHostPorts,
    files: {},
    documents: store,
    ui: { setPreviewEditing: () => undefined },
  } as unknown as HostServices;
  const groups: PanelGroups = { lockNewPanelGroup: () => Promise.resolve(false), release: () => undefined };
  const manager = new PreviewManager(host, groups);
  const posted: Array<Record<string, unknown>> = [];
  const panel = {
    active: true,
    postMessage: (message: Record<string, unknown>) => {
      posted.push(message);
      return Promise.resolve(options.pagePosts ?? true);
    },
  };
  const preview = new PreviewSession({
    panel,
    followsActiveEditor: false,
    document,
    documentUri: document.id,
    workspaceRoot: "/w",
    sessionRoots: [],
    navigationRoots: [],
    workspaceFolder: undefined,
    restrictedReads: false,
    webview: {},
    states: {},
    state: undefined,
    status: "success",
    configuration: {},
    plantUmlConfiguration: {},
    plantUmlEngineSettings: {},
    frontmatterConfiguration: {},
  } as never);
  const revision = document.revision;
  preview.stage = { activeDocumentIdentity: document.id, activeDocumentRevision: revision, requestId: 1 } as never;
  preview.page.readyRequestId = 1;
  (manager as unknown as { live: Set<PreviewSession> }).live.add(preview);
  manager.rendering.refreshPreviewDocument = () => Promise.resolve() as never;
  const send = (type: string, extra: Record<string, unknown> = {}): PromiseLike<void> | undefined =>
    manager.handlePageMessage(preview, { type, documentId: document.id, revision, requestId: 1, ...extra });
  const typeInto = (editedText: string): PromiseLike<void> | undefined => send("previewEditSave", {
    editId: "e1", line: 5, endLine: 5, originalText: "Second paragraph.\n", editedText, final: false,
  });
  return { manager, preview, panel, posted, saves, send, typeInto, document, store };
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-173
test("CR 312: with no focused preview the save command does nothing", async () => {
  const f = fixture();
  f.panel.active = false;
  f.posted.length = 0;
  assert.equal(f.manager.runSaveCommand(), false);
  await settle();
  assert.deepEqual(f.posted, [], "no message");
  assert.equal(f.saves.length, 0, "no save");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-173
test("CR 312: the save command asks the focused page, and its save request saves the document", async () => {
  const f = fixture();
  (f.document as { isDirty: boolean }).isDirty = true;
  assert.equal(f.manager.runSaveCommand(), true);
  await settle();
  assert.deepEqual(f.posted.map((message) => [message.type, message.documentId, message.revision, message.requestId]), [
    ["previewSaveCommand", f.document.id, f.document.revision, 1],
  ]);
  assert.equal(f.saves.length, 0, "the host waits for the page: nothing is saved yet");
  await f.send("previewSaveRequest");
  assert.equal(f.saves.length, 1);
  assert.equal(f.document.isDirty, false);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-173
test("CR 312: an autosave applied slowly is in the document when the save runs, and the editor stays open", async () => {
  const f = fixture({ editDelayMs: 60 });
  void f.typeInto("Second paragraph, typed.\n");
  const request = f.send("previewSaveRequest");
  await settle();
  assert.equal(f.saves.length, 0, "the edit is not applied yet: no save");
  await request;
  assert.equal(f.saves.length, 1);
  assert.match(f.saves[0]!.text, /Second paragraph, typed\./u, "the saved text holds the typed text");
  assert.equal(f.document.isDirty, false, "no later edit marks the document dirty again");
  assert.ok(f.preview.edits.active, "the block editor is not closed by the save");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-173
test("CR 312: an autosave that arrives while another is applied is saved too", async () => {
  const f = fixture({ editDelayMs: 40 });
  void f.typeInto("Second paragraph, one.\n");
  void f.typeInto("Second paragraph, two.\n");
  await f.send("previewSaveRequest");
  assert.equal(f.saves.length, 1);
  assert.match(f.saves[0]!.text, /Second paragraph, two\./u);
  assert.equal(f.preview.edits.active?.pendingText, undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-173
test("CR 312: a frontmatter save still being applied is in the document when the save runs", async () => {
  const f = fixture();
  const pending = delay(60).then(async () => {
    await f.store.applyEdits(f.document, [{ start: 0, end: 0, text: "title: Typed\n" }]);
  });
  f.manager.edits.trackPendingSave(f.preview, pending);
  const request = f.send("previewSaveRequest");
  await settle();
  assert.equal(f.saves.length, 0, "the tracked save is not applied yet: no save");
  await request;
  assert.equal(f.saves.length, 1);
  assert.match(f.saves[0]!.text, /^title: Typed\n/u, "the saved text holds the value");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-173
test("CR 312: a page that is not ready, or cannot be reached, has nothing to flush: the document is saved at once", async () => {
  const notReady = fixture();
  notReady.preview.page.readyRequestId = undefined;
  assert.equal(notReady.manager.runSaveCommand(), true);
  await settle();
  assert.deepEqual(notReady.posted, []);
  assert.equal(notReady.saves.length, 1);
  const unreachable = fixture({ pagePosts: false });
  assert.equal(unreachable.manager.runSaveCommand(), true);
  await settle();
  assert.equal(unreachable.saves.length, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-173
test("CR 312: a save that never reaches the document ends the wait, and the document is saved", async () => {
  const f = fixture();
  f.manager.edits.trackPendingSave(f.preview, new Promise<void>(() => undefined));
  const started = Date.now();
  await f.send("previewSaveRequest");
  assert.ok(Date.now() - started >= FLUSH_WAIT_MS - 50, "the wait is the bounded one");
  assert.equal(f.saves.length, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-173
test("CR 312: a page that never answers: the host saves after the bounded wait", async () => {
  const f = fixture();
  (f.document as { isDirty: boolean }).isDirty = true;
  assert.equal(f.manager.runSaveCommand(), true);
  await settle();
  assert.equal(f.saves.length, 0, "the host waits for the page first");
  await delay(FLUSH_WAIT_MS + 100);
  assert.equal(f.saves.length, 1, "no answer: the host saves after the wait");
  assert.equal(f.document.isDirty, false);
  await f.send("previewSaveRequest");
  assert.equal(f.saves.length, 1, "a late request does not save again");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-173
test("CR 312: an answer in time cancels the fallback: one save only", async () => {
  const f = fixture();
  f.manager.runSaveCommand();
  await settle();
  await f.send("previewSaveRequest");
  await delay(FLUSH_WAIT_MS + 100);
  assert.equal(f.saves.length, 1);
});
