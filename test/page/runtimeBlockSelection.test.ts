import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, RuntimeElement, type RuntimeHarness } from "./runtimeHarness";
import {
  altKey,
  insertPointAfterLine,
  MOVE_IDENTIFIERS,
  moveButton,
  moveMessages,
  openMoveTextarea,
  patchMessage,
  plainClick,
  shiftKey,
} from "./runtimeTestSupport";

/**
 * The block selection: Shift+click, Shift+Arrow, clipboard keys and selection moves
 * (features/blockSelectionView.ts, blockMoves.ts).
 */

// T39: block selection with Shift+click and Shift+Arrow (edit mode, contiguous, no Delete in v1).
const SELECTED = "data-sphinx-preview-block-selected";

function selectedLines(harness: RuntimeHarness): number[] {
  return harness.mappings
    .filter((block) => block.getAttribute(SELECTED) !== null)
    .map((block) => Number(block.getAttribute("data-sphinx-source-line")));
}

function selectionAnnouncement(harness: RuntimeHarness): string | undefined {
  return harness.createdElements.find((element) =>
    element.className.split(" ").includes("sphinx-preview-selection-status"))?.textContent;
}

function shiftClick(harness: RuntimeHarness, block: RuntimeElement, extra: Record<string, unknown> = {}): { prevented: number } {
  const counts = { prevented: 0 };
  harness.dispatchDocument("click", {
    target: block, shiftKey: true, preventDefault: () => { counts.prevented += 1; }, stopPropagation: () => undefined, ...extra,
  });
  return counts;
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-140
test("T39: Shift+click on two blocks selects the run between them without opening an editor", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const before = harness.messages.length;
  const first = shiftClick(harness, harness.mappings[0]);
  assert.deepEqual(selectedLines(harness), [1]);
  shiftClick(harness, harness.mappings[2]);
  assert.deepEqual(selectedLines(harness), [1, 50, 100]);
  assert.equal(first.prevented > 0, true, "the click does not go on to the browser");
  assert.equal(selectionAnnouncement(harness), "3 blocks selected");
  assert.equal(harness.messages.slice(before).some((message) => message.type === "previewEditOpen"), false);
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-block-editing"), null);
  shiftClick(harness, harness.mappings[1]);
  assert.deepEqual(selectedLines(harness), [1, 50], "a later Shift+click moves the free end, the anchor stays");
  assert.equal(selectionAnnouncement(harness), "2 blocks selected");
});

test("T39: the selection announcer is a polite live region created by the page script", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  shiftClick(harness, harness.mappings[0]);
  const region = harness.createdElements.find((element) =>
    element.className.split(" ").includes("sphinx-preview-selection-status"))!;
  assert.equal(region.getAttribute("aria-live"), "polite");
  assert.equal(region.getAttribute("role"), "status");
  assert.equal(selectionAnnouncement(harness), "1 block selected");
});

test("T39: outside edit mode Shift+click selects nothing", () => {
  const harness = createRuntimeHarness();
  shiftClick(harness, harness.mappings[0]);
  shiftClick(harness, harness.mappings[2]);
  assert.deepEqual(selectedLines(harness), []);
  harness.dispatchDocument("keydown", shiftKey("ArrowDown", { target: harness.mappings[1] }));
  assert.deepEqual(selectedLines(harness), []);
});

test("T39: the range starts at the block that was clicked or opened last", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-block-editing"), "true");
  shiftClick(harness, harness.mappings[2]);
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-block-editing"), null, "the editor is closed");
  assert.deepEqual(selectedLines(harness), [50, 100]);
});

test("T39: an open editor with changes is saved first; the blocks are selected once the patch is in", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const textarea = openMoveTextarea(harness, "Current block\n");
  textarea.value = "Current block, changed\n";
  textarea.dispatch("input");
  const before = harness.messages.length;
  shiftClick(harness, harness.mappings[2]);
  const saves = harness.messages.slice(before).filter((message) => message.type === "previewEditSave");
  assert.equal(saves.length, 1);
  assert.equal(saves[0].final, true);
  assert.deepEqual(selectedLines(harness), [], "nothing is selected before the save result");
  harness.dispatchMessage(patchMessage());
  assert.deepEqual(selectedLines(harness), [50, 100]);
  assert.equal(selectionAnnouncement(harness), "2 blocks selected");
});

test("T39: Shift+Arrow from a focused block extends and shrinks the selection and moves the focus", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const before = harness.messages.length;
  let prevented = 0;
  const down = shiftKey("ArrowDown", { target: harness.mappings[1], preventDefault: () => { prevented += 1; } });
  harness.dispatchDocument("keydown", down);
  assert.deepEqual(selectedLines(harness), [50, 100]);
  assert.equal(prevented, 1);
  assert.equal((harness.mappings[2] as RuntimeElement).focusOptions !== undefined, true, "the free end takes the focus");
  harness.dispatchDocument("keydown", shiftKey("ArrowUp", { target: harness.mappings[2] }));
  assert.deepEqual(selectedLines(harness), [50]);
  harness.dispatchDocument("keydown", shiftKey("ArrowUp", { target: harness.mappings[1] }));
  assert.deepEqual(selectedLines(harness), [1, 50]);
  assert.equal(selectionAnnouncement(harness), "2 blocks selected");
  assert.equal(moveMessages(harness, before).length, 0, "a selection key never moves a block");
});

test("T39: Shift+Arrow does not collide with the Alt+Arrow move chords", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const target = harness.mappings[1];
  const before = harness.messages.length;
  harness.dispatchDocument("keydown", shiftKey("ArrowDown", { target, altKey: true }));
  harness.dispatchDocument("keydown", shiftKey("ArrowDown", { target, ctrlKey: true }));
  harness.dispatchDocument("keydown", shiftKey("ArrowDown", { target, metaKey: true }));
  assert.deepEqual(selectedLines(harness), []);
  assert.equal(moveMessages(harness, before).length, 0);
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target }));
  assert.equal(moveMessages(harness, before).length, 1, "Alt+Arrow still moves");
});

test("T39: Shift+Arrow inside the text box, a field or the property table is left alone", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const textarea = openMoveTextarea(harness, "Current block\n");
  let prevented = false;
  textarea.dispatch("keydown", shiftKey("ArrowDown", { preventDefault: () => { prevented = true; } }));
  harness.dispatchDocument("keydown", shiftKey("ArrowDown", {
    target: textarea, preventDefault: () => { prevented = true; },
  }));
  assert.equal(prevented, false);
  assert.deepEqual(selectedLines(harness), []);
});

test("T39: Escape or a plain click clears the selection", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  shiftClick(harness, harness.mappings[0]);
  shiftClick(harness, harness.mappings[1]);
  harness.dispatchDocument("keydown", { key: "Escape", target: harness.mappings[1], preventDefault: () => undefined });
  assert.deepEqual(selectedLines(harness), []);
  assert.equal(selectionAnnouncement(harness), "");
  shiftClick(harness, harness.mappings[0]);
  shiftClick(harness, harness.mappings[1]);
  harness.dispatchDocument("click", { target: harness.mappings[2], preventDefault: () => undefined });
  assert.deepEqual(selectedLines(harness), []);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-001
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-148
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-193
test("T39: a content patch and leaving edit mode clear the selection", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  shiftClick(harness, harness.mappings[0]);
  shiftClick(harness, harness.mappings[2]);
  harness.dispatchMessage(patchMessage());
  assert.deepEqual(selectedLines(harness), []);
  shiftClick(harness, harness.mappings[0]);
  harness.editModeButton.dispatch("click");
  assert.deepEqual(selectedLines(harness), []);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-127
test("T39: included blocks stop the range and the properties table is never selected", () => {
  const harness = createRuntimeHarness({
    mapFrontmatter: true, propertiesMapped: true, firstMappedSourceLine: 5, savedState: { editMode: true },
  });
  harness.mappings[2].setAttribute("data-sphinx-preview-included", "true");
  shiftClick(harness, harness.mappings[0]);
  shiftClick(harness, harness.mappings[2]);
  assert.deepEqual(selectedLines(harness), [5, 50], "the selection ends before the included block");
  harness.dispatchDocument("keydown", shiftKey("ArrowDown", { target: harness.mappings[1] }));
  assert.deepEqual(selectedLines(harness), [5, 50], "Shift+Down cannot pass it");
  const properties = harness.currentProperties()!;
  shiftClick(harness, properties);
  assert.equal(properties.getAttribute(SELECTED), null);
  assert.deepEqual(selectedLines(harness), [5, 50]);
  harness.dispatchDocument("keydown", shiftKey("ArrowUp", { target: harness.mappings[0] }));
  harness.dispatchDocument("keydown", shiftKey("ArrowUp", { target: harness.mappings[0] }));
  assert.equal(properties.getAttribute(SELECTED), null, "Shift+Up stops at the first body block");
});

test("T39 r2: blocks are named by position, so an edit that adds lines selects the right blocks", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const textarea = openMoveTextarea(harness, "Current block\n");
  textarea.value = "Current block\nwith\ntwo more lines\n";
  textarea.dispatch("input");
  shiftClick(harness, harness.mappings[2]);
  // The save adds two lines: the blocks below the edited one shift down by two.
  harness.mappings[1].setAttribute("data-sphinx-source-end-line", "54");
  harness.mappings[2].setAttribute("data-sphinx-source-line", "102");
  harness.mappings[2].setAttribute("data-sphinx-source-end-line", "102");
  harness.dispatchMessage(patchMessage());
  assert.deepEqual(selectedLines(harness), [50, 102], "the edited block and the clicked one, at their new lines");
  assert.equal(selectionAnnouncement(harness), "2 blocks selected");
});

test("T39 r2: a save that changes the number of blocks selects nothing instead of another block", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const textarea = openMoveTextarea(harness, "Current block\n");
  textarea.value = "Current block\n\nsplit\n";
  textarea.dispatch("input");
  shiftClick(harness, harness.mappings[2]);
  harness.mappings.splice(1, 1);
  harness.dispatchMessage(patchMessage());
  assert.deepEqual(selectedLines(harness), []);
});

test("T39 r2: a pending selection does not survive its editor closing without the patch", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const textarea = openMoveTextarea(harness, "Current block\n");
  textarea.value = "Current block, changed\n";
  textarea.dispatch("input");
  shiftClick(harness, harness.mappings[2]);
  harness.editModeButton.dispatch("click");
  harness.editModeButton.dispatch("click");
  harness.dispatchMessage(patchMessage());
  assert.deepEqual(selectedLines(harness), [], "a later patch selects nothing");
});

test("T39 r2: Shift+Arrow with a selection leaves toolbar buttons alone", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  shiftClick(harness, harness.mappings[0]);
  let prevented = false;
  harness.dispatchDocument("keydown", shiftKey("ArrowDown", {
    target: harness.zoomInButton, preventDefault: () => { prevented = true; },
  }));
  assert.equal(prevented, false);
  assert.deepEqual(selectedLines(harness), [1]);
  harness.dispatchDocument("keydown", shiftKey("ArrowDown", { target: harness.body }));
  assert.deepEqual(selectedLines(harness), [1, 50], "the page itself still extends it");
});

test("T39 r2: Shift+mousedown inside a link keeps the browser default", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const inner = harness.mappings[0];
  const closest = inner.closest.bind(inner);
  inner.closest = (selector: string) => (selector === "a" ? inner : closest(selector));
  let prevented = false;
  harness.dispatchDocument("mousedown", { target: inner, shiftKey: true, preventDefault: () => { prevented = true; } });
  assert.equal(prevented, false);
  harness.dispatchDocument("mousedown", { target: harness.mappings[1], shiftKey: true, preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true, "on plain block text it is cancelled");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-041
test("T39 r2: Shift+click while the property editor is open selects nothing", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell, preventDefault: () => undefined, stopPropagation: () => undefined,
  });
  assert.ok(harness.createdElements.some((element) => element.tagName === "SELECT"), "the property editor is open");
  shiftClick(harness, harness.mappings[0]);
  assert.deepEqual(selectedLines(harness), []);
});

// T40: copy, cut and paste of the selected blocks as Markdown (the host owns clipboard and edit).
function clipboardKey(key: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { key, ctrlKey: true, preventDefault: () => undefined, stopPropagation: () => undefined, ...extra };
}

function blocksMessages(harness: RuntimeHarness, from = 0): Array<Record<string, unknown>> {
  return harness.messages.slice(from).filter((message) =>
    typeof message.type === "string" && message.type.startsWith("previewBlocks") && !message.type.endsWith("Result"));
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-166
test("T40: Ctrl+C and Ctrl+X on a selection post its source lines; the keys are ours", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  shiftClick(harness, harness.mappings[0]);
  shiftClick(harness, harness.mappings[1]);
  const before = harness.messages.length;
  let prevented = 0;
  const target = harness.mappings[1];
  harness.dispatchDocument("keydown", clipboardKey("c", { target, preventDefault: () => { prevented += 1; } }));
  let sent = blocksMessages(harness, before);
  assert.deepEqual(sent.map((message) => [message.type, message.line, message.endLine]), [["previewBlocksCopy", 1, 52]]);
  assert.equal(prevented, 1, "the browser does not copy the rendered text");
  harness.dispatchMessage({ type: "previewBlocksResult", ...MOVE_IDENTIFIERS, op: "copy", ok: true });
  harness.dispatchDocument("keydown", clipboardKey("x", { target }));
  sent = blocksMessages(harness, before);
  assert.deepEqual(sent.map((message) => [message.type, message.line, message.endLine]), [
    ["previewBlocksCopy", 1, 52], ["previewBlocksCut", 1, 52],
  ]);
  assert.equal(typeof sent[1].pinViewportTop, "number", "a cut holds the screen position");
  assert.equal(sent[0].pinViewportTop, undefined);
});

test("T40: on macOS the chord is Cmd, and Ctrl alone is ignored", () => {
  const harness = createRuntimeHarness({ platform: "MacIntel", savedState: { editMode: true } });
  shiftClick(harness, harness.mappings[1]);
  const before = harness.messages.length;
  harness.dispatchDocument("keydown", clipboardKey("c", { target: harness.mappings[1] }));
  assert.equal(blocksMessages(harness, before).length, 0);
  harness.dispatchDocument("keydown", clipboardKey("c", { target: harness.mappings[1], ctrlKey: false, metaKey: true }));
  assert.deepEqual(blocksMessages(harness, before).map((message) => [message.line, message.endLine]), [[50, 52]]);
});

test("T40: without a selection, in reading mode or with Shift/Alt the keys stay native", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const before = harness.messages.length;
  let prevented = false;
  const native = { target: harness.mappings[1], preventDefault: () => { prevented = true; } };
  harness.dispatchDocument("keydown", clipboardKey("c", native));
  harness.dispatchDocument("keydown", clipboardKey("x", native));
  assert.equal(blocksMessages(harness, before).length, 0);
  assert.equal(prevented, false);
  shiftClick(harness, harness.mappings[1]);
  harness.dispatchDocument("keydown", clipboardKey("c", { ...native, shiftKey: true }));
  harness.dispatchDocument("keydown", clipboardKey("c", { ...native, altKey: true }));
  harness.dispatchDocument("keydown", clipboardKey("c", { ...native, ctrlKey: false }));
  assert.equal(blocksMessages(harness, before).length, 0);
  const reading = createRuntimeHarness({ savedState: { editMode: false } });
  reading.dispatchDocument("keydown", clipboardKey("c", { target: reading.mappings[1] }));
  assert.equal(blocksMessages(reading).length, 0);
});

test("T40: the keys are ignored inside a text box, a field and the property table", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const textarea = openMoveTextarea(harness, "Current block\n");
  const before = harness.messages.length;
  let prevented = false;
  for (const key of ["c", "x", "v"]) {
    harness.dispatchDocument("keydown", clipboardKey(key, { target: textarea, preventDefault: () => { prevented = true; } }));
  }
  assert.equal(blocksMessages(harness, before).length, 0);
  assert.equal(prevented, false);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-174
test("T40: Ctrl+V pastes after the selection, or after the block of a focused bar", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const before = harness.messages.length;
  shiftClick(harness, harness.mappings[1]);
  shiftClick(harness, harness.mappings[2]);
  harness.dispatchDocument("keydown", clipboardKey("v", { target: harness.mappings[2] }));
  let sent = blocksMessages(harness, before);
  assert.deepEqual(sent.map((message) => [message.type, message.insertAfterLine, message.pinLine]), [
    ["previewBlocksPaste", 100, 100],
  ]);
  harness.dispatchMessage({ type: "previewBlocksResult", ...MOVE_IDENTIFIERS, op: "paste", ok: true });
  assert.deepEqual(selectedLines(harness), [], "the selection is gone after a paste");
  const bar = insertPointAfterLine(harness, 52);
  harness.dispatchDocument("keydown", clipboardKey("v", { target: bar.childElements[0] }));
  sent = blocksMessages(harness, before);
  assert.deepEqual(sent.at(-1) && [sent.at(-1)!.insertAfterLine, sent.at(-1)!.pinLine], [52, 50]);
  const start = createRuntimeHarness({ savedState: { editMode: true }, emptyBody: true });
  start.dispatchDocument("keydown", clipboardKey("v", { target: start.mappings[0] }));
  assert.equal(blocksMessages(start).length, 0, "plain focus on the page pastes nothing");
});

test("T40: a held key sends one request until the host answers; a refusal is announced", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  shiftClick(harness, harness.mappings[1]);
  const before = harness.messages.length;
  const key = clipboardKey("x", { target: harness.mappings[1] });
  harness.dispatchDocument("keydown", key);
  harness.dispatchDocument("keydown", key);
  assert.equal(blocksMessages(harness, before).length, 1);
  harness.dispatchMessage({ type: "previewBlocksResult", ...MOVE_IDENTIFIERS, op: "cut", ok: false, reason: "Nope." });
  assert.equal(selectionAnnouncement(harness), "Nope.");
  assert.deepEqual(selectedLines(harness), [50], "a refused cut keeps the selection");
  harness.dispatchDocument("keydown", key);
  assert.equal(blocksMessages(harness, before).length, 2, "a new request after the answer");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-169
test("T40: a copy answer says so and a cut answer clears the selection", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  shiftClick(harness, harness.mappings[1]);
  harness.dispatchDocument("keydown", clipboardKey("c", { target: harness.mappings[1] }));
  harness.dispatchMessage({ type: "previewBlocksResult", ...MOVE_IDENTIFIERS, op: "copy", ok: true });
  assert.equal(selectionAnnouncement(harness), "Copied as Markdown");
  assert.deepEqual(selectedLines(harness), [50], "copy keeps the selection");
  harness.dispatchDocument("keydown", clipboardKey("x", { target: harness.mappings[1] }));
  harness.dispatchMessage({ type: "previewBlocksResult", ...MOVE_IDENTIFIERS, op: "cut", ok: true });
  assert.deepEqual(selectedLines(harness), []);
});

// T41: Alt+Up/Down (and the bar arrows of the last selected block) move the whole selection.
function selectTwo(harness: RuntimeHarness, from = 0): void {
  shiftClick(harness, harness.mappings[from]);
  shiftClick(harness, harness.mappings[from + 1]);
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-156
test("T41: Alt+ArrowDown with a two-block selection posts the span; the selection follows the patch", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  selectTwo(harness);
  assert.deepEqual(selectedLines(harness), [1, 50]);
  const before = harness.messages.length;
  let prevented = 0;
  harness.dispatchDocument("keydown", altKey("ArrowDown", {
    target: harness.mappings[1], preventDefault: () => { prevented += 1; },
  }));
  const moves = moveMessages(harness, before);
  assert.equal(moves.length, 1);
  assert.deepEqual(
    [moves[0].line, moves[0].endLine, moves[0].neighbourLine, moves[0].neighbourEndLine, moves[0].direction],
    [1, 52, 100, 100, "down"],
  );
  assert.equal(prevented, 1);
  harness.dispatchMessage({ type: "previewBlockMoveResult", ...MOVE_IDENTIFIERS, ok: true, line: 3 });
  harness.dispatchMessage(patchMessage());
  // Same block count after the patch: the span now covers the second and third blocks.
  assert.deepEqual(selectedLines(harness), [50, 100]);
  assert.equal(selectionAnnouncement(harness), "2 blocks selected");
  assert.equal((harness.mappings[2] as RuntimeElement).focusOptions?.preventScroll, true, "the focus follows the span");
});

test("T41: Alt+ArrowUp with a selection posts the span above its neighbour", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  selectTwo(harness, 1);
  const before = harness.messages.length;
  harness.dispatchDocument("keydown", altKey("ArrowUp", { target: harness.mappings[2] }));
  const up = moveMessages(harness, before).at(-1)!;
  assert.deepEqual([up.line, up.endLine, up.neighbourLine, up.neighbourEndLine, up.direction], [50, 100, 1, 1, "up"]);
  harness.dispatchMessage({ type: "previewBlockMoveResult", ...MOVE_IDENTIFIERS, ok: true, line: 1 });
  harness.dispatchMessage(patchMessage());
  assert.deepEqual(selectedLines(harness), [1, 50]);
});

test("T41: at either end of the document the span does not move, and the selection stays", () => {
  const bottom = createRuntimeHarness({ savedState: { editMode: true } });
  selectTwo(bottom, 1);
  const before = bottom.messages.length;
  let prevented = 0;
  bottom.dispatchDocument("keydown", altKey("ArrowDown", {
    target: bottom.mappings[2], preventDefault: () => { prevented += 1; },
  }));
  assert.deepEqual(moveMessages(bottom, before), []);
  assert.equal(prevented, 1, "the key is still ours");
  assert.deepEqual(selectedLines(bottom), [50, 100]);
  const top = createRuntimeHarness({ savedState: { editMode: true } });
  selectTwo(top, 0);
  top.dispatchDocument("keydown", altKey("ArrowUp", { target: top.mappings[1] }));
  assert.deepEqual(moveMessages(top, 0), []);
});

test("T41: a key repeat does not move the span twice; a refusal keeps the selection and can be retried", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  selectTwo(harness);
  const before = harness.messages.length;
  const target = harness.mappings[1];
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target }));
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target, repeat: true }));
  assert.equal(moveMessages(harness, before).length, 1);
  harness.dispatchMessage({ type: "previewBlockMoveResult", ...MOVE_IDENTIFIERS, ok: false, reason: "Text between." });
  assert.deepEqual(selectedLines(harness), [1, 50], "a refused move leaves the selection as it was");
  const reason = insertPointAfterLine(harness, 52).childElements.find((element) =>
    element.className.split(" ").includes("sphinx-preview-move-status"));
  assert.equal(reason?.textContent, "Text between.", "the reason shows under the last selected block");
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target }));
  assert.equal(moveMessages(harness, before).length, 2);
});

test("T41: the arrows of the last selected block's bar move the span; other bars move one block", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  selectTwo(harness);
  const before = harness.messages.length;
  moveButton(harness, 52, "down").dispatch("click", plainClick());
  const span = moveMessages(harness, before).at(-1)!;
  assert.deepEqual([span.line, span.endLine, span.neighbourLine, span.direction], [1, 52, 100, "down"]);
  harness.dispatchMessage({ type: "previewBlockMoveResult", ...MOVE_IDENTIFIERS, ok: false, reason: "no" });
  // The bar of a block that is not the end of the selection moves that one block.
  const count = moveMessages(harness, before).length;
  moveButton(harness, 100, "up").dispatch("click", plainClick());
  const moved = moveMessages(harness, before);
  assert.equal(moved.length, count + 1);
  assert.deepEqual([moved.at(-1)!.line, moved.at(-1)!.endLine, moved.at(-1)!.direction], [100, 100, "up"]);
});

test("T41: without a selection Alt+Arrow still moves the one focused block", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const before = harness.messages.length;
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target: harness.mappings[1] }));
  const move = moveMessages(harness, before).at(-1)!;
  assert.deepEqual([move.line, move.endLine, move.direction], [50, 52, "down"]);
  harness.dispatchMessage({ type: "previewBlockMoveResult", ...MOVE_IDENTIFIERS, ok: true, line: 100 });
  harness.dispatchMessage(patchMessage());
  assert.deepEqual(selectedLines(harness), [], "a single-block move selects nothing");
});

test("T41: a patch that changes the number of blocks restores nothing instead of another block", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  selectTwo(harness);
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target: harness.mappings[1] }));
  harness.dispatchMessage({ type: "previewBlockMoveResult", ...MOVE_IDENTIFIERS, ok: true, line: 3 });
  harness.mappings.splice(2, 1);
  harness.dispatchMessage(patchMessage());
  assert.deepEqual(selectedLines(harness), []);
});

test("T41: after a full reload the selection is restored from the saved state", () => {
  const savedState = {
    documentId: "file:///active.md",
    editMode: true,
    pendingMoveSelection: { anchor: 1, target: 2, count: 3, documentId: "file:///active.md", version: 6, at: Date.now() },
  };
  const harness = createRuntimeHarness({ savedState, previewStatus: "success" });
  assert.deepEqual(selectedLines(harness), [50, 100]);
  const stale = createRuntimeHarness({
    savedState: { ...savedState, pendingMoveSelection: { ...savedState.pendingMoveSelection, count: 4 } },
    previewStatus: "success",
  });
  assert.deepEqual(selectedLines(stale), [], "a different block count selects nothing");
});

function savedPending(harness: RuntimeHarness): unknown {
  return (harness.getWebviewState() ?? {}).pendingMoveSelection;
}

test("T41 r2: a saved pending selection of the same version, or an old one, selects nothing and is dropped", () => {
  const base = { anchor: 1, target: 2, count: 3, documentId: "file:///active.md" };
  for (const pending of [
    { ...base, version: 7, at: Date.now() },
    { ...base, version: 6, at: Date.now() - 10000 },
    { ...base, version: 6 },
  ]) {
    const harness = createRuntimeHarness({
      savedState: { documentId: "file:///active.md", editMode: true, pendingMoveSelection: pending },
      previewStatus: "success",
    });
    assert.deepEqual(selectedLines(harness), [], JSON.stringify(pending));
    assert.equal(savedPending(harness), undefined, "no pendingMoveSelection is left in the saved state");
  }
});

test("T41 r2: with a selection, Alt+Arrow on a block outside it moves that one block", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  shiftClick(harness, harness.mappings[0]);
  const before = harness.messages.length;
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target: harness.mappings[2] }));
  const single = moveMessages(harness, before);
  assert.equal(single.length, 0, "the last block has no neighbour below");
  harness.dispatchDocument("keydown", altKey("ArrowUp", { target: harness.mappings[2] }));
  const up = moveMessages(harness, before).at(-1)!;
  assert.deepEqual([up.line, up.endLine, up.direction], [100, 100, "up"]);
});

test("T41 r2: the last selected block's arrows are labelled for the selection; a dropped request leaves no pending mark", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  selectTwo(harness, 1);
  const last = moveButton(harness, 100, "down");
  assert.equal(last.getAttribute("aria-label"), "Move the selected blocks down");
  assert.equal(last.getAttribute("title"), "Move the selected blocks down");
  assert.equal(moveButton(harness, 52, "down").getAttribute("aria-label"), "Move the block above down");
  // Nothing below the span: the click posts nothing and marks nothing.
  const before = harness.messages.length;
  const point = insertPointAfterLine(harness, 100);
  point.childElements[2].removeAttribute("disabled");
  point.childElements[2].dispatch("click", plainClick());
  assert.deepEqual(moveMessages(harness, before), []);
  assert.equal(point.getAttribute("data-sphinx-move-pending"), null);
  harness.dispatchDocument("keydown", { key: "Escape", preventDefault: () => undefined, target: harness.mappings[1] });
  assert.equal(moveButton(harness, 100, "down").getAttribute("aria-label"), "Move the block above down");
  assert.equal(moveButton(harness, 100, "down").getAttribute("title"), null);
});

// CR 120: keyboard-only block editing. Up / Down select, Enter opens, Esc and Cmd/Ctrl+Enter close
// the editor and leave its block selected.
function plainKey(key: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { key, preventDefault: () => undefined, stopPropagation: () => undefined, ...extra };
}

function editorsOpen(harness: RuntimeHarness): boolean {
  return harness.documentElement.getAttribute("data-sphinx-preview-block-editing") === "true";
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-004
test("CR 120: plain Up and Down select a block, starting at the block nearest the viewport top", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const before = harness.messages.length;
  let prevented = 0;
  harness.dispatchDocument("keydown", plainKey("ArrowDown", { preventDefault: () => { prevented += 1; } }));
  assert.deepEqual(selectedLines(harness), [1], "the first press selects the top block");
  assert.equal(prevented, 1, "the page does not scroll under the key");
  harness.dispatchDocument("keydown", plainKey("ArrowDown"));
  assert.deepEqual(selectedLines(harness), [50]);
  harness.dispatchDocument("keydown", plainKey("ArrowDown"));
  harness.dispatchDocument("keydown", plainKey("ArrowDown"));
  assert.deepEqual(selectedLines(harness), [100], "the selection stops at the last block");
  harness.dispatchDocument("keydown", plainKey("ArrowUp"));
  assert.deepEqual(selectedLines(harness), [50]);
  assert.equal(selectionAnnouncement(harness), "1 block selected");
  assert.equal(harness.messages.slice(before).some((message) => message.type === "previewEditOpen"), false);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-004
test("CR 120: plain Up collapses a block run onto the neighbour of its free end", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  shiftClick(harness, harness.mappings[0]);
  shiftClick(harness, harness.mappings[2]);
  harness.dispatchDocument("keydown", plainKey("ArrowUp"));
  assert.deepEqual(selectedLines(harness), [50]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-004
test("CR 120: plain Up and Down do nothing outside edit mode, in a text box or with a modifier", () => {
  const reading = createRuntimeHarness();
  reading.dispatchDocument("keydown", plainKey("ArrowDown"));
  assert.deepEqual(selectedLines(reading), []);
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const textarea = openMoveTextarea(harness, "Current block\n");
  harness.dispatchDocument("keydown", plainKey("ArrowDown", { target: textarea }));
  assert.deepEqual(selectedLines(harness), [], "an open editor keeps its arrow keys");
  textarea.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  assert.equal(editorsOpen(harness), false);
  harness.dispatchDocument("keydown", plainKey("ArrowDown", { metaKey: true }));
  harness.dispatchDocument("keydown", plainKey("ArrowDown", { ctrlKey: true }));
  harness.dispatchDocument("keydown", plainKey("ArrowDown", { altKey: true }));
  assert.deepEqual(selectedLines(harness), [50], "only the Escape selection is left; no chord selected anything");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-004
test("CR 120: Enter opens the editor of the selected block", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  harness.dispatchDocument("keydown", plainKey("ArrowDown"));
  harness.dispatchDocument("keydown", plainKey("ArrowDown"));
  const before = harness.messages.length;
  harness.dispatchDocument("keydown", plainKey("Enter"));
  const opened = harness.messages.slice(before).filter((message) => message.type === "previewEditOpen");
  assert.equal(opened.length, 1);
  assert.equal(opened[0].line, 50);
  assert.equal(editorsOpen(harness), true);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-004
test("CR 120: Enter with no selection opens nothing", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const before = harness.messages.length;
  harness.dispatchDocument("keydown", plainKey("Enter"));
  assert.equal(harness.messages.slice(before).some((message) => message.type === "previewEditOpen"), false);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-004
test("CR 120: Escape closes the editor and leaves its block selected for the arrow keys", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const textarea = openMoveTextarea(harness, "Current block\n");
  textarea.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  assert.equal(editorsOpen(harness), false);
  assert.deepEqual(selectedLines(harness), [50]);
  harness.dispatchDocument("keydown", plainKey("ArrowDown"));
  assert.deepEqual(selectedLines(harness), [100]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-004
test("CR 120: Cmd/Ctrl+Enter without changes closes the editor and selects its block", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const textarea = openMoveTextarea(harness, "Current block\n");
  textarea.dispatch("keydown", { key: "Enter", ctrlKey: true, preventDefault: () => undefined });
  assert.equal(editorsOpen(harness), false);
  assert.deepEqual(selectedLines(harness), [50]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-004
test("CR 120: Cmd/Ctrl+Enter with changes saves, and the block is selected once the patch is in", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const textarea = openMoveTextarea(harness, "Current block\n");
  textarea.value = "Current block, changed\n";
  textarea.dispatch("input");
  const before = harness.messages.length;
  textarea.dispatch("keydown", { key: "Enter", metaKey: true, preventDefault: () => undefined });
  const saves = harness.messages.slice(before).filter((message) => message.type === "previewEditSave");
  assert.equal(saves.length, 1);
  assert.deepEqual(selectedLines(harness), [], "nothing is selected before the save result");
  harness.dispatchMessage(patchMessage());
  assert.deepEqual(selectedLines(harness), [50]);
});

// CR 129: the content root (`<main tabindex="-1">`) takes the focus when the margin is clicked or the
// window comes back; it is the page itself, never a control that keeps its arrow keys.
function previewRoot(harness: RuntimeHarness): RuntimeElement {
  return harness.previewContent;
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-004
test("CR 129: plain Up and Down on the focused content root move the block selection", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const root = previewRoot(harness);
  let prevented = 0;
  harness.dispatchDocument("keydown", plainKey("ArrowDown", { target: root, preventDefault: () => { prevented += 1; } }));
  assert.deepEqual(selectedLines(harness), [1], "the first press selects the top block");
  assert.equal(prevented, 1, "the page does not scroll under the key");
  harness.dispatchDocument("keydown", plainKey("ArrowDown", { target: root }));
  assert.deepEqual(selectedLines(harness), [50]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-004
test("CR 129: Shift+Down on the focused content root extends a selection", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  harness.dispatchDocument("keydown", plainKey("ArrowDown"));
  harness.dispatchDocument("keydown", plainKey("ArrowDown", { target: previewRoot(harness), shiftKey: true }));
  assert.deepEqual(selectedLines(harness), [1, 50]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-004
test("CR 129: the window coming back selects the block nearest the top when nothing was selected", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  assert.deepEqual(selectedLines(harness), []);
  harness.dispatchWindow("focus");
  assert.deepEqual(selectedLines(harness), [1]);
  harness.dispatchDocument("keydown", plainKey("ArrowDown", { target: previewRoot(harness) }));
  assert.deepEqual(selectedLines(harness), [50]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-004
test("CR 129: the window coming back restores the last block the keyboard selected", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  harness.dispatchDocument("keydown", plainKey("ArrowDown"));
  harness.dispatchDocument("keydown", plainKey("ArrowDown"));
  assert.deepEqual(selectedLines(harness), [50]);
  harness.dispatchMessage(patchMessage());
  assert.deepEqual(selectedLines(harness), [], "a patch while the window was away dropped the outline");
  harness.dispatchWindow("focus");
  assert.deepEqual(selectedLines(harness), [50], "the same block is selected again");
  assert.equal(selectionAnnouncement(harness), "1 block selected");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-004
test("CR 129: the window coming back selects nothing outside edit mode, in an editor or on another control", () => {
  const reading = createRuntimeHarness();
  reading.dispatchWindow("focus");
  assert.deepEqual(selectedLines(reading), []);
  const editing = createRuntimeHarness({ savedState: { editMode: true } });
  openMoveTextarea(editing, "Current block\n");
  editing.dispatchWindow("focus");
  assert.deepEqual(selectedLines(editing), [], "an open editor keeps the focus");
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  harness.document.activeElement = harness.mappings[1];
  harness.dispatchWindow("focus");
  assert.deepEqual(selectedLines(harness), [], "a focused block or control is left alone");
});
