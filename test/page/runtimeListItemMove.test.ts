import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, RuntimeElement, type RuntimeHarness } from "./runtimeHarness";
import { altKey, sourceReply } from "./runtimeTestSupport";

/**
 * The handles of list items and the move of an item among its siblings (features/listItemMove.ts).
 * The precondition (the real renderer maps the items of a list in a quote, an alert and admonitions
 * and the list range is the list's own) is test/session/listItemRange.test.ts.
 */

const MAPPED = { "data-sphinx-preview-document": "file:///active.md", "data-sphinx-source-file": "/workspace/active.md" };
const SOURCE = "- a\n- b\n- c\n";
const ITEM_HEIGHT = 20;

interface FakeList {
  list: RuntimeElement;
  items: RuntimeElement[];
}

/**
 * A list of `count` items mapped from line `line`, one line each, `top` pixels down the page, as a
 * child of `parent` (else a list of the content). Its box is 200 px wide at `left`.
 */
function fakeList(harness: RuntimeHarness, options: {
  count?: number; line?: number; top?: number; left?: number; tag?: string; parent?: RuntimeElement;
  attributes?: Record<string, string>;
} = {}): FakeList {
  const { count = 3, line = 30, top = 200, left = 0, tag = "ul", parent, attributes = {} } = options;
  const list = new RuntimeElement({
    ...MAPPED,
    "data-sphinx-source-line": String(line),
    "data-sphinx-source-end-line": String(line + count - 1),
    ...attributes,
  }, harness.windowState, top, ITEM_HEIGHT * count, tag);
  list.rectProvider = () => {
    const height = list.childElements.reduce((sum, item) => sum + item.height, 0);
    return { top: top - harness.windowState.scrollY, height, left, width: 200, bottom: top + height };
  };
  const items: RuntimeElement[] = [];
  for (let index = 0; index < count; index += 1) {
    const item = new RuntimeElement({
      ...MAPPED,
      "data-sphinx-source-line": String(line + index),
      "data-sphinx-source-end-line": String(line + index),
    }, harness.windowState, top + ITEM_HEIGHT * index, ITEM_HEIGHT, "li");
    list.appendChild(item);
    items.push(item);
  }
  if (parent) parent.appendChild(list);
  harness.contentLists.push(list);
  return { list, items };
}

/** A container element (a GitHub alert, an admonition, a quote) with its box at `left`. */
function container(harness: RuntimeHarness, tag: string, attributes: Record<string, string>, left: number): RuntimeElement {
  const element = new RuntimeElement({ ...MAPPED, "data-sphinx-source-line": "20", ...attributes }, harness.windowState, 180, 200, tag);
  element.rectProvider = () => ({ top: 180, height: 200, left, width: 400, bottom: 380 });
  return element;
}

/** The live handles of the page (the handles of a removed layer are gone). */
const liveHandles = (harness: RuntimeHarness): RuntimeElement[] => harness.createdElements.filter((element) =>
  element.getAttribute("data-okf-list-item-handle") !== null && !element.parentElement?.removed);

/** The live handle of `item`. */
const handleOf = (harness: RuntimeHarness, item: RuntimeElement): RuntimeElement | undefined =>
  liveHandles(harness).find((handle) => handle.getAttribute("data-okf-list-item-line") === item.getAttribute("data-sphinx-source-line"));

const transfer = (): Record<string, unknown> => ({ effectAllowed: "", dropEffect: "", setData: () => undefined });

const at = (clientY: number, dataTransfer: Record<string, unknown>, clientX = 10) => ({
  clientX, clientY, dataTransfer, preventDefault: () => undefined, stopPropagation: () => undefined,
});

const messagesOf = (harness: RuntimeHarness, type: string) => harness.messages.filter((message) => message.type === type);

/** Drags the handle of `item` and drops it at `clientY` (and `clientX`) over the page. */
function dragTo(harness: RuntimeHarness, item: RuntimeElement, clientY: number, clientX = 10): void {
  const data = transfer();
  const handle = handleOf(harness, item)!;
  handle.dispatch("dragstart", { dataTransfer: data });
  harness.dispatchDocument("dragover", at(clientY, data, clientX));
  harness.dispatchDocument("drop", at(clientY, data, clientX));
  handle.dispatch("dragend");
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-262
test("edit mode shows a handle beside each item of a list, on its first line, and pushes a list with no room", () => {
  const harness = createRuntimeHarness();
  const { list, items } = fakeList(harness);
  items[1]!.computedStyle = { lineHeight: "16px" };
  harness.flushFrames();
  assert.equal(liveHandles(harness).length, 0, "no handle in reading mode");
  harness.editModeButton.dispatch("click");
  assert.equal(handleOf(harness, items[0]!)!.style.getPropertyValue("top"), "", "placed in the next frame (issue 423)");
  harness.flushFrames();
  assert.equal(liveHandles(harness).length, 3, "a handle on every item, shown without a hover");
  for (const item of items) {
    const handle = handleOf(harness, item)!;
    assert.equal(handle.tagName, "BUTTON");
    assert.equal(handle.type, "button");
    assert.match(handle.className, /okf-list-editor-handle okf-list-item-handle/u);
    assert.equal(handle.getAttribute("draggable"), "true");
    assert.equal(handle.getAttribute("contenteditable"), "false");
    assert.equal(handle.getAttribute("aria-label"), "Move list item");
    assert.equal(handle.getAttribute("title"), "Drag to move item (Alt+Up, Alt+Down)");
    assert.equal(handle.parentElement?.getAttribute("data-okf-list-handle-layer"), "true");
    assert.equal(handle.parentElement?.parentElement, harness.body);
    assert.equal(handle.style.getPropertyValue("left"), "-4px", "just left of the list");
  }
  assert.equal(handleOf(harness, items[0]!)!.style.getPropertyValue("top"), "210px", "half a 20 px line down the item");
  assert.equal(handleOf(harness, items[1]!)!.style.getPropertyValue("top"), "228px", "half its 16 px line, not of the item");
  assert.equal(list.getAttribute("data-okf-list-shift"), "true", "no room on the left: the list is pushed right");
  harness.editModeButton.dispatch("click");
  assert.equal(liveHandles(harness).length, 0, "edit mode off removes the handles");
  assert.equal(list.getAttribute("data-okf-list-shift"), null, "and the push");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-262
test("an item with sub-items keeps its handle on its first line; the nested list has its own handles", () => {
  const harness = createRuntimeHarness();
  const outer = fakeList(harness, { left: 60, tag: "ol" });
  const inner = fakeList(harness, { count: 2, line: 50, top: 220, left: 90, parent: outer.items[1]! });
  outer.items[1]!.height = 60;
  outer.items[2]!.top = 260;
  harness.editModeButton.dispatch("click");
  harness.flushFrames();
  assert.equal(liveHandles(harness).length, 5);
  assert.equal(handleOf(harness, outer.items[1]!)!.style.getPropertyValue("top"), "230px", "its first line, not its middle");
  assert.equal(handleOf(harness, outer.items[1]!)!.style.getPropertyValue("left"), "56px");
  assert.equal(handleOf(harness, inner.items[0]!)!.style.getPropertyValue("left"), "86px", "left of its own list");
  assert.equal(outer.list.getAttribute("data-okf-list-shift"), null, "room on the left: no push");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-262
test("a one-item list, an included list and a list of the properties table get no handle", () => {
  const harness = createRuntimeHarness();
  fakeList(harness, { count: 1 });
  fakeList(harness, { line: 40, attributes: { "data-sphinx-preview-included": "/workspace/other.md" } });
  fakeList(harness, { line: 50, parent: harness.frontmatterProperties });
  // A list of two items beside them has its handles: only it.
  fakeList(harness, { count: 2, line: 60, top: 600 });
  harness.editModeButton.dispatch("click");
  harness.flushFrames();
  assert.deepEqual(liveHandles(harness).map((handle) => handle.getAttribute("data-okf-list-item-line")), ["60", "61"]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-262
test("the handles of a list in nested admonitions sit left of the outermost box, which is pushed when needed", () => {
  const harness = createRuntimeHarness();
  const outer = container(harness, "aside", { class: "admonition note" }, 40);
  const alert = container(harness, "aside", { class: "admonition note", "data-okf-github-alert": "true" }, 70);
  outer.appendChild(alert);
  const { list, items } = fakeList(harness, { left: 100, parent: alert });
  const nested = fakeList(harness, { count: 2, line: 31, top: 220, left: 130, parent: items[1]! });
  harness.editModeButton.dispatch("click");
  harness.flushFrames();
  for (const item of [...items, ...nested.items]) {
    assert.equal(handleOf(harness, item)!.style.getPropertyValue("left"), "36px", "one column left of the outermost box");
  }
  assert.equal(outer.getAttribute("data-okf-list-shift"), null);
  assert.equal(list.getAttribute("data-okf-list-shift"), null);

  // A quote at the left edge of the pane: the quote is pushed, not the list inside it.
  const narrow = createRuntimeHarness();
  const quote = container(narrow, "blockquote", {}, 0);
  const quoted = fakeList(narrow, { left: 30, parent: quote });
  narrow.editModeButton.dispatch("click");
  narrow.flushFrames();
  assert.equal(quote.getAttribute("data-okf-list-shift"), "true");
  assert.equal(quoted.list.getAttribute("data-okf-list-shift"), null);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-262
test("dragging a handle onto a sibling moves the item with one open, one final save and no editor", () => {
  const harness = createRuntimeHarness();
  const { items } = fakeList(harness);
  harness.editModeButton.dispatch("click");
  const data = transfer();
  const handle = handleOf(harness, items[0]!)!;
  handle.dispatch("dragstart", { dataTransfer: data });
  assert.equal(items[0]!.getAttribute("data-okf-list-item-dragging"), "true");
  assert.equal(data.effectAllowed, "move");
  harness.dispatchDocument("dragover", at(items[2]!.top + 5, data));
  assert.equal(items[2]!.getAttribute("data-okf-list-item-drop"), "before");
  // In the handle strip, left of the list, on the lower half of the last item.
  harness.dispatchDocument("dragover", at(items[2]!.top + 15, data, -20));
  assert.equal(items[2]!.getAttribute("data-okf-list-item-drop"), "after");
  assert.equal(data.dropEffect, "move");
  harness.dispatchDocument("drop", at(items[2]!.top + 15, data, -20));
  handle.dispatch("dragend");
  assert.equal(items[0]!.getAttribute("data-okf-list-item-dragging"), null);
  assert.equal(items[2]!.getAttribute("data-okf-list-item-drop"), null);
  const [open] = messagesOf(harness, "previewEditOpen");
  assert.ok(open);
  assert.equal(open.line, 30);
  assert.equal(open.endLine, 32);
  sourceReply(harness, SOURCE);
  const saves = messagesOf(harness, "previewEditSave");
  assert.equal(saves.length, 1, "one edit, one undo step");
  assert.equal(saves[0]!.editId, open.editId);
  assert.equal(saves[0]!.final, true);
  assert.equal(saves[0]!.originalText, SOURCE);
  assert.equal(saves[0]!.editedText, "- b\n- c\n- a\n");
  assert.equal(harness.messages.at(-1)?.type, "previewEditClosed");
  assert.ok(harness.createdElements.every((element) => element.tagName !== "TEXTAREA"), "no editor opened");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-262
test("an item of a list in a GitHub alert moves on the list's own lines, its quote prefix kept", () => {
  const harness = createRuntimeHarness();
  const alert = container(harness, "aside", { class: "admonition note", "data-okf-github-alert": "true" }, 40);
  const { items } = fakeList(harness, { left: 70, line: 33, parent: alert });
  harness.editModeButton.dispatch("click");
  handleOf(harness, items[2]!)!.dispatch("keydown", altKey("ArrowUp"));
  const [open] = messagesOf(harness, "previewEditOpen");
  assert.deepEqual([open?.line, open?.endLine], [33, 35], "the list's lines, not the alert's");
  sourceReply(harness, "> - a\n> - b\n> - c\n");
  assert.equal(messagesOf(harness, "previewEditSave")[0]?.editedText, "> - a\n> - c\n> - b\n");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-262
test("a drop in place, outside the list or over another list requests nothing", () => {
  const harness = createRuntimeHarness();
  const { items } = fakeList(harness);
  const other = fakeList(harness, { line: 40, top: 400 });
  harness.editModeButton.dispatch("click");
  const data = transfer();
  handleOf(harness, items[1]!)!.dispatch("dragstart", { dataTransfer: data });
  // The lower half of the item before and the upper half of the item after leave it in place.
  harness.dispatchDocument("dragover", at(items[0]!.top + 15, data));
  assert.equal(items[0]!.getAttribute("data-okf-list-item-drop"), null);
  harness.dispatchDocument("dragover", at(items[2]!.top + 5, data));
  assert.equal(items[2]!.getAttribute("data-okf-list-item-drop"), null);
  harness.dispatchDocument("drop", at(items[2]!.top + 5, data));
  // Past the handle strip, and over another list.
  dragTo(harness, items[0]!, items[2]!.top + 15, -60);
  dragTo(harness, items[0]!, other.items[1]!.top + 5);
  assert.equal(other.items[1]!.getAttribute("data-okf-list-item-drop"), null);
  assert.equal(messagesOf(harness, "previewEditOpen").length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-262
test("a drop over a nested item of a sibling lands before or after that sibling, sub-items moving with it", () => {
  const harness = createRuntimeHarness();
  const { items } = fakeList(harness);
  items[1]!.height = 60;
  items[2]!.top = 260;
  const nested = fakeList(harness, { count: 2, line: 32, top: 220, left: 30, parent: items[1]! });
  harness.editModeButton.dispatch("click");
  // The lower half of the sibling that holds the nested item: after that sibling.
  dragTo(harness, items[0]!, nested.items[1]!.top + 15);
  assert.equal(nested.items[1]!.getAttribute("data-okf-list-item-drop"), null);
  sourceReply(harness, "- a\n- b\n  - b1\n  - b2\n- c\n");
  assert.equal(messagesOf(harness, "previewEditSave")[0]?.editedText, "- b\n  - b1\n  - b2\n- a\n- c\n");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-262
test("Alt+Down and Alt+Up on a handle move the item by one, nothing at the ends, a repeat waits for the render", () => {
  const harness = createRuntimeHarness();
  const { items } = fakeList(harness, { tag: "ol" });
  harness.editModeButton.dispatch("click");
  handleOf(harness, items[0]!)!.dispatch("keydown", altKey("ArrowUp"));
  handleOf(harness, items[2]!)!.dispatch("keydown", altKey("ArrowDown"));
  assert.equal(messagesOf(harness, "previewEditOpen").length, 0, "nothing at the ends");

  let stopped = false;
  let prevented = false;
  handleOf(harness, items[0]!)!.dispatch("keydown", altKey("ArrowDown", {
    stopPropagation: () => { stopped = true; }, preventDefault: () => { prevented = true; },
  }));
  assert.ok(stopped && prevented, "the block move chord does not see the key");
  handleOf(harness, items[0]!)!.dispatch("keydown", altKey("ArrowDown", { repeat: true }));
  assert.equal(messagesOf(harness, "previewEditOpen").length, 1, "a repeat while the source is awaited is ignored");
  sourceReply(harness, "3. a\n4. b\n5. c\n");
  assert.equal(messagesOf(harness, "previewEditSave")[0]?.editedText, "3. b\n4. a\n5. c\n");
  assert.equal(messagesOf(harness, "previewBlockMove").length, 0);
  handleOf(harness, items[1]!)!.dispatch("keydown", altKey("ArrowDown"));
  assert.equal(messagesOf(harness, "previewEditOpen").length, 1, "nothing before the render of the move");

  // The render: the handle of the moved item takes the focus back and the handles are free again.
  harness.editModeButton.dispatch("click");
  harness.editModeButton.dispatch("click");
  assert.equal(handleOf(harness, items[1]!)!.focusOptions?.preventScroll, true);
  handleOf(harness, items[1]!)!.dispatch("keydown", altKey("ArrowUp"));
  assert.equal(messagesOf(harness, "previewEditOpen").length, 2);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-262
test("a refused source, a source that does not read as the items or a lost answer leaves the document alone", () => {
  const harness = createRuntimeHarness();
  const { items } = fakeList(harness);
  harness.editModeButton.dispatch("click");
  handleOf(harness, items[0]!)!.dispatch("keydown", altKey("ArrowDown"));
  sourceReply(harness, "", { originalText: undefined, error: "The preview is stale." });
  assert.equal(harness.messages.at(-1)?.type, "previewEditClosed");
  for (const text of ["- a\n- b\n", "> - a\n- b\n- c\n", "Intro\n- a\n- b\n- c\n"]) {
    handleOf(harness, items[0]!)!.dispatch("keydown", altKey("ArrowDown"));
    sourceReply(harness, text);
    assert.equal(harness.messages.at(-1)?.type, "previewEditClosed", text);
  }
  assert.equal(messagesOf(harness, "previewEditSave").length, 0);
  // No answer within 5 s: the edit is closed and the handles are free again.
  handleOf(harness, items[0]!)!.dispatch("keydown", altKey("ArrowDown"));
  const open = messagesOf(harness, "previewEditOpen").at(-1);
  harness.advanceTimers(5000);
  assert.equal(harness.messages.at(-1)?.type, "previewEditClosed");
  assert.equal(harness.messages.at(-1)?.editId, open?.editId);
  handleOf(harness, items[0]!)!.dispatch("keydown", altKey("ArrowDown"));
  assert.equal(messagesOf(harness, "previewEditOpen").length, 6);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-262
test("no move while a block editor or the frontmatter editor is open", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  const { items } = fakeList(harness);
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined, stopPropagation: () => undefined });
  const opened = messagesOf(harness, "previewEditOpen").length;
  assert.equal(opened, 1, "the block editor asked for its source");
  let prevented = false;
  handleOf(harness, items[0]!)!.dispatch("dragstart", { preventDefault: () => { prevented = true; }, dataTransfer: transfer() });
  assert.equal(prevented, true, "the drag is refused");
  assert.equal(items[0]!.getAttribute("data-okf-list-item-dragging"), null);
  handleOf(harness, items[0]!)!.dispatch("keydown", altKey("ArrowDown"));
  assert.equal(messagesOf(harness, "previewEditOpen").length, opened);

  const front = createRuntimeHarness({ mapFrontmatter: true });
  const second = fakeList(front);
  front.editModeButton.dispatch("click");
  front.dispatchDocument("click", { target: front.frontmatterValueCell, preventDefault: () => undefined, stopPropagation: () => undefined });
  assert.ok(front.createdElements.some((element) => element.getAttribute("aria-label") === "Frontmatter lifecycle"));
  handleOf(front, second.items[0]!)!.dispatch("keydown", altKey("ArrowDown"));
  assert.equal(messagesOf(front, "previewEditOpen").length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-262
test("a click on a handle opens no editor and the pointer over it outlines the item it moves", () => {
  const harness = createRuntimeHarness();
  const { items } = fakeList(harness);
  harness.editModeButton.dispatch("click");
  const handle = handleOf(harness, items[1]!)!;
  harness.dispatchDocument("click", { target: handle, preventDefault: () => undefined, stopPropagation: () => undefined });
  assert.equal(messagesOf(harness, "previewEditOpen").length, 0);
  harness.dispatchDocument("mouseover", { target: handle });
  assert.equal(items[1]!.getAttribute("data-sphinx-preview-edit-hover"), "true");
  harness.dispatchDocument("mouseout", { target: handle, relatedTarget: null });
  assert.equal(items[1]!.getAttribute("data-sphinx-preview-edit-hover"), null);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-262
test("placing the handles reads the box of a list once per pass, not once per handle", () => {
  const harness = createRuntimeHarness();
  const { list, items } = fakeList(harness, { count: 12 });
  harness.editModeButton.dispatch("click");
  harness.flushFrames();
  assert.equal(liveHandles(harness).length, 12);
  list.rectReadCount = 0;
  items.forEach((item) => { item.rectReadCount = 0; });
  harness.dispatchWindow("resize");
  harness.flushFrames();
  // Each pass reads each item once and the list twice (the push, then the handle column).
  const passes = items[0]!.rectReadCount;
  assert.ok(passes > 0, "the handles were placed again");
  assert.ok(items.every((item) => item.rectReadCount === passes), "each item box once per pass");
  assert.equal(list.rectReadCount, 2 * passes, `${list.rectReadCount} reads of the list box in ${passes} passes`);
});
