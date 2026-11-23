import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, type RuntimeElement, type RuntimeHarness } from "./runtimeHarness";
import {
  findButton, moveMessages, openBlockEditorWithSource, openTableCellEditor, openTableCellEditorForTab, patchMessage,
} from "./runtimeTestSupport";

/** Every way out of an editor whose final save is in flight closes it (CR 475, cell editors). */

const posts = (harness: RuntimeHarness, type: string, from = 0): Array<Record<string, unknown>> =>
  harness.messages.slice(from).filter((message) => message.type === type);

/** A cell editor with a changed cell whose final save (Enter) is posted. */
function finishingCell(): { harness: RuntimeHarness; input: ReturnType<typeof openTableCellEditor>; editId: string } {
  const harness = createRuntimeHarness();
  const input = openTableCellEditor(harness);
  const editId = String(harness.messages.at(-1)?.editId);
  input.value = "changed";
  input.dispatch("input");
  input.dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  assert.equal(posts(harness, "previewEditSave").filter((message) => message.final === true).length, 1);
  return { harness, input, editId };
}

// @tests_req SwRS-MDOKFSTUDIO-TABLE-025
// @tests_req SwRS-MDOKFSTUDIO-TABLE-025
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-270
test("Escape in the cell input closes a cell editor whose final save is in flight", () => {
  const { harness, input, editId } = finishingCell();
  const before = harness.messages.length;
  input.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  assert.deepEqual(harness.messages.slice(before).map((message) => message.type), ["previewEditClosed"]);
  assert.equal(posts(harness, "previewEditClosed", before)[0]!.editId, editId);
  assert.equal(posts(harness, "previewEditCancel").length, 0, "the save is not cancelled");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-025
// @tests_req SwRS-MDOKFSTUDIO-TABLE-025
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-270
test("Escape outside the cell editor closes a cell editor whose final save is in flight", () => {
  const { harness } = finishingCell();
  const before = harness.messages.length;
  harness.dispatchDocument("keydown", { key: "Escape", target: harness.body, preventDefault: () => undefined });
  assert.deepEqual(harness.messages.slice(before).map((message) => message.type), ["previewEditClosed"]);
});

// Checks 1 to 5 of CR 475: every way a final save ends closes the editor or shows an error.
const IDENTITY = { documentId: "file:///active.md", revision: 7, requestId: 11 };
const ERRORS: Array<{ error: string; unsavedText?: string }> = [
  { error: "Select a block to edit." },
  { error: "The source block changed outside the preview while it was being edited. Copy your text, then reopen the block.", unsavedText: "kept" },
  { error: "VS Code could not apply the Markdown edit." },
  { error: "The file changed outside the preview before your text was saved. Copy your text, then reopen the block.", unsavedText: "kept" },
];

interface Finishing {
  harness: RuntimeHarness;
  editId: string;
  /** Posts the final save again (Done or Enter). */
  again: () => void;
}

const EDITORS: Array<{ name: string; start: () => Finishing }> = [
  {
    name: "paragraph editor",
    start: () => {
      const harness = createRuntimeHarness();
      const box = openBlockEditorWithSource(harness);
      const editId = String(harness.messages.at(-1)?.editId);
      box.value = "Second paragraph, changed.";
      box.dispatch("input");
      findButton(harness, "Done editing").dispatch("click");
      return { harness, editId, again: () => findButton(harness, "Done editing").dispatch("click") };
    },
  },
  {
    name: "cell editor",
    start: () => {
      const { harness, input, editId } = finishingCell();
      return { harness, editId, again: () => input.dispatch("keydown", { key: "Enter", preventDefault: () => undefined }) };
    },
  },
];

const editing = (harness: RuntimeHarness): boolean =>
  (harness.document as { documentElement: RuntimeElement }).documentElement.getAttribute("data-sphinx-preview-block-editing") !== null;
const finalSaves = (harness: RuntimeHarness): number =>
  posts(harness, "previewEditSave").filter((message) => message.final === true).length;

for (const editor of EDITORS) {
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-053
  test(`${editor.name}: the patch of the save closes the editor`, () => {
    const { harness } = editor.start();
    assert.equal(editing(harness), true, "open while the save is in flight");
    harness.dispatchMessage(patchMessage());
    assert.equal(editing(harness), false);
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-053
  test(`${editor.name}: an answer done closes the editor`, () => {
    const { harness, editId } = editor.start();
    harness.dispatchMessage({ type: "previewEditSource", ...IDENTITY, editId, done: true });
    assert.equal(editing(harness), false);
  });

  for (const answer of ERRORS) {
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-053
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-216
    test(`${editor.name}: the error "${answer.error.slice(0, 40)}" leaves it open to retry, with no reopen`, () => {
      const { harness, editId, again } = editor.start();
      harness.dispatchMessage({ type: "previewEditSource", ...IDENTITY, editId, ...answer });
      assert.equal(editing(harness), true, "still open");
      assert.ok(harness.createdElements.some((element) => element.textContent === answer.error && !element.removed), "the error shows");
      assert.equal(posts(harness, "previewEditReopen").length, 0, "nothing was detached");
      again();
      assert.equal(finalSaves(harness), 2, "the save can be posted again: not stuck on Saving");
    });
  }
}

const CHORD = { key: "ArrowDown", ctrlKey: true, altKey: true, preventDefault: () => undefined, stopPropagation: () => undefined };
const EDGE = { key: "ArrowDown", preventDefault: () => undefined, stopPropagation: () => undefined };

const NAVIGATIONS: Array<{ name: string; ask: (harness: RuntimeHarness, box: RuntimeElement) => void; lands: (harness: RuntimeHarness, from: number) => boolean }> = [
  {
    name: "the move chord",
    ask: (_harness, box) => box.dispatch("keydown", CHORD),
    lands: (harness, from) => moveMessages(harness, from).length === 1,
  },
  {
    name: "an arrow at the block edge",
    ask: (_harness, box) => {
      box.selectionStart = box.value.length;
      box.selectionEnd = box.value.length;
      box.dispatch("keydown", EDGE);
    },
    lands: (harness, from) => posts(harness, "previewEditOpen", from).length === 1,
  },
  {
    name: "a click on another block",
    ask: (harness) => harness.dispatchDocument("click", { target: harness.mappings[2], preventDefault: () => undefined, stopPropagation: () => undefined }),
    lands: (harness, from) => posts(harness, "previewEditOpen", from).length === 1,
  },
];

for (const navigation of NAVIGATIONS) {
  for (const ending of ["an answer done", "a patch"] as const) {
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-053
    test(`${navigation.name} asked during the save is carried out after ${ending}`, () => {
      const harness = createRuntimeHarness();
      const box = openBlockEditorWithSource(harness);
      const editId = String(harness.messages.at(-1)?.editId);
      box.value = "Second paragraph, changed.";
      box.dispatch("input");
      navigation.ask(harness, box);
      assert.equal(finalSaves(harness), 1);
      const before = harness.messages.length;
      if (ending === "a patch") harness.dispatchMessage(patchMessage());
      else harness.dispatchMessage({ type: "previewEditSource", ...IDENTITY, editId, done: true });
      assert.equal(navigation.lands(harness, before), true, "the pending navigation ran");
    });
  }
}

// @tests_req SwRS-MDOKFSTUDIO-TABLE-025
test("a Tab at the last cell during the save adds the row after the answer", () => {
  const harness = createRuntimeHarness();
  const opened = openTableCellEditorForTab(harness, { mapped: true, start: [2, 1] });
  const editId = String(harness.messages.at(-1)?.editId);
  opened.input().value = "changed";
  opened.input().dispatch("input");
  opened.input().dispatch("keydown", { key: "Tab", preventDefault: () => undefined });
  assert.equal(finalSaves(harness) >= 1, true, "the save is posted");
  harness.dispatchMessage({ type: "previewEditSource", ...IDENTITY, editId, done: true });
  assert.equal(editing(harness), true, "an editor is open on the added row");
});
