import * as assert from "node:assert/strict";
import { test } from "node:test";

import { highlightCodeBlocks } from "../../../src/core/render/highlight";
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

const ENTITIES: Record<string, string> = { "&lt;": "<", "&gt;": ">", "&amp;": "&", "&quot;": '"', "&#x27;": "'", "&#39;": "'" };

// Parses the markup of `highlightCodeBlocks` (pre, code, span, text) into fake elements.
function parseBlock(html: string): FakeElement {
  const root = new FakeElement("root");
  let node = root;
  for (const match of html.matchAll(/<\/(\w+)>|<(\w+)([^>]*)>|([^<]+)/gu)) {
    if (match[1]) {
      node = node.parent ?? root;
    } else if (match[2]) {
      const classes = /class="([^"]*)"/u.exec(match[3])?.[1]?.split(" ") ?? [];
      const element = node.append(new FakeElement(match[2], classes));
      for (const attribute of match[3].matchAll(/([\w-]+)="([^"]*)"/gu)) element.setAttribute(attribute[1], attribute[2]);
      node = element;
    } else {
      const text = node.append(new FakeElement("#text"));
      text.textContent = match[4].replace(/&(?:lt|gt|amp|quot|#x27|#39);/gu, (entity) => ENTITIES[entity]);
    }
  }
  return root.children[0];
}

function escapeCode(code: string): string {
  return code.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function rect(top: number, left: number, width: number, height: number) {
  return { top, left, right: left + width, bottom: top + height, width, height };
}

function harness(options: { band?: ReturnType<typeof rect> } = {}) {
  const root = new FakeElement("html");
  const body = root.append(new FakeElement("body"));
  const content = body.append(new FakeElement("main"));
  content.setAttribute("id", "sphinx-myst-preview-content");
  const band = body.append(new FakeElement("div"));
  band.setAttribute("data-sphinx-preview-sticky-headings", "");
  if (options.band) band.rect = options.band; else band.hidden = true;
  const makePre = (text: string, top: number, host: FakeElement = content) => {
    const pre = host.append(new FakeElement("pre"));
    pre.rect = rect(top, 20, 500, 120);
    const label = pre.append(new FakeElement("span", ["myst-code-filename"]));
    label.textContent = "example.py";
    const code = pre.append(new FakeElement("code"));
    code.textContent = text;
    return { pre, code, label };
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
    elementFromPoint: () => hovered,
    addEventListener: (type: string, handler: Handler) => documentListeners.set(type, [...(documentListeners.get(type) ?? []), handler]),
  };
  let hovered: FakeElement | null = null;
  const window = {
    innerWidth: 900,
    innerHeight: 800,
    setTimeout: (callback: () => void, delay: number) => { const id = nextTimer++; timers.push({ id, callback, delay }); return id; },
    clearTimeout: (id: number) => { const index = timers.findIndex((timer) => timer.id === id); if (index >= 0) timers.splice(index, 1); },
    addEventListener: (type: string, handler: Handler) => windowListeners.set(type, [...(windowListeners.get(type) ?? []), handler]),
  };
  provideGlobalElement(FakeElement);
  const runtime: { hide(): void } = installCodeCopy(document as never, window as never, (text: string) => posted.push(text));
  return {
    button(): any { return body.querySelector("[data-sphinx-preview-code-copy]") as any; },
    body, content, band, makePre, posted, timers, runtime, window,
    over(target: FakeElement, related: FakeElement | null = null) {
      hovered = target;
      for (const handler of documentListeners.get("mouseover") ?? []) handler({ target, relatedTarget: related });
    },
    out(target: FakeElement, related: FakeElement | null) {
      for (const handler of documentListeners.get("mouseout") ?? []) handler({ target, relatedTarget: related });
    },
    onDocumentClick(handler: Handler) { documentListeners.set("click", [...(documentListeners.get("click") ?? []), handler]); },
    clickWithBubbling(target: FakeElement) {
      const calls = target.fire("click");
      if (calls.stopped === 0) for (const handler of documentListeners.get("click") ?? []) handler({ target });
    },
    click(target: FakeElement) { for (const handler of documentListeners.get("click") ?? []) handler({ target }); },
    move(target: FakeElement) { hovered = target; for (const handler of documentListeners.get("mousemove") ?? []) handler({ target, clientX: 0, clientY: 0 }); },
    scroll() { for (const handler of windowListeners.get("scroll") ?? []) handler({}); },
    pointFrom(target: FakeElement | null) { hovered = target; },
  };
}

// @tests_req SwRS-MDOKFSTUDIO-CODE-017
test("hovering a code block shows the copy button inside its top right corner", () => {
  const t = harness();
  const { pre, code } = t.makePre("print('hi')\n", 100);
  assert.equal(t.button(), null, "no element is added before the first hover");
  t.over(code);
  assert.equal(t.button().getAttribute("type"), "button");
  assert.equal(t.button().getAttribute("aria-label"), "Copy code");
  assert.equal(t.button().hidden, false);
  assert.equal(t.button().styles.get("top"), "106px");
  assert.equal(t.button().styles.get("left"), `${520 - 6 - 26}px`);
  t.out(pre, t.body);
  assert.equal(t.button().hidden, true);
});

test("the button stays while the pointer moves from the block to the button", () => {
  const t = harness();
  const { pre, code } = t.makePre("a\n", 100);
  t.over(code);
  t.out(pre, t.button());
  assert.equal(t.button().hidden, false);
  t.over(t.button(), code);
  assert.equal(t.button().hidden, false);
});

// @tests_req SwRS-MDOKFSTUDIO-CODE-019
test("a click posts the raw code only, without filename or line numbers, and shows a check mark", () => {
  const t = harness();
  const { code } = t.makePre("line one\nline two\n", 100);
  t.over(code);
  const before = t.button().innerHTML;
  const calls = t.button().fire("click");
  assert.deepEqual(t.posted, ["line one\nline two\n"]);
  assert.equal(calls.stopped, 1);
  assert.equal(t.button().getAttribute("aria-label"), "Copied");
  assert.notEqual(t.button().innerHTML, before);
  assert.equal(t.timers.length, 1);
  assert.equal(t.timers[0].delay, 1500);
  t.timers[0].callback();
  assert.equal(t.button().getAttribute("aria-label"), "Copy code");
  assert.equal(t.button().innerHTML, before);
});

test("an unhighlighted block without a code element copies the pre text", () => {
  const t = harness();
  const pre = t.content.append(new FakeElement("pre"));
  pre.rect = rect(100, 20, 500, 120);
  pre.textContent = "plain text";
  t.over(pre);
  t.button().fire("click");
  assert.deepEqual(t.posted, ["plain text"]);
});

test("mousedown on the button is prevented so an open editor keeps focus", () => {
  const t = harness();
  const { code } = t.makePre("a", 100);
  t.over(code);
  assert.equal(t.button().fire("mousedown").prevented, 1);
});

test("blocks being edited, in a block editor, or holding a diagram are skipped", () => {
  const t = harness();
  const editing = t.makePre("a", 100);
  editing.pre.setAttribute("data-sphinx-preview-editing", "true");
  t.over(editing.code);
  assert.equal(t.button(), null);
  const figure = t.content.append(new FakeElement("figure", ["myst-mermaid-figure"]));
  const diagram = t.makePre("graph TD", 300, figure);
  t.over(diagram.code);
  assert.equal(t.button(), null);
  const editor = t.content.append(new FakeElement("div"));
  editor.setAttribute("data-sphinx-preview-block-editor", "");
  const inEditor = t.makePre("a", 500, editor);
  t.over(inEditor.code);
  assert.equal(t.button(), null);
});

test("a block under the sticky band or visible for less than 30 px hides the button", () => {
  const t = harness({ band: rect(0, 0, 900, 90) });
  const { pre, code } = t.makePre("a", 100);
  t.over(code);
  assert.equal(t.button().hidden, false);
  pre.rect = rect(-40, 20, 500, 120); // 80 px tall, bottom at 80, under the band
  t.scroll();
  assert.equal(t.button().hidden, true);
  pre.rect = rect(50, 20, 500, 120); // top under the band: the button sticks below it
  t.scroll();
  assert.equal(t.button().hidden, false);
  assert.equal(t.button().styles.get("top"), "96px");
  pre.rect = rect(-70, 20, 500, 120); // 20 px visible below the band
  t.scroll();
  assert.equal(t.button().hidden, true);
});

test("after scrolling stops outside the block the button is hidden", () => {
  const t = harness();
  const { code } = t.makePre("a", 100);
  t.over(code);
  t.pointFrom(null);
  t.scroll();
  const settle = t.timers.at(-1)!;
  settle.callback();
  assert.equal(t.button().hidden, true);
});

test("hide() hides the button, resets the check mark and ignores a detached block", () => {
  const t = harness();
  const { pre, code } = t.makePre("a", 100);
  t.over(code);
  t.button().fire("click");
  t.runtime.hide();
  assert.equal(t.button().hidden, true);
  assert.equal(t.button().getAttribute("aria-label"), "Copy code");
  assert.equal(t.timers.length, 0);
  t.over(code);
  pre.isConnected = false;
  t.scroll();
  assert.equal(t.button().hidden, true);
});

test("a click inside the block hides the button until the pointer moves again", () => {
  const t = harness();
  const { pre, code } = t.makePre("a", 100);
  t.over(code);
  t.click(code);
  assert.equal(t.button().hidden, true);
  pre.setAttribute("data-sphinx-preview-editing", "true");
  t.move(code);
  assert.equal(t.button().hidden, true, "not shown over a block that is being edited");
  pre.removeAttribute("data-sphinx-preview-editing");
  t.move(code);
  assert.equal(t.button().hidden, false);
  t.click(t.button());
  assert.equal(t.button().hidden, false, "a click on the button itself keeps it");
});

const SHAPES: Array<{ name: string; language?: string; attributes?: string; filename?: string; code: string }> = [
  { name: "plain", code: "no language\n\nsecond <b> & line\n" },
  { name: "highlighted", language: "typescript", code: "const a = 1;\n\n  if (a < 2) {\n    run();\n  }\n" },
  { name: "line numbers", language: "python", attributes: ' data-myst-line-numbers="true"', code: "a = 1\n\nb = 2\n" },
  { name: "line numbers from 7", language: "python", attributes: ' data-myst-line-numbers="true" data-myst-line-start="7"', code: "a\nb\n" },
  { name: "emphasized lines", language: "typescript", attributes: ' data-myst-emphasize-lines="2"', code: "one();\ntwo();\nthree();\n" },
  { name: "diff", language: "diff", code: "-a\n+b\n c\n\n+d\n" },
  { name: "diff with line numbers", language: "diff", attributes: ' data-myst-line-numbers="true"', code: "-a\n+b\n c\n" },
  { name: "filename label", filename: "src/example.ts", code: "plain in a labelled block\nsecond\n" },
  { name: "filename label, highlighted, numbered", language: "typescript", filename: "a.ts", attributes: ' data-myst-line-numbers="true"', code: "let x;\n\nlet y;\n" },
  { name: "multi-line token", language: "typescript", attributes: ' data-myst-line-numbers="true"', code: "/* one\n   two */\nconst s = `a\nb`;\n" },
];

for (const shape of SHAPES) {
  test(`the copied text of a ${shape.name} block is the original code`, () => {
    const classAttribute = shape.language ? ` class="language-${shape.language}"` : "";
    const filename = shape.filename ? ` data-myst-filename="${shape.filename}"` : "";
    const html = highlightCodeBlocks(
      `<pre><code${classAttribute}${filename}${shape.attributes ?? ""}>${escapeCode(shape.code)}</code></pre>`,
    );
    const t = harness();
    const pre = parseBlock(html);
    pre.rect = rect(100, 20, 500, 120);
    t.content.append(pre);
    t.over(pre.querySelector("code"));
    t.button().fire("click");
    assert.deepEqual(t.posted, [shape.code]);
  });
}

test("in edit mode the button click copies and neither opens nor commits an editor", () => {
  const t = harness();
  const { pre, code } = t.makePre("copy me\n", 100);
  pre.setAttribute("data-sphinx-source-line", "3");
  const opened: unknown[] = [];
  t.onDocumentClick((event) => opened.push(event)); // stands for the block editor opener
  t.over(code);
  t.clickWithBubbling(t.button());
  assert.deepEqual(t.posted, ["copy me\n"]);
  assert.equal(opened.length, 0, "the click never reaches the document handlers");
  t.clickWithBubbling(code);
  assert.equal(opened.length, 1, "a click on the block itself still reaches them");
});
