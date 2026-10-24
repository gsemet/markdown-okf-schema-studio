import * as assert from "node:assert/strict";
import { test } from "node:test";
import * as vm from "node:vm";

import { installLinkNavigation } from "../../../src/page/modules/linkNavigation";

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
  const installed = vm.runInNewContext(`(${installLinkNavigation.toString()})(document, window, vscode, context)`, {
    Element: Link,
    context,
    document: { querySelectorAll: () => links, addEventListener: (type: string, callback: (event: any) => void) => listeners.set(type, callback) },
    window: {
      IntersectionObserver: Observer,
      queueMicrotask: (callback: () => void) => microtasks.push(callback),
      addEventListener: (type: string, callback: (event: any) => void) => listeners.set(type, callback),
    },
    vscode: { postMessage: (message: Record<string, any>) => messages.push(message) },
  }) as ReturnType<typeof installLinkNavigation>;
  return { installed, links, messages, listeners, unobserved,
    intersect: (entries: Array<{ target: Link; isIntersecting: boolean }>) => intersect(entries),
    flush: () => { while (microtasks.length) microtasks.shift()!(); },
  };
}

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

// The stale-render half of this test moved to test/page/runtime.test.ts ("link target hints of a
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
  let intersect: (entries: Array<{ target: Link; isIntersecting: boolean }>) => void = () => undefined;
  class Observer {
    constructor(callback: typeof intersect) { intersect = callback; }
    observe(link: Link) { observed.push(link); }
    unobserve() {}
    disconnect() {}
  }
  const live = { documentId: "file:///active.md", revision: 1, requestId: 2 };
  const installed = vm.runInNewContext(`(${installLinkNavigation.toString()})(document, window, vscode, context)`, {
    Element: Link,
    context: live,
    document: { querySelectorAll: () => current, addEventListener: (type: string, callback: (event: any) => void) => listeners.set(type, callback) },
    window: {
      IntersectionObserver: Observer,
      queueMicrotask: (callback: () => void) => microtasks.push(callback),
      addEventListener: (type: string, callback: (event: any) => void) => listeners.set(type, callback),
    },
    vscode: { postMessage: (message: Record<string, any>) => messages.push(message) },
  }) as ReturnType<typeof installLinkNavigation>;
  return {
    installed, messages, listeners, observed, live,
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
