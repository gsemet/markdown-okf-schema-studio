import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, type RuntimeElement, type RuntimeHarness } from "./runtimeHarness";
import { altKey, findButton, moveMessages, openMoveTextarea } from "./runtimeTestSupport";

/**
 * The block editor on a file with CR LF or mixed line endings: a text box returns LF for every
 * break, so the page gives the text back its own line endings before it compares or posts it
 * (features/blockEditor.ts). An editor left without a change never posts a save and never stays on
 * "Saving Markdown…"; a final save the host answers with `done` closes the editor.
 */

const CRLF_PARAGRAPH = "First line\r\nSecond line\r\n";
const CRLF_NESTED_LIST = "- alpha\r\n- beta\r\n  - nested\r\n\r\n";
const MIXED = "one\r\ntwo\nthree\r\n";

function openWithSource(harness: RuntimeHarness, originalText: string): RuntimeElement {
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText,
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  return textarea;
}

const saves = (harness: RuntimeHarness): Array<Record<string, unknown>> =>
  harness.messages.filter((message) => message.type === "previewEditSave");

const isEditing = (harness: RuntimeHarness): boolean =>
  harness.mappings[1].getAttribute("data-sphinx-preview-editing") === "true";

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-263
test("the text box of a CR LF block shows LF, as a browser does, and Done without a change closes at once", () => {
  for (const original of [CRLF_PARAGRAPH, CRLF_NESTED_LIST, MIXED]) {
    const harness = createRuntimeHarness();
    const textarea = openWithSource(harness, original);
    assert.equal(textarea.value.includes("\r"), false, "the text box holds LF only");
    findButton(harness, "Done editing").dispatch("click");
    assert.deepEqual(saves(harness), [], JSON.stringify(original) + ": nothing to save");
    assert.equal(isEditing(harness), false, "the editor is closed");
    assert.equal(harness.createdElements.some((element) => element.textContent === "Saving Markdown…"), false);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-042
test("typing a letter and deleting it in a CR LF block posts no save, on autosave or on Done", () => {
  const harness = createRuntimeHarness();
  const textarea = openWithSource(harness, CRLF_PARAGRAPH);
  textarea.value += "x";
  textarea.dispatch("input");
  textarea.value = textarea.value.slice(0, -1);
  textarea.dispatch("input");
  harness.flushTimers();
  assert.deepEqual(saves(harness), [], "the text is the source again: no autosave");
  findButton(harness, "Done editing").dispatch("click");
  assert.deepEqual(saves(harness), []);
  assert.equal(isEditing(harness), false);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-234
test("a real edit in a CR LF block posts its text in CR LF, on autosave and on Done", () => {
  const harness = createRuntimeHarness();
  const textarea = openWithSource(harness, CRLF_PARAGRAPH);
  textarea.value = "First line\nSecond line, edited";
  textarea.dispatch("input");
  harness.flushTimers();
  assert.equal(saves(harness).at(-1)?.final, false);
  assert.equal(saves(harness).at(-1)?.editedText, "First line\r\nSecond line, edited\r\n");
  findButton(harness, "Done editing").dispatch("click");
  const final = saves(harness).at(-1);
  assert.equal(final?.final, true);
  assert.equal(final?.editedText, "First line\r\nSecond line, edited\r\n");
  assert.equal(final?.originalText, CRLF_PARAGRAPH);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-234
test("a real edit in a block with mixed line endings keeps the endings of the lines it left alone", () => {
  const harness = createRuntimeHarness();
  const textarea = openWithSource(harness, MIXED);
  textarea.value = "one\ntwo\nthree!";
  textarea.dispatch("input");
  findButton(harness, "Done editing").dispatch("click");
  assert.equal(saves(harness).at(-1)?.editedText, "one\r\ntwo\nthree!\r\n");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-234
// A text box returns LF only (a browser normalises CR and CR LF in `value`), so the only CR the page can
// hold comes from the trailing line ending it keeps apart from the box: it must not lose it on a mixed block.
test("a mixed block ending in a CR keeps that CR and the other endings, unchanged or edited", () => {
  const source = "one\r\ntwo\nthree\r";
  const harness = createRuntimeHarness();
  const textarea = openWithSource(harness, source);
  assert.equal(textarea.value.includes("\r"), false, "the text box holds LF only");
  textarea.value = "one\ntwo\nthree!";
  findButton(harness, "Done editing").dispatch("click");
  assert.equal(saves(harness).at(-1)?.editedText, "one\r\ntwo\nthree!\r");
  const other = createRuntimeHarness();
  openWithSource(other, source);
  findButton(other, "Done editing").dispatch("click");
  assert.deepEqual(saves(other), [], "unchanged: nothing posted");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-263
test("a block of an LF file posts LF, as before", () => {
  const harness = createRuntimeHarness();
  const textarea = openWithSource(harness, "a\nb\n");
  textarea.value = "a\nB";
  findButton(harness, "Done editing").dispatch("click");
  assert.equal(saves(harness).at(-1)?.editedText, "a\nB\n");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-130
test("the move chord on an unchanged CR LF block closes the editor and moves, with no save", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const textarea = openMoveTextarea(harness, CRLF_PARAGRAPH);
  const before = harness.messages.length;
  textarea.setSelectionRange(3, 3);
  textarea.dispatch("keydown", altKey("ArrowDown", { ctrlKey: true }));
  const posted = harness.messages.slice(before);
  assert.equal(posted.some((message) => message.type === "previewEditSave"), false);
  assert.equal(moveMessages(harness, before).length, 1, "the move is requested at once");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-263
test("a final save the host answers with done closes the editor", () => {
  const harness = createRuntimeHarness();
  const textarea = openWithSource(harness, "a\nb\n");
  textarea.value = "a\nB";
  findButton(harness, "Done editing").dispatch("click");
  assert.equal(isEditing(harness), true, "the editor waits for the host");
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: saves(harness).at(-1)?.editId,
    done: true,
  });
  assert.equal(isEditing(harness), false, "the answer closes the editor");
  assert.equal(harness.messages.some((message) => message.type === "previewEditCancel"), false, "nothing to cancel");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-263
test("a done answer for another edit leaves the open editor alone", () => {
  const harness = createRuntimeHarness();
  const textarea = openWithSource(harness, "a\nb\n");
  textarea.value = "a\nB";
  findButton(harness, "Done editing").dispatch("click");
  harness.dispatchMessage({
    type: "previewEditSource", documentId: "file:///active.md", revision: 7, requestId: 11, editId: "other", done: true,
  });
  assert.equal(isEditing(harness), true);
});
