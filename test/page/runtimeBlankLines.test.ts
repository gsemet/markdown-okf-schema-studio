import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, RuntimeElement, type RuntimeHarness } from "./runtimeHarness";
import { findButton, insertPointAfterLine, MOVE_IDENTIFIERS, patchMessage, plainClick } from "./runtimeTestSupport";

/**
 * The blank-line block (CR-444): built from the host's list of runs, reachable by the keyboard and
 * the pointer, opened as an editor, deleted, and ignored by every selection that is about blocks
 * (features/blankLines.ts, blockSelectionView.ts).
 */

const SELECTED = "data-sphinx-preview-block-selected";
const RUNS = "4-4 55-55 103-103";
const key = (name: string, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  key: name, preventDefault: () => undefined, stopPropagation: () => undefined, ...extra,
});

/** The host's list of runs, as the last element of the content (replaced when there is one). */
function setRuns(harness: RuntimeHarness, runs: string): RuntimeElement {
  const list = new RuntimeElement({ "data-okf-blank-runs": runs, hidden: "" }, harness.windowState, 0, 0, "div");
  harness.previewContent.childElements.filter((child) => child.getAttribute("data-okf-blank-runs") !== null)
    .forEach((child) => child.remove());
  harness.previewContent.appendChild(list);
  return list;
}

/** A harness in edit mode whose content carries `runs` (edit mode left and entered again). */
function harnessWithRuns(runs = RUNS, configuration: Parameters<typeof createRuntimeHarness>[0] = {}): RuntimeHarness {
  const harness = createRuntimeHarness({ savedState: { editMode: true }, trackFocus: true, ...configuration });
  setRuns(harness, runs);
  harness.editModeButton.dispatch("click");
  harness.editModeButton.dispatch("click");
  return harness;
}

function blankBlocks(harness: RuntimeHarness): RuntimeElement[] {
  return harness.createdElements.filter((element) =>
    element.className.split(" ").includes("sphinx-preview-blank-lines") && !element.removed);
}

const runOf = (message: Record<string, unknown> | undefined): number[] => {
  const run = message?.replaceBlankRun as { line: number; endLine: number } | undefined;
  return run ? [run.line, run.endLine] : [];
};

const blankAt = (harness: RuntimeHarness, index: number): RuntimeElement => blankBlocks(harness)[index]!;

function selectedLines(harness: RuntimeHarness): number[] {
  return harness.mappings
    .filter((block) => block.getAttribute(SELECTED) !== null)
    .map((block) => Number(block.getAttribute("data-sphinx-source-line")));
}

const sent = (harness: RuntimeHarness, type: string, from = 0): Array<Record<string, unknown>> =>
  harness.messages.slice(from).filter((message) => message.type === type);

function shiftClick(harness: RuntimeHarness, block: RuntimeElement): void {
  harness.dispatchDocument("click", {
    target: block, shiftKey: true, preventDefault: () => undefined, stopPropagation: () => undefined,
  });
}

/** Selects the blank block `index` with the keyboard: Shift+click on the first block, then Down. */
function selectBlank(harness: RuntimeHarness, index: number): RuntimeElement {
  const blank = blankAt(harness, index);
  // Walk down from the first block until the wanted blank block holds the selection.
  shiftClick(harness, harness.mappings[0]!);
  for (let step = 0; step < 8 && blank.getAttribute(SELECTED) === null; step += 1) {
    harness.dispatchDocument("keydown", key("ArrowDown", { target: harness.document.activeElement ?? harness.mappings[0] }));
  }
  assert.equal(blank.getAttribute(SELECTED), "true", "the blank-line block is selected");
  return blank;
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("edit mode makes one block per run of the host's list, each after the insertion bar above it", () => {
  const harness = harnessWithRuns();
  const blanks = blankBlocks(harness);
  assert.equal(blanks.length, 3);
  assert.ok(insertPointAfterLine(harness, 1).insertedElements.includes(blanks[0]!));
  assert.ok(insertPointAfterLine(harness, 52).insertedElements.includes(blanks[1]!));
  assert.ok(insertPointAfterLine(harness, 100).insertedElements.includes(blanks[2]!));
  for (const blank of blanks) {
    assert.equal(blank.getAttribute("role"), "button");
    assert.equal(blank.getAttribute("tabindex"), "0");
    assert.match(blank.getAttribute("aria-label") ?? "", /^Blank line\. Press Enter to write a block here\.$/u);
    assert.equal(blank.getAttribute("data-sphinx-source-line"), null, "never a mapped block");
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("reading mode has no blank-line block, and edit mode makes them again", () => {
  const harness = harnessWithRuns();
  harness.editModeButton.dispatch("click");
  assert.equal(blankBlocks(harness).length, 0);
  harness.editModeButton.dispatch("click");
  assert.equal(blankBlocks(harness).length, 3);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("only the last element of the content gives the runs: authored attributes make nothing", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  harness.mappings[1]!.setAttribute("data-okf-blank-runs", "4-4");
  harness.mappings[1]!.setAttribute("data-okf-blank-lines", "4-4");
  harness.previewContent.appendChild(new RuntimeElement({ "data-okf-blank-runs": "4-4" }, harness.windowState, 0, 0, "div"));
  harness.previewContent.appendChild(new RuntimeElement({}, harness.windowState, 0, 0, "p"));
  harness.dispatchMessage(patchMessage());
  assert.equal(blankBlocks(harness).length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("malformed or overlapping entries of the list are dropped", () => {
  const harness = harnessWithRuns("4-4 x-9 4-8 0-4 55-55 55-57 junk");
  assert.equal(blankBlocks(harness).length, 2);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("a run inside a block gets no blank-line block", () => {
  const harness = harnessWithRuns("53-53", { secondBlockEndLine: 60 });
  assert.equal(blankBlocks(harness).length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("a run next to a folded block gets no blank-line block, and unfolding makes it", () => {
  const harness = harnessWithRuns();
  harness.mappings[1]!.setAttribute("data-okf-folded", "");
  harness.editModeButton.dispatch("click");
  harness.editModeButton.dispatch("click");
  assert.equal(blankBlocks(harness).length, 1, "only the run after the last block is left");
  harness.mappings[1]!.removeAttribute("data-okf-folded");
  harness.editModeButton.dispatch("click");
  harness.editModeButton.dispatch("click");
  assert.equal(blankBlocks(harness).length, 3);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("a content patch makes the blank-line blocks of the new list", () => {
  const harness = harnessWithRuns();
  setRuns(harness, "55-55");
  harness.dispatchMessage(patchMessage());
  assert.equal(blankBlocks(harness).length, 1);
  assert.ok(insertPointAfterLine(harness, 52).insertedElements.includes(blankAt(harness, 0)));
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-268
test("a click on a blank-line block opens the editor of its run", () => {
  const harness = harnessWithRuns();
  const before = harness.messages.length;
  blankAt(harness, 0).dispatch("click", plainClick());
  const [open] = sent(harness, "previewEditOpen", before);
  assert.ok(open, "an open request");
  assert.deepEqual([open!.line, open!.endLine, open!.insertAfterLine], [4, 4, 3]);
  assert.deepEqual(runOf(open), [4, 4]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-268
test("Enter on a selected blank-line block opens its editor", () => {
  const harness = harnessWithRuns();
  const blank = selectBlank(harness, 1);
  const before = harness.messages.length;
  harness.dispatchDocument("keydown", key("Enter", { target: blank }));
  const [open] = sent(harness, "previewEditOpen", before);
  assert.deepEqual(runOf(open), [55, 55]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("Arrow Down and Up walk between blocks and blank-line blocks, and Escape clears", () => {
  const harness = harnessWithRuns();
  shiftClick(harness, harness.mappings[0]!);
  harness.dispatchDocument("keydown", key("ArrowDown", { target: harness.mappings[0] }));
  assert.equal(blankAt(harness, 0).getAttribute(SELECTED), "true");
  assert.deepEqual(selectedLines(harness), [], "the block selection gave way");
  harness.dispatchDocument("keydown", key("ArrowDown", { target: blankAt(harness, 0) }));
  assert.deepEqual(selectedLines(harness), [50]);
  assert.equal(blankAt(harness, 0).getAttribute(SELECTED), null);
  harness.dispatchDocument("keydown", key("ArrowUp", { target: harness.mappings[1] }));
  assert.equal(blankAt(harness, 0).getAttribute(SELECTED), "true");
  harness.dispatchDocument("keydown", key("Escape", { target: blankAt(harness, 0) }));
  assert.equal(blankAt(harness, 0).getAttribute(SELECTED), null);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("Shift+Arrow from a blank-line block starts a block selection on its neighbour", () => {
  const harness = harnessWithRuns();
  const blank = selectBlank(harness, 0);
  harness.dispatchDocument("keydown", key("ArrowDown", { target: blank, shiftKey: true }));
  assert.deepEqual(selectedLines(harness), [50]);
  assert.equal(blank.getAttribute(SELECTED), null);
  const again = selectBlank(harness, 1);
  harness.dispatchDocument("keydown", key("ArrowUp", { target: again, shiftKey: true }));
  assert.deepEqual(selectedLines(harness), [50]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("Shift+click on a blank-line block selects nothing and opens nothing", () => {
  const harness = harnessWithRuns();
  const before = harness.messages.length;
  blankAt(harness, 0).dispatch("click", { ...plainClick(), shiftKey: true });
  assert.deepEqual(selectedLines(harness), []);
  assert.equal(sent(harness, "previewEditOpen", before).length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-269
test("Delete and Backspace on a selected blank-line block post previewBlankRunDelete", () => {
  for (const name of ["Delete", "Backspace"]) {
    const harness = harnessWithRuns();
    const blank = selectBlank(harness, 0);
    const before = harness.messages.length;
    harness.dispatchDocument("keydown", key(name, { target: blank }));
    const [message] = sent(harness, "previewBlankRunDelete", before);
    assert.ok(message, name);
    assert.deepEqual([message!.line, message!.endLine], [4, 4]);
    assert.equal(typeof message!.pinViewportTop, "number");
    harness.dispatchDocument("keydown", key(name, { target: blank }));
    assert.equal(sent(harness, "previewBlankRunDelete", before).length, 1, "a held key sends one request");
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-269
test("the Delete block button of a blank-line block posts previewBlankRunDelete and opens no editor", () => {
  const harness = harnessWithRuns();
  const button = blankAt(harness, 1).childElements.find((element) =>
    element.className.split(" ").includes("sphinx-preview-delete"));
  assert.ok(button, "a Delete block button");
  assert.equal(button!.getAttribute("aria-label"), "Delete block");
  const before = harness.messages.length;
  button!.dispatch("click", plainClick());
  assert.deepEqual(sent(harness, "previewBlankRunDelete", before).map((m) => [m.line, m.endLine]), [[55, 55]]);
  assert.equal(sent(harness, "previewEditOpen", before).length, 0);
});

/** Presses the Delete block button of the blank-line block `index` and answers that the host removed the line. */
function deleteLine(harness: RuntimeHarness, index: number): void {
  blankAt(harness, index).childElements.find((element) => element.className.includes("sphinx-preview-delete"))!
    .dispatch("click", plainClick());
  harness.dispatchMessage({ type: "previewBlocksResult", ...MOVE_IDENTIFIERS, op: "delete-blank-lines", ok: true });
}

/** The line a click on the blank-line block `index` asks to write in. */
function lineOfBlank(harness: RuntimeHarness, index: number): number | undefined {
  const before = harness.messages.length;
  blankAt(harness, index).dispatch("click", plainClick());
  return runOf(sent(harness, "previewEditOpen", before)[0])[0];
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("a range of several shown lines makes one block per line, in order, each labelled Blank line", () => {
  const harness = harnessWithRuns("4-6 55-55");
  const blanks = blankBlocks(harness);
  assert.equal(blanks.length, 4);
  for (const blank of blanks) {
    assert.equal(blank.getAttribute("data-okf-blank-label"), "Blank line");
    assert.equal(blank.getAttribute("aria-label"), "Blank line. Press Enter to write a block here.");
  }
  const point = insertPointAfterLine(harness, 1);
  assert.ok(point.insertedElements.includes(blanks[0]!), "the first block goes after the insertion bar");
  assert.ok(blanks[0]!.insertedElements.includes(blanks[1]!) && blanks[1]!.insertedElements.includes(blanks[2]!), "the next ones follow it");
  assert.deepEqual([0, 1, 2, 3].map((index) => lineOfBlank(harnessWithRuns("4-6 55-55"), index)), [4, 5, 6, 55]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("a line of text then six blank lines in a list gives six blocks, each its own line", () => {
  const { harness } = listHarness("12-17");
  assert.equal(blankBlocks(harness).length, 6);
  assert.deepEqual([0, 5].map((index) => lineOfBlank(listHarness("12-17").harness, index)), [12, 17]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-268
test("Enter on the second block of a range opens the editor of that one line", () => {
  const harness = harnessWithRuns("4-6 55-55");
  const blank = selectBlank(harness, 1);
  const before = harness.messages.length;
  harness.dispatchDocument("keydown", key("Enter", { target: blank }));
  const [open] = sent(harness, "previewEditOpen", before);
  assert.deepEqual(runOf(open), [5, 5]);
  assert.deepEqual([open!.line, open!.endLine, open!.insertAfterLine], [5, 5, 4]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("Arrow Down stops on each block of a range, and selecting one says Blank line selected", () => {
  const harness = harnessWithRuns("4-6 55-55");
  selectBlank(harness, 0);
  const status = harness.createdElements.find((element) =>
    element.className.split(" ").includes("sphinx-preview-selection-status"))!;
  assert.equal(status.textContent, "Blank line selected");
  harness.dispatchDocument("keydown", key("ArrowDown", { target: blankAt(harness, 0) }));
  assert.equal(blankAt(harness, 1).getAttribute(SELECTED), "true");
  harness.dispatchDocument("keydown", key("ArrowDown", { target: blankAt(harness, 1) }));
  assert.equal(blankAt(harness, 2).getAttribute(SELECTED), "true");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-269
test("Delete on the second block of a range posts a one-line previewBlankRunDelete", () => {
  const harness = harnessWithRuns("4-6 55-55");
  const blank = selectBlank(harness, 1);
  const before = harness.messages.length;
  harness.dispatchDocument("keydown", key("Delete", { target: blank }));
  const messages = sent(harness, "previewBlankRunDelete", before);
  assert.deepEqual(messages.map((m) => [m.line, m.endLine]), [[5, 5]]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-269
test("after a delete the block of the same line number in the same run is selected, else the one above, else nothing", () => {
  // Line 5 of 4-6 is deleted: the run is now 4-5 and line 5 (the old line 6) is selected.
  const middle = harnessWithRuns("4-6 55-55");
  deleteLine(middle, 1);
  setRuns(middle, "4-5 55-55");
  middle.dispatchMessage(patchMessage());
  assert.equal(blankAt(middle, 1).getAttribute(SELECTED), "true");
  assert.equal(blankAt(middle, 0).getAttribute(SELECTED), null);

  // The last line (6) is deleted: no line 6 is left, line 5 is selected.
  const last = harnessWithRuns("4-6 55-55");
  deleteLine(last, 2);
  setRuns(last, "4-5 55-55");
  last.dispatchMessage(patchMessage());
  assert.equal(blankAt(last, 1).getAttribute(SELECTED), "true");

  // The only line of its run: nothing is selected, and Delete and Backspace post nothing.
  const only = harnessWithRuns();
  deleteLine(only, 0);
  setRuns(only, "55-55 103-103");
  only.dispatchMessage(patchMessage());
  assert.deepEqual(selectedLines(only), []);
  assert.ok(blankBlocks(only).every((block) => block.getAttribute(SELECTED) === null), "no blank block is selected");
  for (const name of ["Delete", "Backspace"]) {
    const before = only.messages.length;
    only.dispatchDocument("keydown", key(name, { target: blankAt(only, 0) }));
    assert.equal(sent(only, "previewBlankRunDelete", before).length, 0, name);
    assert.equal(sent(only, "previewBlocksDelete", before).length, 0, name);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-269
test("a refused blank run delete is announced and the key works again", () => {
  const harness = harnessWithRuns();
  const blank = selectBlank(harness, 0);
  const before = harness.messages.length;
  harness.dispatchDocument("keydown", key("Delete", { target: blank }));
  harness.dispatchMessage({
    type: "previewBlocksResult", ...MOVE_IDENTIFIERS, op: "delete-blank-lines", ok: false, reason: "The text changed.",
  });
  const status = harness.createdElements.find((element) =>
    element.className.split(" ").includes("sphinx-preview-selection-status"))!;
  assert.equal(status.textContent, "The text changed.");
  harness.dispatchDocument("keydown", key("Delete", { target: blank }));
  assert.equal(sent(harness, "previewBlankRunDelete", before).length, 2);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-268
test("Ctrl+V on a selected blank-line block pastes in place of its run; Ctrl+C and Ctrl+X do nothing", () => {
  const harness = harnessWithRuns();
  const blank = selectBlank(harness, 1);
  const before = harness.messages.length;
  harness.dispatchDocument("keydown", key("c", { target: blank, ctrlKey: true }));
  harness.dispatchDocument("keydown", key("x", { target: blank, ctrlKey: true }));
  assert.equal(harness.messages.length, before, "nothing is copied or cut");
  harness.dispatchDocument("keydown", key("v", { target: blank, ctrlKey: true }));
  const [paste] = sent(harness, "previewBlocksPaste", before);
  assert.ok(paste, "a paste request");
  assert.equal(paste!.insertAfterLine, 54);
  assert.deepEqual(runOf(paste), [55, 55]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("Alt+Arrow on a blank-line block moves nothing", () => {
  const harness = harnessWithRuns();
  const blank = selectBlank(harness, 0);
  const before = harness.messages.length;
  harness.dispatchDocument("keydown", key("ArrowDown", { target: blank, altKey: true }));
  harness.dispatchDocument("keydown", key("ArrowUp", { target: blank, altKey: true }));
  assert.equal(harness.messages.length, before);
  assert.equal(blank.getAttribute(SELECTED), "true");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("an empty body with only blank lines shows its blank-line block before Start writing", () => {
  const harness = harnessWithRuns("2-2", { emptyBody: true });
  assert.equal(blankBlocks(harness).length, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-268
test("an editor opened from a blank-line block stays in its element across a patch without that run", () => {
  const harness = harnessWithRuns();
  const blank = blankAt(harness, 0);
  blank.dispatch("click", plainClick());
  const openMessage = sent(harness, "previewEditOpen").at(-1)!;
  harness.dispatchMessage({
    type: "previewEditSource", documentId: "file:///active.md", revision: 7, requestId: 11,
    editId: openMessage.editId, originalText: "",
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA")!;
  assert.ok(textarea, "the editor is open");
  textarea.value = "Typed";
  textarea.dispatch("input");
  harness.flushTimers();
  assert.equal(sent(harness, "previewEditSave").at(-1)?.final, false, "an autosave posted");
  setRuns(harness, "55-55 103-103");
  harness.dispatchMessage(patchMessage());
  assert.ok(blankBlocks(harness).includes(blank), "the element is kept, still a blank-line block of the page");
  assert.ok(insertPointAfterLine(harness, 1).insertedElements.includes(blank), "at the place of its run");
  assert.ok(blank.insertedElements.includes(textarea.parentElement!), "with the editor frame after it");
  assert.equal(harness.createdElements.filter((element) => element.tagName === "TEXTAREA" && !element.removed).length, 1);
  const before = harness.messages.length;
  textarea.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  const [cancel] = sent(harness, "previewEditCancel", before);
  assert.ok(cancel, "Cancel posts previewEditCancel");
  assert.deepEqual(runOf(cancel), [4, 4]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-269
test("Delete and Backspace post nothing on a blank-line block that is only focused", () => {
  for (const name of ["Delete", "Backspace"]) {
    const harness = harnessWithRuns();
    const before = harness.messages.length;
    harness.dispatchDocument("keydown", key(name, { target: blankAt(harness, 1) }));
    assert.equal(sent(harness, "previewBlankRunDelete", before).length, 0, name);
    assert.equal(sent(harness, "previewBlocksDelete", before).length, 0, name);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-269
test("Delete on a focused blank-line block never deletes the selected real blocks", () => {
  for (const name of ["Delete", "Backspace"]) {
    const harness = harnessWithRuns();
    shiftClick(harness, harness.mappings[0]!);
    assert.deepEqual(selectedLines(harness), [1]);
    const before = harness.messages.length;
    harness.dispatchDocument("keydown", key(name, { target: blankAt(harness, 1) }));
    assert.equal(harness.messages.length, before, name);
    assert.deepEqual(selectedLines(harness), [1], "the selection is untouched");
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("a run that starts on the separator line ending a list shows its blank-line block", () => {
  const harness = harnessWithRuns("53-53", { secondBlockEndLine: 52 });
  assert.equal(blankBlocks(harness).length, 1);
  const list = harnessWithRuns("53-53", { secondBlockEndLine: 53 });
  assert.equal(blankBlocks(list).length, 1, "the list range ends on the run's first line");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("the label is drawn by CSS: it is not in the element's text content", () => {
  const harness = harnessWithRuns();
  for (const blank of blankBlocks(harness)) {
    assert.doesNotMatch(blank.textContent, /blank/iu);
    assert.match(blank.getAttribute("data-okf-blank-label") ?? "", /^Blank line$/u);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("a forged runs element placed among the blocks and the insertion bars is ignored", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const forged = (): RuntimeElement =>
    new RuntimeElement({ "data-okf-blank-runs": "55-55" }, harness.windowState, 0, 0, "div");
  harness.previewContent.appendChild(forged());
  harness.editModeButton.dispatch("click");
  harness.editModeButton.dispatch("click");
  insertPointAfterLine(harness, 1).insertAdjacentElement("afterend", forged());
  insertPointAfterLine(harness, 52).insertAdjacentElement("beforebegin", forged());
  setRuns(harness, "4-4");
  harness.editModeButton.dispatch("click");
  harness.editModeButton.dispatch("click");
  const blanks = blankBlocks(harness);
  assert.equal(blanks.length, 1, "only the host's last element counts");
  assert.ok(insertPointAfterLine(harness, 1).insertedElements.includes(blanks[0]!));
});

// --- Runs inside lists (CR-448) -------------------------------------------------------------------

interface Shape { tag: string; line: number; end: number; children?: Shape[] }

/** A top-level list of lines 10-30: item A (10-14), item B (15-30) with two paragraphs. */
const LIST: Shape = {
  tag: "ul", line: 10, end: 30, children: [
    { tag: "li", line: 10, end: 14, children: [{ tag: "p", line: 10, end: 10 }] },
    { tag: "li", line: 15, end: 30, children: [{ tag: "p", line: 15, end: 15 }, { tag: "p", line: 28, end: 28 }] },
  ],
};

/** Adds `shape` to the content of the harness as mapped elements. */
function addShape(harness: RuntimeHarness, shape: Shape, parent: RuntimeElement = harness.previewContent): RuntimeElement {
  const element = new RuntimeElement({
    "data-sphinx-preview-document": "file:///active.md",
    "data-sphinx-source-end-line": String(shape.end),
    "data-sphinx-source-file": "/workspace/active.md",
    "data-sphinx-source-line": String(shape.line),
  }, harness.windowState, 100 + shape.line, 40, shape.tag);
  parent.appendChild(element);
  harness.mappings.push(element);
  for (const child of shape.children ?? []) addShape(harness, child, element);
  return element;
}

/** A harness in edit mode with `shape` in its content and `runs` as the host's list. */
function listHarness(runs: string, shape: Shape = LIST): { harness: RuntimeHarness; list: RuntimeElement } {
  const harness = createRuntimeHarness({ savedState: { editMode: true }, trackFocus: true });
  const list = addShape(harness, shape);
  setRuns(harness, runs);
  harness.editModeButton.dispatch("click");
  harness.editModeButton.dispatch("click");
  return { harness, list };
}

const itemsOf = (list: RuntimeElement): RuntimeElement[] => list.childElements.filter((child) => child.tagName === "LI");

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("a run between two items is shown inside the item above, after its last child, not beside the list", () => {
  const { harness, list } = listHarness("12-12");
  const [blank] = blankBlocks(harness);
  assert.ok(blank, "a blank-line block");
  const [itemA, itemB] = itemsOf(list);
  assert.ok(itemA!.childElements[0]!.insertedElements.includes(blank!), "after the paragraph of the item above");
  assert.equal(blank!.parentElement, itemA);
  assert.ok(!list.insertedElements.includes(blank!), "never placed beside the list");
  assert.equal(itemB!.insertedElements.length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("a run between two paragraphs of an item is shown inside that item, after the paragraph above", () => {
  const { harness, list } = listHarness("23-23");
  const [blank] = blankBlocks(harness);
  const itemB = itemsOf(list)[1]!;
  assert.ok(itemB.childElements[0]!.insertedElements.includes(blank!), "after the first paragraph");
  assert.equal(blank!.parentElement, itemB);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("a run between nested items is shown inside the nested item above", () => {
  const nested: Shape = {
    tag: "ul", line: 10, end: 30, children: [{
      tag: "li", line: 10, end: 30, children: [
        { tag: "p", line: 10, end: 10 },
        {
          tag: "ul", line: 11, end: 29, children: [
            { tag: "li", line: 11, end: 15, children: [{ tag: "p", line: 11, end: 11 }] },
            { tag: "li", line: 16, end: 29, children: [{ tag: "p", line: 16, end: 16 }] },
          ],
        },
      ],
    }],
  };
  const { harness, list } = listHarness("14-14", nested);
  const [blank] = blankBlocks(harness);
  assert.ok(blank, "a blank-line block");
  const inner = list.childElements[0]!.childElements[1]!.childElements[0]!;
  assert.equal(blank!.parentElement, inner, "inside the nested item above");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("a run inside a fence in a list item shows no blank-line block", () => {
  const fence: Shape = {
    tag: "ul", line: 10, end: 30, children: [
      { tag: "li", line: 10, end: 30, children: [{ tag: "p", line: 10, end: 10 }, { tag: "pre", line: 12, end: 28 }] },
    ],
  };
  assert.equal(blankBlocks(listHarness("21-21", fence).harness).length, 0, "a fence in an item");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("a folded list shows no blank-line block, and unfolding shows them", () => {
  const { harness, list } = listHarness("12-12 23-23");
  assert.equal(blankBlocks(harness).length, 2);
  list.setAttribute("data-okf-folded", "");
  harness.editModeButton.dispatch("click");
  harness.editModeButton.dispatch("click");
  assert.equal(blankBlocks(harness).length, 0);
  list.removeAttribute("data-okf-folded");
  harness.editModeButton.dispatch("click");
  harness.editModeButton.dispatch("click");
  assert.equal(blankBlocks(harness).length, 2);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("a content patch keeps the block of a run inside a list where it was", () => {
  const { harness } = listHarness("12-12 23-23");
  const [first, second] = blankBlocks(harness);
  harness.dispatchMessage(patchMessage());
  assert.deepEqual(blankBlocks(harness), [first, second], "the same elements");
  setRuns(harness, "23-23");
  harness.dispatchMessage(patchMessage({ revision: 8, requestId: 12, next: { revision: 9, requestId: 13 } }));
  assert.deepEqual(blankBlocks(harness), [second]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-267
test("a click on a blank-line block inside a list sends the item line and opens no list item editor", () => {
  const { harness } = listHarness("12-12 23-23");
  const before = harness.messages.length;
  blankAt(harness, 1).dispatch("click", plainClick());
  const opened = sent(harness, "previewEditOpen", before);
  assert.equal(opened.length, 1);
  assert.deepEqual({ ...(opened[0]!.replaceBlankRun as object) }, { line: 23, endLine: 23, itemLine: 15 });
  assert.equal(opened[0]!.insertAfterLine, 22);
  const top = harnessWithRuns();
  const mark = top.messages.length;
  blankAt(top, 0).dispatch("click", plainClick());
  assert.deepEqual({ ...(sent(top, "previewEditOpen", mark)[0]!.replaceBlankRun as object) }, { line: 4, endLine: 4 }, "no itemLine at the top level");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-268
test("an editor opened in a list item survives a patch that replaces the list, and Cancel keeps the item line", () => {
  const { harness, list } = listHarness("12-12 23-23");
  const blank = blankAt(harness, 0);
  blank.dispatch("click", plainClick());
  const openMessage = sent(harness, "previewEditOpen").at(-1)!;
  harness.dispatchMessage({
    type: "previewEditSource", documentId: "file:///active.md", revision: 7, requestId: 11,
    editId: openMessage.editId, originalText: "",
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA")!;
  assert.ok(textarea, "the editor is open");
  textarea.value = "Typed";
  textarea.dispatch("input");
  harness.flushTimers();
  // The patch swaps the whole list: new elements for the same lines.
  harness.previewContent.removeChild(list);
  for (let index = harness.mappings.length - 1; index >= 0; index -= 1) {
    if (list.contains(harness.mappings[index]!) || harness.mappings[index] === list) harness.mappings.splice(index, 1);
  }
  const fresh = addShape(harness, LIST);
  setRuns(harness, "23-23");
  harness.dispatchMessage(patchMessage());
  assert.ok(blankBlocks(harness).includes(blank), "the element is kept");
  assert.equal(blankBlocks(harness).length, 2, "the editing block and the block of the run that is left");
  assert.equal(blank.parentElement, itemsOf(fresh)[0], "back in the item of the new list");
  assert.ok(blank.insertedElements.includes(textarea.parentElement!), "with the editor frame after it");
  const before = harness.messages.length;
  textarea.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  const [cancel] = sent(harness, "previewEditCancel", before);
  assert.ok(cancel, "Cancel posts previewEditCancel");
  assert.deepEqual({ ...(cancel!.replaceBlankRun as object) }, { line: 12, endLine: 12, itemLine: 10 });
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-267
test("Arrow Down and Up visit the blank-line blocks of a list in source order between the blocks", () => {
  const { harness, list } = listHarness("12-12 23-23");
  shiftClick(harness, harness.mappings[0]!);
  const walk = (name: string, target: RuntimeElement): void => {
    harness.dispatchDocument("keydown", key(name, { target }));
  };
  walk("ArrowDown", harness.mappings[0]!);
  assert.deepEqual(selectedLines(harness), [10], "the list comes first");
  walk("ArrowDown", list);
  assert.equal(blankAt(harness, 0).getAttribute(SELECTED), "true");
  walk("ArrowDown", blankAt(harness, 0));
  assert.equal(blankAt(harness, 1).getAttribute(SELECTED), "true");
  walk("ArrowDown", blankAt(harness, 1));
  assert.deepEqual(selectedLines(harness), [50], "then the block after the list");
  walk("ArrowUp", harness.mappings.find((block) => block.getAttribute("data-sphinx-source-line") === "50")!);
  assert.equal(blankAt(harness, 1).getAttribute(SELECTED), "true");
  walk("ArrowUp", blankAt(harness, 1));
  assert.equal(blankAt(harness, 0).getAttribute(SELECTED), "true");
  walk("ArrowUp", blankAt(harness, 0));
  assert.deepEqual(selectedLines(harness), [10]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-267
test("Shift+Arrow from a blank-line block of a list starts the selection on the list or the block after it", () => {
  const { harness } = listHarness("12-12 23-23");
  const blank = selectBlank(harness, 0);
  harness.dispatchDocument("keydown", key("ArrowUp", { target: blank, shiftKey: true }));
  assert.deepEqual(selectedLines(harness), [10]);
  const again = selectBlank(harness, 1);
  harness.dispatchDocument("keydown", key("ArrowDown", { target: again, shiftKey: true }));
  assert.deepEqual(selectedLines(harness), [50]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-268
test("Ctrl+V on a blank-line block of a list sends the item line with the run", () => {
  const { harness } = listHarness("12-12 23-23");
  const blank = selectBlank(harness, 1);
  const before = harness.messages.length;
  harness.dispatchDocument("keydown", key("v", { target: blank, ctrlKey: true }));
  const [paste] = sent(harness, "previewBlocksPaste", before);
  assert.ok(paste, "a paste request");
  assert.deepEqual({ ...(paste!.replaceBlankRun as object) }, { line: 23, endLine: 23, itemLine: 15 });
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-269
test("Delete on a blank-line block of a list posts the removal, then the list holds the selection", () => {
  const { harness } = listHarness("12-12 23-23");
  const blank = selectBlank(harness, 0);
  const before = harness.messages.length;
  harness.dispatchDocument("keydown", key("Delete", { target: blank }));
  const [removal] = sent(harness, "previewBlankRunDelete", before);
  assert.deepEqual([removal!.line, removal!.endLine], [12, 12]);
  harness.dispatchMessage({ type: "previewBlocksResult", ...MOVE_IDENTIFIERS, op: "delete-blank-lines", ok: true });
  setRuns(harness, "23-23");
  harness.dispatchMessage(patchMessage());
  assert.deepEqual(selectedLines(harness), [], "no blank line is left in the run: nothing is selected");
  assert.equal(blankAt(harness, 0).getAttribute(SELECTED), null);
});

// --- The final save of a blank-line block's editor (issue 485) -----------------------------------

const DONE = "Done editing";

/** Opens the editor of the blank-line block `index`, answers its source, types `Text`. */
function openTyped(harness: RuntimeHarness, index = 0, autosave = false): RuntimeElement {
  blankAt(harness, index).dispatch("click", plainClick());
  const openMessage = sent(harness, "previewEditOpen").at(-1)!;
  harness.dispatchMessage({
    type: "previewEditSource", documentId: "file:///active.md", revision: 7, requestId: 11,
    editId: openMessage.editId, originalText: "",
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA" && inPage(element))!;
  assert.ok(textarea, "the editor is open");
  textarea.value = "Text";
  textarea.dispatch("input");
  if (autosave) {
    harness.flushTimers();
    assert.equal(sent(harness, "previewEditSave").at(-1)?.final, false, "an autosave posted");
  }
  return textarea;
}

/** Still in the page: neither it nor an ancestor was removed (a removed frame keeps its children). */
function inPage(element: RuntimeElement): boolean {
  for (let node: RuntimeElement | undefined = element; node; node = node.parentElement) {
    if (node.removed) return false;
  }
  return true;
}

const savingShown = (harness: RuntimeHarness): boolean =>
  harness.createdElements.some((element) => inPage(element) && element.textContent === "Saving Markdown…");

const openEditors = (harness: RuntimeHarness): number =>
  harness.createdElements.filter((element) => element.tagName === "TEXTAREA" && inPage(element)).length;

function pressDone(harness: RuntimeHarness): void {
  findButton(harness, DONE).dispatch("click");
  assert.equal(sent(harness, "previewEditSave").at(-1)?.final, true, "the final save is posted");
  assert.ok(savingShown(harness), "Saving Markdown… is shown");
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-268
test("Done in a blank-line block's editor: the patch of its final save closes the editor", () => {
  for (const autosave of [false, true]) {
    const harness = harnessWithRuns("3-3");
    const blank = blankAt(harness, 0);
    const textarea = openTyped(harness, 0, autosave);
    assert.deepEqual(runOf(sent(harness, "previewEditOpen").at(-1)), [3, 3]);
    pressDone(harness);
    const before = harness.messages.length;
    setRuns(harness, "41-41");
    harness.dispatchMessage(patchMessage());
    assert.equal(openEditors(harness), 0, "the editor is closed (autosave " + String(autosave) + ")");
    assert.equal(inPage(textarea), false, "its frame is out of the page");
    assert.equal(savingShown(harness), false, "no Saving Markdown… is left");
    assert.ok(!blankBlocks(harness).includes(blank), "the held blank-line block is gone");
    assert.equal(sent(harness, "previewEditCancel", before).length, 0, "no previewEditCancel");
    // The page is not stuck: a block of the patch's list opens a new editor.
    const open = sent(harness, "previewEditOpen").length;
    blankAt(harness, 0).dispatch("click", plainClick());
    assert.equal(sent(harness, "previewEditOpen").length, open + 1, "a new editor opens");
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-268
test("Done in the editor of a run inside a list: the patch closes the editor", () => {
  const { harness } = listHarness("12-12 23-23");
  const blank = blankAt(harness, 0);
  const textarea = openTyped(harness, 0, true);
  pressDone(harness);
  const before = harness.messages.length;
  setRuns(harness, "23-23");
  harness.dispatchMessage(patchMessage());
  assert.equal(openEditors(harness), 0, "the editor is closed");
  assert.equal(inPage(textarea), false, "its frame is out of the page");
  assert.equal(savingShown(harness), false);
  assert.ok(!blankBlocks(harness).includes(blank), "the held block is gone");
  assert.equal(blankBlocks(harness).length, 1, "the block of the run that is left");
  assert.equal(sent(harness, "previewEditCancel", before).length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-268
test("an error answer to Done keeps the editor open across a patch, and a second Done then a patch closes it", () => {
  const harness = harnessWithRuns("3-3");
  const textarea = openTyped(harness);
  pressDone(harness);
  harness.dispatchMessage({
    type: "previewEditSource", documentId: "file:///active.md", revision: 7, requestId: 11,
    editId: sent(harness, "previewEditOpen").at(-1)!.editId, error: "The text changed.",
  });
  assert.equal(openEditors(harness), 1, "the editor stays after an error answer");
  setRuns(harness, "41-41");
  harness.dispatchMessage(patchMessage());
  assert.equal(openEditors(harness), 1, "no final save in flight: a patch keeps the editor open");
  pressDone(harness);
  setRuns(harness, "41-41");
  harness.dispatchMessage(patchMessage({ revision: 8, requestId: 12, next: { revision: 9, requestId: 13 } }));
  assert.equal(openEditors(harness), 0, "the second final save's patch closes it");
  assert.equal(inPage(textarea), false);
  assert.equal(savingShown(harness), false);
});
