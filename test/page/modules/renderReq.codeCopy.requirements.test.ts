/**
 * Requirement tests of the copy button of a code block (`modules/codeCopy.ts`) and of its hide on
 * a content patch (`features/contentPatch.ts`). Each test asserts the behaviour of the current code
 * on a small fake DOM.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { installContentPatch } from "../../../src/page/features/contentPatch";
import { installCodeCopy } from "../../../src/page/modules/codeCopy";
import { provideGlobalElement } from "./fakeDom";

type Handler = (event: any) => void;

class FakeElement {
  attrs = new Map<string, string>();
  listeners = new Map<string, Handler[]>();
  styles = new Map<string, string>();
  children: FakeElement[] = [];
  parent: FakeElement | undefined;
  hidden = false;
  innerHTML = "";
  private ownText: string | null = null;
  get textContent(): string | null {
    return this.ownText ?? this.children.map((child) => child.textContent ?? "").join("");
  }
  set textContent(value: string | null) { this.ownText = value; }
  get classList() { return { contains: (name: string) => this.classes.includes(name) }; }
  rect = { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
  isConnected = true;
  constructor(public tagName: string, public classes: string[] = []) {}
  get style() {
    return { setProperty: (name: string, value: string) => this.styles.set(name, value) };
  }
  setAttribute(name: string, value: string) { this.attrs.set(name, value); }
  getAttribute(name: string) { return this.attrs.get(name) ?? null; }
  removeAttribute(name: string) { this.attrs.delete(name); }
  addEventListener(type: string, handler: Handler) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), handler]);
  }
  append<T extends FakeElement>(child: T): T { child.parent = this; this.children.push(child); return child; }
  appendChild<T extends FakeElement>(child: T): T { return this.append(child); }
  contains(other: FakeElement | null | undefined): boolean {
    for (let node = other; node; node = node.parent) if (node === this) return true;
    return false;
  }
  matches(token: string): boolean {
    if (token.startsWith(".")) return this.classes.includes(token.slice(1));
    if (token.startsWith("#")) return this.attrs.get("id") === token.slice(1);
    if (token.startsWith("[")) return this.attrs.has(token.slice(1, -1));
    return this.tagName.toLowerCase() === token;
  }
  closest(selector: string): FakeElement | null {
    const tokens = selector.split(",").map((token) => token.trim());
    for (let node: FakeElement | undefined = this; node; node = node.parent) {
      if (tokens.some((token) => node!.matches(token))) return node;
    }
    return null;
  }
  querySelectorAll(selector: string): FakeElement[] {
    const found: FakeElement[] = [];
    for (const child of this.children) {
      if (child.matches(selector)) found.push(child);
      found.push(...child.querySelectorAll(selector));
    }
    return found;
  }
  hasAttribute(name: string) { return this.attrs.has(name); }
  querySelector(selector: string): any {
    for (const child of this.children) {
      if (child.matches(selector)) return child;
      const found = child.querySelector(selector);
      if (found) return found;
    }
    return null;
  }
  getBoundingClientRect() { return this.rect; }
  fire(type: string, event: Record<string, any> = {}) {
    const calls = { prevented: 0, stopped: 0 };
    const full = { target: this, preventDefault: () => calls.prevented++, stopPropagation: () => calls.stopped++, ...event };
    for (const handler of this.listeners.get(type) ?? []) handler(full);
    return calls;
  }
}

function rect(top: number, left: number, width: number, height: number) {
  return { top, left, right: left + width, bottom: top + height, width, height };
}

function harness() {
  const root = new FakeElement("html");
  const body = root.append(new FakeElement("body"));
  const content = body.append(new FakeElement("main"));
  content.setAttribute("id", "sphinx-myst-preview-content");
  const band = body.append(new FakeElement("div"));
  band.setAttribute("data-sphinx-preview-sticky-headings", "");
  band.hidden = true;
  const makePre = (text: string, top: number) => {
    const pre = content.append(new FakeElement("pre"));
    pre.rect = rect(top, 20, 500, 120);
    const code = pre.append(new FakeElement("code"));
    code.textContent = text;
    return { pre, code };
  };
  const documentListeners = new Map<string, Handler[]>();
  const windowListeners = new Map<string, Handler[]>();
  const timers: Array<{ id: number; callback: () => void; delay: number }> = [];
  let nextTimer = 1;
  const posted: string[] = [];
  const document = {
    body,
    createElement: (tag: string) => new FakeElement(tag),
    getElementById: (id: string) => id === "sphinx-myst-preview-content" ? content : null,
    querySelector: (selector: string) => body.querySelector(selector),
    elementFromPoint: () => null,
    addEventListener: (type: string, handler: Handler) => documentListeners.set(type, [...(documentListeners.get(type) ?? []), handler]),
  };
  const window = {
    innerWidth: 900,
    innerHeight: 800,
    setTimeout: (callback: () => void, delay: number) => { const id = nextTimer++; timers.push({ id, callback, delay }); return id; },
    clearTimeout: (id: number) => { const index = timers.findIndex((timer) => timer.id === id); if (index >= 0) timers.splice(index, 1); },
    addEventListener: (type: string, handler: Handler) => windowListeners.set(type, [...(windowListeners.get(type) ?? []), handler]),
  };
  provideGlobalElement(FakeElement);
  const runtime = installCodeCopy(document as never, window as never, (text: string) => posted.push(text));
  return {
    button(): any { return body.querySelector("[data-sphinx-preview-code-copy]") as any; },
    makePre, posted, timers, runtime, window,
    over(target: FakeElement) {
      for (const handler of documentListeners.get("mouseover") ?? []) handler({ target, relatedTarget: null });
    },
    resize() { for (const handler of windowListeners.get("resize") ?? []) handler({}); },
  };
}

// @tests_req SwRS-MDOKFSTUDIO-CODE-017
test("a resize moves the button to the new top-right corner of the block and hides it when too little shows", () => {
  const t = harness();
  const { pre, code } = t.makePre("a\n", 100);
  t.over(code);
  assert.equal(t.button().styles.get("left"), `${520 - 6 - 26}px`);
  assert.equal(t.button().styles.get("top"), "106px");

  pre.rect = rect(100, 20, 300, 120); // the window got narrower: the block is 300 px wide
  t.window.innerWidth = 700;
  t.resize();
  assert.equal(t.button().hidden, false);
  assert.equal(t.button().styles.get("left"), `${320 - 6 - 26}px`, "6 px inside the new right edge");
  assert.equal(t.button().styles.get("top"), "106px");

  pre.rect = rect(780, 20, 300, 120); // only 20 px of the block stay in the 800 px window
  t.resize();
  assert.equal(t.button().hidden, true, "less than 30 px visible hides the button");
});

test("the Copied state is reset when another block is hovered and kept inside the same block", () => {
  const t = harness();
  const first = t.makePre("one\n", 100);
  const second = t.makePre("two\n", 300);
  t.over(first.code);
  const idle = t.button().innerHTML;
  t.button().fire("click");
  assert.equal(t.button().getAttribute("aria-label"), "Copied");
  assert.notEqual(t.button().innerHTML, idle, "the check mark shows");

  t.over(first.code); // the pointer stays in the same block
  assert.equal(t.button().getAttribute("aria-label"), "Copied", "kept until the 1.5 s end");

  t.over(second.code);
  assert.equal(t.button().getAttribute("aria-label"), "Copy code");
  assert.equal(t.button().innerHTML, idle, "no check mark on the other block");
  assert.equal(t.timers.length, 0, "the Copied timer was cleared");
});

test("an applied content patch hides the copy button once", () => {
  // A page runtime of which only the parts a content patch reads are real; everything else is inert.
  const inert: any = new Proxy(function inertTarget() { return undefined; }, {
    get: (_target, key) => (key === Symbol.toPrimitive ? () => "" : inert),
    apply: () => inert,
  });
  let hides = 0;
  const main = { id: "sphinx-myst-preview-content" };
  const document = {
    getElementById: () => main,
    querySelectorAll: () => [],
    documentElement: { setAttribute: () => undefined },
  };
  const parts = new Proxy({ codeCopy: { hide: () => { hides += 1; }, refresh: () => undefined } } as Record<string, unknown>, {
    get: (target, key) => (typeof key === "string" && key in target ? target[key] : inert),
  });
  const rt: any = new Proxy({
    document,
    window: { scrollY: 0 },
    context: { documentId: "file:///a.md", revision: 1, requestId: 1 },
    host: { postMessage: () => undefined },
    state: {},
    parts,
  } as Record<string, unknown>, {
    get: (target, key) => (typeof key === "string" && key in target ? target[key] : inert),
  });
  const patch = installContentPatch(rt);
  assert.equal(hides, 0);
  patch.applyContentPatch({
    type: "previewContentPatch",
    documentId: "file:///a.md",
    revision: 1,
    requestId: 1,
    next: { revision: 2, requestId: 2 },
    contentHtml: "<p>fresh</p>",
    status: "success",
    label: "ready",
    diagnostics: [],
  } as never);
  assert.equal(hides, 1, "hide is called once per applied patch");
  assert.equal(rt.context.revision, 2, "the patch was applied");
});
