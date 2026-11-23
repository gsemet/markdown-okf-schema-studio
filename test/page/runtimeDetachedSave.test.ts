import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, type RuntimeHarness } from "./runtimeHarness";
import { findButton, openBlockEditorWithSource } from "./runtimeTestSupport";

/**
 * A final save the writer leaves with Cancel or Escape stays in flight (CR 475): the editor is
 * closed, nothing else starts until the host answers, and a failed save gives the text back in a
 * reopened editor on the same block.
 */

const DONE = "Done editing";
const CANCEL = "Cancel editing and restore the original text";
const IDENTITY = { documentId: "file:///active.md", revision: 7, requestId: 11 };

const posts = (harness: RuntimeHarness, type: string, from = 0): Array<Record<string, unknown>> =>
  harness.messages.slice(from).filter((message) => message.type === type);

/** A block editor whose final save is posted and then left with Cancel. */
function detachedHarness(): { harness: RuntimeHarness; editId: string; textarea: ReturnType<typeof openBlockEditorWithSource> } {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const editId = String(harness.messages.at(-1)?.editId);
  textarea.value = "Second paragraph, changed.";
  textarea.dispatch("input");
  findButton(harness, DONE).dispatch("click");
  findButton(harness, CANCEL).dispatch("click");
  return { harness, editId, textarea };
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-053
test("the close of a detached save is reported to the host whether or not it asked to watch", () => {
  const { harness, editId } = detachedHarness();
  assert.deepEqual(posts(harness, "previewEditClosed").map((message) => message.editId), [editId]);
  assert.equal(posts(harness, "previewEditClosed")[0]!.detached, true, "the host learns the save outlives the editor");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-053
test("no other edit starts while a detached save is in flight, and the click waits for its end", () => {
  const { harness, editId } = detachedHarness();
  const before = harness.messages.length;
  harness.dispatchDocument("click", { target: harness.mappings[0], preventDefault: () => undefined });
  assert.deepEqual(posts(harness, "previewEditOpen", before), [], "the open waits");
  harness.dispatchMessage({ type: "previewEditSource", ...IDENTITY, editId, done: true });
  assert.equal(posts(harness, "previewEditOpen", before).length, 1, "the answer lets the waiting open go on");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-053
test("a detached save the host answers with a render to follow ends when the render is applied", () => {
  const { harness, editId } = detachedHarness();
  harness.dispatchMessage({ type: "previewEditSource", ...IDENTITY, editId, done: true, renderFollows: true });
  const before = harness.messages.length;
  harness.dispatchDocument("click", { target: harness.mappings[0], preventDefault: () => undefined });
  assert.deepEqual(posts(harness, "previewEditOpen", before), [], "still in flight until the render");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-216
test("a failed detached save reopens the editor on the same edit with the typed text", () => {
  const { harness, editId } = detachedHarness();
  const before = harness.messages.length;
  harness.dispatchMessage({
    type: "previewEditSource",
    ...IDENTITY,
    editId,
    error: "VS Code could not apply the Markdown edit.",
    unsavedText: "Second paragraph, changed.\n",
  });
  assert.deepEqual(posts(harness, "previewEditOpen", before), [], "no new open: the host still holds the edit");
  const reopen = posts(harness, "previewEditReopen", before);
  assert.equal(reopen.length, 1);
  assert.equal(reopen[0]!.editId, editId);
  assert.equal(reopen[0]!.reopened, true);
  const textareas = harness.createdElements.filter((element) => element.tagName === "TEXTAREA");
  assert.equal(textareas.at(-1)!.value, "Second paragraph, changed.");
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
  // The editor saves again as the same edit, with the identity of its first saves.
  findButton(harness, DONE).dispatch("click");
  const save = posts(harness, "previewEditSave", before).at(-1)!;
  assert.equal(save.editId, editId);
  assert.equal(save.originalText, "Second paragraph.\n");
  assert.equal(save.editedText, "Second paragraph, changed.\n");
  assert.equal(save.revision, 7);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-216
test("a failed detached save whose block is gone tells the host nothing was reopened", () => {
  const { harness, editId } = detachedHarness();
  harness.mappings[1].setAttribute("data-sphinx-source-line", "999");
  harness.mappings[1].removeAttribute("data-sphinx-preview-block");
  const before = harness.messages.length;
  harness.dispatchMessage({ type: "previewEditSource", ...IDENTITY, editId, error: "No.", unsavedText: "kept" });
  const reopen = posts(harness, "previewEditReopen", before);
  assert.equal(reopen.length, 1);
  assert.equal(reopen[0]!.reopened, false);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-053
test("an answer that names another edit does not end a detached save", () => {
  const { harness } = detachedHarness();
  harness.dispatchMessage({ type: "previewEditSource", ...IDENTITY, editId: "another", done: true });
  const before = harness.messages.length;
  harness.dispatchDocument("click", { target: harness.mappings[0], preventDefault: () => undefined });
  assert.deepEqual(posts(harness, "previewEditOpen", before), []);
});
