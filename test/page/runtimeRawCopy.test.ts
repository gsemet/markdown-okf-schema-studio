import * as assert from "node:assert/strict";
import { test } from "node:test";

import { HARNESS_PAGE } from "../shared/previewIdentity";
import { createRuntimeHarness, type RuntimeElement, type RuntimeHarness } from "./runtimeHarness";
import { patchMessage } from "./runtimeTestSupport";

/**
 * The raw copy of a native selection (features/rawCopy.ts): which copy events the page takes. The
 * fake page holds no real Selection, so the page here shows an empty content container and a
 * selection from its start to its end (the whole document): a taken copy then puts the source text
 * on the clipboard. What a real Selection selects is proved in the browser (test/visual).
 */

const SOURCE = "# Title\n\nSome **text**.\n";

/** Gives the content container the few DOM members the copy handler reads. */
function readableContent(harness: RuntimeHarness): RuntimeElement {
  const content = harness.previewContent;
  Object.assign(content, { nodeType: 1, classList: { contains: () => false }, getAttributeNames: () => [] });
  (content as unknown as { contains(node: unknown): boolean }).contains = (node) => node === content;
  return content;
}

const createElement = (harness: RuntimeHarness, tagName: string): RuntimeElement =>
  (harness.document.createElement as (tag: string) => RuntimeElement)(tagName);

/** Selects the whole content, then copies: what was put on the clipboard, and whether the browser's copy was cancelled. */
function copy(harness: RuntimeHarness, selectionExtra: Record<string, unknown> = {}): { data: Record<string, string>; prevented: boolean } {
  const content = readableContent(harness);
  const range = {
    startContainer: content, startOffset: 0, endContainer: content, endOffset: 0,
    intersectsNode: () => true,
    cloneContents: () => createElement(harness, "div"),
  };
  harness.window.getSelection = () => ({
    rangeCount: 1, isCollapsed: false, anchorNode: content, focusNode: content, getRangeAt: () => range, ...selectionExtra,
  });
  const data: Record<string, string> = {};
  let prevented = false;
  harness.dispatchDocument("copy", {
    clipboardData: { setData: (type: string, value: string) => { data[type] = value; } },
    preventDefault: () => { prevented = true; },
  });
  return { data, prevented };
}

const sourceText = (text: string, extra: Record<string, unknown> = {}): Record<string, unknown> =>
  ({ type: "previewSourceText", ...HARNESS_PAGE, text, ...extra });

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-271#S1
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-277#S1
test("a copy with the source text of the shown render puts the Markdown on the clipboard and cancels the browser's copy", () => {
  const harness = createRuntimeHarness({ emptyBody: true });
  harness.dispatchMessage(sourceText(SOURCE));
  const taken = copy(harness);
  assert.equal(taken.prevented, true);
  assert.equal(taken.data["text/plain"], SOURCE);
  assert.equal(typeof taken.data["text/html"], "string");
});

interface FakeNode {
  nodeType: number;
  data?: string;
  tagName?: string;
  childNodes: FakeNode[];
  parentNode: FakeNode | null;
  parentElement: FakeNode | null;
  [key: string]: unknown;
}

/** A text node and an element of the few members the raw copy reads (a selection that is not the whole document). */
const fakeText = (data: string): FakeNode => ({ nodeType: 3, data, childNodes: [], parentNode: null, parentElement: null });
function fakeElement(tagName: string, attributes: Record<string, string>, children: FakeNode[]): FakeNode {
  const element: FakeNode = {
    nodeType: 1, tagName: tagName.toUpperCase(), childNodes: children, parentNode: null, parentElement: null,
    classList: { contains: () => false },
    getAttributeNames: () => Object.keys(attributes),
    getAttribute: (name: string) => attributes[name] ?? null,
    closest: () => null,
  };
  for (const child of children) Object.assign(child, { parentNode: element, parentElement: element });
  return element;
}

/** Copies, with `balanceEdges` set or not in the boot context, the selection from `offset` in "world" to the end of " again". */
function copyPartOfParagraph(balanceEdges: boolean | undefined): string | undefined {
  const harness = createRuntimeHarness({ emptyBody: true, ...(balanceEdges === undefined ? {} : { "rawCopy.balanceEdges": balanceEdges }) });
  harness.dispatchMessage(sourceText("Hello **world** again\n"));
  const content = readableContent(harness);
  const world = fakeText("world");
  const again = fakeText(" again");
  const paragraph = fakeElement("p", { "data-sphinx-source-line": "1", "data-sphinx-source-end-line": "1" }, [
    fakeText("Hello "), fakeElement("strong", {}, [world]), again,
  ]);
  Object.assign(paragraph, { parentNode: content, parentElement: content });
  Object.defineProperty(content, "childNodes", { value: [paragraph], configurable: true });
  (content as unknown as { contains(node: FakeNode | RuntimeElement): boolean }).contains = (node) => {
    for (let current: FakeNode | RuntimeElement | null = node; current; current = (current as FakeNode).parentNode) if (current === content) return true;
    return false;
  };
  const range = {
    startContainer: world, startOffset: 2, endContainer: again, endOffset: again.data!.length,
    intersectsNode: () => true,
    cloneContents: () => createElement(harness, "div"),
  };
  harness.window.getSelection = () => ({ rangeCount: 1, isCollapsed: false, anchorNode: world, focusNode: again, getRangeAt: () => range });
  const data: Record<string, string> = {};
  harness.dispatchDocument("copy", {
    clipboardData: { setData: (type: string, value: string) => { data[type] = value; } },
    preventDefault: () => undefined,
  });
  return data["text/plain"];
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-278#S2
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-278#S3
test("the rawCopy.balanceEdges boot setting makes a copy that starts inside a bold word balanced; off, absent or false it is the exact cut", () => {
  assert.equal(copyPartOfParagraph(true), "**rld** again", "on: the bold's opening delimiters are added");
  assert.equal(copyPartOfParagraph(false), "rld** again", "off");
  assert.equal(copyPartOfParagraph(undefined), "rld** again", "absent: off by default");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-278#S2
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-278#S3
test("with the rawCopy.balanceEdges boot setting on or off, a copy of the whole document is still the whole source", () => {
  for (const enabled of [true, false]) {
    const harness = createRuntimeHarness({ emptyBody: true, "rawCopy.balanceEdges": enabled });
    harness.dispatchMessage(sourceText(SOURCE));
    const taken = copy(harness);
    assert.equal(taken.prevented, true);
    assert.equal(taken.data["text/plain"], SOURCE);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-272#S1
test("a copy before the page received the source text stays native", () => {
  const harness = createRuntimeHarness({ emptyBody: true });
  const taken = copy(harness);
  assert.equal(taken.prevented, false);
  assert.deepEqual(taken.data, {});
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-271#S1
test("the source text of another render is not kept", () => {
  const harness = createRuntimeHarness({ emptyBody: true });
  harness.dispatchMessage(sourceText(SOURCE, { requestId: 12 }));
  assert.equal(copy(harness).prevented, false);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-271#S1
test("a content patch drops the source text until the host sends the next one", () => {
  const harness = createRuntimeHarness({ emptyBody: true });
  harness.dispatchMessage(sourceText(SOURCE));
  assert.equal(copy(harness).prevented, true);
  harness.dispatchMessage(patchMessage());
  assert.equal(copy(harness).prevented, false, "the text belongs to the render the patch replaced");
  harness.dispatchMessage(sourceText("# Next\n", { revision: 8, requestId: 12 }));
  assert.equal(copy(harness).data["text/plain"], "# Next\n");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-272#S1
test("a collapsed selection, a selection outside the content and a selection in a text control stay native", () => {
  const harness = createRuntimeHarness({ emptyBody: true });
  harness.dispatchMessage(sourceText(SOURCE));
  assert.equal(copy(harness, { isCollapsed: true }).prevented, false, "nothing selected");
  assert.equal(copy(harness, { rangeCount: 0 }).prevented, false, "no range");
  const field = createElement(harness, "textarea");
  Object.assign(field, { nodeType: 1, closest: () => field });
  Object.defineProperty(harness.document, "activeElement", { value: field, configurable: true });
  assert.equal(copy(harness).prevented, false, "the focus is in a text control");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-272#S1
test("with a block selection in edit mode the copy is the block copy's; in reading mode a leftover block selection does not block it", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  harness.dispatchMessage(sourceText(SOURCE));
  harness.dispatchDocument("click", {
    target: harness.mappings[0], shiftKey: true, preventDefault: () => undefined, stopPropagation: () => undefined,
  });
  assert.equal(harness.mappings[0]!.getAttribute("data-sphinx-preview-block-selected") !== null, true, "a block is selected");
  assert.equal(copy(harness).prevented, false, "edit mode with a block selection");
  harness.editModeButton.dispatch("click");
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-edit-mode"), "off");
  assert.equal(copy(harness).prevented, true, "reading mode, whatever selection is left over");
});
