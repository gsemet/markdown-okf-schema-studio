import * as assert from "node:assert/strict";
import { test } from "node:test";
import * as vm from "node:vm";

import { installCommentThreads } from "../../src/webview/commentThreads";

type Listener = (event: any) => void;

/** A minimal DOM: elements and text nodes, the selectors the module uses, and event dispatch. */
class FakeNode {
  parentNode: FakeElement | null = null;
  get nodeType(): number { return this instanceof FakeElement ? 1 : 3; }
  get previousSibling(): FakeNode | null {
    const list = this.parentNode?.childNodes ?? [];
    return list[list.indexOf(this) - 1] ?? null;
  }
  get nextSibling(): FakeNode | null {
    const list = this.parentNode?.childNodes ?? [];
    return list[list.indexOf(this) + 1] ?? null;
  }
  remove(): void { this.parentNode?.removeChild(this); }
}

class FakeText extends FakeNode {
  constructor(public nodeValue: string) { super(); }
  get textContent(): string { return this.nodeValue; }
}

class FakeElement extends FakeNode {
  attrs = new Map<string, string>();
  childNodes: FakeNode[] = [];
  listeners = new Map<string, Listener[]>();
  styles = new Map<string, string>();
  constructor(public tagName: string, attrs: Record<string, string> = {}) {
    super();
    for (const [key, value] of Object.entries(attrs)) this.attrs.set(key, value);
  }
  get firstChild(): FakeNode | null { return this.childNodes[0] ?? null; }
  get style() { return { setProperty: (name: string, value: string) => this.styles.set(name, value) }; }
  get textContent(): string { return this.childNodes.map((child) => (child as any).textContent).join(""); }
  set textContent(value: string) {
    this.childNodes.forEach((child) => { child.parentNode = null; });
    this.childNodes = [];
    if (value !== "") this.appendChild(new FakeText(value));
  }
  setAttribute(name: string, value: string) { this.attrs.set(name, String(value)); }
  getAttribute(name: string) { return this.attrs.get(name) ?? null; }
  removeAttribute(name: string) { this.attrs.delete(name); }
  hasAttribute(name: string) { return this.attrs.has(name); }
  detach(node: FakeNode) { node.parentNode?.childNodes.splice(node.parentNode.childNodes.indexOf(node), 1); }
  appendChild<T extends FakeNode>(node: T): T { return this.insertBefore(node, null); }
  insertBefore<T extends FakeNode>(node: T, reference: FakeNode | null): T {
    this.detach(node);
    node.parentNode = this;
    const index = reference ? this.childNodes.indexOf(reference) : this.childNodes.length;
    this.childNodes.splice(index, 0, node);
    return node;
  }
  removeChild<T extends FakeNode>(node: T): T { this.detach(node); node.parentNode = null; return node; }
  replaceChild(node: FakeNode, old: FakeNode) { this.insertBefore(node, old); this.removeChild(old); return old; }
  matchesToken(token: string): boolean {
    if (token.startsWith(".")) return (this.attrs.get("class") ?? "").split(/\s+/u).includes(token.slice(1));
    if (token.startsWith("[")) return this.attrs.has(token.slice(1, -1));
    return this.tagName.toLowerCase() === token.toLowerCase();
  }
  matches(selector: string): boolean {
    return selector.split(",").map((token) => token.trim()).some((token) => this.matchesToken(token));
  }
  closest(selector: string): FakeElement | null {
    for (let node: FakeElement | null = this; node; node = node.parentNode) if (node.matches(selector)) return node;
    return null;
  }
  descendants(): FakeElement[] {
    const found: FakeElement[] = [];
    const walk = (node: FakeElement) => {
      for (const child of node.childNodes) if (child instanceof FakeElement) { found.push(child); walk(child); }
    };
    walk(this);
    return found;
  }
  querySelectorAll(selector: string) { return this.descendants().filter((element) => element.matches(selector)); }
  querySelector(selector: string) { return this.querySelectorAll(selector)[0] ?? null; }
  getBoundingClientRect() { return { left: 10, top: 10, right: 50, bottom: 30, width: 40, height: 20 }; }
  addEventListener(type: string, listener: Listener) { this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]); }
  fire(type: string, event: Record<string, any> = {}) {
    const calls = { prevented: 0, stopped: 0 };
    let halted = false;
    const full = {
      type, target: this, preventDefault: () => calls.prevented++,
      stopImmediatePropagation: () => { calls.stopped++; halted = true; }, ...event,
    };
    // Capture handlers on the document run before the ones registered after them.
    for (const listener of (this.ownerDocument?.listeners.get(type) ?? [])) {
      if (halted) break;
      listener(full);
    }
    return calls;
  }
  ownerDocument?: FakeDocument;
}

class FakeDocument extends FakeElement {
  body = new FakeElement("body");
  content = new FakeElement("main");
  constructor() {
    super("html");
    this.appendChild(this.body);
    this.body.appendChild(this.content);
    this.ownerDocument = this;
  }
  createElement(tag: string) { const element = new FakeElement(tag); element.ownerDocument = this; return element; }
  createTextNode(text: string) { return new FakeText(text); }
  add(tag: string, attrs: Record<string, string>, parent: FakeElement = this.content, text?: string) {
    const element = this.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
    if (text !== undefined) element.appendChild(new FakeText(text));
    parent.appendChild(element);
    return element;
  }
}

function setup() {
  const document = new FakeDocument();
  const window = { innerWidth: 800, innerHeight: 600 };
  const sandbox = { document, window, Element: FakeElement, Date, Number, Array, Math };
  const comments = vm.runInNewContext(`(${installCommentThreads.toString()})(document, window)`, sandbox) as
    ReturnType<typeof installCommentThreads>;
  return { document, comments };
}

const thread = (overrides: Record<string, unknown> = {}) => ({
  id: "t1",
  anchor: { line: 1, endLine: 1, quote: "needle", prefix: "", suffix: "" },
  resolved: false,
  createdAt: "2026-10-21T10:00:00Z",
  comments: [{ id: "c1", author: "Ada", createdAt: "2026-10-21T10:00:00Z", body: "Why this?" }],
  ...overrides,
});

const marks = (document: FakeDocument) => document.querySelectorAll("[data-okf-comment-thread]");
const badges = (document: FakeDocument) => document.querySelectorAll("[data-okf-comment-badge]");

test("T42: the first occurrence of the quote is wrapped in a mark", () => {
  const { document, comments } = setup();
  const paragraph = document.add("p", { "data-line": "1" }, document.content, "a needle and another needle");
  comments.setThreads([thread()]);
  assert.equal(marks(document).length, 1);
  assert.equal(marks(document)[0].textContent, "needle");
  assert.equal(marks(document)[0].getAttribute("data-okf-comment-thread"), "t1");
  assert.equal(paragraph.textContent, "a needle and another needle");
  assert.equal(badges(document).length, 0);
});

test("T42: a quote that spans an element boundary gets a badge, not a mark", () => {
  const { document, comments } = setup();
  const paragraph = document.add("p", { "data-line": "1" }, document.content, "a nee");
  document.add("em", {}, paragraph, "dle b");
  comments.setThreads([thread()]);
  assert.equal(marks(document).length, 0);
  assert.equal(badges(document).length, 1);
  assert.equal(badges(document)[0].parentNode, paragraph);
  assert.equal(paragraph.textContent, "a needle b", "a badge adds no text");
  assert.equal(paragraph.getAttribute("data-okf-comment-badged"), "true");
});

test("T42: code, math, mermaid, plantuml and the properties table are never wrapped", () => {
  const { document, comments } = setup();
  const pre = document.add("pre", { "data-line": "1" });
  document.add("code", {}, pre, "needle");
  const math = document.add("div", { "data-line": "2", class: "math-display" }, document.content, "needle");
  document.add("figure", { "data-line": "3", class: "myst-mermaid-figure" }, document.content, "needle");
  document.add("figure", { "data-line": "4", class: "myst-plantuml-figure" }, document.content, "needle");
  const properties = document.add("section", { "data-okf-properties": "", "data-line": "5" });
  document.add("td", {}, properties, "needle");
  comments.setThreads([1, 2, 3, 4, 5].map((line) => thread({
    id: `t${line}`, anchor: { line, endLine: line, quote: "needle", prefix: "", suffix: "" },
  })));
  assert.equal(marks(document).length, 0);
  assert.equal(pre.textContent, "needle");
  assert.equal(math.textContent, "needle");
  // The code block keeps its children: the badge sits after it.
  assert.equal(pre.childNodes.length, 1);
  assert.ok(badges(document).some((badge) => badge.previousSibling === pre));
});

test("T42: the block that covers the line is searched, not another with the same text", () => {
  const { document, comments } = setup();
  document.add("p", { "data-line": "1" }, document.content, "needle");
  const second = document.add("p", { "data-line": "3", "data-end-line": "4" }, document.content, "needle too");
  comments.setThreads([thread({ anchor: { line: 4, endLine: 4, quote: "needle", prefix: "", suffix: "" } })]);
  assert.equal(marks(document).length, 1);
  assert.equal(marks(document)[0].parentNode, second);
});

test("T42: re-applying is idempotent and survives replaced content", () => {
  const { document, comments } = setup();
  const paragraph = document.add("p", { "data-line": "1" }, document.content, "a needle b");
  document.add("p", { "data-line": "3" }, document.content, "none here");
  comments.setThreads([thread(), thread({ id: "t2", anchor: { line: 3, endLine: 3, quote: "absent", prefix: "", suffix: "" } })]);
  const shape = () => `${marks(document).length}/${badges(document).length}/${document.content.textContent}`;
  const first = shape();
  comments.apply();
  comments.apply();
  assert.equal(shape(), first);
  assert.equal(first, "1/1/a needle bnone here");
  assert.equal(paragraph.childNodes.length, 3);
  // A content patch replaces the nodes: apply puts the threads back.
  document.content.textContent = "";
  document.add("p", { "data-line": "1" }, document.content, "a needle b");
  assert.equal(marks(document).length, 0);
  comments.apply();
  assert.equal(marks(document).length, 1);
});

test("T42: blocks inside an open editor are left alone (O10)", () => {
  const { document, comments } = setup();
  const editing = document.add("p", { "data-line": "1", "data-sphinx-preview-editing": "true" }, document.content, "a needle");
  const editor = document.add("div", { "data-sphinx-preview-block-editor": "true" });
  document.add("textarea", {}, editor, "needle");
  comments.setThreads([thread()]);
  assert.equal(marks(document).length, 0);
  assert.equal(badges(document).length, 0);
  assert.equal(editing.textContent, "a needle");
});

test("T42: the popover shows author, date and bodies as text, never as HTML", () => {
  const { document, comments } = setup();
  document.add("p", { "data-line": "1" }, document.content, "a needle b");
  const hostile = "<img src=x onerror=alert(1)><b>bold</b>";
  comments.setThreads([thread({
    resolved: true,
    comments: [
      { id: "c1", author: "<script>x</script>", createdAt: "2026-10-21T10:00:00Z", body: hostile },
      { id: "c2", author: "Bob", createdAt: "not a date <i>", body: "second" },
    ],
  })]);
  const mark = marks(document)[0];
  assert.equal(mark.getAttribute("data-okf-comment-resolved"), "true");
  const calls = mark.fire("click");
  assert.equal(calls.prevented, 1);
  assert.equal(calls.stopped, 1, "the click never reaches the handlers that edit or reveal the block");
  const popover = document.querySelector("[data-okf-comment-popover]");
  assert.ok(popover);
  assert.match(popover.textContent, /Resolved/u);
  assert.ok(popover.textContent.includes(hostile));
  assert.ok(popover.textContent.includes("<script>x</script>"));
  assert.ok(popover.textContent.includes("not a date <i>"));
  const elements = popover.descendants().map((element) => element.tagName.toLowerCase());
  assert.ok(!elements.includes("img") && !elements.includes("script") && !elements.includes("b") && !elements.includes("i"),
    `unexpected elements: ${elements}`);
  // Clicking again closes it; Escape closes it too.
  mark.fire("click");
  assert.equal(document.querySelector("[data-okf-comment-popover]"), null);
  mark.fire("click");
  assert.ok(document.querySelector("[data-okf-comment-popover]"));
  document.fire("keydown", { key: "Escape", target: document });
  assert.equal(document.querySelector("[data-okf-comment-popover]"), null);
});

test("T42: hostile ids and malformed threads are tolerated", () => {
  const { document, comments } = setup();
  document.add("p", { "data-line": "1" }, document.content, "a needle b");
  comments.setThreads([null, 3, { id: 4 }, thread({ id: '"] , body {x' }), thread({ id: "t2", comments: "x" })]);
  assert.equal(marks(document).length, 1);
  assert.equal(comments.openThread('"] , body {x'), true);
  comments.setThreads("nope");
  assert.equal(marks(document).length, 0);
  assert.equal(document.querySelector("[data-okf-comment-popover]"), null);
});

test("T42 r2: included content and blocks under a skipped ancestor are never chosen", () => {
  const { document, comments } = setup();
  const included = document.add("div", { "data-line": "1", "data-sphinx-preview-included": "true" }, document.content);
  const inner = document.add("p", { "data-line": "1" }, included, "needle in the other file");
  const own = document.add("p", { "data-line": "1", "data-end-line": "5" }, document.content, "needle here");
  const figure = document.add("figure", { "data-line": "7", class: "myst-mermaid-figure" });
  const inFigure = document.add("p", { "data-line": "7" }, figure, "needle");
  comments.setThreads([
    thread(),
    thread({ id: "t2", anchor: { line: 7, endLine: 7, quote: "needle", prefix: "", suffix: "" } }),
  ]);
  assert.equal(marks(document).length, 1);
  assert.equal(marks(document)[0].parentNode, own, "the real block wins over the included one");
  assert.equal(inner.textContent, "needle in the other file");
  assert.equal(inFigure.textContent, "needle");
  assert.equal(badges(document).every((badge) => badge.parentNode !== inFigure && badge.parentNode !== included), true);
});

test("T42 r2: a quote at index 0 leaves no empty text node and clear restores the structure", () => {
  const { document, comments } = setup();
  const paragraph = document.add("p", { "data-line": "1" }, document.content, "needle and more");
  const em = document.add("em", {}, paragraph, "tail");
  const original = paragraph.childNodes.map((node) => (node as any).nodeValue ?? `<${(node as FakeElement).tagName}>`);
  comments.setThreads([thread()]);
  assert.ok(paragraph.childNodes.every((node) => !(node instanceof FakeText) || node.nodeValue !== ""), "no empty text node");
  assert.equal(paragraph.childNodes.length, 3);
  comments.setThreads([]);
  const restored = paragraph.childNodes.map((node) => (node as any).nodeValue ?? `<${(node as FakeElement).tagName}>`);
  assert.deepEqual(restored, original);
  assert.equal(paragraph.childNodes[1], em);
  // A mark in the middle also restores one text node.
  comments.setThreads([thread({ anchor: { line: 1, endLine: 1, quote: "and", prefix: "", suffix: "" } })]);
  comments.setThreads([]);
  assert.deepEqual(paragraph.childNodes.map((node) => (node as any).nodeValue ?? `<${(node as FakeElement).tagName}>`), original);
});

test("T42 r2: an open popover survives a re-apply while its thread exists", () => {
  const { document, comments } = setup();
  document.add("p", { "data-line": "1" }, document.content, "a needle b");
  comments.setThreads([thread()]);
  marks(document)[0].fire("click");
  assert.ok(document.querySelector("[data-okf-comment-popover]"));
  comments.setThreads([thread()]);
  comments.apply();
  assert.ok(document.querySelector("[data-okf-comment-popover]"), "same thread: still open");
  comments.setThreads([thread({ id: "other" })]);
  assert.equal(document.querySelector("[data-okf-comment-popover]"), null, "thread gone: closed");
});

test("T42 r2: Escape stops propagation only when it closed a popover", () => {
  const { document, comments } = setup();
  document.add("p", { "data-line": "1" }, document.content, "a needle b");
  comments.setThreads([thread()]);
  assert.equal(document.fire("keydown", { key: "Escape", target: document }).stopped, 0);
  marks(document)[0].fire("click");
  assert.equal(document.fire("keydown", { key: "Escape", target: document }).stopped, 1);
});
