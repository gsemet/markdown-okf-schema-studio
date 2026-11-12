import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness } from "./runtimeHarness";
import { frontmatterSaves, openTableCellEditor, openTextFieldEditor } from "./runtimeTestSupport";

/**
 * The save key with a table-cell editor or a frontmatter field of the properties table open (CR 312,
 * features/blockEditor.ts). The block editor's case is in runtimeBlockEditor.test.ts.
 */

const IDS = { documentId: "file:///active.md", revision: 7, requestId: 11 };
const SAVE_COMMAND = { type: "previewSaveCommand", ...IDS };

function openObjectYamlEditor() {
  const harness = createRuntimeHarness();
  harness.frontmatterRow.setAttribute("data-okf-type", "object");
  harness.frontmatterRow.setAttribute("data-okf-value", JSON.stringify({ a: 1 }));
  harness.frontmatterRow.setAttribute("data-okf-value-yaml", "a: 1\n");
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  return { harness, textarea };
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-173
test("CR 312: the save command writes the typed frontmatter value as a flush before the save request", () => {
  const { harness, textarea } = openTextFieldEditor("Alpha");
  textarea.value = "Beta";
  const before = harness.messages.length;
  harness.dispatchMessage(SAVE_COMMAND);
  const posted = harness.messages.slice(before);
  assert.deepEqual(posted.map((message) => message.type), ["previewFrontmatterSave", "previewSaveRequest"]);
  assert.equal(posted[0].fieldValue, "Beta");
  assert.equal(posted[0].flush, true);
  assert.equal(frontmatterSaves(harness).length, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-173
test("CR 312: a refused plain save is written again as a flush, then the save request follows", () => {
  const { harness, textarea } = openObjectYamlEditor();
  textarea.value = "[unclosed";
  textarea.dispatch("blur");
  const plain = frontmatterSaves(harness);
  assert.equal(plain.length, 1);
  const before = harness.messages.length;
  harness.dispatchMessage(SAVE_COMMAND);
  assert.deepEqual(harness.messages.slice(before).map((message) => message.type), [],
    "the request waits for the pending save");
  harness.dispatchMessage({ type: "previewFrontmatterResult", ...IDS, editId: plain[0].editId, error: "Invalid YAML value" });
  const posted = harness.messages.slice(before);
  assert.deepEqual(posted.map((message) => message.type), ["previewFrontmatterSave", "previewSaveRequest"]);
  assert.equal(posted[0].fieldValue, "[unclosed");
  assert.equal(posted[0].flush, true);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-173
test("CR 312: a plain save with no result still gets its save request after the bounded wait", () => {
  const { harness, textarea } = openObjectYamlEditor();
  textarea.value = "[unclosed";
  textarea.dispatch("blur");
  const before = harness.messages.length;
  harness.dispatchMessage(SAVE_COMMAND);
  assert.deepEqual(harness.messages.slice(before).map((message) => message.type), []);
  harness.flushTimers();
  assert.deepEqual(harness.messages.slice(before).map((message) => message.type).at(-1), "previewSaveRequest");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-173
test("CR 312: the save command posts the typed cell text as an autosave, then the save request, and keeps the cell editor open", () => {
  const harness = createRuntimeHarness();
  const input = openTableCellEditor(harness);
  input.value = "typed";
  input.dispatch("input");
  input.setSelectionRange(1, 3);
  const before = harness.messages.length;
  harness.dispatchMessage(SAVE_COMMAND);
  const posted = harness.messages.slice(before);
  assert.deepEqual(posted.map((message) => message.type), ["previewEditSave", "previewSaveRequest"]);
  assert.equal(posted[0].final, false);
  assert.match(String(posted[0].editedText), /\| typed\s*\|/u, "the cell's typed text is in the save");
  assert.equal(input.value, "typed", "the cell value is unchanged");
  assert.deepEqual([input.selectionStart, input.selectionEnd], [1, 3], "the selection is unchanged");
  assert.equal(input.removed, false, "the cell editor stays open");
  const again = harness.messages.length;
  harness.dispatchMessage(SAVE_COMMAND);
  assert.deepEqual(harness.messages.slice(again).map((message) => message.type), ["previewSaveRequest"],
    "no pending autosave: only the request");
});
