/**
 * Requirement tests of the toolbar-navigation scope in the page: link activation by keyboard,
 * link discovery without an intersection observer, the look of a blocked link, and the sticky
 * heading band with its reading offset.
 */

import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { test } from "node:test";

import { installStickyHeadings } from "../../../src/page/features/stickyHeadings";
import { installLinkNavigation } from "../../../src/page/modules/linkNavigation";
import { provideGlobalElement } from "./fakeDom";

const context = { documentId: "file:///active.md", revision: 1, requestId: 2 };

function linkHarness(requests: string[], withObserver: boolean) {
  class Link {
    attributes = new Map<string, string>();
    constructor(request: string) { this.attributes.set("data-sphinx-preview-navigation", request); }
    getAttribute(name: string) { return this.attributes.get(name); }
    setAttribute(name: string, value: string) { this.attributes.set(name, value); }
    removeAttribute(name: string) { this.attributes.delete(name); }
    nextSibling = null;
    parentNode = { insertBefore: (node: unknown) => { inserted.push(node as FakeIcon); } };
    closest() { return this; }
  }
  interface FakeIcon { attributes: Map<string, string>; getAttribute(name: string): string | undefined; setAttribute(name: string, value: string): void }
  const inserted: FakeIcon[] = [];
  const links = requests.map((request) => new Link(request));
  const messages: Array<Record<string, any>> = [];
  const microtasks: Array<() => void> = [];
  const listeners = new Map<string, (event: any) => void>();
  let intersect: (entries: Array<{ target: Link; isIntersecting: boolean }>) => void = () => undefined;
  class Observer {
    constructor(callback: typeof intersect) { intersect = callback; }
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  provideGlobalElement(Link);
  const installed = installLinkNavigation(
    {
      querySelectorAll: () => links,
      addEventListener: (type: string, callback: (event: any) => void) => listeners.set(type, callback),
      createElement: () => {
        const attributes = new Map<string, string>();
        return { attributes, getAttribute: (name: string) => attributes.get(name), setAttribute: (name: string, value: string) => attributes.set(name, value) };
      },
    } as never,
    {
      ...(withObserver ? { IntersectionObserver: Observer } : {}),
      queueMicrotask: (callback: () => void) => microtasks.push(callback),
      addEventListener: (type: string, callback: (event: any) => void) => listeners.set(type, callback),
    } as never,
    { postMessage: (message: Record<string, any>) => messages.push(message) } as never,
    context as never,
  );
  return { installed, links, messages, listeners, inserted,
    intersect: (entries: Array<{ target: Link; isIntersecting: boolean }>) => intersect(entries),
    flush: () => { while (microtasks.length) microtasks.shift()!(); },
  };
}

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-077
test("Enter or Space on a link is routed to the host and another key is not", () => {
  const runtime = linkHarness(["other.md"], true);
  let prevented = 0;
  const press = (key: string) => runtime.listeners.get("keydown")!({
    type: "keydown", key, target: runtime.links[0], preventDefault: () => { prevented += 1; },
  });
  press("a");
  assert.equal(runtime.messages.length, 0);
  assert.equal(prevented, 0);
  press("Enter");
  press(" ");
  assert.equal(prevented, 2);
  assert.deepEqual(runtime.messages.map((message) => [message.type, message.request]), [
    ["previewLink", "other.md"],
    ["previewLink", "other.md"],
  ]);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-079
test("without an intersection observer no link is looked up and clicks still reach the host", () => {
  const without = linkHarness(["other.md"], false);
  without.flush();
  assert.equal(without.messages.length, 0);
  without.listeners.get("click")!({ type: "click", target: without.links[0], preventDefault: () => undefined });
  assert.deepEqual(without.messages.map((message) => message.type), ["previewLink"]);
  const withObserver = linkHarness(["other.md"], true);
  withObserver.intersect([{ target: withObserver.links[0], isIntersecting: true }]);
  withObserver.flush();
  assert.deepEqual(withObserver.messages.map((message) => message.type), ["previewLinkDiscover"]);
});

function filesBelow(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? filesBelow(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
}

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-085
test("a missing or blocked target keeps the link and adds a warning icon", () => {
  const runtime = linkHarness(["gone.md", "here.md"], true);
  runtime.installed.applyTargets({ targets: [
    { request: "gone.md", kind: "blocked", reason: "File not found: gone.md" },
    { request: "here.md", kind: "local", path: "/w/here.md" },
  ] } as never);
  const [blocked, local] = runtime.links;
  assert.equal(blocked.getAttribute("data-sphinx-preview-link-state"), "blocked");
  assert.equal(blocked.getAttribute("title"), "File not found: gone.md");
  // The link itself only gains the description that names the problem; the valid link is unchanged.
  assert.deepEqual([...blocked.attributes.keys()].sort(), [
    "aria-describedby", "data-sphinx-preview-link-state", "data-sphinx-preview-navigation", "title",
  ]);
  assert.deepEqual([...local.attributes.keys()].sort(), [
    "data-sphinx-preview-link-state", "data-sphinx-preview-navigation", "title",
  ]);
  assert.equal(runtime.inserted.length, 1, "only the blocked link gets an icon");
  assert.equal(runtime.inserted[0].getAttribute("title"), "File not found: gone.md");
  // No rule of the extension selects the state attribute: the link keeps its look; the icon has a class.
  const selectors = filesBelow(path.join(process.cwd(), "src")).filter((file) =>
    fs.readFileSync(file, "utf8").includes("[data-sphinx-preview-link-state"));
  assert.deepEqual(selectors, []);
});

interface BandOptions {
  width: number;
  bandHeight: number;
  headings: Array<{ tag: string; text: string; top: number; height: number }>;
  scrollY: number;
  policyOffset: number;
}

function bandHarness(options: BandOptions) {
  const selectors: string[] = [];
  const band = {
    hidden: true,
    textContent: "",
    getBoundingClientRect: () => ({ height: band.hidden ? 0 : options.bandHeight, bottom: band.hidden ? 0 : options.bandHeight }),
    style: { setProperty: () => undefined },
  };
  const headings = options.headings.map((heading) => ({
    tagName: heading.tag.toUpperCase(),
    textContent: heading.text,
    getBoundingClientRect: () => ({ top: heading.top - options.scrollY, height: heading.height }),
  }));
  const doc = {
    querySelector: (selector: string) => (selector.includes("sticky-headings") ? band : null),
    querySelectorAll: (selector: string) => { selectors.push(selector); return headings; },
    documentElement: { get clientWidth() { return options.width; }, style: { setProperty: () => undefined } },
    body: { setAttribute: () => undefined, removeAttribute: () => undefined },
  };
  const win = {
    get scrollY() { return options.scrollY; },
    getComputedStyle: () => ({ lineHeight: "20px", fontSize: "13px" }),
  };
  const sticky = installStickyHeadings(
    doc as never, win as never, { readingOffset: () => options.policyOffset }, 6,
  );
  return { band, sticky, selectors };
}

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-018
test("the sticky band follows every heading from h1 to h6 and ignores a heading without height", () => {
  const { band, sticky, selectors } = bandHarness({
    width: 800, bandHeight: 60, scrollY: 250, policyOffset: 30,
    headings: [
      { tag: "h1", text: "Title", top: 0, height: 30 },
      { tag: "h2", text: "Section", top: 100, height: 24 },
      { tag: "h5", text: "Deep in an admonition", top: 200, height: 18 },
      { tag: "h3", text: "Hidden", top: 240, height: 0 },
    ],
  });
  sticky.updateStickyHeadings();
  assert.equal(selectors[0], "h1, h2, h3, h4, h5, h6");
  assert.equal(band.textContent, "# Title\n## Section\n##### Deep in an admonition");
  assert.equal(band.hidden, false);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-030
test("the reading offset only grows for a width and starts again when the width changes", () => {
  const options: BandOptions = { width: 800, bandHeight: 100, scrollY: 0, policyOffset: 30, headings: [] };
  const { band, sticky } = bandHarness(options);
  band.hidden = false;
  sticky.refreshReadingOffset();
  assert.equal(sticky.readingOffset(), 100, "the band height is larger than the allowance");
  options.bandHeight = 50;
  sticky.refreshReadingOffset();
  assert.equal(sticky.readingOffset(), 100, "a smaller band does not shrink the offset");
  options.policyOffset = 150;
  sticky.refreshReadingOffset();
  assert.equal(sticky.readingOffset(), 150, "the allowance for the depth is a floor");
  options.policyOffset = 30;
  options.width = 600;
  sticky.refreshReadingOffset();
  assert.equal(sticky.readingOffset(), 50, "another width forgets the remembered height");
});
