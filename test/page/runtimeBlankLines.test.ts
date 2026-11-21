import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, RuntimeElement, type RuntimeHarness } from "./runtimeHarness";
import { insertPointAfterLine, MOVE_IDENTIFIERS, patchMessage, plainClick } from "./runtimeTestSupport";

/**
 * The blank-lines block (CR-444): built from the host's list of runs, reachable by the keyboard and
 * the pointer, opened as an editor, deleted, and ignored by every selection that is about blocks
 * (features/blankLines.ts, blockSelectionView.ts).
 */

const SELECTED = "data-sphinx-preview-block-selected";
const RUNS = "3-6 54-56 102-104";
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
  assert.equal(blank.getAttribute(SELECTED), "true", "the blank-lines block is selected");
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
    assert.match(blank.getAttribute("aria-label") ?? "", /^Blank lines, \d+ lines/u);
    assert.equal(blank.getAttribute("data-sphinx-source-line"), null, "never a mapped block");
  }
  assert.match(blanks[0]!.getAttribute("aria-label")!, /4 lines/u);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("reading mode has no blank-lines block, and edit mode makes them again", () => {
  const harness = harnessWithRuns();
  harness.editModeButton.dispatch("click");
  assert.equal(blankBlocks(harness).length, 0);
  harness.editModeButton.dispatch("click");
  assert.equal(blankBlocks(harness).length, 3);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("only the last element of the content gives the runs: authored attributes make nothing", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  harness.mappings[1]!.setAttribute("data-okf-blank-runs", "3-6");
  harness.mappings[1]!.setAttribute("data-okf-blank-lines", "3-6");
  harness.previewContent.appendChild(new RuntimeElement({ "data-okf-blank-runs": "3-6" }, harness.windowState, 0, 0, "div"));
  harness.previewContent.appendChild(new RuntimeElement({}, harness.windowState, 0, 0, "p"));
  harness.dispatchMessage(patchMessage());
  assert.equal(blankBlocks(harness).length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("malformed or overlapping entries of the list are dropped", () => {
  const harness = harnessWithRuns("3-6 x-9 5-8 0-4 54-54 54-56 junk");
  assert.equal(blankBlocks(harness).length, 2);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("a run inside a block gets no blank-lines block", () => {
  const harness = harnessWithRuns("52-54", { secondBlockEndLine: 60 });
  assert.equal(blankBlocks(harness).length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("a run next to a folded block gets no blank-lines block, and unfolding makes it", () => {
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
test("a content patch makes the blank-lines blocks of the new list", () => {
  const harness = harnessWithRuns();
  setRuns(harness, "54-56");
  harness.dispatchMessage(patchMessage());
  assert.equal(blankBlocks(harness).length, 1);
  assert.ok(insertPointAfterLine(harness, 52).insertedElements.includes(blankAt(harness, 0)));
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-268
test("a click on a blank-lines block opens the editor of its run", () => {
  const harness = harnessWithRuns();
  const before = harness.messages.length;
  blankAt(harness, 0).dispatch("click", plainClick());
  const [open] = sent(harness, "previewEditOpen", before);
  assert.ok(open, "an open request");
  assert.deepEqual([open!.line, open!.endLine, open!.insertAfterLine], [3, 6, 2]);
  assert.deepEqual(runOf(open), [3, 6]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-268
test("Enter on a selected blank-lines block opens its editor", () => {
  const harness = harnessWithRuns();
  const blank = selectBlank(harness, 1);
  const before = harness.messages.length;
  harness.dispatchDocument("keydown", key("Enter", { target: blank }));
  const [open] = sent(harness, "previewEditOpen", before);
  assert.deepEqual(runOf(open), [54, 56]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("Arrow Down and Up walk between blocks and blank-lines blocks, and Escape clears", () => {
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
test("Shift+Arrow from a blank-lines block starts a block selection on its neighbour", () => {
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
test("Shift+click on a blank-lines block selects nothing and opens nothing", () => {
  const harness = harnessWithRuns();
  const before = harness.messages.length;
  blankAt(harness, 0).dispatch("click", { ...plainClick(), shiftKey: true });
  assert.deepEqual(selectedLines(harness), []);
  assert.equal(sent(harness, "previewEditOpen", before).length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-269
test("Delete and Backspace on a selected blank-lines block post previewBlankRunDelete", () => {
  for (const name of ["Delete", "Backspace"]) {
    const harness = harnessWithRuns();
    const blank = selectBlank(harness, 0);
    const before = harness.messages.length;
    harness.dispatchDocument("keydown", key(name, { target: blank }));
    const [message] = sent(harness, "previewBlankRunDelete", before);
    assert.ok(message, name);
    assert.deepEqual([message!.line, message!.endLine], [3, 6]);
    assert.equal(typeof message!.pinViewportTop, "number");
    harness.dispatchDocument("keydown", key(name, { target: blank }));
    assert.equal(sent(harness, "previewBlankRunDelete", before).length, 1, "a held key sends one request");
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-269
test("the Delete block button of a blank-lines block posts previewBlankRunDelete and opens no editor", () => {
  const harness = harnessWithRuns();
  const button = blankAt(harness, 1).childElements.find((element) =>
    element.className.split(" ").includes("sphinx-preview-delete"));
  assert.ok(button, "a Delete block button");
  assert.equal(button!.getAttribute("aria-label"), "Delete block");
  const before = harness.messages.length;
  button!.dispatch("click", plainClick());
  assert.deepEqual(sent(harness, "previewBlankRunDelete", before).map((m) => [m.line, m.endLine]), [[54, 56]]);
  assert.equal(sent(harness, "previewEditOpen", before).length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-269
test("after a blank run is deleted the block that followed it is selected, else the one above", () => {
  const harness = harnessWithRuns();
  blankAt(harness, 0).childElements.find((element) => element.className.includes("sphinx-preview-delete"))!
    .dispatch("click", plainClick());
  harness.dispatchMessage({ type: "previewBlocksResult", ...MOVE_IDENTIFIERS, op: "delete-blank-lines", ok: true });
  setRuns(harness, "54-56 102-104");
  harness.dispatchMessage(patchMessage());
  assert.deepEqual(selectedLines(harness), [50]);

  const last = harnessWithRuns();
  blankAt(last, 2).childElements.find((element) => element.className.includes("sphinx-preview-delete"))!
    .dispatch("click", plainClick());
  last.dispatchMessage({ type: "previewBlocksResult", ...MOVE_IDENTIFIERS, op: "delete-blank-lines", ok: true });
  setRuns(last, "3-6 54-56");
  last.dispatchMessage(patchMessage());
  assert.deepEqual(selectedLines(last), [100]);
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
test("Ctrl+V on a selected blank-lines block pastes in place of its run; Ctrl+C and Ctrl+X do nothing", () => {
  const harness = harnessWithRuns();
  const blank = selectBlank(harness, 1);
  const before = harness.messages.length;
  harness.dispatchDocument("keydown", key("c", { target: blank, ctrlKey: true }));
  harness.dispatchDocument("keydown", key("x", { target: blank, ctrlKey: true }));
  assert.equal(harness.messages.length, before, "nothing is copied or cut");
  harness.dispatchDocument("keydown", key("v", { target: blank, ctrlKey: true }));
  const [paste] = sent(harness, "previewBlocksPaste", before);
  assert.ok(paste, "a paste request");
  assert.equal(paste!.insertAfterLine, 53);
  assert.deepEqual(runOf(paste), [54, 56]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("Alt+Arrow on a blank-lines block moves nothing", () => {
  const harness = harnessWithRuns();
  const blank = selectBlank(harness, 0);
  const before = harness.messages.length;
  harness.dispatchDocument("keydown", key("ArrowDown", { target: blank, altKey: true }));
  harness.dispatchDocument("keydown", key("ArrowUp", { target: blank, altKey: true }));
  assert.equal(harness.messages.length, before);
  assert.equal(blank.getAttribute(SELECTED), "true");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("an empty body with only blank lines shows its blank-lines block before Start writing", () => {
  const harness = harnessWithRuns("1-3", { emptyBody: true });
  assert.equal(blankBlocks(harness).length, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-268
test("an editor opened from a blank-lines block stays in its element across a patch without that run", () => {
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
  setRuns(harness, "54-56 102-104");
  harness.dispatchMessage(patchMessage());
  assert.ok(blankBlocks(harness).includes(blank), "the element is kept, still a blank-lines block of the page");
  assert.ok(insertPointAfterLine(harness, 1).insertedElements.includes(blank), "at the place of its run");
  assert.ok(blank.insertedElements.includes(textarea.parentElement!), "with the editor frame after it");
  assert.equal(harness.createdElements.filter((element) => element.tagName === "TEXTAREA" && !element.removed).length, 1);
  const before = harness.messages.length;
  textarea.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  const [cancel] = sent(harness, "previewEditCancel", before);
  assert.ok(cancel, "Cancel posts previewEditCancel");
  assert.deepEqual(runOf(cancel), [3, 6]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-269
test("Delete and Backspace post nothing on a blank-lines block that is only focused", () => {
  for (const name of ["Delete", "Backspace"]) {
    const harness = harnessWithRuns();
    const before = harness.messages.length;
    harness.dispatchDocument("keydown", key(name, { target: blankAt(harness, 1) }));
    assert.equal(sent(harness, "previewBlankRunDelete", before).length, 0, name);
    assert.equal(sent(harness, "previewBlocksDelete", before).length, 0, name);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-269
test("Delete on a focused blank-lines block never deletes the selected real blocks", () => {
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
test("a run that starts on the separator line ending a list shows its blank-lines block", () => {
  const harness = harnessWithRuns("52-54", { secondBlockEndLine: 52 });
  assert.equal(blankBlocks(harness).length, 1);
  const list = harnessWithRuns("52-54", { secondBlockEndLine: 53 });
  assert.equal(blankBlocks(list).length, 1, "the list range ends on the run's first line");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("the label is drawn by CSS: it is not in the element's text content", () => {
  const harness = harnessWithRuns();
  for (const blank of blankBlocks(harness)) {
    assert.doesNotMatch(blank.textContent, /blank/iu);
    assert.match(blank.getAttribute("data-okf-blank-label") ?? "", /^Blank lines \(\d+\)$/u);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("a forged runs element placed among the blocks and the insertion bars is ignored", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const forged = (): RuntimeElement =>
    new RuntimeElement({ "data-okf-blank-runs": "54-56" }, harness.windowState, 0, 0, "div");
  harness.previewContent.appendChild(forged());
  harness.editModeButton.dispatch("click");
  harness.editModeButton.dispatch("click");
  insertPointAfterLine(harness, 1).insertAdjacentElement("afterend", forged());
  insertPointAfterLine(harness, 52).insertAdjacentElement("beforebegin", forged());
  setRuns(harness, "3-6");
  harness.editModeButton.dispatch("click");
  harness.editModeButton.dispatch("click");
  const blanks = blankBlocks(harness);
  assert.equal(blanks.length, 1, "only the host's last element counts");
  assert.ok(insertPointAfterLine(harness, 1).insertedElements.includes(blanks[0]!));
});
