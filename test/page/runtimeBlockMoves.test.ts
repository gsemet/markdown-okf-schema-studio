import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, RuntimeElement } from "./runtimeHarness";
import {
  altKey,
  insertPointAfterLine,
  insertPointsOf,
  MOVE_IDENTIFIERS,
  moveButton,
  moveMessages,
  NEXT_IDENTIFIERS,
  openMoveTextarea,
  patchMessage,
  plainClick,
  shiftKey,
  sourceReply,
} from "./runtimeTestSupport";

/**
 * Insertion points and block moves (features/insertPoints.ts, blockMoves.ts).
 */

test("T28: edit mode adds one insertion point after each top-level block, reading mode none", () => {
  const harness = createRuntimeHarness();
  assert.equal(insertPointsOf(harness).length, 0);
  harness.editModeButton.dispatch("click");
  assert.deepEqual(
    insertPointsOf(harness).map((point) => point.getAttribute("data-sphinx-insert-after-line")),
    ["1", "52", "100"],
  );
  harness.mappings.forEach((block, index) => {
    assert.equal(block.insertedElements.length, 1);
    assert.equal(block.insertedElements[0], insertPointsOf(harness)[index]);
  });
  const button = insertPointAfterLine(harness, 52).childElements[0];
  assert.equal(button.tagName, "BUTTON");
  assert.equal(button.getAttribute("aria-label"), "Insert a block here");
  assert.equal(button.getAttribute("type"), "button");
  assert.equal(button.textContent, "+");
  const first = insertPointsOf(harness);
  harness.editModeButton.dispatch("click");
  assert.equal(insertPointsOf(harness).length, 0);
  assert.ok(first.every((point) => point.removed));
  harness.editModeButton.dispatch("click");
  assert.equal(insertPointsOf(harness).length, 3, "recreated, not duplicated");
});

// T36: move a block up or down from its insertion bar.
const MOVE_LABELS = ["Move the block above up", "Move the block above down"];

test("T36: every body insertion point has up and down buttons, disabled at the ends", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  for (const line of [1, 52, 100]) {
    const buttons = insertPointAfterLine(harness, line).childElements;
    assert.deepEqual(buttons.map((button) => button.textContent), ["+", "\u2191", "\u2193"]);
    assert.deepEqual(buttons.slice(1).map((button) => button.getAttribute("aria-label")), MOVE_LABELS);
    assert.ok(buttons.slice(1).every((button) => button.getAttribute("type") === "button"));
  }
  const disabled = (line: number, direction: "up" | "down") =>
    moveButton(harness, line, direction).getAttribute("disabled") !== null;
  assert.deepEqual([disabled(1, "up"), disabled(1, "down")], [true, false]);
  assert.deepEqual([disabled(52, "up"), disabled(52, "down")], [false, false]);
  assert.deepEqual([disabled(100, "up"), disabled(100, "down")], [false, true]);
});

test("T36: the properties point and the Start writing point have no move buttons", () => {
  const withProperties = createRuntimeHarness({
    mapFrontmatter: true, propertiesMapped: true, savedState: { editMode: true },
  });
  assert.equal(insertPointAfterLine(withProperties, 0).childElements.length, 1);
  const empty = createRuntimeHarness({ emptyBody: true, previewStatus: "success", savedState: { editMode: true } });
  assert.equal(insertPointAfterLine(empty, 0).childElements.length, 1);
});

test("T36: a block from an included file disables its own buttons and the ones toward it", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  harness.mappings[1].setAttribute("data-sphinx-preview-included", "true");
  harness.editModeButton.dispatch("click");
  harness.editModeButton.dispatch("click");
  const disabled = (line: number, direction: "up" | "down") =>
    moveButton(harness, line, direction).getAttribute("disabled") !== null;
  assert.deepEqual([disabled(1, "down"), disabled(52, "up"), disabled(52, "down"), disabled(100, "up")],
    [true, true, true, true]);
});

test("T36: a click posts the ranges of the block above the bar and of its neighbour", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const before = harness.messages.length;
  moveButton(harness, 52, "down").dispatch("click", plainClick());
  moveButton(harness, 52, "up").dispatch("click", plainClick());
  const moves = harness.messages.slice(before).filter((message) => message.type === "previewBlockMove");
  assert.equal(moves.length, 2);
  assert.deepEqual(
    { ...moves[0], pinViewportTop: typeof moves[0].pinViewportTop },
    {
      type: "previewBlockMove", documentId: "file:///active.md", revision: 7, requestId: 11,
      line: 50, endLine: 52, neighbourLine: 100, neighbourEndLine: 100, direction: "down",
      pinViewportTop: "number",
    },
  );
  assert.equal(moves[0].pinViewportTop, 500);
  assert.deepEqual(
    [moves[1].line, moves[1].endLine, moves[1].neighbourLine, moves[1].neighbourEndLine, moves[1].direction],
    [50, 52, 1, 1, "up"],
  );
  assert.equal(harness.messages.slice(before).some((message) => message.type === "previewEditOpen"), false);
});

test("T36: a disabled button posts nothing, and the buttons stand down while an editor is open", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const before = harness.messages.length;
  moveButton(harness, 1, "up").dispatch("click", plainClick());
  moveButton(harness, 100, "down").dispatch("click", plainClick());
  assert.equal(harness.messages.length, before);
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-block-editing"), null);
  insertPointAfterLine(harness, 52).childElements[0].dispatch("click", plainClick());
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-block-editing"), "true");
  const opened = harness.messages.length;
  moveButton(harness, 52, "down").dispatch("click", plainClick());
  assert.equal(harness.messages.slice(opened).some((message) => message.type === "previewBlockMove"), false);
});

test("T36: a refused move says why next to the bar; a result of another context is ignored", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  moveButton(harness, 52, "down").dispatch("click", plainClick());
  const result = {
    type: "previewBlockMoveResult", documentId: "file:///active.md", revision: 7, requestId: 11,
    ok: false, reason: "Text between the two blocks prevents the move.",
  };
  harness.dispatchMessage({ ...result, requestId: 99 });
  const statusOf = () => insertPointAfterLine(harness, 52).childElements.find((element) =>
    element.className.split(" ").includes("sphinx-preview-move-status"));
  assert.equal(statusOf(), undefined);
  harness.dispatchMessage(result);
  assert.equal(statusOf()?.textContent, result.reason);
  assert.equal(statusOf()?.getAttribute("role"), "status");
});

test("T37: Alt+ArrowDown on a focused block and Alt+ArrowUp on its bar button post the move", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const before = harness.messages.length;
  let prevented = 0;
  const handled = altKey("ArrowDown", { target: harness.mappings[1], preventDefault: () => { prevented += 1; } });
  harness.dispatchDocument("keydown", handled);
  const moves = moveMessages(harness, before);
  assert.equal(moves.length, 1);
  assert.deepEqual(
    [moves[0].line, moves[0].endLine, moves[0].neighbourLine, moves[0].neighbourEndLine, moves[0].direction],
    [50, 52, 100, 100, "down"],
  );
  assert.equal(prevented, 1);
  harness.dispatchMessage({ type: "previewBlockMoveResult", ...MOVE_IDENTIFIERS, ok: false, reason: "no" });
  const button = insertPointAfterLine(harness, 52).childElements[0];
  harness.dispatchDocument("keydown", altKey("ArrowUp", { target: button }));
  const up = moveMessages(harness, before).at(-1)!;
  assert.deepEqual([up.line, up.neighbourLine, up.direction], [50, 1, "up"]);
});

test("T37: other chords and other targets do not move a block", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const before = harness.messages.length;
  const target = harness.mappings[1];
  harness.dispatchDocument("keydown", { key: "ArrowDown", target, preventDefault: () => undefined });
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target, ctrlKey: true }));
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target, metaKey: true }));
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target, shiftKey: true }));
  harness.dispatchDocument("keydown", altKey("ArrowLeft", { target }));
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target: harness.createdElements[0] }));
  harness.dispatchDocument("keydown", altKey("ArrowUp", { target: harness.mappings[0] }));
  assert.deepEqual(moveMessages(harness, before), []);
});

test("T37: a key repeat during the round trip does not move twice; the block takes the focus", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const before = harness.messages.length;
  const target = harness.mappings[1];
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target }));
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target, repeat: true }));
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target, repeat: true }));
  assert.equal(moveMessages(harness, before).length, 1);
  // The result arrives before the render: still no second move.
  harness.dispatchMessage({ type: "previewBlockMoveResult", ...MOVE_IDENTIFIERS, ok: true, line: 100 });
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target, repeat: true }));
  assert.equal(moveMessages(harness, before).length, 1);
  assert.equal((harness.mappings[2] as RuntimeElement).focusOptions === undefined, true);
  harness.dispatchMessage(patchMessage());
  assert.equal((harness.mappings[2] as RuntimeElement).focusOptions?.preventScroll, true, "the moved block has the focus");
  assert.equal(harness.mappings[2].getAttribute("tabindex"), "-1");
  harness.dispatchDocument("keydown", altKey("ArrowUp", { target: harness.mappings[2] }));
  assert.equal(moveMessages(harness, before).length, 2, "once the render is in, the next move goes through");
});

test("T37: a refused keyboard move can be retried", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const target = harness.mappings[1];
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target }));
  harness.dispatchMessage({ type: "previewBlockMoveResult", ...MOVE_IDENTIFIERS, ok: false, reason: "no" });
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target }));
  assert.equal(moveMessages(harness).length, 2);
});

test("T37: plain Alt+Arrow in the text box stays native; the shortcut chord is the only one handled", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const textarea = openMoveTextarea(harness, "Current block\n");
  textarea.value = "Current block, changed\n";
  textarea.dispatch("input");
  const before = harness.messages.length;
  let prevented = false;
  textarea.dispatch("keydown", altKey("ArrowDown", { preventDefault: () => { prevented = true; } }));
  textarea.dispatch("keydown", altKey("ArrowDown", { metaKey: true, preventDefault: () => { prevented = true; } }));
  assert.equal(prevented, false);
  assert.equal(harness.messages.length, before);
});

test("T37: Ctrl+Alt+ArrowDown saves, moves, then reopens the editor with the caret in place", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const textarea = openMoveTextarea(harness, "Current block\n");
  textarea.value = "Current block, changed\n";
  textarea.dispatch("input");
  textarea.setSelectionRange(7, 7);
  const before = harness.messages.length;
  let prevented = false;
  textarea.dispatch("keydown", altKey("ArrowDown", { ctrlKey: true, preventDefault: () => { prevented = true; } }));
  assert.equal(prevented, true);
  const save = harness.messages.slice(before).find((message) => message.type === "previewEditSave");
  assert.equal(save?.final, true);
  assert.deepEqual(moveMessages(harness, before), [], "the move waits for the saved render");
  // A repeat while the save is in flight does nothing.
  textarea.dispatch("keydown", altKey("ArrowDown", { ctrlKey: true, repeat: true }));
  assert.equal(harness.messages.slice(before).filter((m) => m.type === "previewEditSave").length, 1);
  harness.dispatchMessage(patchMessage());
  const moves = moveMessages(harness, before);
  assert.equal(moves.length, 1);
  assert.deepEqual([moves[0].line, moves[0].neighbourLine, moves[0].direction], [50, 100, "down"]);
  assert.equal(moves[0].revision, 8);
  harness.dispatchMessage({ type: "previewBlockMoveResult", ...NEXT_IDENTIFIERS, ok: true, line: 100 });
  assert.equal(
    harness.messages.slice(before).some((message) => message.type === "previewEditOpen"),
    false, "the editor waits for the render of the move",
  );
  harness.dispatchMessage(patchMessage({
    revision: 8, requestId: 12, next: { revision: 9, requestId: 13 },
  }));
  const open = harness.messages.slice(before).find((message) => message.type === "previewEditOpen");
  assert.ok(open, "the editor reopens on the moved block");
  assert.equal(open.line, 100);
  harness.dispatchMessage({
    type: "previewEditSource", documentId: "file:///active.md", revision: 9, requestId: 13,
    editId: open.editId, originalText: "Current block, changed\n",
  });
  const reopened = harness.createdElements.filter((element) => element.tagName === "TEXTAREA").at(-1)!;
  assert.notEqual(reopened, textarea);
  assert.deepEqual(reopened.selectionRange, [7, 7], "the caret is where it was");
});

test("T37: on macOS the chord is Cmd+Alt, and Ctrl+Alt does nothing special", () => {
  const harness = createRuntimeHarness({ platform: "MacIntel", savedState: { editMode: true } });
  const textarea = openMoveTextarea(harness, "Current block\n");
  textarea.value = "Current block, changed\n";
  textarea.dispatch("input");
  const before = harness.messages.length;
  textarea.dispatch("keydown", altKey("ArrowUp", { ctrlKey: true }));
  assert.equal(harness.messages.length, before);
  textarea.dispatch("keydown", altKey("ArrowUp", { metaKey: true }));
  assert.equal(harness.messages.slice(before).find((message) => message.type === "previewEditSave")?.final, true);
});

test("T37: with nothing to save the chord closes the editor and moves at once", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const textarea = openMoveTextarea(harness, "Current block\n");
  textarea.setSelectionRange(3, 3);
  const before = harness.messages.length;
  textarea.dispatch("keydown", altKey("ArrowUp", { ctrlKey: true }));
  const sent = harness.messages.slice(before).map((message) => message.type);
  assert.deepEqual(sent, ["previewEditCancel", "previewBlockMove"]);
});

test("T28: a render that starts in edit mode builds the insertion points at init", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  assert.equal(insertPointsOf(harness).length, 3);
});

test("T28: the properties section gets an insertion point after line 0", () => {
  const harness = createRuntimeHarness({
    mapFrontmatter: true,
    propertiesMapped: true,
    savedState: { editMode: true },
  });
  assert.deepEqual(
    insertPointsOf(harness).map((point) => point.getAttribute("data-sphinx-insert-after-line")),
    ["0", "1", "52", "100"],
  );
});

test("T28: an empty body shows a single Start writing point after line 0", () => {
  const harness = createRuntimeHarness({
    emptyBody: true,
    previewStatus: "success",
    savedState: { editMode: true },
  });
  const points = insertPointsOf(harness);
  assert.equal(points.length, 1);
  assert.equal(points[0].getAttribute("data-sphinx-insert-after-line"), "0");
  assert.equal(points[0].childElements[0].textContent, "Start writing");
  assert.equal(points[0].parentElement, harness.previewContent);
  harness.editModeButton.dispatch("click");
  assert.equal(insertPointsOf(harness).length, 0, "reading mode removes it");
});

test("T28: a frontmatter-only document gets one Start writing point", () => {
  const harness = createRuntimeHarness({
    emptyBody: true,
    mapFrontmatter: true,
    propertiesMapped: true,
    previewStatus: "success",
    savedState: { editMode: true },
  });
  const points = insertPointsOf(harness);
  assert.equal(points.length, 1);
  assert.equal(points[0].getAttribute("data-sphinx-insert-after-line"), "0");
  assert.equal(points[0].childElements[0].textContent, "Start writing");
});

test("T28: a failed render offers no Start writing point", () => {
  const harness = createRuntimeHarness({
    emptyBody: true,
    previewStatus: "error",
    savedState: { editMode: true },
  });
  assert.equal(insertPointsOf(harness).length, 0);
});

test("T28: clicking a point posts previewEditOpen with insertAfterLine", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  insertPointAfterLine(harness, 52).childElements[0].dispatch("click", {
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  const open = harness.messages.at(-1);
  assert.equal(open?.type, "previewEditOpen");
  assert.equal(open?.line, 52);
  assert.equal(open?.endLine, 52);
  assert.equal(open?.insertAfterLine, 52);
});

test("T28: Start writing opens at line 1 with insertAfterLine 0", () => {
  const harness = createRuntimeHarness({
    emptyBody: true,
    previewStatus: "success",
    savedState: { editMode: true },
  });
  insertPointAfterLine(harness, 0).childElements[0].dispatch("click", {
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  const open = harness.messages.at(-1);
  assert.equal(open?.type, "previewEditOpen");
  assert.equal(open?.line, 1);
  assert.equal(open?.endLine, 1);
  assert.equal(open?.insertAfterLine, 0);
});

test("T28: document-level click and keydown on an insertion point never open a block editor", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const point = insertPointAfterLine(harness, 52);
  const button = point.childElements[0];
  const before = harness.messages.length;
  harness.dispatchDocument("click", { target: button, preventDefault: () => undefined });
  harness.dispatchDocument("keydown", { key: "Enter", target: point, preventDefault: () => undefined });
  harness.dispatchDocument("keydown", { key: " ", target: button, preventDefault: () => undefined });
  assert.equal(
    harness.messages.slice(before).some((message) =>
      message.type === "previewEditOpen" || message.type === "revealSource"),
    false,
  );
  assert.equal(harness.createdElements.some((element) =>
    element.getAttribute("data-sphinx-preview-block-editor") !== null), false);
});

test("T28: an empty source reply opens an empty textarea with a placeholder; Done saves the insertion", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  insertPointAfterLine(harness, 52).childElements[0].dispatch("click", {
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  sourceReply(harness, "", { insertAfterLine: 52 });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  assert.equal(textarea.value, "");
  assert.equal(
    textarea.getAttribute("placeholder"),
    'Type Markdown, for example "## Heading" or "- item"',
  );
  const done = harness.createdElements.find((element) =>
    element.tagName === "BUTTON" && element.textContent === "Done");
  const cancel = harness.createdElements.find((element) =>
    element.tagName === "BUTTON" && element.textContent === "Cancel");
  assert.ok(done && cancel);
  assert.ok(harness.createdElements.some((element) =>
    element.tagName === "P" && /Enter: new line/u.test(element.textContent)), "hint is shown");
  textarea.value = "## New section";
  textarea.dispatch("input");
  done.dispatch("click");
  const save = harness.messages.at(-1);
  assert.equal(save?.type, "previewEditSave");
  assert.equal(save?.insertAfterLine, 52);
  assert.equal(save?.originalText, "");
  assert.equal(save?.editedText, "## New section");
  assert.equal(save?.final, true);
});

test("T28: Done on an untouched empty insertion closes without saving", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  insertPointAfterLine(harness, 1).childElements[0].dispatch("click", {
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  sourceReply(harness, "", { insertAfterLine: 1 });
  const done = harness.createdElements.find((element) =>
    element.tagName === "BUTTON" && element.textContent === "Done");
  assert.ok(done);
  done.dispatch("click");
  assert.equal(harness.messages.some((message) => message.type === "previewEditSave"), false);
});

test("T28: autosave and Cancel carry insertAfterLine", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  insertPointAfterLine(harness, 100).childElements[0].dispatch("click", {
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  sourceReply(harness, "", { insertAfterLine: 100 });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  textarea.value = "- check logs";
  textarea.dispatch("input");
  harness.flushTimers();
  const autosave = harness.messages.at(-1);
  assert.equal(autosave?.type, "previewEditSave");
  assert.equal(autosave?.final, false);
  assert.equal(autosave?.insertAfterLine, 100);
  const cancelButton = harness.createdElements.find((element) =>
    element.tagName === "BUTTON" && element.textContent === "Cancel");
  assert.ok(cancelButton);
  cancelButton.dispatch("click");
  const cancel = harness.messages.at(-1);
  assert.equal(cancel?.type, "previewEditCancel");
  assert.equal(cancel?.insertAfterLine, 100);
});

test("T28: ordinary block edits never carry insertAfterLine", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  assert.equal("insertAfterLine" in (harness.messages.at(-1) as object), false);
  sourceReply(harness, "Editable paragraph.\n");
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  assert.equal(textarea.getAttribute("placeholder"), null);
  textarea.value = "Changed.";
  textarea.dispatch("input");
  harness.flushTimers();
  assert.equal("insertAfterLine" in (harness.messages.at(-1) as object), false);
});
