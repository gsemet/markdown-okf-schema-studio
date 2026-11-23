/**
 * The detached edit of the host (CR-475): a final save whose editor the writer cancelled while it
 * was in flight ends with an answer the page can act on, and a failure gives the text back.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { fixture, settle } from "./blockFixture";

const FIRST = { editId: "e1", line: 3, endLine: 3, originalText: "First paragraph.\n" };
const SAVE = { ...FIRST, editedText: "Changed.\n", final: true };
const SECOND = { line: 5, endLine: 5, originalText: "Second paragraph.\n" };
const BUSY = "Another Markdown block is already being edited.";

/** A fixture whose write waits until `open()` is called, so the final save stays in flight. */
function heldSave() {
  const run = fixture();
  let open!: () => void;
  run.hooks.gate = new Promise<void>((resolve) => { open = resolve; });
  return { run, open };
}

type Run = ReturnType<typeof fixture>;

/** Opens the first block, sends its final save and the detaching close. */
async function detach(run: Run): Promise<void> {
  await run.send("previewEditOpen", FIRST);
  await run.send("previewEditSave", SAVE);
  await run.send("previewEditClosed", { editId: "e1", detached: true });
}

const errors = (run: Run) => run.of("previewEditSource").filter((entry) => typeof entry.error === "string");
const dones = (run: Run) => run.of("previewEditSource").filter((entry) => entry.done === true);

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-053
test("a detached save completes with done and renderFollows, and the host edit ends", async () => {
  const { run, open } = heldSave();
  run.manager.sourceAvailable = () => true;
  await detach(run);
  assert.equal(run.preview.edits.active?.detached, true);
  assert.equal(run.preview.edits.lock.pageEditor, undefined, "the page editor is closed");
  open();
  await settle();
  assert.ok(run.document.getText().includes("Changed."));
  assert.equal(dones(run).length, 1);
  assert.equal(dones(run)[0]!.editId, "e1");
  assert.equal(dones(run)[0]!.renderFollows, true);
  assert.equal(run.preview.edits.active, undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-053
test("a detached save that wrote nothing ends with a plain done", async () => {
  const run = fixture();
  await run.send("previewEditOpen", FIRST);
  await run.send("previewEditSave", { ...FIRST, editedText: "First paragraph.\n", final: true });
  await run.send("previewEditClosed", { editId: "e1", detached: true });
  assert.equal(dones(run).length, 1, "a final save always gets an answer");
  assert.equal(dones(run)[0]!.renderFollows, undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-053
test("an idle edit completes at the detach, with its answer", async () => {
  const run = fixture();
  await run.send("previewEditOpen", FIRST);
  await run.send("previewEditSave", { ...FIRST, editedText: "Changed.\n", final: false });
  await run.send("previewEditClosed", { editId: "e1", detached: true });
  assert.equal(run.preview.edits.active, undefined, "nothing waits: the edit ends");
  assert.equal(dones(run).length, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-216
test("a refused final save answers with the writer's text; an open and an autosave give none", async () => {
  const run = fixture();
  await run.send("previewEditOpen", FIRST);
  await run.send("previewEditSave", { ...SAVE, final: false, originalText: "Not the source.\n" });
  assert.equal(errors(run)[0]!.unsavedText, undefined);
  await run.send("previewEditSave", { ...SAVE, originalText: "Not the source.\n" });
  assert.equal(errors(run)[1]!.unsavedText, "Changed.\n");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-216
test("a detached save that fails gives the text back and waits for the page", async () => {
  const { run } = heldSave();
  run.hooks.rejectWith = new Error("disk full");
  await detach(run);
  run.hooks.gate = undefined;
  await settle();
  const error = errors(run).find((entry) => entry.error === "disk full");
  assert.equal(error?.unsavedText, "Changed.\n");
  assert.equal(run.preview.edits.lock.pageEditor, "e1", "the render waits for the reopened editor");
  assert.equal(run.preview.edits.unsaved?.editId, "e1");
  await run.send("previewEditReopen", { editId: "e1", reopened: true });
  assert.equal(run.preview.edits.unsaved, undefined);
  assert.equal(run.preview.edits.active?.detached, false, "the reopened editor retries the save");
  assert.equal(run.preview.edits.watchedPageEditorId, "e1");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-216
test("a Cancel that crosses the error does not detach the edit: the host waits for the reopen", async () => {
  const run = fixture();
  await run.send("previewEditOpen", FIRST);
  await run.send("previewEditSave", { ...SAVE, originalText: "Not the source.\n" });
  await run.send("previewEditClosed", { editId: "e1", detached: true });
  assert.equal(run.preview.edits.lock.pageEditor, "e1");
  assert.equal(run.preview.edits.unsaved?.editId, "e1");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-216
test("a normal close after an error forgets the kept text", async () => {
  const run = fixture();
  await run.send("previewEditOpen", FIRST);
  await run.send("previewEditSave", { ...SAVE, originalText: "Not the source.\n" });
  await run.send("previewEditClosed", { editId: "e1" });
  assert.equal(run.preview.edits.unsaved, undefined);
  assert.equal(run.preview.edits.lock.pageEditor, undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-216
test("a page that cannot reopen the editor gets a warning that copies the text", async () => {
  const { run } = heldSave();
  run.hooks.rejectWith = new Error("disk full");
  const copied: string[] = [];
  run.hooks.writeClipboard = (text) => { copied.push(text); return Promise.resolve(); };
  run.hooks.warningChoice = "Copy text";
  await detach(run);
  run.hooks.gate = undefined;
  await settle();
  await run.send("previewEditReopen", { editId: "e1", reopened: false });
  assert.equal(run.preview.edits.active, undefined, "the edit is released");
  assert.equal(run.preview.edits.lock.pageEditor, undefined);
  assert.equal(run.warnings.length, 1);
  assert.match(run.warnings[0]!, /could not be saved, and the preview could not show it again: disk full/u);
  assert.deepEqual(copied, ["Changed.\n"]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-216
test("dismissing the warning writes nothing to the clipboard", async () => {
  const { run } = heldSave();
  run.hooks.rejectWith = new Error("disk full");
  const copied: string[] = [];
  run.hooks.writeClipboard = (text) => { copied.push(text); return Promise.resolve(); };
  await detach(run);
  run.hooks.gate = undefined;
  await settle();
  await run.send("previewEditReopen", { editId: "e1", reopened: false });
  assert.equal(run.warnings.length, 1);
  assert.deepEqual(copied, []);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-053
test("previewReady does not release a detached edit, whatever blockEditOpen says", async () => {
  const { run, open } = heldSave();
  Object.assign(run.manager.host, { logger: { error: () => undefined, warn: () => undefined, info: () => undefined } });
  Object.assign(run.manager.scroll, { markEditorSelectionInPreview: () => undefined, postPageLiveState: () => undefined });
  await detach(run);
  await run.manager.handlePageMessage(run.preview, run.message("previewReady", { blockEditOpen: true }));
  assert.ok(run.preview.edits.active, "blockEditOpen true: the page still holds the save");
  await run.manager.handlePageMessage(run.preview, run.message("previewReady", { blockEditOpen: false }));
  assert.ok(run.preview.edits.active, "blockEditOpen false: a detached save has no editor, and ends with its own answer");
  assert.equal(run.preview.edits.active?.detached, true);
  open();
  await settle();
  assert.equal(run.preview.edits.active, undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-053
test("a release of a detached edit keeps a newer page editor", async () => {
  const { run, open } = heldSave();
  await detach(run);
  run.preview.edits.lock.openPageEditor("e2");
  open();
  await settle();
  assert.equal(run.preview.edits.active, undefined);
  assert.equal(run.preview.edits.lock.pageEditor, "e2");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-053
test("an open that arrives during a detached edit is held, at most one, and handled when it ends", async () => {
  const { run, open } = heldSave();
  await detach(run);
  await run.send("previewEditOpen", { ...SECOND, editId: "e2" });
  await run.send("previewEditOpen", { ...SECOND, editId: "e3" });
  assert.deepEqual(errors(run).filter((entry) => entry.error === BUSY).map((entry) => entry.editId), ["e2"]);
  open();
  await settle();
  // The held open meets its usual checks: the render it was sent for is behind the written text.
  assert.equal(run.of("previewEditSource").filter((entry) => entry.editId === "e3").length, 1, "the held open was handled after the end");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-216
test("a held open is refused when the detached edit fails", async () => {
  const { run } = heldSave();
  run.hooks.rejectWith = new Error("disk full");
  await detach(run);
  await run.send("previewEditOpen", { ...SECOND, editId: "e2" });
  run.hooks.gate = undefined;
  await settle();
  assert.deepEqual(errors(run).filter((entry) => entry.error === BUSY).map((entry) => entry.editId), ["e2"]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-191
test("an outside change while a final save is requested gives the text back and keeps the render waiting", async () => {
  const { run, open } = heldSave();
  await run.send("previewEditOpen", FIRST);
  await run.send("previewEditSave", SAVE);
  const edit = run.preview.edits.active!;
  assert.equal(edit.finalRequested, true);
  const outcome = run.manager.edits.keepTextOnOutsideChange(run.preview, edit);
  assert.equal(outcome, true);
  const error = errors(run).find((entry) => /outside the preview/u.test(String(entry.error)));
  assert.equal(error?.unsavedText, "Changed.\n");
  assert.equal(run.preview.edits.lock.pageEditor, "e1");
  assert.equal(run.preview.edits.active, undefined, "the host edit is released without a write");
  open();
  await settle();
});

/** Binds the render the stage holds to the document, so an open after a write is not refused as stale. */
function followDocument(run: Run): void {
  Object.defineProperty(run.preview.stage, "activeDocumentRevision", { get: () => run.document.revision, configurable: true });
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-053
test("decision 1 (c): an open held during a detached edit gets no answer and opens no page editor", async () => {
  const { run } = heldSave();
  await detach(run);
  await run.send("previewEditOpen", { ...SECOND, editId: "e2" });
  assert.deepEqual(run.of("previewEditSource").filter((entry) => entry.editId === "e2"), []);
  assert.equal(run.preview.edits.heldOpen?.editId, "e2");
  assert.equal(run.preview.edits.lock.pageEditor, undefined, "the held open is not an open editor yet");
  assert.equal(run.preview.edits.active?.detached, true);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-053
test("decision 1 (a): the held open is handled after the end and opens on the written document", async () => {
  const { run, open } = heldSave();
  followDocument(run);
  await detach(run);
  await run.send("previewEditOpen", { ...SECOND, editId: "e2", revision: run.document.revision });
  open();
  await settle();
  const answers = run.of("previewEditSource").filter((entry) => entry.editId === "e2");
  assert.equal(answers.length, 1, "one answer, after the end");
  assert.equal(answers[0]!.originalText, "Second paragraph.\n");
  assert.equal(run.preview.edits.lock.pageEditor, "e2");
  assert.equal(run.preview.edits.heldOpen, undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-216
test("a retry of a reopened editor is accepted, with the same identity, and writes the text", async () => {
  const { run } = heldSave();
  run.hooks.rejectWith = new Error("disk full");
  await detach(run);
  run.hooks.gate = undefined;
  await settle();
  await run.send("previewEditReopen", { editId: "e1", reopened: true });
  run.hooks.rejectWith = undefined;
  const before = run.document.getText();
  await run.send("previewEditSave", SAVE);
  assert.notEqual(run.document.getText(), before);
  assert.ok(run.document.getText().includes("Changed."));
  assert.equal(run.preview.edits.active, undefined, "the retry completed");
  assert.equal(errors(run).filter((entry) => entry.error !== "disk full").length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-216
test("a refusal that arrives before the detaching close keeps the text and the page editor wait", async () => {
  const run = fixture();
  await run.send("previewEditOpen", FIRST);
  await run.send("previewEditSave", { ...SAVE, originalText: "Not the source.\n" });
  assert.equal(errors(run)[0]!.unsavedText, "Changed.\n");
  await run.send("previewEditClosed", { editId: "e1", detached: true });
  assert.equal(run.preview.edits.unsaved?.text, "Changed.\n");
  assert.equal(run.preview.edits.lock.pageEditor, "e1");
  await run.send("previewEditReopen", { editId: "e1", reopened: true });
  assert.equal(run.preview.edits.unsaved, undefined);
  assert.equal(run.preview.edits.watchedPageEditorId, "e1");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-216
test("a source block that changed under a final save gives the text back", async () => {
  const run = fixture();
  await run.send("previewEditOpen", FIRST);
  await run.send("previewEditSave", { ...SAVE, final: false });
  assert.ok(run.document.getText().includes("Changed."));
  Reflect.set(run.document, "text", run.document.getText().replace("Changed.", "Other writer."));
  await run.send("previewEditSave", { ...SAVE, editedText: "Changed again.\n" });
  const error = errors(run).find((entry) => entry.error === "The source block changed while it was being edited.");
  assert.equal(error?.unsavedText, "Changed again.\n");
  assert.equal(run.preview.edits.unsaved?.editId, "e1");
  assert.equal(run.preview.edits.lock.pageEditor, "e1");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-216
test("a final save VS Code refuses gives the text back", async () => {
  const run = fixture();
  run.hooks.refuse = true;
  await run.send("previewEditOpen", FIRST);
  await run.send("previewEditSave", SAVE);
  const error = errors(run).find((entry) => entry.error === "VS Code could not apply the Markdown edit.");
  assert.equal(error?.unsavedText, "Changed.\n");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-053
test("a Cancel requested before the close restores the block and is not a detach", async () => {
  const run = fixture();
  await run.send("previewEditOpen", FIRST);
  await run.send("previewEditSave", { ...FIRST, editedText: "Changed.\n", final: false });
  assert.ok(run.document.getText().includes("Changed."));
  await run.send("previewEditCancel", FIRST);
  await run.send("previewEditClosed", { editId: "e1" });
  assert.ok(run.document.getText().includes("First paragraph."), "the cancel restored the text");
  assert.equal(run.preview.edits.active, undefined);
  assert.equal(run.preview.edits.unsaved, undefined);
});

/** A change of the document made outside the preview, reported to the host as VS Code reports it. */
function outsideChange(run: Run): void {
  Object.assign(run.manager.host, { editors: {} });
  run.manager.sourceAvailable = () => true;
  // The frontmatter and the render of the outside text are out of scope: the host only asks for them.
  Object.assign(run.manager.frontmatter, { refresh: () => undefined });
  Object.assign(run.manager.rendering, { refreshOpenDocument: () => Promise.resolve() });
  const text = run.document.getText();
  Reflect.set(run.document, "text", `${text}\nAppended outside.\n`);
  run.manager.events.onDocumentChanged({
    document: run.document,
    changes: [{ start: text.length, length: 0, text: "\nAppended outside.\n", startLine: 9, endLine: 9 }],
  } as never);
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-191
test("Q16: an outside change while the editor on a final save is still open gives the text back and keeps the editor", async () => {
  const run = fixture();
  await run.send("previewEditOpen", FIRST);
  await run.send("previewEditSave", { ...SAVE, final: false });
  const edit = run.preview.edits.active!;
  edit.finalRequested = true;
  edit.lastMessage = { ...edit.lastMessage, ...SAVE } as typeof edit.lastMessage;
  outsideChange(run);
  await settle();
  const error = errors(run).find((entry) => /outside the preview/u.test(String(entry.error)));
  assert.equal(error?.unsavedText, "Changed.\n");
  assert.equal(run.preview.edits.active, undefined, "the host edit is released without a write");
  assert.equal(run.preview.edits.lock.pageEditor, "e1", "the editor stays open: the render waits for it");
  assert.equal(dones(run).length, 0, "no done: the save did not end");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-191
test("Q13: an outside change during a detached final save gives the text back and the page reopens the editor", async () => {
  const { run } = heldSave();
  await detach(run);
  run.preview.edits.active!.applying = false;
  outsideChange(run);
  await settle();
  const error = errors(run).find((entry) => /outside the preview/u.test(String(entry.error)));
  assert.equal(error?.unsavedText, "Changed.\n");
  assert.equal(run.preview.edits.lock.pageEditor, "e1");
  await run.send("previewEditReopen", { editId: "e1", reopened: true });
  assert.equal(run.preview.edits.watchedPageEditorId, "e1");
});
