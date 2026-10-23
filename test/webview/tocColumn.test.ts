import * as assert from "node:assert/strict";
import { test } from "node:test";

import { installTocColumn } from "../../src/webview/tocColumn";

type Handler = (event: any) => void;

class FakeElement {
  attrs = new Map<string, string>();
  listeners = new Map<string, Handler[]>();
  styles = new Map<string, string>();
  children: FakeElement[] = [];
  parent: FakeElement | undefined;
  ownText: string | null = null;
  rect = { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
  constructor(public tagName: string, public classes: string[] = []) {}
  get textContent(): string {
    return this.ownText ?? this.children.map((child) => child.textContent).join("");
  }
  set textContent(value: string) { this.ownText = value; this.children = []; }
  get style() {
    return { setProperty: (name: string, value: string) => this.styles.set(name, value) };
  }
  setAttribute(name: string, value: string) { this.attrs.set(name, value); }
  getAttribute(name: string) { return this.attrs.get(name) ?? null; }
  removeAttribute(name: string) { this.attrs.delete(name); }
  hasAttribute(name: string) { return this.attrs.has(name); }
  addEventListener(type: string, handler: Handler) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), handler]);
  }
  appendChild<T extends FakeElement>(child: T): T { child.parent = this; this.children.push(child); return child; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((c) => c !== this); this.parent = undefined; }
  getBoundingClientRect() { return this.rect; }
  matches(token: string): boolean {
    if (token.startsWith(".")) return this.classes.includes(token.slice(1));
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
  all(selector: string): FakeElement[] {
    const tokens = selector.split(",").map((token) => token.trim());
    return this.children.flatMap((child) => [
      ...(tokens.some((token) => child.matches(token)) ? [child] : []),
      ...child.all(selector),
    ]);
  }
  cloneNode(deep: boolean): FakeElement {
    const copy = new FakeElement(this.tagName, [...this.classes]);
    copy.ownText = this.ownText;
    if (deep) for (const child of this.children) copy.appendChild(child.cloneNode(true));
    return copy;
  }
  querySelectorAll(selector: string) { return this.all(selector); }
  querySelector(selector: string) { return this.all(selector)[0] ?? null; }
  fire(type: string) {
    const calls = { prevented: 0 };
    for (const handler of this.listeners.get(type) ?? []) handler({ preventDefault: () => calls.prevented++ });
    return calls;
  }
}

function heading(tag: string, text: string, ...extra: FakeElement[]): FakeElement {
  const element = new FakeElement(tag);
  element.ownText = null;
  const label = new FakeElement("span");
  label.ownText = text;
  element.appendChild(label);
  for (const child of extra) element.appendChild(child);
  return element;
}

function setup(options: { toc?: boolean; saved?: { viewToc?: boolean }; frames?: boolean } = {}) {
  const content = new FakeElement("div");
  content.attrs.set("id", "sphinx-myst-preview-content");
  const body = new FakeElement("body");
  const root = new FakeElement("html");
  const button = new FakeElement("button");
  button.attrs.set("aria-pressed", "false");
  const toolbar = new FakeElement("div");
  toolbar.rect = { top: 12, left: 0, right: 0, bottom: 84, width: 0, height: 72 };
  const posted: any[] = [];
  let state: Record<string, unknown> | undefined = options.saved;
  const frames: Array<() => void> = [];
  const document = {
    body,
    documentElement: root,
    createElement: (tag: string) => new FakeElement(tag),
    getElementById: (id: string) => (id === "sphinx-myst-preview-content" ? content : null),
    querySelector: (selector: string) => (
      selector === "[data-sphinx-preview-toc-toggle]" ? button
        : selector === "[data-sphinx-preview-toolbar]" ? toolbar
          : null
    ),
  };
  const windowListeners = new Map<string, Handler[]>();
  const window = {
    scrollY: 0,
    addEventListener: (type: string, handler: Handler) => {
      windowListeners.set(type, [...(windowListeners.get(type) ?? []), handler]);
    },
    requestAnimationFrame: (callback: () => void) => { frames.push(callback); return frames.length; },
  };
  const scrolled: FakeElement[] = [];
  let changes = 0;
  const toc = installTocColumn(
    document as never,
    window as never,
    {
      postMessage: (message: unknown) => posted.push(message),
      getState: () => state,
      setState: (next: unknown) => { state = next as Record<string, unknown>; },
    },
    { documentId: "doc", revision: 1, requestId: 2, initialViewPreferences: { toc: options.toc } },
    (target) => scrolled.push(target as never),
    () => { changes += 1; },
    () => 40,
  );
  const flush = () => { while (frames.length) frames.shift()!(); };
  const nav = () => body.children.find((child) => child.attrs.has("data-sphinx-preview-toc"))!;
  const entries = () => nav().all("button").filter((entry) => !entry.attrs.has("data-sphinx-preview-toc-twisty"));
  const twisties = () => nav().all("button").filter((entry) => entry.attrs.has("data-sphinx-preview-toc-twisty"));
  return { toc, window, twisties, content, body, root, button, posted, scrolled, flush, nav, entries, getState: () => state, changes: () => changes, frames };
}

test("the TOC is off by default and the page is marked closed", () => {
  const { root, button, nav } = setup();
  assert.equal(root.getAttribute("data-sphinx-preview-toc"), "closed");
  assert.equal(button.getAttribute("aria-pressed"), "false");
  assert.equal(nav().getAttribute("aria-label"), "Table of contents");
});

test("the workspace preference opens the TOC and the saved webview state wins", () => {
  assert.equal(setup({ toc: true }).root.getAttribute("data-sphinx-preview-toc"), "open");
  assert.equal(setup({ toc: true, saved: { viewToc: false } }).root.getAttribute("data-sphinx-preview-toc"), "closed");
});

test("the entries list h1 to h4 with their level and without the permalink glyph", () => {
  const { content, toc, flush, entries } = setup({ toc: true });
  const permalink = new FakeElement("a", ["headerlink"]);
  permalink.ownText = "¶";
  content.appendChild(heading("h1", "Title", permalink));
  content.appendChild(heading("h2", "Part"));
  content.appendChild(heading("h4", "Deep"));
  content.appendChild(heading("h5", "Too deep"));
  content.appendChild(heading("h3", "Section"));
  toc.refresh();
  flush();
  assert.deepEqual(entries().map((entry) => entry.textContent), ["Title", "Part", "Deep", "Section"]);
  assert.deepEqual(
    entries().map((entry) => entry.parent!.getAttribute("data-level")),
    ["1", "2", "4", "3"],
  );
});

test("headings in properties, admonitions, block editors and the sticky band are left out", () => {
  const { content, toc, flush, entries } = setup({ toc: true });
  const properties = new FakeElement("div");
  properties.attrs.set("data-okf-properties", "");
  properties.appendChild(heading("h2", "In properties"));
  const note = new FakeElement("div", ["admonition"]);
  note.appendChild(heading("h2", "In note"));
  const editor = new FakeElement("div");
  editor.attrs.set("data-sphinx-preview-block-editor", "");
  editor.appendChild(heading("h2", "In editor"));
  content.appendChild(properties);
  content.appendChild(note);
  content.appendChild(editor);
  content.appendChild(heading("h2", "Kept"));
  toc.refresh();
  flush();
  assert.deepEqual(entries().map((entry) => entry.textContent), ["Kept"]);
});

test("an empty document shows No headings", () => {
  const { toc, flush, nav, entries } = setup({ toc: true });
  toc.refresh();
  flush();
  assert.equal(entries().length, 0);
  assert.match(nav().textContent, /No headings/u);
});

test("the TOC is rebuilt after the content is replaced, once per frame", () => {
  const { content, toc, flush, entries, frames } = setup({ toc: true });
  content.appendChild(heading("h1", "Old"));
  toc.refresh();
  flush();
  assert.deepEqual(entries().map((entry) => entry.textContent), ["Old"]);
  content.children = [heading("h1", "New one"), heading("h2", "New two")];
  toc.refresh();
  toc.refresh();
  toc.refresh();
  assert.equal(frames.length, 1);
  flush();
  assert.deepEqual(entries().map((entry) => entry.textContent), ["New one", "New two"]);
});

test("clicking an entry scrolls to its heading and does not navigate", () => {
  const { content, toc, flush, entries, scrolled } = setup({ toc: true });
  const first = content.appendChild(heading("h1", "One"));
  const second = content.appendChild(heading("h2", "Two"));
  toc.refresh();
  flush();
  const calls = entries()[1].fire("click");
  assert.deepEqual(scrolled, [second]);
  assert.equal(calls.prevented, 1);
  entries()[0].fire("click");
  assert.equal(scrolled[1], first);
});

test("the toggle opens the TOC, posts the preference, remembers it and builds the entries", () => {
  const { content, button, root, posted, flush, entries, getState, changes } = setup();
  content.appendChild(heading("h1", "Title"));
  button.fire("click");
  flush();
  assert.equal(root.getAttribute("data-sphinx-preview-toc"), "open");
  assert.equal(button.getAttribute("aria-pressed"), "true");
  assert.deepEqual(entries().map((entry) => entry.textContent), ["Title"]);
  assert.deepEqual(posted, [{
    type: "previewViewPreferenceChanged",
    documentId: "doc",
    revision: 1,
    requestId: 2,
    preference: "toc",
    value: true,
  }]);
  assert.equal((getState() as { viewToc?: boolean }).viewToc, true);
  assert.equal(changes(), 1);
  button.fire("click");
  assert.equal(root.getAttribute("data-sphinx-preview-toc"), "closed");
  assert.equal(posted[1].value, false);
});

test("the column starts 8 px below the toolbar", () => {
  const { nav } = setup({ toc: true });
  assert.equal(nav().styles.get("--sphinx-preview-toc-top"), "92px");
});

function outline(content: FakeElement) {
  const tops: Array<[string, string, number]> = [
    ["h1", "Intro", 0], ["h2", "Setup", 300], ["h3", "Install", 500], ["h2", "Usage", 900], ["h1", "End", 1400],
  ];
  return tops.map(([tag, text, top]) => {
    const element = content.appendChild(heading(tag, text));
    element.rect = { ...element.rect, top, height: 30 };
    return element;
  });
}
const hiddenOf = (entry: FakeElement) => entry.parent!.hasAttribute("hidden");

test("only parent entries get a twisty with aria-expanded", () => {
  const { content, toc, flush, twisties } = setup({ toc: true });
  outline(content);
  toc.refresh();
  flush();
  assert.equal(twisties().length, 2);
  assert.deepEqual(twisties().map((twisty) => twisty.getAttribute("aria-expanded")), ["true", "true"]);
});

test("collapsing a parent hides its descendants, and a rebuild keeps it collapsed", () => {
  const { content, toc, flush, twisties, entries, getState } = setup({ toc: true });
  outline(content);
  toc.refresh();
  flush();
  twisties()[0].fire("click");
  assert.equal(twisties()[0].getAttribute("aria-expanded"), "false");
  assert.deepEqual(entries().map(hiddenOf), [false, true, true, true, false]);
  assert.equal((getState() as { tocCollapsed?: string[] }).tocCollapsed?.length, 1);
  content.children = [];
  outline(content);
  toc.refresh();
  flush();
  assert.deepEqual(entries().map(hiddenOf), [false, true, true, true, false]);
  assert.equal(twisties()[0].getAttribute("aria-expanded"), "false");
  twisties()[0].fire("click");
  assert.deepEqual(entries().map(hiddenOf), [false, false, false, false, false]);
});

test("collapsing a middle parent hides only its own subtree", () => {
  const { content, toc, flush, twisties, entries } = setup({ toc: true });
  outline(content);
  toc.refresh();
  flush();
  twisties()[1].fire("click");
  assert.deepEqual(entries().map(hiddenOf), [false, false, true, false, false]);
});

test("the current entry follows the reading line and is marked aria-current", () => {
  const { content, toc, window, flush, entries } = setup({ toc: true });
  outline(content);
  toc.refresh();
  flush();
  const current = () => entries().map((entry) => entry.getAttribute("aria-current"));
  assert.deepEqual(current(), ["location", null, null, null, null]);
  window.scrollY = 700; // reading line at 740: after Install (500), before Usage (900)
  toc.track();
  assert.deepEqual(current(), [null, null, "location", null, null]);
  assert.equal(entries()[2].parent!.hasAttribute("data-sphinx-preview-toc-current"), true);
  assert.equal(entries()[0].parent!.hasAttribute("data-sphinx-preview-toc-current"), false);
  window.scrollY = 1500;
  toc.track();
  assert.deepEqual(current(), [null, null, null, null, "location"]);
});

test("a collapsed parent carries the highlight of a hidden current section", () => {
  const { content, toc, window, flush, entries, twisties } = setup({ toc: true });
  outline(content);
  toc.refresh();
  flush();
  window.scrollY = 700;
  toc.track();
  twisties()[0].fire("click");
  assert.deepEqual(entries().map((entry) => entry.getAttribute("aria-current")), ["location", null, null, null, null]);
  twisties()[0].fire("click");
  assert.equal(entries()[2].getAttribute("aria-current"), "location");
});

test("the scroll tracking reads no layout: tops are cached until remeasure", () => {
  const { content, toc, window, flush, entries } = setup({ toc: true });
  const headings = outline(content);
  toc.refresh();
  flush();
  let reads = 0;
  for (const element of headings) {
    const original = element.getBoundingClientRect.bind(element);
    element.getBoundingClientRect = () => { reads += 1; return original(); };
  }
  window.scrollY = 700;
  toc.track();
  toc.track();
  assert.equal(reads, 0);
  // Zoom or width mode moved Usage up to 600; rects are viewport-relative at scrollY 700.
  const moved = [0, 300, 500, 600, 1400];
  headings.forEach((element, index) => { element.rect = { ...element.rect, top: moved[index] - 700 }; });
  toc.track();
  assert.equal(entries()[2].getAttribute("aria-current"), "location");
  toc.remeasure();
  assert.equal(reads, headings.length);
  assert.equal(entries()[3].getAttribute("aria-current"), "location");
});

test("the TOC scrolls itself, not the page, to keep the current entry visible", () => {
  const { content, toc, window, flush, nav, entries } = setup({ toc: true });
  outline(content);
  toc.refresh();
  flush();
  nav().rect = { top: 0, left: 0, right: 240, bottom: 200, width: 240, height: 200 };
  (nav() as any).scrollTop = 0;
  entries()[4].parent!.rect = { top: 260, left: 0, right: 240, bottom: 290, width: 240, height: 30 };
  window.scrollY = 1500;
  toc.track();
  assert.equal((nav() as any).scrollTop, 90);
});

test("a click right after a content patch scrolls to the live heading", () => {
  const { content, toc, flush, entries, scrolled } = setup({ toc: true });
  outline(content);
  toc.refresh();
  flush();
  const old = content.children.slice();
  content.children = [];
  const fresh = outline(content);
  toc.refresh(); // the rebuild waits for the next frame
  entries()[1].fire("click");
  assert.equal(scrolled[0], fresh[1]);
  assert.notEqual(scrolled[0], old[1]);
});

test("a repeated heading text is told apart by its occurrence", () => {
  const { content, toc, flush, entries, scrolled } = setup({ toc: true });
  const first = content.appendChild(heading("h2", "Notes"));
  const second = content.appendChild(heading("h2", "Notes"));
  toc.refresh();
  flush();
  content.children = [];
  const freshFirst = content.appendChild(heading("h2", "Notes"));
  const freshSecond = content.appendChild(heading("h2", "Notes"));
  entries()[1].fire("click");
  assert.equal(scrolled[0], freshSecond);
  assert.notEqual(scrolled[0], second);
  assert.notEqual(freshFirst, first);
});

test("a heading revealed at the reading line becomes current despite a fractional top", () => {
  const { content, toc, window, flush, entries } = setup({ toc: true });
  const headings = outline(content);
  toc.refresh();
  flush();
  headings.forEach((element, index) => {
    element.rect = { ...element.rect, top: [0, 300.4, 500.3, 900.4, 1400][index] };
  });
  toc.remeasure();
  window.scrollY = 860; // reading line at 900; Usage sits at 900.4
  toc.track();
  assert.equal(entries()[3].getAttribute("aria-current"), "location");
});

test("a comment chip and its hidden body stay out of the entry label, a TODO word chip stays in", () => {
  const { content, toc, flush, entries } = setup({ toc: true });
  const comment = new FakeElement("span", ["okf-comment"]);
  const chip = new FakeElement("span", ["okf-chip", "okf-chip--todo"]);
  chip.ownText = "TODO";
  const body = new FakeElement("span", ["okf-comment-body"]);
  body.ownText = "TODO fix later";
  comment.appendChild(chip);
  comment.appendChild(body);
  const word = new FakeElement("span", ["okf-chip", "okf-chip--todo"]);
  word.ownText = "TODO";
  content.appendChild(heading("h2", "Plan ", comment));
  content.appendChild(heading("h2", "Ship ", word));
  toc.refresh?.();
  flush();
  assert.deepEqual(entries().map((entry) => entry.textContent), ["Plan", "Ship TODO"]);
});
