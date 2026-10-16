import * as assert from "node:assert/strict";
import { test } from "node:test";
import * as vm from "node:vm";

import { installIncomingChanges } from "../../src/webview/incomingChanges";

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
  const marks = vm.runInNewContext(`(${installIncomingChanges.toString()})(document)`, { document }) as
    ReturnType<typeof installIncomingChanges>;
  const block = (parent: FakeElement, line: number, end?: number) =>
    parent.append(new FakeElement("div", { "data-line": String(line), ...(end ? { "data-end-line": String(end) } : {}) }));
  const marked = () => all().filter((element) => element.attrs.has("data-sphinx-preview-changed"));
  return { root, main, marks, block, marked };
}

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
