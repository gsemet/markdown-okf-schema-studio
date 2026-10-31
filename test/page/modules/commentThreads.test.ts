import * as assert from "node:assert/strict";
import { test } from "node:test";

import { installCommentThreads } from "../../../src/page/modules/commentThreads";
import { provideGlobalElement } from "./fakeDom";

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
  get documentElement(): FakeElement { return this; }
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
  provideGlobalElement(FakeElement);
  const comments = installCommentThreads(document as never, window as never);
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

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-017
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

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-001
// @tests_req SwRS-MDOKFSTUDIO-REVIEW-021
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

function setupWithReply() {
  const document = new FakeDocument();
  const timers = new Map<number, () => void>();
  let nextTimer = 1;
  const window = {
    innerWidth: 800, innerHeight: 600,
    setTimeout: (callback: () => void) => { timers.set(nextTimer, callback); return nextTimer++; },
    clearTimeout: (id: number) => { timers.delete(id); },
  };
  const replies: Array<[string, string]> = [];
  const hooks = { reply: (threadId: string, body: string) => { replies.push([threadId, body]); } };
  provideGlobalElement(FakeElement);
  const comments = installCommentThreads(document as never, window as never, hooks as never);
  const fireTimers = () => { for (const [id, callback] of [...timers]) { timers.delete(id); callback(); } };
  return { document, comments, replies, fireTimers };
}

const popoverOf = (document: FakeDocument) => document.querySelector("[data-okf-comment-popover]")!;
const sendButton = (document: FakeDocument) =>
  popoverOf(document).querySelectorAll("button").find((candidate) => candidate.textContent === "Reply")!;

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-081
test("T43: the popover has a reply box that posts the thread id and the trimmed body", () => {
  const { document, comments, replies } = setupWithReply();
  document.add("p", { "data-line": "1" }, document.content, "a needle b");
  comments.setThreads([thread({ id: "<t&1>" })]);
  marks(document)[0].fire("click");
  const input = popoverOf(document).querySelector("textarea")!;
  assert.ok(input, "a reply box");
  document.fire("click", { target: sendButton(document) });
  assert.deepEqual(replies, [], "an empty reply is not sent");
  (input as any).value = "  Because it is.  ";
  document.fire("click", { target: sendButton(document) });
  assert.deepEqual(replies, [["<t&1>", "Because it is."]], "the id is sent as data, unchanged");
  assert.equal((input as any).value, "  Because it is.  ", "the text stays until the host answers");
  assert.equal(sendButton(document).getAttribute("disabled"), "true");
  document.fire("click", { target: sendButton(document) });
  assert.equal(replies.length, 1, "no second send while waiting");
  assert.equal(comments.result({ kind: "reply", threadId: "<t&1>", ok: true }), true);
  assert.equal((input as any).value, "", "ok empties the box");
  assert.equal(sendButton(document).hasAttribute("disabled"), false);
});

test("T43 r2: a refused reply keeps the text and shows the reason as text", () => {
  const { document, comments, replies } = setupWithReply();
  document.add("p", { "data-line": "1" }, document.content, "a needle b");
  comments.setThreads([thread()]);
  marks(document)[0].fire("click");
  const input = popoverOf(document).querySelector("textarea")!;
  (input as any).value = "Keep me";
  document.fire("click", { target: sendButton(document) });
  assert.equal(comments.result({ kind: "reply", threadId: "other", ok: true }), false, "another thread's answer is ignored");
  assert.equal(comments.result({ kind: "reply", threadId: "t1", ok: false, reason: "<i>unsaved changes</i>" }), true);
  assert.equal((input as any).value, "Keep me");
  const alert = popoverOf(document).querySelector("[data-okf-comment-error]")!;
  assert.equal(alert.getAttribute("role"), "alert");
  assert.equal(alert.textContent, "<i>unsaved changes</i>");
  assert.equal(alert.childNodes.length, 1);
  document.fire("click", { target: sendButton(document) });
  assert.equal(replies.length, 2, "the reply can be sent again");
});

test("T43 r2: no answer keeps the text, says so, and a late ok still empties the box", () => {
  const { document, comments, replies, fireTimers } = setupWithReply();
  document.add("p", { "data-line": "1" }, document.content, "a needle b");
  comments.setThreads([thread()]);
  marks(document)[0].fire("click");
  const input = popoverOf(document).querySelector("textarea")!;
  (input as any).value = "Slow";
  document.fire("click", { target: sendButton(document) });
  fireTimers();
  assert.equal((input as any).value, "Slow");
  assert.match(popoverOf(document).querySelector("[data-okf-comment-error]")!.textContent, /No answer/u);
  assert.equal(sendButton(document).hasAttribute("disabled"), false);
  assert.equal(replies.length, 1);
  comments.result({ kind: "reply", threadId: "t1", ok: true });
  assert.equal((input as any).value, "");
});

test("T43 r2: a reply draft survives the threads being posted again while the thread exists", () => {
  const { document, comments } = setupWithReply();
  document.add("p", { "data-line": "1" }, document.content, "a needle b");
  comments.setThreads([thread()]);
  marks(document)[0].fire("click");
  (popoverOf(document).querySelector("textarea") as any).value = "Half typed";
  comments.setThreads([thread({ resolved: true })]);
  assert.equal((popoverOf(document).querySelector("textarea") as any).value, "Half typed");
  comments.setThreads([thread({ id: "other" })]);
  assert.equal(document.querySelector("[data-okf-comment-popover]"), null, "thread gone: closed");
});

test("T43: Cmd/Ctrl+Enter sends a reply and keys typed in the reply box stay there", () => {
  const { document, comments, replies } = setupWithReply();
  document.add("p", { "data-line": "1" }, document.content, "a needle b");
  comments.setThreads([thread()]);
  marks(document)[0].fire("click");
  const input = popoverOf(document).querySelector("textarea")!;
  (input as any).value = "ok";
  const plain = document.fire("keydown", { key: "a", target: input });
  assert.equal(plain.stopped, 1, "other handlers do not see typing");
  document.fire("keydown", { key: "Enter", ctrlKey: true, target: input });
  assert.deepEqual(replies, [["t1", "ok"]]);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-001
test("T43: no reply box without a reply hook (read-only previews)", () => {
  const { document, comments } = setup();
  document.add("p", { "data-line": "1" }, document.content, "a needle b");
  comments.setThreads([thread()]);
  marks(document)[0].fire("click");
  const popover = document.querySelector("[data-okf-comment-popover]")!;
  assert.equal(popover.querySelector("textarea"), null);
  assert.equal(popover.querySelectorAll("button").length, 0);
});

test("T43: a reply over 10000 characters is cut by the box and refused by the page", () => {
  const { document, comments, replies } = setupWithReply();
  document.add("p", { "data-line": "1" }, document.content, "a needle b");
  comments.setThreads([thread()]);
  marks(document)[0].fire("click");
  const input = popoverOf(document).querySelector("textarea")!;
  assert.equal(input.getAttribute("maxlength"), "10000");
  (input as any).value = "x".repeat(10_001);
  document.fire("click", { target: sendButton(document) });
  assert.deepEqual(replies, []);
});

// ---- T44: resolve, delete, orphaned threads ----

function setupWithActions() {
  const document = new FakeDocument();
  const timers = new Map<number, () => void>();
  let nextTimer = 1;
  const window = {
    innerWidth: 800, innerHeight: 600,
    setTimeout: (callback: () => void) => { timers.set(nextTimer, callback); return nextTimer++; },
    clearTimeout: (id: number) => { timers.delete(id); },
  };
  const calls: Array<[string, ...unknown[]]> = [];
  const hooks = {
    reply: (threadId: string, body: string) => { calls.push(["reply", threadId, body]); },
    resolve: (threadId: string, resolved: boolean) => { calls.push(["resolve", threadId, resolved]); },
    remove: (threadId: string) => { calls.push(["delete", threadId]); },
  };
  provideGlobalElement(FakeElement);
  const comments = installCommentThreads(document as never, window as never, hooks as never);
  const fireTimers = () => { for (const [id, callback] of [...timers]) { timers.delete(id); callback(); } };
  return { document, comments, calls, fireTimers };
}

const press = (document: FakeDocument, selector: string) => {
  const target = document.querySelector(selector);
  assert.ok(target, `${selector} exists`);
  document.fire("click", { target });
};
const orphanBox = (document: FakeDocument) => document.querySelector("[data-okf-orphans]");
const orphanItems = (document: FakeDocument) => document.querySelectorAll("[data-okf-comment-orphan]");

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-086
test("T44: Resolve sends the flag, waits for ok, and the mark changes style after the re-post", () => {
  const { document, comments, calls } = setupWithActions();
  document.add("p", { "data-line": "1" }, document.content, "a needle b");
  comments.setThreads([thread()]);
  marks(document)[0].fire("click");
  const resolveButton = () => popoverOf(document).querySelector("[data-okf-comment-resolve]")!;
  assert.equal(resolveButton().textContent, "Resolve");
  press(document, "[data-okf-comment-resolve]");
  assert.deepEqual(calls, [["resolve", "t1", true]]);
  assert.equal(resolveButton().getAttribute("disabled"), "true", "no second send while waiting");
  assert.equal(marks(document)[0].hasAttribute("data-okf-comment-resolved"), false, "no success assumed before ok");
  assert.equal(comments.result({ kind: "resolve", threadId: "t1", ok: true }), true);
  comments.setThreads([thread({ resolved: true })]);
  assert.equal(marks(document)[0].getAttribute("data-okf-comment-resolved"), "true");
  assert.equal(resolveButton().textContent, "Reopen", "the open popover now offers Reopen");
  press(document, "[data-okf-comment-resolve]");
  assert.deepEqual(calls[1], ["resolve", "t1", false]);
});

test("T44: a refused resolve shows the reason as text in an alert and can be retried", () => {
  const { document, comments, calls, fireTimers } = setupWithActions();
  document.add("p", { "data-line": "1" }, document.content, "a needle b");
  comments.setThreads([thread()]);
  marks(document)[0].fire("click");
  press(document, "[data-okf-comment-resolve]");
  assert.equal(comments.result({ kind: "resolve", threadId: "other", ok: true }), false);
  assert.equal(comments.result({ kind: "resolve", threadId: "t1", ok: false, reason: "<b>no write</b>" }), true);
  const alert = popoverOf(document).querySelector("[data-okf-comment-action-error]")!;
  assert.equal(alert.getAttribute("role"), "alert");
  assert.equal(alert.textContent, "<b>no write</b>");
  assert.equal(alert.childNodes.length, 1);
  assert.equal(popoverOf(document).querySelector("[data-okf-comment-resolve]")!.hasAttribute("disabled"), false);
  press(document, "[data-okf-comment-resolve]");
  assert.equal(calls.length, 2);
  assert.equal(popoverOf(document).querySelector("[data-okf-comment-action-error]"), null, "the error goes while retrying");
  fireTimers();
  assert.match(popoverOf(document).querySelector("[data-okf-comment-action-error]")!.textContent, /No answer/u);
  assert.equal(popoverOf(document).querySelector("[data-okf-comment-resolve]")!.hasAttribute("disabled"), false);
});

test("T44: Delete asks inside the popover first; No cancels, Yes sends and waits for ok", () => {
  const { document, comments, calls } = setupWithActions();
  document.add("p", { "data-line": "1" }, document.content, "a needle b");
  comments.setThreads([thread()]);
  marks(document)[0].fire("click");
  press(document, "[data-okf-comment-delete]");
  assert.deepEqual(calls, [], "the first press only asks");
  const confirm = popoverOf(document).querySelector("[data-okf-comment-confirm]")!;
  assert.match(confirm.textContent, /Delete thread\?/u);
  assert.equal(popoverOf(document).querySelector("[data-okf-comment-delete]"), null, "Delete is replaced by the question");
  press(document, "[data-okf-comment-delete-no]");
  assert.equal(popoverOf(document).querySelector("[data-okf-comment-confirm]"), null);
  assert.ok(popoverOf(document).querySelector("[data-okf-comment-delete]"));
  assert.deepEqual(calls, []);
  press(document, "[data-okf-comment-delete]");
  press(document, "[data-okf-comment-delete-yes]");
  assert.deepEqual(calls, [["delete", "t1"]]);
  assert.equal(marks(document).length, 1, "the thread stays until the host re-posts the list");
  press(document, "[data-okf-comment-delete-yes]");
  assert.equal(calls.length, 1, "no second send while waiting");
  comments.result({ kind: "delete", threadId: "t1", ok: true });
  comments.setThreads([]);
  assert.equal(marks(document).length, 0);
  assert.equal(document.querySelector("[data-okf-comment-popover]"), null);
});

test("T44: a refused delete keeps the thread, shows the reason and returns to the buttons", () => {
  const { document, comments } = setupWithActions();
  document.add("p", { "data-line": "1" }, document.content, "a needle b");
  comments.setThreads([thread()]);
  marks(document)[0].fire("click");
  press(document, "[data-okf-comment-delete]");
  press(document, "[data-okf-comment-delete-yes]");
  comments.result({ kind: "delete", threadId: "t1", ok: false, reason: "the comments file is read-only" });
  assert.equal(popoverOf(document).querySelector("[data-okf-comment-action-error]")!.textContent, "the comments file is read-only");
  assert.ok(popoverOf(document).querySelector("[data-okf-comment-delete]"), "Delete is offered again");
  assert.equal(popoverOf(document).querySelector("[data-okf-comment-confirm]"), null);
  assert.equal(marks(document).length, 1);
});

test("T44: the pending question survives the threads being posted again", () => {
  const { document, comments } = setupWithActions();
  document.add("p", { "data-line": "1" }, document.content, "a needle b");
  comments.setThreads([thread()]);
  marks(document)[0].fire("click");
  press(document, "[data-okf-comment-delete]");
  comments.setThreads([thread()]);
  assert.ok(popoverOf(document).querySelector("[data-okf-comment-confirm]"));
});

test("T44: Escape closes the popover and forgets the question", () => {
  const { document, comments } = setupWithActions();
  document.add("p", { "data-line": "1" }, document.content, "a needle b");
  comments.setThreads([thread()]);
  marks(document)[0].fire("click");
  press(document, "[data-okf-comment-delete]");
  document.fire("keydown", { key: "Escape" });
  marks(document)[0].fire("click");
  assert.equal(popoverOf(document).querySelector("[data-okf-comment-confirm]"), null);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-081
test("CR 174: the trace names what closed an open popover, and a re-apply that keeps it is silent", () => {
  const document = new FakeDocument();
  provideGlobalElement(FakeElement);
  const traced: Array<[string, string]> = [];
  const comments = installCommentThreads(document as never, { innerWidth: 800, innerHeight: 600 } as never,
    undefined, (event, detail) => { traced.push([event, detail]); });
  const paragraph = document.add("p", { "data-line": "1" }, document.content, "a needle b");
  comments.setThreads([thread()]);
  marks(document)[0].fire("click");
  comments.setThreads([thread({ resolved: true })]);
  assert.ok(popoverOf(document), "the popover stays open across a re-apply");
  assert.deepEqual(traced, [], "nothing closed it");
  comments.setThreads([]);
  assert.equal(document.querySelector("[data-okf-comment-popover]"), null);
  comments.setThreads([thread()]);
  marks(document)[0].fire("click");
  comments.setThreads([thread({ id: "t2" })]);
  marks(document)[0].fire("click");
  paragraph.fire("pointerdown");
  marks(document)[0].fire("click");
  document.fire("keydown", { key: "Escape" });
  assert.deepEqual(traced, [
    ["comment popover closed", "re-apply without threads, thread t1"],
    ["comment popover closed", "re-apply without the thread, thread t1, 1 thread(s)"],
    ["comment popover closed", "pointerdown outside on p, thread t2"],
    ["comment popover closed", "Escape, thread t2"],
  ]);
  marks(document)[0].fire("click");
  marks(document)[0].fire("click");
  comments.close();
  assert.deepEqual(traced.slice(4), [["comment popover closed", "toggled, thread t2"]], "a closed popover records nothing");
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-081
test("CR 186: the popover stays open through a reply and a resolve in the host's order, with no close traced", () => {
  // The review-threads stress scenario: the host posts the threads, then its answer; a content
  // update re-applies the threads in between. On the same page nothing here closes the popover.
  const document = new FakeDocument();
  provideGlobalElement(FakeElement);
  const traced: Array<[string, string]> = [];
  const calls: unknown[][] = [];
  const window = { innerWidth: 800, innerHeight: 600, setTimeout: () => 1, clearTimeout: () => undefined };
  const comments = installCommentThreads(document as never, window as never, {
    reply: (threadId: string, body: string) => { calls.push(["reply", threadId, body]); },
    resolve: (threadId: string, resolved: boolean) => { calls.push(["resolve", threadId, resolved]); },
  } as never, (event, detail) => { traced.push([event, detail]); });
  document.add("p", { "data-line": "1" }, document.content, "a needle b");
  comments.setThreads([thread()]);
  marks(document)[0].fire("click");
  (popoverOf(document).querySelector("textarea") as any).value = "Added.";
  press(document, "[data-okf-comment-reply-send]");
  const second = { id: "c2", author: "Ada", createdAt: "2026-10-21T11:00:00Z", body: "Added." };
  const replied = thread({ comments: [...thread().comments, second] });
  comments.setThreads([replied]);
  const resolveButton = () => popoverOf(document).querySelector("[data-okf-comment-resolve]")!;
  assert.equal(resolveButton().getAttribute("disabled"), "true", "Resolve waits for the reply's answer");
  comments.result({ kind: "reply", threadId: "t1", ok: true });
  assert.equal(resolveButton().hasAttribute("disabled"), false);
  press(document, "[data-okf-comment-resolve]");
  comments.apply();
  comments.setThreads([{ ...replied, resolved: true }]);
  comments.apply();
  comments.result({ kind: "resolve", threadId: "t1", ok: true });
  assert.deepEqual(calls, [["reply", "t1", "Added."], ["resolve", "t1", true]]);
  assert.equal(popoverOf(document).querySelectorAll("[data-okf-comment-entry]").length, 2);
  assert.equal(resolveButton().textContent, "Reopen");
  assert.equal(resolveButton().hasAttribute("disabled"), false);
  assert.deepEqual(traced, [], "no close on the way");
});

test("T44: without resolve and delete hooks (read-only) the popover has neither button", () => {
  const { document, comments } = setup();
  document.add("p", { "data-line": "1" }, document.content, "a needle b");
  comments.setThreads([thread()]);
  marks(document)[0].fire("click");
  assert.equal(popoverOf(document).querySelector("[data-okf-comment-resolve]"), null);
  assert.equal(popoverOf(document).querySelector("[data-okf-comment-delete]"), null);
  const reply = setupWithReply();
  reply.document.add("p", { "data-line": "1" }, reply.document.content, "a needle b");
  reply.comments.setThreads([thread()]);
  marks(reply.document)[0].fire("click");
  assert.equal(popoverOf(reply.document).querySelector("[data-okf-comment-resolve]"), null, "hooks decide, not the reply hook");
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-028
test("T44: a thread with no block at its line and no quote anywhere goes to the Orphaned comments box", () => {
  const { document, comments } = setup();
  document.add("p", { "data-line": "1" }, document.content, "plain text");
  comments.setThreads([
    thread({ id: "gone", anchor: { line: 40, endLine: 40, quote: "<i>vanished</i>", prefix: "", suffix: "" } }),
    thread({ id: "kept", anchor: { line: 1, endLine: 1, quote: "plain", prefix: "", suffix: "" } }),
  ]);
  const box = orphanBox(document)!;
  assert.ok(box, "the box exists");
  assert.match(box.textContent, /Orphaned comments/u);
  const items = orphanItems(document);
  assert.deepEqual(items.map((item) => item.getAttribute("data-okf-comment-orphan")), ["gone"]);
  assert.match(items[0].textContent, /<i>vanished<\/i>/u, "the quote is shown as text");
  assert.equal(items[0].querySelector("i"), null);
  assert.equal(marks(document).length, 1, "the placed thread is not orphaned");
  assert.equal(badges(document).length, 0);
});

test("T44: the box lives outside the content, after it, and is re-created after content is replaced", () => {
  const { document, comments } = setup();
  document.add("p", { "data-line": "1" }, document.content, "plain");
  comments.setThreads([thread({ id: "gone", anchor: { line: 9, endLine: 9, quote: "lost", prefix: "", suffix: "" } })]);
  const box = orphanBox(document)!;
  assert.equal(box.closest("main"), null, "not inside the patched content");
  assert.equal(box.parentNode, document.body);
  assert.equal(document.body.childNodes.indexOf(box), document.body.childNodes.indexOf(document.content) + 1, "right after the content");
  // A patch replaces the content children and may drop anything else; apply() rebuilds the box.
  document.content.textContent = "";
  document.body.removeChild(box);
  document.add("p", { "data-line": "1" }, document.content, "new text");
  comments.apply();
  assert.equal(document.querySelectorAll("[data-okf-orphans]").length, 1);
  comments.apply();
  assert.equal(document.querySelectorAll("[data-okf-orphans]").length, 1, "no duplicate box");
  assert.equal(document.content.querySelectorAll("[data-okf-orphans]").length, 0);
});

const movedThread = (quote: string) => thread({ anchor: { line: 1, endLine: 1, quote, prefix: "", suffix: "" } });

test("T44 r2: a long quote that occurs once elsewhere is placed, not orphaned", () => {
  const { document, comments } = setup();
  document.add("p", { "data-line": "3", "data-end-line": "3" }, document.content, "move along, the unique needle phrase here");
  comments.setThreads([movedThread("unique needle phrase")]);
  assert.equal(marks(document).length, 1);
  assert.equal(marks(document)[0].textContent, "unique needle phrase");
  assert.equal(orphanBox(document), null, "no box when nothing is orphaned");
});

test("T44 r2: a quote repeated elsewhere is orphaned, not marked on the first copy", () => {
  const { document, comments } = setup();
  document.add("p", { "data-line": "3", "data-end-line": "3" }, document.content, "a repeated phrase here");
  document.add("p", { "data-line": "5", "data-end-line": "5" }, document.content, "again a repeated phrase there");
  comments.setThreads([movedThread("repeated phrase")]);
  assert.equal(marks(document).length, 0);
  assert.equal(orphanItems(document).length, 1);
  assert.equal(document.content.querySelectorAll("mark").length, 0);
});

test("T44 r2: a short quote is orphaned even when it occurs once elsewhere", () => {
  const { document, comments } = setup();
  document.add("p", { "data-line": "3", "data-end-line": "3" }, document.content, "move along, needle here");
  comments.setThreads([movedThread("needle")]);
  assert.equal(marks(document).length, 0);
  assert.equal(orphanItems(document).length, 1);
});

test("T44 r2: a pending reply disables Resolve and Delete, and a pending resolve disables Reply", () => {
  const { document, comments, calls } = setupWithActions();
  document.add("p", { "data-line": "1" }, document.content, "a needle b");
  comments.setThreads([thread()]);
  marks(document)[0].fire("click");
  (popoverOf(document).querySelector("textarea") as any).value = "Typed";
  document.fire("click", { target: sendButton(document) });
  assert.deepEqual(calls, [["reply", "t1", "Typed"]]);
  assert.equal(popoverOf(document).querySelector("[data-okf-comment-resolve]")!.getAttribute("disabled"), "true");
  assert.equal(popoverOf(document).querySelector("[data-okf-comment-delete]")!.getAttribute("disabled"), "true");
  press(document, "[data-okf-comment-resolve]");
  press(document, "[data-okf-comment-delete]");
  assert.equal(calls.length, 1, "nothing else is sent while the reply is in flight");
  assert.equal(popoverOf(document).querySelector("[data-okf-comment-confirm]"), null);
  comments.result({ kind: "reply", threadId: "t1", ok: true });
  assert.equal(popoverOf(document).querySelector("[data-okf-comment-resolve]")!.hasAttribute("disabled"), false);
  press(document, "[data-okf-comment-resolve]");
  (popoverOf(document).querySelector("textarea") as any).value = "Second";
  assert.equal(sendButton(document).getAttribute("disabled"), "true");
  document.fire("click", { target: sendButton(document) });
  assert.equal(calls.length, 2, "no reply while a resolve is in flight");
});

test("T44: the box goes away when the orphan is resolved away, and its entries open the popover", () => {
  const { document, comments, calls } = setupWithActions();
  document.add("p", { "data-line": "1" }, document.content, "text");
  comments.setThreads([thread({ id: "gone", resolved: true, anchor: { line: 9, endLine: 9, quote: "lost", prefix: "", suffix: "" } })]);
  const item = orphanItems(document)[0];
  assert.equal(item.getAttribute("data-okf-comment-resolved"), "true", "resolved orphans are styled");
  item.fire("click");
  assert.ok(popoverOf(document), "an orphan opens the popover (resolve and delete stay possible)");
  press(document, "[data-okf-comment-resolve]");
  assert.deepEqual(calls, [["resolve", "gone", false]]);
  comments.setThreads([]);
  assert.equal(orphanBox(document), null);
  assert.equal(document.querySelector("[data-okf-comment-popover]"), null);
});

test("T44: orphans are never reported to the host as changes (the page only displays them)", () => {
  const { document, comments, calls } = setupWithActions();
  comments.setThreads([thread({ anchor: { line: 7, endLine: 7, quote: "lost", prefix: "", suffix: "" } })]);
  comments.apply();
  assert.deepEqual(calls, []);
});

// ---- T45: the page trusts the host's re-anchoring verdict ----

test("T45: orphaned true goes to the box even when the quote is on the page", () => {
  const { document, comments } = setup();
  document.add("p", { "data-line": "1" }, document.content, "a needle b");
  comments.setThreads([{ ...thread(), orphaned: true }]);
  assert.equal(marks(document).length, 0);
  assert.equal(badges(document).length, 0);
  assert.deepEqual(orphanItems(document).map((item) => item.getAttribute("data-okf-comment-orphan")), ["t1"]);
});

test("T45: orphaned false trusts the host lines and does not search the quote elsewhere", () => {
  const { document, comments } = setup();
  document.add("p", { "data-line": "1" }, document.content, "a long unique needle phrase here");
  const moved = { anchor: { line: 40, endLine: 40, quote: "long unique needle phrase", prefix: "", suffix: "" } };
  comments.setThreads([{ ...thread(moved), orphaned: false }]);
  assert.equal(marks(document).length, 0, "no placement by the page quote search");
  assert.equal(orphanItems(document).length, 1);
  // Without the verdict the T44 fallback still places a long unique quote.
  comments.setThreads([thread(moved)]);
  assert.equal(marks(document).length, 1);
});

test("T45: orphaned false with a block at the line places the thread as before", () => {
  const { document, comments } = setup();
  document.add("p", { "data-line": "1" }, document.content, "a needle b");
  comments.setThreads([{ ...thread(), orphaned: false }]);
  assert.equal(marks(document).length, 1);
  assert.equal(orphanItems(document).length, 0);
});

// Comments hidden by the toolbar Comments button or by the preview.showComments setting.
const HIDDEN_BY = [["data-sphinx-preview-comments", "off", "on"], ["data-okf-show-comments", "false", "true"]] as const;

/** A highlight, a badge (quote across an element boundary) and an orphan entry. */
function setupAllMarks() {
  const { document, comments } = setup();
  document.add("p", { "data-line": "1" }, document.content, "a needle b");
  const split = document.add("p", { "data-line": "2" }, document.content, "a nee");
  document.add("em", {}, split, "dle b");
  comments.setThreads([
    thread({ id: "mark" }),
    thread({ id: "badge", anchor: { line: 2, endLine: 2, quote: "needle", prefix: "", suffix: "" } }),
    thread({ id: "orphan", anchor: { line: 40, endLine: 40, quote: "gone", prefix: "", suffix: "" } }),
  ]);
  const holders = [marks(document)[0], badges(document)[0], orphanItems(document)[0]];
  assert.equal(holders.filter(Boolean).length, 3, "a highlight, a badge and an orphan entry");
  return { document, comments, holders };
}

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-152
// @tests_req SwRS-MDOKFSTUDIO-REVIEW-021
test("comments hidden: a click, Enter or Space on a highlight, badge or orphan entry opens nothing and is not swallowed", () => {
  for (const [name, off] of HIDDEN_BY) {
    const { document, comments, holders } = setupAllMarks();
    document.setAttribute(name, off);
    comments.visibilityChanged();
    for (const holder of holders) {
      const label = `${name}=${off}, ${holder.tagName} ${holder.attrs.keys().next().value}`;
      for (const [type, event] of [["click", {}], ["dblclick", {}], ["keydown", { key: "Enter" }], ["keydown", { key: " " }]] as const) {
        const calls = holder.fire(type, event);
        assert.deepEqual(calls, { prevented: 0, stopped: 0 }, `${label}: ${type} ${JSON.stringify(event)} reaches the other handlers`);
        assert.equal(document.querySelector("[data-okf-comment-popover]"), null, `${label}: ${type} opens no popover`);
      }
    }
    assert.equal(comments.openThread("mark"), false, `${name}=${off}: the page opens no thread either`);
    assert.equal(document.querySelector("[data-okf-comment-popover]"), null);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-152
test("comments hidden: highlights leave the Tab order and come back when comments are shown", () => {
  const focusable = (mark: FakeElement) => ["tabindex", "role", "aria-haspopup"].map((name) => mark.getAttribute(name));
  for (const [name, off, on] of HIDDEN_BY) {
    const { document, comments } = setupAllMarks();
    assert.deepEqual(focusable(marks(document)[0]), ["0", "button", "dialog"]);
    document.setAttribute(name, off);
    comments.visibilityChanged();
    assert.deepEqual(focusable(marks(document)[0]), [null, null, null], `${name}=${off}: the highlight is plain text`);
    // Threads posted again while hidden (a new thread, a render) stay out of the Tab order.
    comments.apply();
    assert.deepEqual(focusable(marks(document)[0]), [null, null, null], `${name}=${off}: still plain text after a re-apply`);
    document.setAttribute(name, on);
    comments.visibilityChanged();
    assert.deepEqual(focusable(marks(document)[0]), ["0", "button", "dialog"], `${name}=${on}: back in the Tab order`);
    const calls = marks(document)[0].fire("click");
    assert.deepEqual(calls, { prevented: 1, stopped: 1 });
    assert.ok(document.querySelector("[data-okf-comment-popover]"), "a shown highlight opens its popover again");
  }
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-152
test("comments hidden: an open popover closes and does not come back with the threads or with Show", () => {
  for (const [name, off, on] of HIDDEN_BY) {
    const { document, comments } = setupAllMarks();
    marks(document)[0].fire("click");
    assert.ok(document.querySelector("[data-okf-comment-popover]"));
    document.setAttribute(name, off);
    comments.visibilityChanged();
    assert.equal(document.querySelector("[data-okf-comment-popover]"), null, `${name}=${off}: the popover closed`);
    comments.apply();
    assert.equal(document.querySelector("[data-okf-comment-popover]"), null, `${name}=${off}: not reopened by a re-apply`);
    document.setAttribute(name, on);
    comments.visibilityChanged();
    assert.equal(document.querySelector("[data-okf-comment-popover]"), null, `${name}=${on}: Show opens nothing by itself`);
  }
});
