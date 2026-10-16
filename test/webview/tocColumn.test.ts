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
    { documentId: "doc", documentVersion: 1, requestId: 2, initialViewPreferences: { toc: options.toc } },
    (target) => scrolled.push(target as never),
    () => { changes += 1; },
  );
  const flush = () => { while (frames.length) frames.shift()!(); };
  const nav = () => body.children.find((child) => child.attrs.has("data-sphinx-preview-toc"))!;
  const entries = () => nav().all("button");
  return { toc, content, body, root, button, posted, scrolled, flush, nav, entries, getState: () => state, changes: () => changes, frames };
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
    documentVersion: 1,
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
