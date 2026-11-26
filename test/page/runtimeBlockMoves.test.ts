import * as assert from "node:assert/strict";
import { test } from "node:test";

import { STALE_REQUEST } from "../../src/core/protocol/staleRequest";
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

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-087#S2
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-087#S8
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

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-109#S2
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-109#S7
test("T36: every body insertion point has up and down buttons, disabled at the ends", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  for (const line of [1, 52, 100]) {
    const buttons = insertPointAfterLine(harness, line).childElements;
    assert.deepEqual(buttons.map((button) => button.textContent), ["+", "\u2191", "\u2193", "\u00d7"]);
    assert.deepEqual(buttons.slice(1, 3).map((button) => button.getAttribute("aria-label")), MOVE_LABELS);
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
  // The Start writing point also holds its hint line (not a control): one button, no move buttons.
  const startPoint = insertPointAfterLine(empty, 0).childElements;
  assert.equal(startPoint.filter((element) => element.tagName === "BUTTON").length, 1);
  assert.equal(startPoint.length, 2);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-127#S1
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-127#S3
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

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-109#S8
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-109#S11
// @tests_req SwRS-MDOKFSTUDIO-TRUST-059#S5
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

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-109#S12
test("T36: a move refused as stale is sent once more after the next render, before any message", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const before = harness.messages.length;
  const statusOf = () => insertPointAfterLine(harness, 52).childElements.find((element) =>
    element.className.split(" ").includes("sphinx-preview-move-status"));
  moveButton(harness, 52, "down").dispatch("click", plainClick());
  harness.dispatchMessage({ type: "previewBlockMoveResult", ...MOVE_IDENTIFIERS, ok: false, reason: STALE_REQUEST });
  assert.equal(statusOf(), undefined, "no message while the render is awaited");
  assert.equal(moveMessages(harness, before).length, 1);
  harness.dispatchMessage(patchMessage());
  const moves = moveMessages(harness, before);
  assert.equal(moves.length, 2, "the move is sent again from the new render");
  assert.deepEqual(
    [moves[1].line, moves[1].endLine, moves[1].neighbourLine, moves[1].direction, moves[1].revision],
    [50, 52, 100, "down", 8],
  );
  harness.dispatchMessage({ type: "previewBlockMoveResult", ...NEXT_IDENTIFIERS, ok: false, reason: STALE_REQUEST });
  assert.equal(statusOf()?.textContent, STALE_REQUEST, "a second stale refusal is shown, not retried again");
  harness.dispatchMessage(patchMessage({ revision: 8, requestId: 12, next: { revision: 9, requestId: 13 } }));
  assert.equal(moveMessages(harness, before).length, 2);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-130#S1
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
  const refusal = insertPointAfterLine(harness, 52).childElements.find((element) =>
    element.className.split(" ").includes("sphinx-preview-move-status"));
  assert.equal(refusal?.textContent, "no", "a refusal after a key press shows its reason");
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

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-130#S6
test("T37: the chord in a list item editor saves the item, then moves the whole list", () => {
  // The default page has blocks at lines 1, 50 and 100; a list at line 60 holds two items, 60 to 61
  // and 62 to 63. The item editor moves the list that holds it, as the list's editor did.
  const openItem = (harness: ReturnType<typeof createRuntimeHarness>): RuntimeElement => {
    const mapped = (tag: string, line: number, endLine: number): RuntimeElement => {
      const element = new RuntimeElement({
        "data-sphinx-preview-document": "file:///active.md",
        "data-sphinx-source-end-line": String(endLine),
        "data-sphinx-source-file": "/workspace/active.md",
        "data-sphinx-source-line": String(line),
      }, harness.windowState, line * 10, 20, tag);
      harness.mappings.push(element);
      return element;
    };
    const list = mapped("ul", 60, 63);
    for (const [line, endLine] of [[60, 61], [62, 63]] as const) {
      const item = mapped("li", line, endLine);
      item.siblingsFromParent = true;
      item.appendChild(mapped("p", line, endLine));
      list.appendChild(item);
    }
    harness.dispatchDocument("click", { target: list.childElements[1]!.childElements[0], preventDefault: () => undefined });
    const request = harness.messages.at(-1);
    assert.deepEqual([request?.type, request?.line, request?.endLine], ["previewEditOpen", 62, 63], "the item editor opens");
    harness.dispatchMessage({
      type: "previewEditSource", ...MOVE_IDENTIFIERS, editId: request?.editId, originalText: "- Second item\n",
    });
    return harness.createdElements.filter((element) => element.tagName === "TEXTAREA").at(-1)!;
  };

  const changed = createRuntimeHarness({ savedState: { editMode: true } });
  const textarea = openItem(changed);
  textarea.value = "- Second item, changed\n";
  textarea.dispatch("input");
  textarea.setSelectionRange(4, 4);
  const before = changed.messages.length;
  let prevented = false;
  textarea.dispatch("keydown", altKey("ArrowDown", { ctrlKey: true, preventDefault: () => { prevented = true; } }));
  assert.equal(prevented, true, "the chord is consumed");
  const save = changed.messages.slice(before).find((message) => message.type === "previewEditSave");
  assert.deepEqual([save?.final, save?.line, save?.endLine], [true, 62, 63], "the item is saved first");
  assert.deepEqual(moveMessages(changed, before), [], "the move waits for the saved render");
  changed.dispatchMessage(patchMessage());
  const moves = moveMessages(changed, before);
  assert.deepEqual(moves.map((move) => [move.line, move.neighbourLine, move.direction]), [[60, 100, "down"]],
    "the whole list, from its first line, moves past the next top-level block");

  const unchanged = createRuntimeHarness({ savedState: { editMode: true } });
  const untouched = openItem(unchanged);
  const start = unchanged.messages.length;
  untouched.dispatch("keydown", altKey("ArrowUp", { ctrlKey: true }));
  assert.deepEqual(moveMessages(unchanged, start).map((move) => [move.line, move.neighbourLine, move.direction]),
    [[60, 50, "up"]], "nothing to save: the whole list moves at once");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-130#S6
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-130#S7
test("T37: AltGr with an arrow in the text box is no move chord", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const textarea = openMoveTextarea(harness, "Current block\n");
  textarea.setSelectionRange(3, 3);
  const before = harness.messages.length;
  textarea.dispatch("keydown", altKey("ArrowUp", { ctrlKey: true, getModifierState: (name: string) => name === "AltGraph" }));
  assert.deepEqual(harness.messages.slice(before), [], "AltGr leaves the key native");
  textarea.dispatch("keydown", altKey("ArrowUp", { ctrlKey: true, getModifierState: () => false }));
  assert.deepEqual(harness.messages.slice(before).map((message) => message.type), ["previewEditCancel", "previewBlockMove"]);
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

// The move chord inside an admonition or an alert. The default page has blocks at lines 1, 50 and
// 100; an admonition from line 60 to 90 stands between the last two. Its body holds a paragraph
// (61), a list (63 to 66, with a nested sub-list), a code block (68 to 70), a nested admonition
// (72 to 76), a block quote holding a list (78 to 79), a card holding a list (81 to 82) and a
// last paragraph (84).
const ADMONITION_KINDS = ["a MyST admonition", "a GitHub alert"] as const;

function admonitionMovePage(kind: (typeof ADMONITION_KINDS)[number]) {
  const harness = createRuntimeHarness();
  const element = (tag: string, parent: RuntimeElement | undefined,
    attributes: Record<string, string> = {}): RuntimeElement => {
    const created = new RuntimeElement(attributes, harness.windowState, 600, 20, tag);
    parent?.appendChild(created);
    return created;
  };
  const mapped = (tag: string, parent: RuntimeElement | undefined, line: number, endLine = line,
    attributes: Record<string, string> = {}): RuntimeElement => {
    const created = element(tag, parent, {
      "data-sphinx-preview-document": "file:///active.md",
      "data-sphinx-source-end-line": String(endLine),
      "data-sphinx-source-file": "/workspace/active.md",
      "data-sphinx-source-line": String(line),
      ...attributes,
    });
    created.siblingsFromParent = true;
    harness.mappings.push(created);
    return created;
  };
  const alert: Record<string, string> = kind === "a GitHub alert" ? { "data-okf-github-alert": "true" } : {};
  const admonition = mapped("aside", undefined, 60, 90, { class: "admonition note", ...alert });
  element("p", admonition, { class: "admonition-title" });
  const first = mapped("p", admonition, 61);
  const list = mapped("ul", admonition, 63, 66);
  const item = mapped("li", list, 63);
  mapped("p", item, 63);
  const parentItem = mapped("li", list, 64, 66);
  mapped("p", parentItem, 64);
  const subList = mapped("ul", parentItem, 65, 66);
  mapped("li", subList, 65);
  const nestedItem = mapped("li", subList, 66);
  const code = mapped("code", element("pre", admonition), 68, 70);
  const inner = mapped("aside", admonition, 72, 76, { class: "admonition tip" });
  element("p", inner, { class: "admonition-title" });
  const innerFirst = mapped("p", inner, 73);
  mapped("p", inner, 75);
  const quotedList = mapped("ul", mapped("blockquote", admonition, 78, 79), 78, 79);
  const quotedItem = mapped("li", quotedList, 78);
  mapped("li", quotedList, 79);
  const cardList = mapped("ul", element("div", admonition, { class: "sd-card" }), 81, 82);
  const cardItem = mapped("li", cardList, 81);
  mapped("li", cardList, 82);
  const last = mapped("p", admonition, 84);
  harness.editModeButton.dispatch("click");

  const editors = () => harness.createdElements.filter((created) => created.tagName === "TEXTAREA");
  // Answers the last edit request, so its text box opens.
  const answer = (originalText: string, identifiers: Record<string, unknown> = MOVE_IDENTIFIERS): RuntimeElement => {
    const request = harness.messages.filter((message) => message.type === "previewEditOpen").at(-1);
    harness.dispatchMessage({ type: "previewEditSource", ...identifiers, editId: request?.editId, originalText });
    return editors().at(-1)!;
  };
  const open = (target: RuntimeElement): RuntimeElement => {
    harness.dispatchDocument("click", { target, preventDefault: () => undefined });
    return answer("Source of the block\n");
  };
  const chord = (textarea: RuntimeElement, key: "ArrowUp" | "ArrowDown"): boolean => {
    let prevented = false;
    textarea.dispatch("keydown", altKey(key, { ctrlKey: true, preventDefault: () => { prevented = true; } }));
    return prevented;
  };
  // The lines of `block`, and of the blocks inside it, as the render after a move maps them.
  const shift = (block: RuntimeElement, delta: number): void => {
    for (const moved of harness.mappings.filter((candidate) => candidate === block || block.contains(candidate))) {
      for (const name of ["data-sphinx-source-line", "data-sphinx-source-end-line"]) {
        moved.setAttribute(name, String(Number(moved.getAttribute(name)) + delta));
      }
    }
  };
  return {
    harness, admonition, first, list, item, parentItem, subList, nestedItem, code, inner, innerFirst,
    quotedItem, cardItem, last, answer, open, chord, shift,
  };
}

const movedLines = (message: Record<string, unknown>) =>
  [message.line, message.endLine, message.neighbourLine, message.neighbourEndLine, message.direction];

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-130#S8
test("the chord in the editor of a block of an admonition moves it among the blocks of that admonition", () => {
  type Page = ReturnType<typeof admonitionMovePage>;
  const cases: ReadonlyArray<readonly [string, (page: Page) => RuntimeElement, "ArrowUp" | "ArrowDown", unknown[]]> = [
    ["an item moves its list down", (page) => page.item, "ArrowDown", [63, 66, 68, 70, "down"]],
    ["an item moves its list up", (page) => page.item, "ArrowUp", [63, 66, 61, 61, "up"]],
    ["a nested item moves the outermost list", (page) => page.nestedItem, "ArrowDown", [63, 66, 68, 70, "down"]],
    ["the list", (page) => page.list, "ArrowUp", [63, 66, 61, 61, "up"]],
    ["a paragraph", (page) => page.first, "ArrowDown", [61, 61, 63, 66, "down"]],
    ["a code block, up", (page) => page.code, "ArrowUp", [68, 70, 63, 66, "up"]],
    ["a code block, past a nested admonition", (page) => page.code, "ArrowDown", [68, 70, 72, 76, "down"]],
    ["a block of a nested admonition", (page) => page.innerFirst, "ArrowDown", [73, 73, 75, 75, "down"]],
    ["a nested admonition, up", (page) => page.inner, "ArrowUp", [72, 76, 68, 70, "up"]],
    ["a nested admonition, down", (page) => page.inner, "ArrowDown", [72, 76, 78, 79, "down"]],
  ];
  for (const kind of ADMONITION_KINDS) {
    for (const [name, target, key, expected] of cases) {
      const page = admonitionMovePage(kind);
      const textarea = page.open(target(page));
      const before = page.harness.messages.length;
      assert.equal(page.chord(textarea, key), true, `${kind}, ${name}: the chord is consumed`);
      assert.deepEqual(moveMessages(page.harness, before).map(movedLines), [expected], `${kind}, ${name}`);
    }
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-130#S8
test("the chord stops at the edge of an admonition body and leaves a block that is not a direct one", () => {
  type Page = ReturnType<typeof admonitionMovePage>;
  const cases: ReadonlyArray<readonly [string, (page: Page) => RuntimeElement, "ArrowUp" | "ArrowDown"]> = [
    ["the first block, up", (page) => page.first, "ArrowUp"],
    ["the last block, down", (page) => page.last, "ArrowDown"],
    ["the first block of a nested admonition, up", (page) => page.innerFirst, "ArrowUp"],
    ["a list inside a list item", (page) => page.subList, "ArrowDown"],
    ["an item of a list inside a block quote", (page) => page.quotedItem, "ArrowDown"],
    ["an item of a list inside a card", (page) => page.cardItem, "ArrowUp"],
  ];
  for (const kind of ADMONITION_KINDS) {
    for (const [name, target, key] of cases) {
      const page = admonitionMovePage(kind);
      const textarea = page.open(target(page));
      textarea.value = "Source of the block, changed\n";
      textarea.dispatch("input");
      const before = page.harness.messages.length;
      assert.equal(page.chord(textarea, key), true, `${kind}, ${name}: the chord is consumed`);
      assert.deepEqual(page.harness.messages.slice(before), [], `${kind}, ${name}: nothing is saved or moved`);
      assert.equal(page.harness.documentElement.getAttribute("data-sphinx-preview-block-editing"), "true",
        `${kind}, ${name}: the editor stays open`);
    }
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-130#S8
test("after a move inside an admonition the block's editor reopens, and the chord moves it again to the edge", () => {
  for (const kind of ADMONITION_KINDS) {
    const page = admonitionMovePage(kind);
    const textarea = page.open(page.code);
    textarea.setSelectionRange(5, 5);
    const before = page.harness.messages.length;
    page.chord(textarea, "ArrowUp");
    page.harness.dispatchMessage({ type: "previewBlockMoveResult", ...MOVE_IDENTIFIERS, ok: true, line: 63 });
    page.shift(page.code, -5);
    page.shift(page.list, 4);
    page.harness.dispatchMessage(patchMessage());
    const reopened = page.answer("Source of the block\n", NEXT_IDENTIFIERS);
    assert.notEqual(reopened, textarea, `${kind}: a new editor`);
    assert.deepEqual(reopened.selectionRange, [5, 5], `${kind}: the caret is where it was`);
    page.chord(reopened, "ArrowUp");
    page.harness.dispatchMessage({ type: "previewBlockMoveResult", ...NEXT_IDENTIFIERS, ok: true, line: 61 });
    page.shift(page.code, -2);
    page.shift(page.first, 4);
    page.harness.dispatchMessage(patchMessage({ revision: 8, requestId: 12, next: { revision: 9, requestId: 13 } }));
    const atEdge = page.answer("Source of the block\n", { ...NEXT_IDENTIFIERS, revision: 9, requestId: 13 });
    assert.notEqual(atEdge, reopened, `${kind}: a third editor`);
    assert.deepEqual(atEdge.selectionRange, [5, 5], `${kind}: the caret is still where it was`);
    const edge = page.harness.messages.length;
    assert.equal(page.chord(atEdge, "ArrowUp"), true);
    assert.deepEqual(page.harness.messages.slice(edge), [], `${kind}: the first block stays`);
    assert.deepEqual(moveMessages(page.harness, before).map(movedLines),
      [[68, 70, 63, 66, "up"], [63, 65, 61, 61, "up"]], kind);
    assert.deepEqual(
      page.harness.messages.slice(before).filter((message) => message.type === "previewEditOpen")
        .map((message) => [message.line, message.endLine]),
      [[63, 65], [61, 63]], `${kind}: the moved block's editor opens at its new lines`);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-130#S8
test("with unsaved text the chord in an admonition saves, moves the list, then reopens its editor", () => {
  for (const kind of ADMONITION_KINDS) {
    const page = admonitionMovePage(kind);
    const textarea = page.open(page.item);
    textarea.value = "- Source of the item, changed\n";
    textarea.dispatch("input");
    textarea.setSelectionRange(7, 7);
    const before = page.harness.messages.length;
    page.chord(textarea, "ArrowUp");
    const save = page.harness.messages.slice(before).find((message) => message.type === "previewEditSave");
    assert.deepEqual([save?.final, save?.line, save?.endLine], [true, 63, 63], `${kind}: the item is saved first`);
    assert.deepEqual(moveMessages(page.harness, before), [], `${kind}: the move waits for the saved render`);
    page.harness.dispatchMessage(patchMessage());
    const moves = moveMessages(page.harness, before);
    assert.deepEqual(moves.map(movedLines), [[63, 66, 61, 61, "up"]], kind);
    assert.equal(moves[0].revision, 8);
    page.harness.dispatchMessage({ type: "previewBlockMoveResult", ...NEXT_IDENTIFIERS, ok: true, line: 61 });
    page.shift(page.list, -2);
    page.shift(page.first, 5);
    page.harness.dispatchMessage(patchMessage({ revision: 8, requestId: 12, next: { revision: 9, requestId: 13 } }));
    const opened = page.harness.messages.slice(before).filter((message) => message.type === "previewEditOpen");
    assert.deepEqual(opened.map((message) => [message.line, message.endLine]), [[61, 64]],
      `${kind}: the list's editor opens at its new lines`);
    const reopened = page.answer("- Source of the item, changed\n", { ...NEXT_IDENTIFIERS, revision: 9, requestId: 13 });
    assert.notEqual(reopened, textarea);
    assert.deepEqual(reopened.selectionRange, [7, 7], `${kind}: the caret is where it was`);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-109#S8
test("a refused move inside an admonition says why next to the admonition's insert point", () => {
  for (const kind of ADMONITION_KINDS) {
    for (const [name, key] of [["a block of the body", "first"], ["a block of a nested admonition", "innerFirst"]] as const) {
      const page = admonitionMovePage(kind);
      page.chord(page.open(page[key]), "ArrowDown");
      const status = () => insertPointAfterLine(page.harness, 90).childElements.find((element) =>
        element.className.split(" ").includes("sphinx-preview-move-status"));
      assert.equal(status(), undefined);
      page.harness.dispatchMessage({
        type: "previewBlockMoveResult", ...MOVE_IDENTIFIERS, ok: false, reason: "Not here.",
      });
      assert.equal(status()?.textContent, "Not here.", `${kind}, ${name}`);
      assert.equal(status()?.getAttribute("role"), "status");
      page.harness.flushTimers();
      assert.equal(status(), undefined, `${kind}, ${name}: the reason disappears`);
    }
  }
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

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-102#S1
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

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-102#S2
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

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-033#S4
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-033#S5
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

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-047#S6
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

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-109#S9
test("the block actions follow whichever moved last: the keyboard selection or the pointer", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const owner = () => harness.documentElement.getAttribute("data-sphinx-preview-actions-owner");
  const shown = (line: number) => insertPointAfterLine(harness, line).getAttribute("data-sphinx-actions-shown");
  assert.equal(owner(), null, "nothing owns the actions before any selection");
  // The keyboard moves the selection to the block at line 100: its bar owns the actions.
  harness.dispatchDocument("keydown", shiftKey("ArrowDown", { target: harness.mappings[1] }));
  assert.equal(owner(), "keyboard");
  assert.deepEqual([shown(1), shown(52), shown(100)], [null, null, "true"]);
  // The first pointer move after the keyboard hands the actions to the hovered block.
  harness.dispatchDocument("mousemove", { clientX: 5, clientY: 5 });
  assert.equal(owner(), "pointer");
  harness.dispatchDocument("keydown", shiftKey("ArrowUp", { target: harness.mappings[2] }));
  assert.equal(owner(), "keyboard", "a selection move takes the actions back");
  assert.deepEqual([shown(1), shown(52), shown(100)], [null, "true", null]);
  harness.dispatchDocument("mousemove", { clientX: 5, clientY: 5 });
  assert.equal(owner(), "keyboard", "a move event at the same coordinates is not a pointer move");
  harness.dispatchDocument("mousemove", { clientX: 9, clientY: 5 });
  assert.equal(owner(), "pointer");
});
