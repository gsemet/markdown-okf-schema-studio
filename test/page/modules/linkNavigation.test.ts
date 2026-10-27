import * as assert from "node:assert/strict";
import { test } from "node:test";

import { applyLinkHint, installLinkNavigation } from "../../../src/page/modules/linkNavigation";
import { provideGlobalElement } from "./fakeDom";

const context = { documentId: "file:///active.md", revision: 1, requestId: 2 };

function harness(requests: string[]) {
  class Link {
    attributes = new Map<string, string>();
    constructor(request: string) { this.attributes.set("data-sphinx-preview-navigation", request); }
    getAttribute(name: string) { return this.attributes.get(name); }
    setAttribute(name: string, value: string) { this.attributes.set(name, value); }
    closest() { return this; }
  }
  const links = requests.map((request) => new Link(request));
  const messages: Array<Record<string, any>> = [];
  const microtasks: Array<() => void> = [];
  const listeners = new Map<string, (event: any) => void>();
  let intersect: (entries: Array<{ target: Link; isIntersecting: boolean }>) => void;
  const unobserved: Link[] = [];
  class Observer {
    constructor(callback: typeof intersect) { intersect = callback; }
    observe() {}
    unobserve(link: Link) { unobserved.push(link); }
    disconnect() {}
  }
  provideGlobalElement(Link);
  const installed = installLinkNavigation(
    { querySelectorAll: () => links, addEventListener: (type: string, callback: (event: any) => void) => listeners.set(type, callback) } as never,
    {
      IntersectionObserver: Observer,
      queueMicrotask: (callback: () => void) => microtasks.push(callback),
      addEventListener: (type: string, callback: (event: any) => void) => listeners.set(type, callback),
    } as never,
    { postMessage: (message: Record<string, any>) => messages.push(message) } as never,
    context as never,
  );
  return { installed, links, messages, listeners, unobserved,
    intersect: (entries: Array<{ target: Link; isIntersecting: boolean }>) => intersect(entries),
    flush: () => { while (microtasks.length) microtasks.shift()!(); },
  };
}

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-079
test("link discovery waits for the viewport and deduplicates bounded batches", () => {
  const runtime = harness(["references/PROPERTIES.md", "references/PROPERTIES.md", "wiki:Note", "okf-link:identity", "#heading", "https://example.test"]);
  assert.equal(runtime.messages.length, 0);
  runtime.intersect([{ target: runtime.links[0], isIntersecting: false }]);
  runtime.flush();
  assert.equal(runtime.messages.length, 0);
  runtime.intersect(runtime.links.map((target) => ({ target, isIntersecting: true })));
  runtime.flush();
  assert.equal(runtime.messages.length, 1);
  assert.equal(runtime.messages[0].type, "previewLinkDiscover");
  assert.equal(JSON.stringify(runtime.messages[0].requests), JSON.stringify(["references/PROPERTIES.md", "wiki:Note"]));
  assert.equal(runtime.unobserved.length, 6);
  const many = harness(Array.from({ length: 130 }, (_, index) => `note-${index}.md`));
  many.intersect(many.links.map((target) => ({ target, isIntersecting: true })));
  many.flush();
  assert.equal(many.messages.map((message) => message.requests.length).join(","), "64,64,2");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-077
test("local and wiki clicks are host-routed even before discovery, including middle click", () => {
  const runtime = harness(["references/PROPERTIES.md", "wiki:Note", "okf-link:identity"]);
  let prevented = 0;
  for (const link of runtime.links) {
    runtime.listeners.get("click")!({ target: link, preventDefault: () => prevented += 1 });
  }
  runtime.listeners.get("auxclick")!({ type: "auxclick", button: 1, target: runtime.links[0], preventDefault: () => prevented += 1 });
  assert.equal(prevented, 4);
  assert.equal(runtime.messages.length, 4);
  assert.equal(runtime.messages[0].type, "previewLink");
  assert.equal(runtime.messages[0].request, "references/PROPERTIES.md");
  assert.equal(runtime.messages[0].requestId, context.requestId);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-085
// The stale-render half of this test moved to test/page/runtimeContentPatch.test.ts ("link target hints of a
// stale render are ignored"): the page's host message filter now matches previewLinkTargets to the
// render before the router hands it to applyTargets.
test("discovery hints never replace the original target", () => {
  const runtime = harness(["wiki:Note"]);
  const target = { request: "wiki:Note", kind: "local", path: "/workspace/Note.md" };
  runtime.installed.applyTargets({ targets: [target] });
  assert.equal(runtime.links[0].getAttribute("title"), target.path);
  assert.equal(runtime.links[0].getAttribute("data-sphinx-preview-navigation"), "wiki:Note");
});

function rescanHarness(initial: string[]) {
  class Link {
    attributes = new Map<string, string>();
    constructor(request: string) { this.attributes.set("data-sphinx-preview-navigation", request); }
    getAttribute(name: string) { return this.attributes.get(name); }
    setAttribute(name: string, value: string) { this.attributes.set(name, value); }
    closest() { return this; }
  }
  let current = initial.map((request) => new Link(request));
  const messages: Array<Record<string, any>> = [];
  const microtasks: Array<() => void> = [];
  const listeners = new Map<string, (event: any) => void>();
  const observed: Link[] = [];
  const unobserved: Link[] = [];
  let intersect: (entries: Array<{ target: Link; isIntersecting: boolean }>) => void = () => undefined;
  class Observer {
    constructor(callback: typeof intersect) { intersect = callback; }
    observe(link: Link) { observed.push(link); }
    unobserve(link: Link) { unobserved.push(link); }
    disconnect() {}
  }
  const live = { documentId: "file:///active.md", revision: 1, requestId: 2 };
  provideGlobalElement(Link);
  const installed = installLinkNavigation(
    { querySelectorAll: () => current, addEventListener: (type: string, callback: (event: any) => void) => listeners.set(type, callback) } as never,
    {
      IntersectionObserver: Observer,
      queueMicrotask: (callback: () => void) => microtasks.push(callback),
      addEventListener: (type: string, callback: (event: any) => void) => listeners.set(type, callback),
    } as never,
    { postMessage: (message: Record<string, any>) => messages.push(message) } as never,
    live as never,
  );
  return {
    installed, messages, listeners, observed, unobserved, live,
    replaceLinks: (requests: string[]) => { current = requests.map((request) => new Link(request)); return current; },
    keepLinksAndAdd: (requests: string[]) => { current = [...current, ...requests.map((request) => new Link(request))]; return current; },
    intersect: (entries: Array<{ target: Link; isIntersecting: boolean }>) => intersect(entries),
    flush: () => { while (microtasks.length) microtasks.shift()!(); },
  };
}

test("T33: installing returns a rescan and the startup scan observes each link once", () => {
  const runtime = rescanHarness(["a.md", "b.md"]);
  assert.equal(typeof runtime.installed.rescan, "function");
  assert.equal(runtime.observed.length, 2);
});

test("T33: rescan observes only the links that are not observed yet", () => {
  const runtime = rescanHarness(["a.md", "b.md"]);
  const all = runtime.keepLinksAndAdd(["c.md"]);
  runtime.installed.rescan();
  assert.equal(runtime.observed.length, 3);
  assert.equal(runtime.observed[2], all[2]);
  runtime.installed.rescan();
  assert.equal(runtime.observed.length, 3, "a second rescan finds nothing new");
});

test("T33: after a rescan, discovery and target hints apply to the new links", () => {
  const runtime = rescanHarness(["a.md"]);
  const fresh = runtime.replaceLinks(["wiki:New"]);
  runtime.installed.rescan();
  assert.equal(runtime.observed.at(-1), fresh[0]);
  runtime.intersect([{ target: fresh[0], isIntersecting: true }]);
  runtime.flush();
  assert.equal(runtime.messages.length, 1);
  assert.equal(runtime.messages[0].type, "previewLinkDiscover");
  assert.equal(JSON.stringify(runtime.messages[0].requests), JSON.stringify(["wiki:New"]));
  runtime.installed.applyTargets({ targets: [{ request: "wiki:New", kind: "local", path: "/workspace/New.md" }] });
  assert.equal(fresh[0].getAttribute("title"), "/workspace/New.md");
  assert.equal(fresh[0].getAttribute("data-sphinx-preview-link-state"), "local");
});

// The hint check against the mutated context is the page's host message filter now; the runtime
// test "T34: links of the new content keep known target hints and discover new targets" covers
// it on a patched page.
test("T33: a context mutated after install is honoured by posts and by the hint check", () => {
  const runtime = rescanHarness(["wiki:Note"]);
  runtime.live.requestId = 3;
  runtime.live.revision = 4;
  runtime.listeners.get("click")!({ target: runtime.keepLinksAndAdd([])[0], preventDefault: () => undefined });
  assert.equal(runtime.messages[0].requestId, 3);
  assert.equal(runtime.messages[0].revision, 4);
  const link = runtime.keepLinksAndAdd([])[0];
  runtime.installed.rescan();
  runtime.installed.applyTargets({ targets: [{ request: "wiki:Note", kind: "local", path: "/p.md" }] });
  assert.equal(link.getAttribute("title"), "/p.md");
});

class Node2 {
  attributes = new Map<string, string>();
  parentNode: Container | null = null;
  constructor(public tag: string) {}
  getAttribute(name: string) { return this.attributes.get(name) ?? null; }
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  removeAttribute(name: string) { this.attributes.delete(name); }
  get nextSibling() { const list = this.parentNode?.children ?? []; return list[list.indexOf(this) + 1] ?? null; }
  remove() { this.parentNode?.children.splice(this.parentNode.children.indexOf(this), 1); this.parentNode = null; }
}
class Container extends Node2 {
  children: Node2[] = [];
  insertBefore(node: Node2, reference: Node2 | null) {
    node.remove();
    node.parentNode = this;
    this.children.splice(reference ? this.children.indexOf(reference) : this.children.length, 0, node);
  }
}

function iconHarness() {
  const parent = new Container("p");
  const link = new Node2("a");
  link.setAttribute("data-sphinx-preview-navigation", "docs/guid.md");
  link.setAttribute("title", "original");
  parent.insertBefore(link, null);
  const document = { createElement: (tag: string) => new Node2(tag) } as unknown as Document;
  return { parent, link, document };
}

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-085
test("a blocked target keeps the link and adds a warning icon described by the reason", () => {
  const { parent, link, document } = iconHarness();
  applyLinkHint(document, link as never, "blocked", "File not found: docs/guid.md");
  assert.equal(parent.children.length, 2);
  const icon = parent.children[1];
  assert.equal(icon.getAttribute("class"), "sphinx-preview-link-warning");
  assert.equal(icon.getAttribute("title"), "File not found: docs/guid.md");
  assert.equal(icon.getAttribute("aria-hidden"), "true");
  assert.equal(icon.getAttribute("aria-label"), "File not found: docs/guid.md");
  assert.equal(link.getAttribute("aria-describedby"), icon.getAttribute("id"));
  assert.equal(link.getAttribute("data-sphinx-preview-navigation"), "docs/guid.md");
  // A second answer updates the icon instead of adding another one.
  applyLinkHint(document, link as never, "blocked", "The navigation target is outside the workspace.");
  assert.equal(parent.children.length, 2);
  assert.equal(parent.children[1].getAttribute("title"), "The navigation target is outside the workspace.");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-085
test("a target that becomes valid loses the warning icon and the description", () => {
  const { parent, link, document } = iconHarness();
  applyLinkHint(document, link as never, "blocked", "File not found: docs/guid.md");
  applyLinkHint(document, link as never, "local", "/workspace/docs/guid.md");
  assert.equal(parent.children.length, 1);
  assert.equal(link.getAttribute("aria-describedby"), null);
  assert.equal(link.getAttribute("title"), "/workspace/docs/guid.md");
  const valid = iconHarness();
  applyLinkHint(valid.document, valid.link as never, "local", "/workspace/a.md");
  assert.equal(valid.parent.children.length, 1, "a valid link gets no icon");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-079
test("links are asked again when the preview regains focus or becomes visible", () => {
  const runtime = harness(["a.md"]);
  runtime.intersect([{ target: runtime.links[0], isIntersecting: true }]);
  runtime.flush();
  assert.equal(runtime.messages.length, 1);
  runtime.intersect([{ target: runtime.links[0], isIntersecting: true }]);
  runtime.flush();
  assert.equal(runtime.messages.length, 1, "asked once while the page stays as it is");
  runtime.listeners.get("focus")!({});
  runtime.intersect([{ target: runtime.links[0], isIntersecting: true }]);
  runtime.flush();
  assert.equal(runtime.messages.length, 2, "asked again after the focus came back");
  assert.equal(runtime.messages[1].requests[0], "a.md");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-079
test("T22: rescan unobserves the links that the replaced content detached", () => {
  const runtime = rescanHarness(["a.md", "b.md"]);
  const [a, b] = runtime.observed;
  runtime.replaceLinks(["c.md"]);
  runtime.installed.rescan();
  assert.deepEqual(runtime.unobserved, [a, b], "the detached links are released by the observer");
  assert.equal(runtime.observed.length, 3, "the new link is observed");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-079
test("T22: rescan keeps observing the links that are still in the content", () => {
  const runtime = rescanHarness(["a.md", "b.md"]);
  runtime.keepLinksAndAdd(["c.md"]);
  runtime.installed.rescan();
  assert.equal(runtime.unobserved.length, 0);
  assert.equal(runtime.observed.length, 3);
});
