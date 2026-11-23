import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, RuntimeElement, type RuntimeHarness } from "./runtimeHarness";
import { insertPointAfterLine, MOVE_IDENTIFIERS, patchMessage, plainClick } from "./runtimeTestSupport";

/**
 * The blank-line block inside a container (CR-462): a quote, an alert, an admonition, a context-tag
 * panel, a quote directive, a figure, a card, a grid item, a definition and a footnote show the block
 * of a run inside them, and send the line the host reads the container's indent from
 * (features/blankRunHosts.ts, blankLines.ts, blockSelectionView.ts).
 */

const SELECTED = "data-sphinx-preview-block-selected";
const key = (name: string, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  key: name, preventDefault: () => undefined, stopPropagation: () => undefined, ...extra,
});

interface Shape {
  tag: string;
  line?: number;
  end?: number;
  className?: string;
  attrs?: Record<string, string>;
  children?: Shape[];
}

const p = (line: number): Shape => ({ tag: "p", line, end: line });

function setRuns(harness: RuntimeHarness, runs: string): void {
  const list = new RuntimeElement({ "data-okf-blank-runs": runs, hidden: "" }, harness.windowState, 0, 0, "div");
  harness.previewContent.childElements.filter((child) => child.getAttribute("data-okf-blank-runs") !== null)
    .forEach((child) => child.remove());
  harness.previewContent.appendChild(list);
}

/** Adds `shape` to the content as elements; those with a line are mapped blocks. */
function addShape(harness: RuntimeHarness, shape: Shape, parent: RuntimeElement = harness.previewContent): RuntimeElement {
  const mapped = shape.line !== undefined;
  const element = new RuntimeElement({
    ...(mapped ? {
      "data-sphinx-preview-document": "file:///active.md",
      "data-sphinx-source-end-line": String(shape.end ?? shape.line),
      "data-sphinx-source-file": "/workspace/active.md",
      "data-sphinx-source-line": String(shape.line),
    } : {}),
    ...(shape.attrs ?? {}),
  }, harness.windowState, 100 + (shape.line ?? 0), 40, shape.tag);
  if (shape.className) element.className = shape.className;
  parent.appendChild(element);
  if (mapped) harness.mappings.push(element);
  for (const child of shape.children ?? []) addShape(harness, child, element);
  return element;
}

/** A harness in edit mode with `shapes` after its own blocks (lines 1 and 50) and `runs` as the host's list. */
function build(runs: string, ...shapes: Shape[]): { harness: RuntimeHarness; elements: RuntimeElement[] } {
  const harness = createRuntimeHarness({ savedState: { editMode: true }, trackFocus: true });
  const elements = shapes.map((shape) => addShape(harness, shape));
  setRuns(harness, runs);
  harness.editModeButton.dispatch("click");
  harness.editModeButton.dispatch("click");
  return { harness, elements };
}

function blankBlocks(harness: RuntimeHarness): RuntimeElement[] {
  return harness.createdElements.filter((element) =>
    element.className.split(" ").includes("sphinx-preview-blank-lines") && !element.removed);
}

const sent = (harness: RuntimeHarness, type: string, from = 0): Array<Record<string, unknown>> =>
  harness.messages.slice(from).filter((message) => message.type === type);

const opened = (harness: RuntimeHarness, index = 0): Record<string, unknown> => {
  const before = harness.messages.length;
  blankBlocks(harness)[index]!.dispatch("click", plainClick());
  const [open] = sent(harness, "previewEditOpen", before);
  assert.ok(open, "an open request");
  return { ...(open!.replaceBlankRun as object) };
};

function selectedLines(harness: RuntimeHarness): number[] {
  return harness.mappings
    .filter((block) => block.getAttribute(SELECTED) !== null)
    .map((block) => Number(block.getAttribute("data-sphinx-source-line")));
}

function shiftClick(harness: RuntimeHarness, block: RuntimeElement): void {
  harness.dispatchDocument("click", {
    target: block, shiftKey: true, preventDefault: () => undefined, stopPropagation: () => undefined,
  });
}

function selectBlank(harness: RuntimeHarness, index: number): RuntimeElement {
  const blank = blankBlocks(harness)[index]!;
  shiftClick(harness, harness.mappings[0]!);
  for (let step = 0; step < 10 && blank.getAttribute(SELECTED) === null; step += 1) {
    harness.dispatchDocument("keydown", key("ArrowDown", { target: harness.document.activeElement ?? harness.mappings[0] }));
  }
  assert.equal(blank.getAttribute(SELECTED), "true", "the blank-line block is selected");
  return blank;
}

const QUOTE: Shape = { tag: "blockquote", line: 10, end: 30, children: [p(10), p(14), p(28)] };
const ALERT: Shape = {
  tag: "aside", line: 10, end: 30, className: "admonition note", attrs: { "data-okf-github-alert": "true" },
  children: [{ tag: "p", className: "admonition-title" }, p(14), p(28)],
};
const ADMONITION: Shape = {
  tag: "aside", line: 10, end: 30, className: "admonition note", children: [{ tag: "p", className: "admonition-title" }, p(12), p(28)],
};

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("a quote run shows inside the quote between its paragraphs, and at its start and end", () => {
  const { harness, elements } = build("12-12 16-16 30-30", QUOTE);
  const blocks = blankBlocks(harness);
  assert.equal(blocks.length, 3);
  const [quote] = elements;
  assert.ok(blocks.every((block) => block.parentElement === quote), "every block is inside the quote");
  // Each block is inserted right after the paragraph above it: the fake DOM records the insertions.
  assert.deepEqual(quote!.childElements.map((child) => child.insertedElements.length), [1, 1, 1]);
  assert.deepEqual(quote!.childElements.map((child) => child.insertedElements[0]), blocks);
  assert.deepEqual(opened(harness, 0), { line: 12, endLine: 12 }, "no container line for a quote");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("a quote run that starts on the first line of the quote shows before its first child", () => {
  const start: Shape = { tag: "blockquote", line: 10, end: 20, children: [p(13)] };
  const { harness, elements } = build("11-11", start);
  const [blank] = blankBlocks(harness);
  assert.equal(blank!.parentElement, elements[0]);
  assert.deepEqual(elements[0]!.childElements[0]!.insertedElements, [blank], "right before the first child");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("an alert run shows after the title and before the first block, with no container line", () => {
  const first: Shape = { ...ALERT, children: [{ tag: "p", className: "admonition-title" }, p(14)] };
  const { harness, elements } = build("12-12", first);
  const [blank] = blankBlocks(harness);
  assert.equal(blank!.parentElement, elements[0]);
  assert.equal(elements[0]!.childElements[0]!.className, "admonition-title");
  assert.deepEqual(elements[0]!.childElements[0]!.insertedElements, [], "nothing after the title element itself");
  assert.deepEqual(elements[0]!.childElements[1]!.insertedElements, [blank], "before the first block, after the title");
  assert.deepEqual(opened(harness), { line: 12, endLine: 12 });
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-268
test("a run in an admonition, a context-tag panel and a quote directive carries the container line", () => {
  const admonition = build("14-14", ADMONITION);
  assert.equal(blankBlocks(admonition.harness)[0]!.parentElement, admonition.elements[0]);
  assert.deepEqual(opened(admonition.harness), { line: 14, endLine: 14, containerLine: 10 });

  const panel = build("14-14", { ...ADMONITION, className: "admonition myst-context-admonition no-icon" });
  assert.equal(blankBlocks(panel.harness)[0]!.parentElement, panel.elements[0]);
  assert.deepEqual(opened(panel.harness), { line: 14, endLine: 14, containerLine: 10 });

  const epigraph: Shape = { tag: "figure", children: [{ tag: "blockquote", line: 10, end: 20, children: [p(11), p(16)] }] };
  const directive = build("13-13", epigraph);
  const quote = directive.elements[0]!.childElements[0]!;
  assert.equal(blankBlocks(directive.harness)[0]!.parentElement, quote);
  assert.deepEqual(opened(directive.harness), { line: 13, endLine: 13, containerLine: 10 });
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("a run in a figure, a card body and a grid item shows inside it; a grid alone shows none", () => {
  const figure = build("13-13", { tag: "figure", line: 10, end: 20, children: [{ tag: "figcaption", children: [p(11)] }, p(16)] });
  assert.equal(blankBlocks(figure.harness)[0]!.parentElement, figure.elements[0]);
  assert.deepEqual(opened(figure.harness), { line: 13, endLine: 13, containerLine: 10 });

  const card: Shape = {
    tag: "div", line: 10, end: 20, className: "myst-card", children: [
      { tag: "div", line: 10, end: 10 }, { tag: "div", className: "myst-grid-card-body", children: [p(11), p(16)] },
    ],
  };
  const cardRun = build("13-13", card);
  const body = cardRun.elements[0]!.childElements[1]!;
  assert.equal(blankBlocks(cardRun.harness)[0]!.parentElement, body, "right after the paragraph above, in the body");
  assert.deepEqual(body.childElements[0]!.insertedElements, blankBlocks(cardRun.harness));
  assert.deepEqual(opened(cardRun.harness), { line: 13, endLine: 13, containerLine: 10 });

  const item: Shape = { tag: "div", line: 11, end: 19, className: "myst-grid-item", children: [p(12), p(16)] };
  const grid: Shape = { tag: "div", line: 10, end: 20, className: "myst-grid", children: [{ tag: "div", className: "myst-grid-row", children: [item] }] };
  const inItem = build("14-14", grid);
  assert.equal(blankBlocks(inItem.harness)[0]!.parentElement, inItem.elements[0]!.childElements[0]!.childElements[0]);
  assert.deepEqual(opened(inItem.harness), { line: 14, endLine: 14, containerLine: 11 });
  assert.equal(blankBlocks(build("12-12", { ...grid, children: [{ tag: "div", children: [{ ...item, line: 15, end: 19 }] }] }).harness).length, 0,
    "a run held by the grid only");
});

const DEFINITIONS: Shape = {
  tag: "dl", line: 10, end: 30, children: [
    { tag: "dt" },
    { tag: "dd", attrs: { "data-okf-definition-line": "11" }, children: [p(11), p(15)] },
    { tag: "dt" },
    { tag: "dd", attrs: { "data-okf-definition-line": "21" }, children: [p(21)] },
  ],
};

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-268
test("a run in a loose definition shows in its dd; a run between two entries ends the dd above", () => {
  const { harness, elements } = build("13-13 18-18", DEFINITIONS);
  const [first, second] = blankBlocks(harness);
  const [firstDd] = elements[0]!.childElements.filter((child) => child.tagName === "DD");
  assert.equal(first!.parentElement, firstDd);
  assert.deepEqual(firstDd!.childElements[0]!.insertedElements, [first], "between the two paragraphs");
  assert.equal(second!.parentElement, firstDd, "between entries: at the end of the definition above");
  assert.deepEqual(firstDd!.childElements[1]!.insertedElements, [second], "after its last paragraph");
  assert.deepEqual(opened(harness, 0), { line: 13, endLine: 13, containerLine: 11 });
  assert.deepEqual(opened(build("18-18", DEFINITIONS).harness), { line: 18, endLine: 18, containerLine: 11 }, "the entry above");
});

const FOOTNOTES = (items: Shape[]): Shape => ({
  tag: "section", attrs: { "data-footnotes": "" }, children: [{ tag: "ol", children: items }],
});
const footnote = (label: number, ...children: Shape[]): Shape => ({
  tag: "li", attrs: { "data-okf-footnote-line": String(label) }, children,
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-268
test("a footnote run shows in the footnote: in its body, after a label alone, and between two footnotes", () => {
  const section = FOOTNOTES([footnote(60, p(60), p(64)), footnote(70, p(73)), footnote(80, p(80))]);
  const { harness, elements } = build("62-62 67-67 72-72", section);
  const items = elements[0]!.childElements[0]!.childElements;
  const blocks = blankBlocks(harness);
  assert.equal(blocks.length, 3);
  assert.equal(blocks.filter((block) => block.parentElement === items[0]).length, 2, "body and gap");
  assert.ok(items[0]!.childElements[0]!.insertedElements.includes(blocks[0]!), "after the first paragraph");
  assert.ok(items[0]!.childElements[1]!.insertedElements.includes(blocks[1]!), "at the end, after the last paragraph");
  assert.ok(items[1]!.childElements[0]!.insertedElements.includes(blocks[2]!), "before the first block");
  // One editor at a time: each run is opened on a page of its own.
  assert.deepEqual(opened(harness, 0), { line: 62, endLine: 62, containerLine: 60 });
  assert.deepEqual(opened(build("67-67", section).harness), { line: 67, endLine: 67, containerLine: 60 }, "the footnote above");
  assert.deepEqual(opened(build("72-72", section).harness), { line: 72, endLine: 72, containerLine: 70 });
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("a run between a footnote and the body after it shows in the body, after the block above it", () => {
  const section = FOOTNOTES([footnote(20, p(20), p(24))]);
  const { harness } = build("27-27", p(15), section, p(30));
  assert.equal(blankBlocks(harness).length, 1);
  assert.equal(blankBlocks(harness)[0]!.parentElement, harness.previewContent);
  assert.ok(insertPointAfterLine(harness, 15).insertedElements.includes(blankBlocks(harness)[0]!), "after the block of line 15");
  assert.deepEqual(opened(harness), { line: 27, endLine: 27 }, "no container line");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("a run in the body of a footnote written inside a quote shows nothing", () => {
  const quote: Shape = { tag: "blockquote", line: 10, end: 20, children: [p(10)] };
  const section = FOOTNOTES([footnote(12, p(12), p(16))]);
  assert.equal(blankBlocks(build("14-14", quote, section).harness).length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("a fence in a quote, a table, a tab panel and a table in an admonition show nothing", () => {
  const fence: Shape = { tag: "blockquote", line: 10, end: 30, children: [p(10), { tag: "pre", line: 12, end: 28 }] };
  assert.equal(blankBlocks(build("21-21", fence).harness).length, 0, "a fence in a quote");
  assert.equal(blankBlocks(build("21-21", { tag: "pre", line: 10, end: 30 }).harness).length, 0, "a pre");
  assert.equal(blankBlocks(build("21-21", { tag: "table", line: 10, end: 30 }).harness).length, 0, "a table");
  assert.equal(blankBlocks(build("21-21", { tag: "div", line: 10, end: 30, className: "myst-tab-set", children: [p(12)] }).harness).length, 0,
    "a tab panel");
  const table: Shape = { ...ADMONITION, children: [{ tag: "table", line: 12, end: 28 }] };
  assert.equal(blankBlocks(build("21-21", table).harness).length, 0, "a table in an admonition");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("a list in an admonition shows the run in its item, with the item line", () => {
  const list: Shape = {
    ...ADMONITION, children: [
      { tag: "ul", line: 12, end: 28, children: [{ tag: "li", line: 12, end: 28, children: [p(12), p(26)] }] },
    ],
  };
  const { harness, elements } = build("21-21", list);
  const item = elements[0]!.childElements[0]!.childElements[0];
  assert.equal(blankBlocks(harness)[0]!.parentElement, item);
  assert.deepEqual(opened(harness), { line: 21, endLine: 21, itemLine: 12 });
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("a quote run and a plain run next to each other both show", () => {
  const { harness } = build("12-12 14-14", QUOTE);
  assert.equal(blankBlocks(harness).length, 2);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("a run inside a folded quote shows nothing, and unfolding shows it", () => {
  const { harness, elements } = build("12-12", QUOTE);
  assert.equal(blankBlocks(harness).length, 1);
  elements[0]!.setAttribute("data-okf-folded", "");
  harness.editModeButton.dispatch("click");
  harness.editModeButton.dispatch("click");
  assert.equal(blankBlocks(harness).length, 0);
  elements[0]!.removeAttribute("data-okf-folded");
  harness.editModeButton.dispatch("click");
  harness.editModeButton.dispatch("click");
  assert.equal(blankBlocks(harness).length, 1);
});

const DROPDOWN: Shape = { ...ADMONITION, tag: "details", className: "admonition note dropdown" };

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("a run in a closed dropdown shows when it opens and goes when it closes", () => {
  const { harness, elements } = build("14-14", DROPDOWN);
  assert.equal(blankBlocks(harness).length, 0, "closed");
  elements[0]!.setAttribute("open", "");
  harness.previewContent.dispatch("toggle");
  assert.equal(blankBlocks(harness).length, 1, "open");
  assert.equal(blankBlocks(harness)[0]!.parentElement, elements[0]);
  elements[0]!.removeAttribute("open");
  harness.previewContent.dispatch("toggle");
  assert.equal(blankBlocks(harness).length, 0, "closed again");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("an insertion editor opened in a dropdown stays when the dropdown closes", () => {
  const { harness, elements } = build("14-14", { ...DROPDOWN, attrs: { open: "" } });
  const blank = blankBlocks(harness)[0]!;
  blank.dispatch("click", plainClick());
  const open = sent(harness, "previewEditOpen").at(-1)!;
  harness.dispatchMessage({
    type: "previewEditSource", documentId: "file:///active.md", revision: 7, requestId: 11,
    editId: open.editId, originalText: "",
  });
  assert.ok(harness.createdElements.some((element) => element.tagName === "TEXTAREA"), "the editor is open");
  elements[0]!.removeAttribute("open");
  harness.previewContent.dispatch("toggle");
  assert.deepEqual(blankBlocks(harness), [blank], "the block of the open editor stays");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("a content patch keeps the element of an unchanged quote run", () => {
  const { harness } = build("12-12 16-16", QUOTE);
  const before = blankBlocks(harness);
  harness.dispatchMessage(patchMessage());
  assert.deepEqual(blankBlocks(harness), before);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-268
test("an editor opened from a quote run survives a patch that replaces the quote, and Cancel keeps the run", () => {
  const { harness, elements } = build("12-12 16-16", QUOTE);
  const blank = blankBlocks(harness)[0]!;
  blank.dispatch("click", plainClick());
  const open = sent(harness, "previewEditOpen").at(-1)!;
  harness.dispatchMessage({
    type: "previewEditSource", documentId: "file:///active.md", revision: 7, requestId: 11,
    editId: open.editId, originalText: "",
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA")!;
  textarea.value = "Typed";
  textarea.dispatch("input");
  harness.flushTimers();
  harness.previewContent.removeChild(elements[0]!);
  for (let index = harness.mappings.length - 1; index >= 0; index -= 1) {
    if (elements[0]!.contains(harness.mappings[index]!) || harness.mappings[index] === elements[0]) harness.mappings.splice(index, 1);
  }
  const fresh = addShape(harness, QUOTE);
  setRuns(harness, "16-16");
  harness.dispatchMessage(patchMessage());
  assert.ok(blankBlocks(harness).includes(blank), "the element is kept");
  assert.equal(blank.parentElement, fresh, "back inside the new quote");
  assert.ok(blank.insertedElements.includes(textarea.parentElement!), "with the editor frame after it");
  const before = harness.messages.length;
  textarea.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  const [cancel] = sent(harness, "previewEditCancel", before);
  assert.deepEqual({ ...(cancel!.replaceBlankRun as object) }, { line: 12, endLine: 12 });
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-267
test("a click on a blank-line block in an admonition, a panel and an alert opens its own editor", () => {
  for (const shape of [ADMONITION, { ...ADMONITION, className: "admonition myst-context-admonition" }, ALERT]) {
    const { harness } = build("14-14", shape);
    const before = harness.messages.length;
    blankBlocks(harness)[0]!.dispatch("click", plainClick());
    const opens = sent(harness, "previewEditOpen", before);
    assert.equal(opens.length, 1);
    assert.equal(opens[0]!.insertAfterLine, 13, "the editor of the run, never the container's");
    const run = opens[0]!.replaceBlankRun as Record<string, unknown>;
    assert.equal(run.containerLine, shape === ALERT ? undefined : 10);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-268
test("Ctrl+V on a selected blank-line block in a container sends its container line", () => {
  const { harness } = build("14-14", ADMONITION);
  const blank = selectBlank(harness, 0);
  const before = harness.messages.length;
  harness.dispatchDocument("keydown", key("v", { target: blank, ctrlKey: true }));
  const [paste] = sent(harness, "previewBlocksPaste", before);
  assert.deepEqual({ ...(paste!.replaceBlankRun as object) }, { line: 14, endLine: 14, containerLine: 10 });
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-267
test("Down from a selected quote stops on each blank-line block inside it, then on the next block; Up walks back", () => {
  const { harness, elements } = build("16-16 21-21", QUOTE);
  const walk = (name: string, target: RuntimeElement): void => {
    harness.dispatchDocument("keydown", key(name, { target }));
  };
  shiftClick(harness, harness.mappings[0]!);
  walk("ArrowDown", harness.mappings[0]!);
  assert.deepEqual(selectedLines(harness), [10], "the quote");
  walk("ArrowDown", elements[0]!);
  assert.equal(blankBlocks(harness)[0]!.getAttribute(SELECTED), "true");
  walk("ArrowDown", blankBlocks(harness)[0]!);
  assert.equal(blankBlocks(harness)[1]!.getAttribute(SELECTED), "true");
  walk("ArrowDown", blankBlocks(harness)[1]!);
  assert.deepEqual(selectedLines(harness), [50], "the block after the quote");
  walk("ArrowUp", harness.mappings.find((block) => block.getAttribute("data-sphinx-source-line") === "50")!);
  assert.equal(blankBlocks(harness)[1]!.getAttribute(SELECTED), "true");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-267
test("a run on the first line of a quote comes after the quote: Down stops on it, Up selects the quote", () => {
  const { harness, elements } = build("11-11", { tag: "blockquote", line: 10, end: 20, children: [p(13)] });
  shiftClick(harness, harness.mappings[0]!);
  harness.dispatchDocument("keydown", key("ArrowDown", { target: harness.mappings[0] }));
  assert.deepEqual(selectedLines(harness), [10], "the quote first");
  harness.dispatchDocument("keydown", key("ArrowDown", { target: elements[0] }));
  const blank = blankBlocks(harness)[0]!;
  assert.equal(blank.getAttribute(SELECTED), "true", "then the run on its first line");
  harness.dispatchDocument("keydown", key("ArrowUp", { target: blank }));
  assert.deepEqual(selectedLines(harness), [10], "Up from the run selects the quote");
});

/** Selects the first blank line of `harness`, presses Delete and answers the render of the host's `after` runs. */
function deleteFirst(harness: RuntimeHarness, after: string): void {
  const blank = selectBlank(harness, 0);
  const before = harness.messages.length;
  harness.dispatchDocument("keydown", key("Delete", { target: blank }));
  const [message] = sent(harness, "previewBlankRunDelete", before);
  assert.equal(message!.line, message!.endLine, "one line is deleted");
  harness.dispatchMessage({ type: "previewBlocksResult", ...MOVE_IDENTIFIERS, op: "delete-blank-lines", ok: true });
  setRuns(harness, after);
  harness.dispatchMessage(patchMessage());
}

const noneSelected = (harness: RuntimeHarness): boolean =>
  selectedLines(harness).length === 0 && blankBlocks(harness).every((block) => block.getAttribute(SELECTED) === null);

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-269
test("Delete on the only blank line in a quote, an admonition and a definition list selects nothing", () => {
  for (const [shape, runs] of [[QUOTE, "16-16"], [ADMONITION, "14-14"], [DEFINITIONS, "13-13"]] as const) {
    const { harness } = build(runs, shape);
    deleteFirst(harness, "");
    assert.ok(noneSelected(harness), "nothing is selected once the run has no line left");
    for (const name of ["Delete", "Backspace"]) {
      const before = harness.messages.length;
      harness.dispatchDocument("keydown", key(name, { target: harness.mappings[0] }));
      assert.equal(sent(harness, "previewBlankRunDelete", before).length, 0, name);
      assert.equal(sent(harness, "previewBlocksDelete", before).length, 0, name);
    }
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-269
test("Delete on a blank line of a quote keeps the selection on the block of the same line number in its run", () => {
  const { harness } = build("12-13", QUOTE);
  deleteFirst(harness, "12-12");
  assert.equal(blankBlocks(harness)[0]!.getAttribute(SELECTED), "true", "the next line took the number of the deleted one");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-269
test("Delete on a footnote blank line selects nothing when its run has no line left", () => {
  const { harness } = build("62-62", FOOTNOTES([footnote(60, p(60), p(64))]));
  deleteFirst(harness, "");
  assert.ok(noneSelected(harness));
});
