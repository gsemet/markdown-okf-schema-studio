import * as assert from "node:assert/strict";
import { test } from "node:test";

import { changedLinesLabel, installIncomingChanges, removedLinesLabel, type ChangeTarget } from "../../../src/page/modules/incomingChanges";

class FakeElement {
  attrs = new Map<string, string>();
  children: FakeElement[] = [];
  parentElement: FakeElement | null = null;
  constructor(public name: string, attrs: Record<string, string> = {}) {
    for (const [key, value] of Object.entries(attrs)) this.attrs.set(key, value);
  }
  setAttribute(name: string, value: string) { this.attrs.set(name, value); }
  getAttribute(name: string) { return this.attrs.get(name) ?? null; }
  hasAttribute(name: string) { return this.attrs.has(name); }
  removeAttribute(name: string) { this.attrs.delete(name); }
  append<T extends FakeElement>(child: T): T { child.parentElement = this; this.children.push(child); return child; }
  contains(other: FakeElement): boolean {
    for (let node: FakeElement | null = other; node; node = node.parentElement) if (node === this) return true;
    return false;
  }
  closest(selector: string): FakeElement | null {
    const names = selector.split(",").map((part) => part.trim().replace(/^\[|\]$/g, ""));
    for (let node: FakeElement | null = this; node; node = node.parentElement) {
      if (names.some((name) => node!.attrs.has(name))) return node;
    }
    return null;
  }
}

function setup() {
  const root = new FakeElement("html");
  const main = root.append(new FakeElement("main"));
  const all = (): FakeElement[] => {
    const found: FakeElement[] = [];
    const walk = (node: FakeElement) => { for (const child of node.children) { found.push(child); walk(child); } };
    walk(root);
    return found;
  };
  const document = {
    documentElement: root,
    querySelectorAll: (selector: string) => {
      const names = selector.split(",").map((part) => part.trim().replace(/^\[|\]$/g, ""));
      return all().filter((element) => names.some((name) => element.attrs.has(name)));
    },
  };
  const marks = installIncomingChanges(document as never);
  const block = (parent: FakeElement, line: number, end?: number) =>
    parent.append(new FakeElement("div", { "data-line": String(line), ...(end ? { "data-end-line": String(end) } : {}) }));
  const marked = () => all().filter((element) => element.attrs.has("data-sphinx-preview-changed"));
  return { root, main, marks, block, marked };
}

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-207
test("T16: the innermost mapped elements that meet a changed range are marked", () => {
  const { main, marks, block, marked } = setup();
  const list = block(main, 1, 6);
  const itemA = block(list, 1, 2);
  const itemB = block(list, 3, 6);
  const nested = block(itemB, 5, 6);
  const paragraph = block(main, 8);
  marks.setRanges([{ start: 5, end: 5 }, { start: 8, end: 8 }]);
  assert.deepEqual(marked(), [nested, paragraph]);
  assert.equal(itemA.hasAttribute("data-sphinx-preview-changed"), false);
  assert.equal(list.hasAttribute("data-sphinx-preview-changed"), false);
});

test("T16: new ranges clear the old marks, empty ranges clear all", () => {
  const { main, marks, block, marked } = setup();
  const first = block(main, 1);
  const second = block(main, 3);
  marks.setRanges([{ start: 1, end: 1 }]);
  assert.deepEqual(marked(), [first]);
  marks.setRanges([{ start: 3, end: 4 }]);
  assert.deepEqual(marked(), [second]);
  marks.setRanges([]);
  assert.deepEqual(marked(), []);
});

test("T16: apply puts the last ranges on replaced content", () => {
  const { main, marks, block, marked } = setup();
  const old = block(main, 2);
  marks.setRanges([{ start: 2, end: 2 }]);
  main.children.splice(main.children.indexOf(old), 1);
  const fresh = block(main, 2);
  assert.deepEqual(marked(), []);
  marks.apply();
  assert.deepEqual(marked(), [fresh]);
});

test("T16: elements in or under an open editor are skipped", () => {
  const { main, marks, block, marked } = setup();
  const editor = main.append(new FakeElement("div", { "data-sphinx-preview-block-editor": "true" }));
  block(editor, 2);
  const editing = block(main, 3);
  editing.setAttribute("data-sphinx-preview-editing", "true");
  const plain = block(main, 4);
  marks.setRanges([{ start: 1, end: 9 }]);
  assert.deepEqual(marked(), [plain]);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-207
test("T16: malformed ranges are ignored and enabled is reported", () => {
  const { main, marks, block, marked } = setup();
  block(main, 1);
  marks.setRanges([{ start: "x", end: 1 }, null, { start: 3, end: 1 }] as never);
  assert.deepEqual(marked(), []);
  assert.equal(marks.enabled(), true);
  marks.setEnabled(false);
  assert.equal(marks.enabled(), false);
});

test("T16: included blocks are never marked, a distinct wrapper of the directive can be", () => {
  const { main, marks, block, marked } = setup();
  const wrapper = block(main, 1, 3);
  const included = wrapper.append(new FakeElement("div", {
    "data-line": "2", "data-end-line": "2", "data-sphinx-preview-included": "true",
  }));
  const inner = block(included, 2);
  const outsider = block(main, 9);
  marks.setRanges([{ start: 2, end: 2 }]);
  assert.equal(included.hasAttribute("data-sphinx-preview-changed"), false);
  assert.equal(inner.hasAttribute("data-sphinx-preview-changed"), false);
  assert.deepEqual(marked(), [wrapper]);
  assert.equal(outsider.hasAttribute("data-sphinx-preview-changed"), false);
});

test("T16: one bar per marked block in a layer, at the block's top and height, nested or not", () => {
  class Box extends FakeElement {
    box = { top: 0, height: 0 };
    style = { values: new Map<string, string>(), setProperty(name: string, value: string) { this.values.set(name, value); } };
    hidden = false;
    tagName = "";
    appendChild<T extends FakeElement>(child: T): T { return this.append(child); }
    getBoundingClientRect() { return { top: this.box.top, height: this.box.height }; }
  }
  const html = new Box("html");
  html.box = { top: -100, height: 900 };
  const body = html.append(new Box("body"));
  const main = body.append(new Box("main"));
  const top = main.append(new Box("p", { "data-line": "1" }));
  top.box = { top: 20, height: 30 };
  const list = main.append(new Box("ul", { "data-line": "3", "data-end-line": "4" }));
  const nested = list.append(new Box("li", { "data-line": "3" }));
  nested.box = { top: 120, height: 40 };
  const pre = main.append(new Box("pre"));
  pre.tagName = "PRE";
  pre.box = { top: 300, height: 70 };
  const code = pre.append(new Box("code", { "data-line": "6" }));
  code.tagName = "CODE";
  code.box = { top: 312, height: 46 };
  const all = (): FakeElement[] => {
    const found: FakeElement[] = [];
    const walk = (node: FakeElement) => { for (const child of node.children) { found.push(child); walk(child); } };
    walk(html);
    return found;
  };
  const document = {
    documentElement: html,
    body,
    defaultView: undefined,
    createElement: (name: string) => new Box(name),
    querySelectorAll: (selector: string) => {
      const names = selector.split(",").map((part) => part.trim().replace(/^\[|\]$/g, ""));
      return all().filter((element) => names.some((name) => element.attrs.has(name)));
    },
  };
  const marks = installIncomingChanges(document as never);
  marks.setRanges([{ start: 1, end: 1 }, { start: 3, end: 3 }, { start: 6, end: 6 }]);
  const layer = body.children.find((child) => child.hasAttribute("data-sphinx-preview-change-layer")) as Box;
  assert.ok(layer, "the layer is appended to the body");
  assert.equal(layer.getAttribute("aria-hidden"), "true");
  const bars = layer.children as Box[];
  assert.deepEqual(bars.map((bar) => [bar.style.values.get("top"), bar.style.values.get("height"), bar.hidden]),
    [["120px", "30px", false], ["220px", "40px", false], ["400px", "70px", false]]);
  // A code block is marked on its <code>: the bar spans the <pre> box around it.
  // The bar carries no horizontal position: every bar shares the stylesheet's column.
  assert.ok(bars.every((bar) => !bar.style.values.has("left") && !bar.style.values.has("inset-inline-start")));
  // A block that moved or collapsed is followed by layout(); bars of blocks that left are hidden.
  top.box = { top: 60, height: 0 };
  marks.layout();
  assert.deepEqual(bars.map((bar) => bar.hidden), [false, false, true]);
  assert.equal(bars[0].style.values.get("top"), "220px");
  marks.setRanges([]);
  assert.deepEqual(bars.map((bar) => bar.hidden), [true, true, true]);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-215
test("CR 155: a properties table row is marked by the lines of its field, not the table around it", () => {
  const { main, marks, marked } = setup();
  const table = main.append(new FakeElement("section", { "data-line": "1" }));
  const title = table.append(new FakeElement("tr", { "data-okf-line": "2", "data-okf-end-line": "2" }));
  const status = table.append(new FakeElement("tr", { "data-okf-line": "4", "data-okf-end-line": "4" }));
  const tags = table.append(new FakeElement("tr", { "data-okf-line": "5", "data-okf-end-line": "7" }));
  marks.setRanges([{ start: 4, end: 4 }, { start: 6, end: 6 }]);
  assert.deepEqual(marked(), [status, tags]);
  assert.equal(title.hasAttribute("data-sphinx-preview-changed"), false);
  assert.equal(table.hasAttribute("data-sphinx-preview-changed"), false);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-215
test("CR 155: a range on line 1 with no row marked marks the whole properties table", () => {
  const { main, marks, marked } = setup();
  const table = main.append(new FakeElement("section", { "data-line": "1" }));
  table.append(new FakeElement("tr", { "data-okf-line": "2", "data-okf-end-line": "2" }));
  marks.setRanges([{ start: 1, end: 1 }]);
  assert.deepEqual(marked(), [table]);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-220
test("CR 463: each bar carries the changed lines of its block as its tooltip", () => {
  class Box extends FakeElement {
    style = { setProperty() {} };
    hidden = false;
    tagName = "";
    appendChild<T extends FakeElement>(child: T): T { return this.append(child); }
    getBoundingClientRect() { return { top: 10, height: 20 }; }
  }
  const html = new Box("html");
  const body = html.append(new Box("body"));
  const one = body.append(new Box("p", { "data-line": "12" }));
  const several = body.append(new Box("pre", { "data-line": "20", "data-end-line": "30" }));
  const all = (): FakeElement[] => [one, several];
  const document = {
    documentElement: html,
    body,
    defaultView: undefined,
    createElement: (name: string) => new Box(name),
    querySelectorAll: () => all(),
  };
  const marks = installIncomingChanges(document as never);
  // A range wider than the block is cut to the block; two ranges in one block span from the first to the last line they changed.
  marks.setRanges([{ start: 10, end: 13 }, { start: 22, end: 23 }, { start: 27, end: 40 }]);
  const layer = body.children.find((child) => child.hasAttribute("data-sphinx-preview-change-layer")) as Box;
  assert.deepEqual(layer.children.map((bar) => bar.getAttribute("data-tooltip")), [
    "Changed line 12 since last commit",
    "Changed lines 22\u201330 since last commit",
  ]);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-220
test("CR 463: changedLinesLabel uses the singular for one line and an en dash for a range", () => {
  assert.equal(changedLinesLabel([{ start: 5, end: 5 }], 1, 9), "Changed line 5 since last commit");
  assert.equal(changedLinesLabel([{ start: 12, end: 14 }], 12, 14), "Changed lines 12\u201314 since last commit");
  assert.equal(changedLinesLabel([{ start: 1, end: 3 }, { start: 8, end: 9 }], 2, 8), "Changed lines 2\u20138 since last commit");
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-221
test("CR 463: removedLinesLabel names the lines at the last commit, singular for one, with an en dash for a run", () => {
  assert.equal(removedLinesLabel({ baseStart: 12, baseEnd: 12, start: 12 }), "Removed line 12 since last commit");
  assert.equal(removedLinesLabel({ baseStart: 12, baseEnd: 14, start: 12 }), "Removed lines 12–14 since last commit");
});

/** A page of two blocks (lines 1 and 5) with a layer that records its click listener. */
function pageWithLayer(onActivate: (target: ChangeTarget) => void) {
  class Box extends FakeElement {
    style = { props: new Map<string, string>(), setProperty(name: string, value: string) { this.props.set(name, value); }, removeProperty(name: string) { this.props.delete(name); } };
    hidden = false;
    listeners = new Map<string, (event: unknown) => void>();
    constructor(name: string, attrs: Record<string, string> = {}, public box = { top: 0, height: 0, bottom: 0 }) { super(name, attrs); }
    appendChild<T extends FakeElement>(child: T): T { return this.append(child); }
    addEventListener(type: string, listener: (event: unknown) => void) { this.listeners.set(type, listener); }
    getBoundingClientRect() { return this.box; }
    override closest(selector: string) { return selector.includes("change-layer") ? this : null; }
  }
  const html = new Box("html");
  const body = html.append(new Box("body"));
  const first = body.append(new Box("p", { "data-line": "1" }, { top: 10, height: 20, bottom: 30 }));
  const second = body.append(new Box("p", { "data-line": "5" }, { top: 100, height: 20, bottom: 120 }));
  const all = (): FakeElement[] => [first, second];
  const document = { documentElement: html, body, defaultView: undefined, createElement: (name: string) => new Box(name), querySelectorAll: () => all() };
  const marks = installIncomingChanges(document as never, onActivate);
  const layer = () => body.children.find((child) => child.hasAttribute("data-sphinx-preview-change-layer")) as Box;
  return { html, marks, layer, first, second };
}

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-221
test("CR 463: a removal between two blocks gets a marker above the next block with the removed lines as tooltip", () => {
  const page = pageWithLayer(() => undefined);
  page.marks.setRanges([{ start: 1, end: 1 }], [{ baseStart: 3, baseEnd: 4, start: 5 }]);
  const bars = page.layer().children as unknown as Array<FakeElement & { style: { props: Map<string, string> } }>;
  const marker = bars.find((bar) => bar.hasAttribute("data-removed"))!;
  assert.ok(marker, "a marker is drawn");
  assert.equal(marker.getAttribute("data-tooltip"), "Removed lines 3–4 since last commit");
  // Just above the block of line 5 (top 100), in the gap between the blocks.
  assert.equal(marker.style.props.get("top"), "86px");
  const bar = bars.find((candidate) => !candidate.hasAttribute("data-removed"))!;
  assert.equal(bar.getAttribute("data-tooltip"), "Changed line 1 since last commit");
  // Malformed removals are ignored.
  page.marks.setRanges([], [{ baseStart: 4, baseEnd: 3, start: 5 }, null, { baseStart: 1, baseEnd: 1 }]);
  assert.equal(page.layer().children.filter((candidate) => candidate.hasAttribute("data-removed") && !(candidate as never as { hidden: boolean }).hidden).length, 0);
  // A removal at the end of the page sits below the last block.
  page.marks.setRanges([], [{ baseStart: 9, baseEnd: 9, start: 9 }]);
  const end = page.layer().children.find((candidate) => candidate.hasAttribute("data-removed")) as unknown as { style: { props: Map<string, string> }; getAttribute(name: string): string | null };
  assert.equal(end.style.props.get("top"), "122px");
  assert.equal(end.getAttribute("data-tooltip"), "Removed line 9 since last commit");
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-222
test("CR 463: a click on a bar or a marker passes its target on, except in edit mode", () => {
  const clicked: ChangeTarget[] = [];
  const page = pageWithLayer((target) => clicked.push(target));
  page.marks.setRanges([{ start: 1, end: 1 }], [{ baseStart: 3, baseEnd: 3, start: 5 }]);
  const children = page.layer().children as unknown as Array<FakeElement>;
  const click = page.layer().listeners.get("click")!;
  click({ target: children.find((bar) => !bar.hasAttribute("data-removed")) });
  click({ target: children.find((bar) => bar.hasAttribute("data-removed")) });
  assert.deepEqual(clicked, [{ element: page.first }, { removed: { baseStart: 3, baseEnd: 3, start: 5 } }]);
  page.html.setAttribute("data-sphinx-preview-edit-mode", "on");
  click({ target: children[0] });
  assert.equal(clicked.length, 2, "edit mode takes the click away");
});
