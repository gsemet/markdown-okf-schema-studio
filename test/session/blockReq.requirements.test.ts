/**
 * Host side of the block editing requirements (BLOCK scope): the refusals, the failure answers, the
 * coalescing of autosaves and the pins of the block edit and source edit controllers. The real
 * `PreviewManager` runs over an in-memory document store, a scripted clipboard and a preview session
 * whose page is a recorder; every message goes through `handlePageMessage`, like a page message.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import type { TextEdit } from "../../src/core/edits/textEdit";
import type { HostServices } from "../../src/host-api/index";
import { nodeHostPorts } from "./nodeHostPorts";
import type { PanelGroups } from "../../src/host-api/previewPanel";
import { createMemoryDocumentStore } from "../../src/host-memory/memoryDocumentStore";
import { PreviewManager } from "../../src/session/previewManager";
import { PreviewSession } from "../../src/session/previewSession";

const MARKDOWN = "# Title\n\nFirst paragraph.\n\nSecond paragraph.\n";

/** Lets promise chains run. */
async function settle(): Promise<void> {
  for (let index = 0; index < 20; index += 1) {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

interface FixtureOptions {
  restrictedReads?: boolean;
  text?: string;
}

/** A preview over an in-memory document, with hooks on the edits and the clipboard. */
function fixture(options: FixtureOptions = {}) {
  const store = createMemoryDocumentStore();
  const document = store.add("file:///w/a.md", options.text ?? MARKDOWN, "/w/a.md");
  const applyCalls: Array<readonly TextEdit[]> = [];
  const hooks = {
    gate: undefined as Promise<void> | undefined,
    rejectWith: undefined as Error | undefined,
    /** A file VS Code holds read-only: it accepts an edit and changes nothing. */
    readOnly: false,
    readClipboard: (): Promise<string> => Promise.resolve("Pasted block.\n"),
    writeClipboard: (_text: string): Promise<void> => Promise.resolve(),
  };
  const documents = Object.assign(Object.create(store) as object, {
    applyEdits: (target: typeof document, edits: readonly TextEdit[], applyOptions?: never) => {
      applyCalls.push(edits);
      if (hooks.rejectWith) return Promise.reject(hooks.rejectWith);
      if (hooks.readOnly) return Promise.resolve(true);
      const outcome = Promise.resolve(store.applyEdits(target, edits, applyOptions));
      return hooks.gate ? hooks.gate.then(() => outcome) : outcome;
    },
  });
  const warnings: string[] = [];
  const deleted: string[] = [];
  const host = {
    ...nodeHostPorts,
    files: { delete: (file: string) => { deleted.push(file); return Promise.resolve(); } },
    documents,
    ui: {
      readClipboard: () => hooks.readClipboard(),
      writeClipboard: (text: string) => hooks.writeClipboard(text),
      showWarning: (text: string) => {
        warnings.push(text);
        return Promise.resolve(undefined);
      },
    },
  } as unknown as HostServices;
  const groups: PanelGroups = { lockNewPanelGroup: () => Promise.resolve(false), release: () => undefined };
  const manager = new PreviewManager(host, groups);
  const posted: Array<Record<string, unknown>> = [];
  const preview = new PreviewSession({
    panel: { postMessage: (message: Record<string, unknown>) => { posted.push(message); return Promise.resolve(true); } },
    followsActiveEditor: false,
    document,
    documentUri: document.id,
    workspaceRoot: "/w",
    sessionRoots: [],
    navigationRoots: [],
    workspaceFolder: undefined,
    restrictedReads: options.restrictedReads === true,
    webview: {},
    states: {},
    state: undefined,
    status: "success",
    configuration: {},
    plantUmlConfiguration: {},
    plantUmlEngineSettings: {},
    frontmatterConfiguration: {},
  } as never);
  const openRevision = document.revision;
  preview.stage = { activeDocumentIdentity: document.id, activeDocumentRevision: openRevision, requestId: 1 } as never;
  preview.page.readyRequestId = 1;
  (manager as unknown as { live: Set<PreviewSession> }).live.add(preview);
  manager.rendering.refreshPreviewDocument = () => Promise.resolve() as never;

  /** A page message for the render the preview holds. */
  const message = (type: string, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
    type, documentId: document.id, revision: openRevision, requestId: 1, ...extra,
  });
  const send = async (type: string, extra: Record<string, unknown> = {}): Promise<void> => {
    await manager.handlePageMessage(preview, message(type, extra));
    await settle();
  };
  const of = (type: string): Array<Record<string, unknown>> => posted.filter((entry) => entry.type === type);
  return { store, document, applyCalls, hooks, manager, preview, posted, warnings, deleted, send, of, message };
}

/** The save of the second paragraph (source line 5) with the edited text. */
const SECOND = { editId: "e1", line: 5, endLine: 5, originalText: "Second paragraph.\n" };

// @tests_req SwRS-MDOKFSTUDIO-TRUST-005
test("a restricted-reads preview opens, saves and cancels a block like a writable one", async () => {
  const restricted = fixture({ restrictedReads: true });
  await restricted.send("previewEditOpen", { editId: "e1", line: 5, endLine: 5 });
  assert.equal(restricted.of("previewEditSource")[0]!.originalText, "Second paragraph.\n");
  assert.equal(restricted.of("previewEditSource")[0]!.error, undefined);
  await restricted.send("previewEditSave", { ...SECOND, editedText: "Changed.\n" });
  assert.ok(restricted.document.getText().includes("Changed."), "Restricted Mode and a standalone file edit the document");
  assert.equal(restricted.applyCalls.length, 1);
  assert.deepEqual(restricted.of("previewEditSource").map((answer) => answer.error), [undefined]);

  const writable = fixture();
  await writable.send("previewEditOpen", { editId: "e1", line: 5, endLine: 5 });
  assert.equal(writable.of("previewEditSource")[0]!.originalText, "Second paragraph.\n");
  assert.equal(writable.of("previewEditSource")[0]!.error, undefined);
});

test("a restricted-reads preview and a writable one both post a flush request before a switch", async () => {
  for (const options of [{ restrictedReads: true }, {}]) {
  const writable = fixture(options);
  const original = writable.preview.postToPage.bind(writable.preview);
  writable.preview.postToPage = ((value: { type: string; flushId?: string }) => {
    if (value.type === "previewFlushEdit") {
      // The page answers the flush at once.
      queueMicrotask(() => writable.preview.edits.flushWaiters.get(value.flushId!)?.());
    }
    return original(value as never);
  }) as never;
  await writable.manager.edits.flushPageEdits(writable.preview);
  assert.equal(writable.of("previewFlushEdit").length, 1);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-216
test("a first save for lines or an insertion point that do not exist is refused as stale", async () => {
  const stale = "The preview is stale. Reopen the block before saving.";
  const lines = fixture();
  await lines.send("previewEditSave", { editId: "e1", line: 40, endLine: 41, originalText: "x\n", editedText: "y\n" });
  assert.equal(lines.of("previewEditSource")[0]!.error, stale);
  const insertion = fixture();
  await insertion.send("previewEditSave", {
    editId: "e2", line: 99, endLine: 99, insertAfterLine: 99, originalText: "", editedText: "New\n",
  });
  assert.equal(insertion.of("previewEditSource")[0]!.error, stale);
  assert.equal(lines.document.getText(), MARKDOWN);
  assert.equal(insertion.document.getText(), MARKDOWN);

  const valid = fixture();
  await valid.send("previewEditSave", { ...SECOND, editedText: "Second changed.\n", final: false });
  assert.deepEqual(valid.of("previewEditSource"), []);
  assert.equal(valid.preview.edits.active?.editId, "e1");
  assert.match(valid.document.getText(), /Second changed\./u);
});

test("an open for a document that changed since the render is refused and registers no editor", async () => {
  const changed = fixture();
  await changed.store.applyEdits(changed.document, [{ start: 0, end: 0, text: "Intro\n\n" }]);
  await changed.send("previewEditOpen", { editId: "e1", line: 5, endLine: 5 });
  const answers = changed.of("previewEditSource");
  assert.equal(answers.length, 1);
  assert.equal(answers[0]!.error, "The preview is stale. Refresh it before editing this block.");
  assert.equal(changed.preview.edits.lock.pageEditorOpen, false);

  const lines = fixture();
  await lines.send("previewEditOpen", { editId: "e1", line: 50, endLine: 50 });
  assert.equal(lines.of("previewEditSource")[0]!.error, "The preview is stale. Refresh it before editing this block.");

  const current = fixture();
  await current.send("previewEditOpen", { editId: "e1", line: 5, endLine: 5 });
  assert.equal(current.of("previewEditSource")[0]!.originalText, "Second paragraph.\n");
  assert.equal(current.preview.edits.lock.pageEditorOpen, true);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-041
test("a second open while the host holds an edit is refused", async () => {
  const held = fixture();
  await held.send("previewEditSave", { ...SECOND, editedText: "Second A.\n", final: false });
  assert.ok(held.preview.edits.active);
  await held.send("previewEditOpen", { editId: "e2", line: 3, endLine: 3 });
  const answers = held.of("previewEditSource");
  assert.equal(answers.length, 1);
  assert.equal(answers[0]!.error, "Another Markdown block is already being edited.");
  assert.equal(answers[0]!.editId, "e2");

  const free = fixture();
  await free.send("previewEditOpen", { editId: "e2", line: 3, endLine: 3 });
  assert.equal(free.of("previewEditSource")[0]!.originalText, "First paragraph.\n");
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-065
test("an open, save or cancel from an older page of a preview is answered with an error", async () => {
  const stale = "The preview changed while this block was being edited. Copy your text, then reopen the block.";
  const writable = fixture();
  const old = (type: string, extra: Record<string, unknown>) => writable.manager.handlePageMessage(
    writable.preview,
    { ...writable.message(type, extra), requestId: 0 },
  );
  await old("previewEditSave", { ...SECOND, editedText: "Changed.\n" });
  await old("previewEditCancel", { editId: "e1", line: 5, endLine: 5 });
  await old("previewEditOpen", { editId: "e1", line: 5, endLine: 5 });
  await settle();
  const errors = writable.of("previewEditSource").map((entry) => entry.error);
  assert.deepEqual(errors, [stale, stale, "The preview is out of date. Try again once it has refreshed."]);
  assert.equal(writable.document.getText(), MARKDOWN);

  const restricted = fixture({ restrictedReads: true });
  await restricted.manager.handlePageMessage(
    restricted.preview,
    { ...restricted.message("previewEditSave", { ...SECOND, editedText: "Changed.\n" }), requestId: 0 },
  );
  await settle();
  assert.deepEqual(restricted.of("previewEditSource").map((entry) => entry.error), [stale]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-058
test("an edit that VS Code does not apply or rejects is reported and the final request is reset", async () => {
  const refused = fixture();
  refused.store.refuseEdits(true);
  await refused.send("previewEditSave", { ...SECOND, editedText: "Second A.\n" });
  assert.equal(refused.of("previewEditSource").at(-1)!.error, "VS Code could not apply the Markdown edit.");
  assert.equal(refused.preview.edits.active?.finalRequested, false);
  assert.equal(refused.document.getText(), MARKDOWN);
  // The held edit lets the next save go through.
  refused.store.refuseEdits(false);
  await refused.send("previewEditSave", { ...SECOND, editedText: "Second B.\n" });
  assert.match(refused.document.getText(), /Second B\./u);

  const rejected = fixture();
  rejected.hooks.rejectWith = new Error("The file is read-only.");
  await rejected.send("previewEditSave", { ...SECOND, editedText: "Second A.\n" });
  assert.equal(rejected.of("previewEditSource").at(-1)!.error, "The file is read-only.");
  assert.equal(rejected.preview.edits.active?.finalRequested, false);
});

test("a block that changed in the document under the host is reported and the lock is released", async () => {
  const held = fixture();
  await held.send("previewEditSave", { ...SECOND, editedText: "Second A.\n", final: false });
  assert.ok(held.preview.edits.active);
  assert.equal(held.preview.edits.lock.pageEditorOpen, true);
  // The block is edited in the document, outside the preview (no tracking runs in this fixture).
  const start = held.document.getText().indexOf("Second A.");
  await held.store.applyEdits(held.document, [{ start, end: start + "Second".length, text: "Other" }]);
  await held.send("previewEditSave", { ...SECOND, editedText: "Second B.\n", final: false });
  assert.equal(held.of("previewEditSource").at(-1)!.error, "The source block changed while it was being edited.");
  assert.equal(held.preview.edits.active, undefined, "the host edit is released");
  assert.equal(held.preview.edits.lock.pageEditorOpen, true, "the editor of the page stays open");
  assert.match(held.document.getText(), /Other A\./u);

  const unchanged = fixture();
  await unchanged.send("previewEditSave", { ...SECOND, editedText: "Second A.\n", final: false });
  await unchanged.send("previewEditSave", { ...SECOND, editedText: "Second B.\n", final: false });
  assert.deepEqual(unchanged.of("previewEditSource"), []);
  assert.match(unchanged.document.getText(), /Second B\./u);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-042
test("the host applies one edit at a time and keeps only the newest text received meanwhile", async () => {
  const running = fixture();
  const gate = deferred<void>();
  running.hooks.gate = gate.promise;
  await running.send("previewEditSave", { ...SECOND, editedText: "Second A.\n", final: false });
  await running.send("previewEditSave", { ...SECOND, editedText: "Second B.\n", final: false });
  await running.send("previewEditSave", { ...SECOND, editedText: "Second C.\n", final: false });
  assert.equal(running.applyCalls.length, 1, "one edit in flight");
  assert.equal(running.preview.edits.active?.pendingText, "Second C.\n");
  gate.resolve();
  await settle();
  assert.equal(running.applyCalls.length, 2, "the newest text is applied after the running edit");
  assert.match(running.document.getText(), /Second C\./u);
  assert.doesNotMatch(running.document.getText(), /Second B\./u);

  const same = fixture();
  const sameGate = deferred<void>();
  same.hooks.gate = sameGate.promise;
  await same.send("previewEditSave", { ...SECOND, editedText: "Second A.\n", final: false });
  await same.send("previewEditSave", { ...SECOND, editedText: "Second A.\n", final: false });
  sameGate.resolve();
  await settle();
  assert.equal(same.applyCalls.length, 1, "the pending text equals the text just written");
});

test("a block move is refused while a block edit is held and planned otherwise", async () => {
  const move = { line: 3, endLine: 3, neighbourLine: 5, neighbourEndLine: 5, direction: "down" };
  const held = fixture();
  await held.send("previewEditSave", { ...SECOND, editedText: "Second A.\n", final: false });
  const before = held.document.getText();
  await held.send("previewBlockMove", move);
  assert.deepEqual(held.of("previewBlockMoveResult").map(({ ok, reason }) => ({ ok, reason })), [
    { ok: false, reason: "Save or cancel the open Markdown edit before moving a block." },
  ]);
  assert.equal(held.document.getText(), before);

  const free = fixture();
  await free.send("previewBlockMove", move);
  assert.equal(free.of("previewBlockMoveResult")[0]!.ok, true);
  assert.equal(free.document.getText(), "# Title\n\nSecond paragraph.\n\nFirst paragraph.\n");
});

test("a move that VS Code does not apply or rejects is answered with ok false", async () => {
  const move = { line: 3, endLine: 3, neighbourLine: 5, neighbourEndLine: 5, direction: "down" };
  const refused = fixture();
  refused.store.refuseEdits(true);
  await refused.send("previewBlockMove", move);
  assert.deepEqual(refused.of("previewBlockMoveResult").map(({ ok, reason }) => ({ ok, reason })), [
    { ok: false, reason: "VS Code could not apply the move." },
  ]);
  const rejected = fixture();
  rejected.hooks.rejectWith = new Error("Edit rejected.");
  await rejected.send("previewBlockMove", move);
  assert.deepEqual(rejected.of("previewBlockMoveResult").map(({ ok, reason }) => ({ ok, reason })), [
    { ok: false, reason: "Edit rejected." },
  ]);
  assert.equal(rejected.document.getText(), MARKDOWN);
});

test("copy, cut and paste of blocks are refused while a block edit is held", async () => {
  const held = fixture();
  await held.send("previewEditSave", { ...SECOND, editedText: "Second A.\n", final: false });
  const before = held.document.getText();
  const written: string[] = [];
  held.hooks.writeClipboard = (text) => { written.push(text); return Promise.resolve(); };
  await held.send("previewBlocksCopy", { line: 3, endLine: 3 });
  await held.send("previewBlocksCut", { line: 3, endLine: 3 });
  await held.send("previewBlocksPaste", { insertAfterLine: 3 });
  const results = held.of("previewBlocksResult");
  assert.deepEqual(results.map(({ op, ok, reason }) => ({ op, ok, reason })), ["copy", "cut", "paste"].map((op) => ({
    op, ok: false, reason: "Save or cancel the open Markdown edit first.",
  })));
  assert.deepEqual(written, []);
  assert.equal(held.document.getText(), before);

  const free = fixture();
  const copied: string[] = [];
  free.hooks.writeClipboard = (text) => { copied.push(text); return Promise.resolve(); };
  await free.send("previewBlocksCopy", { line: 3, endLine: 3 });
  assert.equal(free.of("previewBlocksResult")[0]!.ok, true);
  assert.deepEqual(copied, ["First paragraph."]);
});

test("a cut or paste that VS Code does not apply, and a failing clipboard, are answered with ok false", async () => {
  const cut = fixture();
  cut.store.refuseEdits(true);
  await cut.send("previewBlocksCut", { line: 3, endLine: 3 });
  assert.deepEqual(cut.of("previewBlocksResult").map(({ op, ok, reason }) => ({ op, ok, reason })), [
    { op: "cut", ok: false, reason: "VS Code could not apply the cut." },
  ]);
  const paste = fixture();
  paste.store.refuseEdits(true);
  await paste.send("previewBlocksPaste", { insertAfterLine: 3 });
  assert.deepEqual(paste.of("previewBlocksResult").map(({ op, ok, reason }) => ({ op, ok, reason })), [
    { op: "paste", ok: false, reason: "VS Code could not apply the paste." },
  ]);
  const copy = fixture();
  copy.hooks.writeClipboard = () => Promise.reject(new Error("The clipboard is locked."));
  await copy.send("previewBlocksCopy", { line: 3, endLine: 3 });
  assert.deepEqual(copy.of("previewBlocksResult").map(({ op, ok, reason }) => ({ op, ok, reason })), [
    { op: "copy", ok: false, reason: "The clipboard is locked." },
  ]);
  const read = fixture();
  read.hooks.readClipboard = () => Promise.reject(new Error("No clipboard."));
  await read.send("previewBlocksPaste", { insertAfterLine: 3 });
  assert.equal(read.of("previewBlocksResult")[0]!.reason, "No clipboard.");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-174
test("a paste is refused when the document changed while the clipboard was read", async () => {
  const racing = fixture();
  const clipboard = deferred<string>();
  racing.hooks.readClipboard = () => clipboard.promise;
  const sending = racing.send("previewBlocksPaste", { insertAfterLine: 3 });
  await settle();
  await racing.store.applyEdits(racing.document, [{ start: 0, end: 0, text: "Intro\n\n" }]);
  clipboard.resolve("Pasted block.\n");
  await sending;
  assert.deepEqual(racing.of("previewBlocksResult").map(({ ok, reason }) => ({ ok, reason })), [
    { ok: false, reason: "The document changed while pasting. Try again." },
  ]);
  assert.equal(racing.document.getText(), `Intro\n\n${MARKDOWN}`);

  const calm = fixture();
  await calm.send("previewBlocksPaste", { insertAfterLine: 3 });
  assert.equal(calm.of("previewBlocksResult")[0]!.ok, true);
  assert.match(calm.document.getText(), /First paragraph\.\n\nPasted block\./u);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-169
test("a cut is refused when the document changed while the clipboard was written", async () => {
  const racing = fixture();
  const write = deferred<void>();
  racing.hooks.writeClipboard = () => write.promise;
  const sending = racing.send("previewBlocksCut", { line: 3, endLine: 3, pinViewportTop: 200 });
  await settle();
  await racing.store.applyEdits(racing.document, [{ start: 0, end: 0, text: "Intro\n\n" }]);
  write.resolve();
  await sending;
  assert.deepEqual(racing.of("previewBlocksResult").map(({ ok, reason }) => ({ ok, reason })), [
    {
      ok: false,
      reason: "The document changed while cutting. The blocks are on the clipboard, nothing was removed.",
    },
  ]);
  assert.equal(racing.document.getText(), `Intro\n\n${MARKDOWN}`);
  assert.equal(racing.preview.scroll.pendingPin, undefined);

  const calm = fixture();
  await calm.send("previewBlocksCut", { line: 3, endLine: 3, pinViewportTop: 200 });
  assert.equal(calm.of("previewBlocksResult")[0]!.ok, true);
  assert.doesNotMatch(calm.document.getText(), /First paragraph/u);
});

test("a cut stores a pin for the first line of the span only when a block follows it", async () => {
  const following = fixture();
  await following.send("previewBlocksCut", { line: 3, endLine: 3, pinViewportTop: 200 });
  assert.equal(following.of("previewBlocksResult")[0]!.ok, true);
  const pin = following.preview.scroll.pendingPin;
  assert.ok(pin);
  assert.equal(pin.line, 3);
  assert.equal(pin.viewportTop, 200);
  assert.equal(pin.documentId, following.document.id);

  const last = fixture();
  await last.send("previewBlocksCut", { line: 5, endLine: 5, pinViewportTop: 200 });
  assert.equal(last.of("previewBlocksResult")[0]!.ok, true);
  assert.equal(last.preview.scroll.pendingPin, undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-228
test("a final save with a pin stores it for five seconds, a save without the two fields stores none", async () => {
  const pinned = fixture();
  const before = Date.now();
  await pinned.send("previewEditSave", { ...SECOND, editedText: "Second A.\n", final: true, pinLine: 12, pinViewportTop: 180 });
  const pin = pinned.preview.scroll.pendingPin;
  assert.ok(pin);
  assert.equal(pin.line, 12);
  assert.equal(pin.viewportTop, 180);
  assert.ok(pin.expiresAt >= before + 5000 && pin.expiresAt <= Date.now() + 5000);

  const plain = fixture();
  await plain.send("previewEditSave", { ...SECOND, editedText: "Second A.\n", final: true });
  assert.equal(plain.preview.scroll.pendingPin, undefined);
  const half = fixture();
  await half.send("previewEditSave", { ...SECOND, editedText: "Second A.\n", final: true, pinLine: 12 });
  assert.equal(half.preview.scroll.pendingPin, undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-169
test("the host stores the edit mode a writable preview reports and ignores the other reports", async () => {
  const updates: Array<[string, unknown]> = [];
  const store = {
    get: () => undefined,
    keys: (): string[] => [],
    update: (key: string, value: unknown) => { updates.push([key, value]); return Promise.resolve(); },
  };
  const writable = fixture();
  writable.manager.choices.load(store as never);
  await writable.send("previewEditModeChanged", { editMode: true });
  assert.deepEqual(updates, [["markdownOkfSchemaStudio.editMode", true]]);
  await writable.send("previewEditModeChanged", { editMode: "yes" });
  assert.equal(updates.length, 1, "a message whose editMode is not a boolean changes nothing");

  const restricted = fixture({ restrictedReads: true });
  restricted.manager.choices.load(store as never);
  await restricted.send("previewEditModeChanged", { editMode: false });
  assert.equal(updates.length, 2, "a restricted-reads preview stores the edit mode like any other");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-234
test("a block edit keeps the line ending of the document and the next save is not refused", async () => {
  for (const eol of ["\n", "\r\n", "\r"]) {
    const name = JSON.stringify(eol);
    const text = `# Title${eol}${eol}- a${eol}- b${eol}${eol}Last${eol}`;
    const run = fixture({ text });
    // The list is source lines 3-4; the text box returns LF.
    const list = { editId: "e1", line: 3, endLine: 4, originalText: `- a${eol}- b${eol}` };
    await run.send("previewEditSave", { ...list, editedText: `- a\n- b\n- c${eol}`, final: false });
    assert.equal(run.document.getText(), `# Title${eol}${eol}- a${eol}- b${eol}- c${eol}${eol}Last${eol}`, name);
    await run.send("previewEditSave", { ...list, editedText: `- a\n- b\n- c\n- d${eol}`, final: false });
    assert.deepEqual(run.of("previewEditSource"), [], `${name}: the second save is not refused`);
    assert.equal(run.document.getText(), `# Title${eol}${eol}- a${eol}- b${eol}- c${eol}- d${eol}${eol}Last${eol}`, name);

    // A one-line paragraph with Enter pressed, and its trailing line ending kept.
    const single = fixture({ text });
    await single.send("previewEditSave", {
      editId: "e1", line: 6, endLine: 6, originalText: `Last${eol}`, editedText: `Last\nmore${eol}`, final: true,
    });
    assert.equal(single.document.getText(), `# Title${eol}${eol}- a${eol}- b${eol}${eol}Last${eol}more${eol}`, name);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-234
test("a block edit in a document with mixed line endings writes the text box content as it is", async () => {
  const run = fixture({ text: "# Title\r\n\r\n- a\n- b\r\n\r\nLast\n" });
  await run.send("previewEditSave", {
    editId: "e1", line: 3, endLine: 4, originalText: "- a\n- b\r\n", editedText: "- a\n- b\n- c\r\n", final: false,
  });
  assert.deepEqual(run.of("previewEditSource"), []);
  assert.equal(run.document.getText(), "# Title\r\n\r\n- a\n- b\n- c\r\n\r\nLast\n");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-234
test("the last block of a CRLF document without a final line break takes CR LF", async () => {
  const run = fixture({ text: "# Title\r\n\r\nLast" });
  await run.send("previewEditSave", {
    editId: "e1", line: 3, endLine: 3, originalText: "Last", editedText: "Last\nmore", final: true,
  });
  assert.equal(run.document.getText(), "# Title\r\n\r\nLast\r\nmore");
});

const READ_ONLY = "This file is read-only in VS Code.";

// @tests_req SwRS-MDOKFSTUDIO-TRUST-001
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-058
test("a move, a cut and a paste on a file VS Code holds read-only answer the read-only reason, trusted or not", async () => {
  for (const restrictedReads of [false, true]) {
    const readOnly = fixture({ restrictedReads });
    readOnly.hooks.readOnly = true;
    await readOnly.send("previewBlockMove", { line: 3, endLine: 3, neighbourLine: 5, neighbourEndLine: 5, direction: "down" });
    await readOnly.send("previewBlocksCut", { line: 3, endLine: 3 });
    await readOnly.send("previewBlocksPaste", { insertAfterLine: 3 });
    assert.deepEqual(readOnly.of("previewBlockMoveResult").map(({ ok, reason }) => ({ ok, reason })), [{ ok: false, reason: READ_ONLY }]);
    assert.deepEqual(readOnly.of("previewBlocksResult").map(({ op, ok, reason }) => ({ op, ok, reason })), [
      { op: "cut", ok: false, reason: READ_ONLY },
      { op: "paste", ok: false, reason: READ_ONLY },
    ]);
    assert.equal(readOnly.document.getText(), MARKDOWN);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-001
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-058
test("a block save on a file VS Code holds read-only is told, and the images pasted meanwhile are removed", async () => {
  for (const restrictedReads of [false, true]) {
    const readOnly = fixture({ restrictedReads });
    readOnly.hooks.readOnly = true;
    await readOnly.send("previewEditOpen", { editId: "e1", line: 5, endLine: 5 });
    // The image the page pasted into this editor was saved next to the document.
    readOnly.preview.edits.pastedImages = ["/w/image.png"];
    await readOnly.send("previewEditSave", { ...SECOND, editedText: "Changed ![](image.png)\n", final: true });
    const errors = readOnly.of("previewEditSource").map((entry) => entry.error).filter((error) => error !== undefined);
    assert.deepEqual(errors, [READ_ONLY]);
    assert.deepEqual(readOnly.deleted, ["/w/image.png"], "no orphan image is left");
    assert.equal(readOnly.document.getText(), MARKDOWN);
  }
});
