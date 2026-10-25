import * as assert from "node:assert/strict";
import { test } from "node:test";

import { installIncomingChanges } from "../../../src/page/modules/incomingChanges";

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
      const name = selector.replace(/^\[|\]$/g, "");
      return all().filter((element) => element.attrs.has(name));
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

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-208
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
      const name = selector.replace(/^\[|\]$/g, "");
      return all().filter((element) => element.attrs.has(name));
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
