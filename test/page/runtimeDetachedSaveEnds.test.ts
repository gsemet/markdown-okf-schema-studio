import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, type RuntimeHarness } from "./runtimeHarness";
import {
  findButton, frontmatterSaves, moveMessages, openBlockEditorWithSource, openTableCellEditorForTab, patchMessage,
} from "./runtimeTestSupport";

/**
 * How a detached save ends and what waits for it (CR 475, checks 6 to 11, 13 and 18): Escape and
 * Cancel leave the final save in flight; a navigation the writer asked for before is dropped; a
 * patch alone does not end the save; a field click waits for the end and is dropped by a failure.
 */

const DONE = "Done editing";
const CANCEL = "Cancel editing and restore the original text";
const IDENTITY = { documentId: "file:///active.md", revision: 7, requestId: 11 };
const escape = { key: "Escape", preventDefault: () => undefined, stopPropagation: () => undefined };
const SELECTED = "data-sphinx-preview-block-selected";

const posts = (harness: RuntimeHarness, type: string, from = 0): Array<Record<string, unknown>> =>
  harness.messages.slice(from).filter((message) => message.type === type);
const finals = (harness: RuntimeHarness, from = 0): Array<Record<string, unknown>> =>
  posts(harness, "previewEditSave", from).filter((message) => message.final === true);
const anyClick = (harness: RuntimeHarness, target: unknown = harness.mappings[0]): void =>
  harness.dispatchDocument("click", { target, preventDefault: () => undefined, stopPropagation: () => undefined });

/** A paragraph editor with a typed change; its text box is returned. */
function typed(harness: RuntimeHarness): { box: ReturnType<typeof openBlockEditorWithSource>; editId: string } {
  const box = openBlockEditorWithSource(harness);
  const editId = String(harness.messages.at(-1)?.editId);
  box.value = "Second paragraph, changed.";
  box.dispatch("input");
  return { box, editId };
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-053#S4
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-270#S1
test("Escape during the final save closes the editor once, cancels nothing and posts no second save", () => {
  const harness = createRuntimeHarness();
  const { box, editId } = typed(harness);
  findButton(harness, DONE).dispatch("click");
  assert.equal(finals(harness).length, 1);
  const before = harness.messages.length;
  box.dispatch("keydown", escape);
  assert.deepEqual(harness.messages.slice(before).map((message) => message.type), ["previewEditClosed"]);
  assert.equal(posts(harness, "previewEditClosed", before)[0]!.editId, editId);
  assert.equal(posts(harness, "previewEditClosed", before)[0]!.detached, true);
  assert.equal(posts(harness, "previewEditCancel").length, 0);
  assert.equal(finals(harness).length, 1);
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), null, "the editor is closed");
  assert.notEqual(harness.mappings[1].getAttribute(SELECTED), null, "the edited block is selected");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-053#S1
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-053#S4
test("Cancel with no final save posted leaves nothing detached: nothing to cancel without an autosave, a cancel with one", () => {
  for (const autosaved of [false, true]) {
    const harness = createRuntimeHarness();
    const { editId } = typed(harness);
    if (autosaved) harness.advanceTimers(5000);
    assert.equal(posts(harness, "previewEditSave").length, autosaved ? 1 : 0, "the autosave ran or not");
    const before = harness.messages.length;
    findButton(harness, CANCEL).dispatch("click");
    assert.equal(finals(harness, before).length, 0, "no final save");
    assert.equal(posts(harness, "previewEditClosed", before).filter((message) => message.detached === true).length, 0);
    const cancel = posts(harness, "previewEditCancel", before);
    assert.equal(cancel.length, autosaved ? 1 : 0, `autosaved ${autosaved}`);
    if (autosaved) assert.equal(cancel[0]!.editId, editId);
    anyClick(harness);
    assert.equal(posts(harness, "previewEditOpen", before).length, 1, "the next click opens at once");
  }
});

/** Dispatches the host's end of the save, then a patch; nothing the writer asked before may start. */
function endAndPatch(harness: RuntimeHarness, editId: string, renderFollows: boolean): void {
  harness.dispatchMessage({ type: "previewEditSource", ...IDENTITY, editId, done: true, ...(renderFollows ? { renderFollows: true } : {}) });
  harness.dispatchMessage(patchMessage());
}

const CHORD = { key: "ArrowDown", ctrlKey: true, altKey: true, preventDefault: () => undefined, stopPropagation: () => undefined };
const EDGE = { key: "ArrowDown", preventDefault: () => undefined, stopPropagation: () => undefined };

const NAVIGATIONS: Array<{ name: string; ask: (harness: RuntimeHarness, box: ReturnType<typeof openBlockEditorWithSource>) => void }> = [
  { name: "the move chord", ask: (_harness, box) => box.dispatch("keydown", CHORD) },
  {
    name: "an arrow at the block edge",
    ask: (_harness, box) => {
      box.selectionStart = box.value.length;
      box.selectionEnd = box.value.length;
      box.dispatch("keydown", EDGE);
    },
  },
  { name: "a click on another block", ask: (harness) => anyClick(harness, harness.mappings[2]) },
];

for (const navigation of NAVIGATIONS) {
  for (const renderFollows of [false, true]) {
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-053#S6
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-216#S3
    test(`${navigation.name} asked before an Escape is dropped, ${renderFollows ? "with a render" : "without a render"}`, () => {
      const harness = createRuntimeHarness();
      const { box, editId } = typed(harness);
      navigation.ask(harness, box);
      assert.equal(finals(harness).length, 1, "the final save is posted");
      const before = harness.messages.length;
      box.dispatch("keydown", escape);
      endAndPatch(harness, editId, renderFollows);
      assert.deepEqual(posts(harness, "previewEditOpen", before), [], "no editor opens");
      assert.deepEqual(moveMessages(harness, before), [], "no block moves");
      assert.equal(harness.mappings[2].getAttribute("data-sphinx-preview-editing"), null);
      assert.notEqual(harness.mappings[1].getAttribute(SELECTED), null, "the edited block is selected");
    });
  }
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-053#S6
test("a Tab at the last cell asked before an Escape is dropped as well", () => {
  const harness = createRuntimeHarness();
  const opened = openTableCellEditorForTab(harness, { mapped: true });
  const editId = String(harness.messages.at(-1)?.editId);
  opened.input().value = "changed";
  opened.input().dispatch("input");
  opened.input().dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  const before = harness.messages.length;
  opened.input().dispatch("keydown", { key: "Tab", preventDefault: () => undefined });
  opened.input().dispatch("keydown", escape);
  endAndPatch(harness, editId, false);
  assert.deepEqual(posts(harness, "previewEditOpen", before), []);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-053#S4
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-053#S5
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-216#S8
test("a patch alone does not end a detached save: a later error still reopens the editor", () => {
  const harness = createRuntimeHarness();
  const { box, editId } = typed(harness);
  findButton(harness, DONE).dispatch("click");
  box.dispatch("keydown", escape);
  harness.dispatchMessage(patchMessage());
  const before = harness.messages.length;
  anyClick(harness);
  assert.deepEqual(posts(harness, "previewEditOpen", before), [], "the save is still in flight");
  harness.dispatchMessage({ type: "previewEditSource", ...IDENTITY, editId, error: "disk full", unsavedText: "Second paragraph, changed.\n" });
  assert.equal(posts(harness, "previewEditReopen", before).at(-1)?.reopened, true);
  assert.equal(posts(harness, "previewEditOpen", before).length, 0, "the waiting open was dropped by the failure");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-053#S2
test("after the answer the click waits for one previewEditOpen; with a render it opens after the patch with the new revision", () => {
  const plain = createRuntimeHarness();
  const first = typed(plain);
  findButton(plain, DONE).dispatch("click");
  first.box.dispatch("keydown", escape);
  anyClick(plain);
  const mark = plain.messages.length;
  plain.dispatchMessage({ type: "previewEditSource", ...IDENTITY, editId: first.editId, done: true });
  assert.equal(posts(plain, "previewEditOpen", mark).length, 1);

  const render = createRuntimeHarness();
  const second = typed(render);
  findButton(render, DONE).dispatch("click");
  second.box.dispatch("keydown", escape);
  anyClick(render);
  const before = render.messages.length;
  render.dispatchMessage({ type: "previewEditSource", ...IDENTITY, editId: second.editId, done: true, renderFollows: true });
  assert.equal(posts(render, "previewEditOpen", before).length, 0, "none before the patch");
  render.dispatchMessage(patchMessage());
  const opens = posts(render, "previewEditOpen", before);
  assert.equal(opens.length, 1);
  assert.equal(opens[0]!.revision, 8, "the open names the new revision");
});

const FIELD_ROW = {
  "data-okf-field": "priority",
  "data-okf-type": "number",
  "data-okf-value": "2",
  "data-okf-value-yaml": "2\n",
};

/** A page with a block editor whose final save was left with Escape, and a frontmatter field click after it. */
function fieldAfterDetached(): { harness: RuntimeHarness; editId: string } {
  const harness = createRuntimeHarness({ mapFrontmatter: true, frontmatterRowAttributes: FIELD_ROW });
  const { box, editId } = typed(harness);
  findButton(harness, DONE).dispatch("click");
  box.dispatch("keydown", escape);
  anyClick(harness, harness.frontmatterValueCell);
  return { harness, editId };
}
const fieldControl = (harness: RuntimeHarness) =>
  harness.createdElements.find((element) => element.getAttribute("aria-label") === "Frontmatter priority" && !element.removed);

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-019#S3
// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-019#S12
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-053#S5
test("a frontmatter field clicked during a detached save opens only after the save ends", () => {
  const { harness, editId } = fieldAfterDetached();
  assert.equal(fieldControl(harness), undefined, "waits");
  harness.dispatchMessage({ type: "previewEditSource", ...IDENTITY, editId, done: true });
  assert.ok(fieldControl(harness), "opens after the end");
});

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-019#S11
// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-019#S12
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-216#S8
test("a frontmatter field clicked during a detached save does not open when the save fails", () => {
  const { harness, editId } = fieldAfterDetached();
  harness.dispatchMessage({ type: "previewEditSource", ...IDENTITY, editId, error: "disk full", unsavedText: "Second paragraph, changed.\n" });
  assert.equal(fieldControl(harness), undefined, "only the failed editor reopens");
  assert.equal(frontmatterSaves(harness).length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-053#S4
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-216#S8
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-216#S9
test("a block and a field clicked between the Cancel and the error are both dropped by it", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true, frontmatterRowAttributes: FIELD_ROW });
  const { box, editId } = typed(harness);
  findButton(harness, DONE).dispatch("click");
  box.dispatch("keydown", escape);
  anyClick(harness, harness.mappings[2]);
  anyClick(harness, harness.frontmatterValueCell);
  const before = harness.messages.length;
  harness.dispatchMessage({ type: "previewEditSource", ...IDENTITY, editId, error: "disk full", unsavedText: "Second paragraph, changed.\n" });
  assert.equal(posts(harness, "previewEditOpen", before).length, 0);
  assert.equal(fieldControl(harness), undefined);
  const textareas = harness.createdElements.filter((element) => element.tagName === "TEXTAREA" && !element.removed);
  assert.equal(textareas.at(-1)?.value, "Second paragraph, changed.", "the failed editor is the one open");
});
