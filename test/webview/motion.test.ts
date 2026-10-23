import * as assert from "node:assert/strict";
import { test } from "node:test";
import * as vm from "node:vm";

import { installMotion } from "../../src/webview/motion";

type Listener = (event: { type: string; target: unknown; propertyName?: string }) => void;

class FakeElement {
  attrs = new Map<string, string>();
  children: FakeElement[] = [];
  parentElement: FakeElement | null = null;
  listeners = new Map<string, Listener[]>();
  constructor(public tagName: string, attrs: Record<string, string> = {}) {
    for (const [key, value] of Object.entries(attrs)) this.attrs.set(key, value);
  }
  setAttribute(name: string, value: string) { this.attrs.set(name, value); }
  getAttribute(name: string) { return this.attrs.get(name) ?? null; }
  removeAttribute(name: string) { this.attrs.delete(name); }
  addEventListener(type: string, listener: Listener) {
    this.listeners.set(type, [...this.listeners.get(type) ?? [], listener]);
  }
  removeEventListener(type: string, listener: Listener) {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((entry) => entry !== listener));
  }
  dispatch(type: string, extra: { propertyName?: string; target?: unknown } = {}) {
    for (const listener of [...this.listeners.get(type) ?? []]) listener({ type, target: this, ...extra });
  }
  append<T extends FakeElement>(child: T): T { child.parentElement = this; this.children.push(child); return child; }
  closest(selector: string): FakeElement | null {
    const names = selector.split(",").map((part) => part.trim().replace(/^\[|\]$/g, ""));
    for (let node: FakeElement | null = this; node; node = node.parentElement) {
      if (names.some((name) => node!.attrs.has(name))) return node;
    }
    return null;
  }
}

function setup(options: { reduced?: boolean } = {}) {
  const root = new FakeElement("HTML");
  const body = root.append(new FakeElement("BODY"));
  const main = body.append(new FakeElement("MAIN"));
  const all = (): FakeElement[] => {
    const found: FakeElement[] = [];
    const walk = (node: FakeElement) => { for (const child of node.children) { found.push(child); walk(child); } };
    walk(root);
    return found;
  };
  const document = {
    documentElement: root,
    body,
    querySelectorAll: (selector: string) => {
      assert.equal(selector, "[data-line]");
      return all().filter((element) => element.attrs.has("data-line"));
    },
  };
  const windowListeners = new Map<string, Listener[]>();
  const timers = new Map<number, () => void>();
  let nextTimer = 1;
  const window = {
    matchMedia: (query: string) => ({ matches: query === "(prefers-reduced-motion: reduce)" && options.reduced === true }),
    addEventListener: (type: string, listener: Listener) => {
      windowListeners.set(type, [...windowListeners.get(type) ?? [], listener]);
    },
    setTimeout: (callback: () => void) => { const id = nextTimer++; timers.set(id, callback); return id; },
    clearTimeout: (id: number) => { timers.delete(id); },
  };
  const motion = vm.runInNewContext(`(${installMotion.toString()})(document, window)`, { document, window }) as
    ReturnType<typeof installMotion>;
  const press = (type = "pointerdown") => {
    for (const listener of windowListeners.get(type) ?? []) listener({ type, target: window });
  };
  const block = (parent: FakeElement, tagName: string, line: number, end?: number, attrs: Record<string, string> = {}) =>
    parent.append(new FakeElement(tagName, { "data-line": String(line), ...(end ? { "data-end-line": String(end) } : {}), ...attrs }));
  // Arrays made in the page context have another prototype: copy them for deepEqual.
  const glow = (ranges: unknown) => [...motion.glow(ranges)];
  const glowing = () => all().filter((element) => element.attrs.get("data-sphinx-preview-updated") === "true");
  return { root, body, main, motion, glow, block, glowing, press, timers };
}

test("CR 046: an update glows on the innermost blocks whose lines meet a range, and only there", () => {
  const { main, glow, block, glowing } = setup();
  const before = block(main, "P", 1);
  const list = block(main, "UL", 3, 6);
  const itemA = block(list, "LI", 3, 4);
  const itemB = block(list, "LI", 5, 6);
  const after = block(main, "P", 8);
  const marked = glow([{ start: 4, end: 5 }]);
  assert.deepEqual(marked, [itemA, itemB]);
  assert.deepEqual(glowing(), [itemA, itemB], "the list itself and the untouched paragraphs do not glow");
  assert.equal(before.getAttribute("data-sphinx-preview-updated"), null);
  assert.equal(after.getAttribute("data-sphinx-preview-updated"), null);
});

test("CR 046: the glow mark goes away when its animation ends", () => {
  const { main, glow, block, glowing } = setup();
  const paragraph = block(main, "P", 2);
  const other = block(main, "P", 3);
  glow([{ start: 2, end: 3 }]);
  assert.equal(glowing().length, 2);
  // A child's animation bubbling up does not end the block's glow.
  paragraph.dispatch("animationend", { target: {} });
  assert.equal(paragraph.getAttribute("data-sphinx-preview-updated"), "true");
  paragraph.dispatch("animationend");
  other.dispatch("animationcancel");
  assert.deepEqual(glowing(), []);
});

test("CR 046: a changed code block glows on its <pre> box", () => {
  const { main, glow, block, glowing } = setup();
  const pre = main.append(new FakeElement("PRE"));
  block(pre, "CODE", 4, 7);
  glow([{ start: 5, end: 5 }]);
  assert.deepEqual(glowing(), [pre]);
});

test("CR 046: included blocks, open editors and the block being edited never glow", () => {
  const { main, glow, block, glowing } = setup();
  block(main, "P", 2, undefined, { "data-sphinx-preview-included": "" });
  block(main, "P", 3, undefined, { "data-sphinx-preview-editing": "true" });
  const frame = main.append(new FakeElement("DIV", { "data-sphinx-preview-block-editor": "true" }));
  block(frame, "P", 4);
  glow([{ start: 1, end: 9 }]);
  assert.deepEqual(glowing(), []);
});

test("CR 046: no ranges, invalid ranges or a change too large to point at blocks glow nothing", () => {
  const { main, glow, block, glowing } = setup();
  for (let line = 1; line <= 45; line += 1) block(main, "P", line);
  assert.deepEqual(glow(undefined), []);
  assert.deepEqual(glow([]), []);
  assert.deepEqual(glow([{ start: 0, end: 2 }, { start: 5, end: 4 }, { start: "1", end: 2 }]), []);
  assert.deepEqual(glow([{ start: 1, end: 45 }]), [], "45 blocks is above the limit of 40");
  assert.deepEqual(glowing(), []);
  assert.equal(glow([{ start: 1, end: 40 }]).length, 40);
});

test("CR 046: with prefers-reduced-motion: reduce nothing is marked to move", () => {
  const { root, main, motion, glow, block, glowing, press, timers } = setup({ reduced: true });
  block(main, "P", 1);
  const edited = block(main, "P", 2);
  assert.deepEqual(glow([{ start: 1, end: 2 }]), []);
  assert.deepEqual(glowing(), []);
  motion.themeSwitch();
  assert.equal(root.getAttribute("data-sphinx-preview-theme-switching"), null);
  assert.equal(timers.size, 0);
  press();
  motion.editorClosed(edited as unknown as Element);
  assert.equal(edited.getAttribute("data-sphinx-preview-edit-closed"), null);
});

test("CR 046: editors and menus appear softly only after a pointer or key press, never after a patch", () => {
  const { root, main, motion, block, press } = setup();
  const edited = block(main, "P", 2);
  assert.equal(root.getAttribute("data-sphinx-preview-motion"), null, "a page that just loaded shows no motion");
  motion.editorClosed(edited as unknown as Element);
  assert.equal(edited.getAttribute("data-sphinx-preview-edit-closed"), null, "an editor closed by the page itself does not fade");
  press("keydown");
  assert.equal(root.getAttribute("data-sphinx-preview-motion"), "on");
  motion.editorClosed(edited as unknown as Element);
  assert.equal(edited.getAttribute("data-sphinx-preview-edit-closed"), "true", "the block an editor gives back fades in");
  edited.dispatch("animationend");
  assert.equal(edited.getAttribute("data-sphinx-preview-edit-closed"), null);
  motion.hold();
  assert.equal(root.getAttribute("data-sphinx-preview-motion"), null, "a content patch holds the motion back");
  press();
  assert.equal(root.getAttribute("data-sphinx-preview-motion"), "on");
});

test("CR 046: a theme switch transitions the colours once, until the body background has changed", () => {
  const { root, body, motion, timers } = setup();
  motion.themeSwitch();
  assert.equal(root.getAttribute("data-sphinx-preview-theme-switching"), "true");
  body.dispatch("transitionend", { propertyName: "color" });
  assert.equal(root.getAttribute("data-sphinx-preview-theme-switching"), "true", "another property ending is not the end");
  body.dispatch("transitionend", { propertyName: "background-color" });
  assert.equal(root.getAttribute("data-sphinx-preview-theme-switching"), null);
  assert.equal(timers.size, 0, "the fallback is cleared");
  // Two modes with the same background run no transition: the fallback ends the switch.
  motion.themeSwitch();
  assert.equal(timers.size, 1);
  [...timers.values()][0]!();
  assert.equal(root.getAttribute("data-sphinx-preview-theme-switching"), null);
});
