import * as assert from "node:assert/strict";
import { test } from "node:test";

import { THEME_TOKEN_NAMES } from "../../../src/core/preview/themeTokens";
import { EXPORT_TOO_LARGE } from "../../../src/core/export/exportSnapshot";
import {
  EXPORT_DIAGRAM_WAIT_MS,
  installExportSnapshot,
  takeExportSnapshot,
  whenDiagramsSettled,
} from "../../../src/page/modules/exportSnapshot";
import { createRuntimeHarness, RuntimeElement } from "../runtimeHarness";

const exportRequests = (harness: ReturnType<typeof createRuntimeHarness>): Array<Record<string, unknown>> =>
  harness.messages.filter((message) => message.type === "previewExportHtml");

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-134
test("a click on the Export button asks the host for the export with a user gesture", () => {
  const harness = createRuntimeHarness();
  harness.exportButton.dispatch("click");
  harness.flushTimers();
  const [request] = exportRequests(harness);
  assert.ok(request, "the click did not send previewExportHtml");
  assert.equal(request.userGesture, true);
  assert.match(String(request.editId), /^host-/u);
  assert.match(String((request.snapshot as { contentHtml: string }).contentHtml), /^<main/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-134
test("the command of the host asks for the export without a user gesture", () => {
  const harness = createRuntimeHarness();
  harness.dispatchMessage({ type: "previewExportCommand", documentId: "file:///active.md", revision: 7, requestId: 11 });
  harness.flushTimers();
  const [request] = exportRequests(harness);
  assert.ok(request, "the command did not send previewExportHtml");
  assert.equal(request.userGesture, false);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-134
test("a command of another render is ignored, and a second click while one export runs sends nothing more", () => {
  const harness = createRuntimeHarness();
  harness.dispatchMessage({ type: "previewExportCommand", documentId: "file:///other.md", revision: 7, requestId: 11 });
  assert.equal(exportRequests(harness).length, 0);
  harness.exportButton.dispatch("click");
  harness.exportButton.dispatch("click");
  assert.equal(exportRequests(harness).length, 1);
  assert.equal(harness.exportButton.getAttribute("aria-busy"), "true", "the button shows the export is running");
  const editId = String(exportRequests(harness)[0]!.editId);
  harness.dispatchMessage({ type: "previewExportHtmlResult", editId, ok: true, fileName: "a.html" });
  assert.equal(harness.exportButton.getAttribute("aria-busy"), null, "the answer ends the wait");
  harness.exportButton.dispatch("click");
  assert.equal(exportRequests(harness).length, 2);
});

// ---------------------------------------------------------------------------------------------
// The snapshot itself, on hand-built stubs (the harness DOM has no markup or computed style).

interface Stubs {
  document: Parameters<typeof takeExportSnapshot>[0];
  window: Parameters<typeof takeExportSnapshot>[1];
  rootAttributes: Record<string, string>;
}

function stubs(options: {
  tokens?: Record<string, string>;
  rootAttributes?: Record<string, string>;
  math?: string;
  tabSets?: Array<Array<"true" | "false">>;
  checkboxes?: boolean[];
} = {}): Stubs {
  const rootAttributes: Record<string, string> = {
    "data-sphinx-preview-theme": "2",
    "data-sphinx-preview-zoom": "150",
    "data-sphinx-preview-width": "auto",
    ...options.rootAttributes,
  };
  const checkboxes = options.checkboxes ?? [];
  const makeBox = (checked: boolean) => ({
    checked,
    attrs: checked ? ["checked"] : [] as string[],
    setAttribute(name: string) { this.attrs.push(name); },
    removeAttribute(name: string) { this.attrs = this.attrs.filter((entry) => entry !== name); },
  });
  const cloneBoxes = checkboxes.map(() => makeBox(false));
  const liveBoxes = checkboxes.map((checked) => makeBox(checked));
  const tabSets = (options.tabSets ?? []).map((states) => ({
    querySelectorAll: () => states.map((state) => ({
      getAttribute: () => state,
      closest: () => tabSets[0] ?? null,
    })),
  }));
  tabSets.forEach((set, index) => {
    set.querySelectorAll = () => (options.tabSets![index] ?? []).map((state) => ({
      getAttribute: () => state,
      closest: () => set,
    })) as never;
  });
  const content = {
    cloneNode: () => ({
      outerHTML: '<main id="sphinx-myst-preview-content"><p>copy</p></main>',
      querySelectorAll: () => cloneBoxes,
    }),
    querySelectorAll: (selector: string) => selector === ".myst-tab-set" ? tabSets : liveBoxes,
  };
  const root = {
    getAttribute: (name: string) => rootAttributes[name] ?? null,
  };
  return {
    rootAttributes,
    document: {
      documentElement: root,
      getElementById: (id: string) => id === "sphinx-myst-preview-content" ? content : null,
      querySelector: (selector: string) => selector === "style[data-studio-math-styles]" && options.math !== undefined
        ? { textContent: options.math } : null,
      querySelectorAll: () => [],
    } as unknown as Stubs["document"],
    window: {
      getComputedStyle: () => ({
        getPropertyValue: (name: string) => options.tokens?.[name] ?? "",
      }),
      setTimeout: () => 0,
      clearTimeout: () => undefined,
    } as unknown as Stubs["window"],
  };
}

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-136
test("the snapshot holds the resolved value of each theme token and the root attributes the CSS reads, and leaves out the zoom", () => {
  const tokens = Object.fromEntries(THEME_TOKEN_NAMES.map((name) => [`--studio-${name}`, ` value-${name} `]));
  const { document, window } = stubs({ tokens, math: ".m1{margin:0}" });
  const snapshot = takeExportSnapshot(document, window)!;
  assert.equal(Object.keys(snapshot.tokens).length, THEME_TOKEN_NAMES.length);
  for (const name of THEME_TOKEN_NAMES) assert.equal(snapshot.tokens[name], `value-${name}`);
  assert.deepEqual(snapshot.rootAttributes, { "data-sphinx-preview-theme": "2", "data-sphinx-preview-width": "auto" });
  assert.equal(snapshot.mathStyles, ".m1{margin:0}");
  assert.match(snapshot.contentHtml, /^<main id="sphinx-myst-preview-content">/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-137
test("the snapshot records the shown tab of each tab set and the ticked task boxes", () => {
  const { document, window } = stubs({ tabSets: [["false", "true"], ["true", "false", "false"]], checkboxes: [true, false] });
  const snapshot = takeExportSnapshot(document, window)!;
  assert.deepEqual(snapshot.shownTabs, [1, 0]);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-137
test("taking a snapshot changes nothing on the page", () => {
  const harness = createRuntimeHarness();
  const before = JSON.stringify([
    harness.documentElement.getAttribute("data-sphinx-preview-edit-mode"),
    harness.documentElement.getAttribute("data-sphinx-preview-theme-mode"),
    harness.previewContent.outerHTML,
    harness.windowState.scrollY,
  ]);
  harness.exportButton.dispatch("click");
  harness.flushTimers();
  const after = JSON.stringify([
    harness.documentElement.getAttribute("data-sphinx-preview-edit-mode"),
    harness.documentElement.getAttribute("data-sphinx-preview-theme-mode"),
    harness.previewContent.outerHTML,
    harness.windowState.scrollY,
  ]);
  assert.equal(after, before);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-128
test("a diagram that is still drawing is awaited, then the export goes ahead", () => {
  const diagram = new RuntimeElement({ "data-render-state": "rendering" }, { scrollY: 0 }, 0, 10);
  const harness = createRuntimeHarness();
  harness.diagrams.push(diagram);
  harness.exportButton.dispatch("click");
  harness.advanceTimers(2_000);
  assert.equal(exportRequests(harness).length, 0, "the export went ahead while a diagram was drawing");
  diagram.setAttribute("data-render-state", "rendered");
  harness.advanceTimers(200);
  assert.equal(exportRequests(harness).length, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-128
test("a diagram in error does not hold the export, and a diagram that never settles is given up after 10 s", () => {
  const failed = new RuntimeElement({ "data-render-state": "error" }, { scrollY: 0 }, 0, 10);
  const first = createRuntimeHarness();
  first.diagrams.push(failed);
  first.exportButton.dispatch("click");
  first.flushTimers();
  assert.equal(exportRequests(first).length, 1);

  const stuck = new RuntimeElement({}, { scrollY: 0 }, 0, 10);
  const second = createRuntimeHarness();
  second.diagrams.push(stuck);
  second.exportButton.dispatch("click");
  second.advanceTimers(EXPORT_DIAGRAM_WAIT_MS - 200);
  assert.equal(exportRequests(second).length, 0);
  second.advanceTimers(400);
  assert.equal(exportRequests(second).length, 1, "the wait is bounded");
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-128
test("whenDiagramsSettled calls back at once with no diagram", () => {
  let called = 0;
  whenDiagramsSettled({ querySelectorAll: () => [] } as never, { setTimeout: () => 0 } as never, 10_000, () => { called += 1; });
  assert.equal(called, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-128
test("a diagram that is unavailable is settled and does not hold the export", () => {
  const unavailable = new RuntimeElement({ "data-render-state": "unavailable" }, { scrollY: 0 }, 0, 10);
  const harness = createRuntimeHarness();
  harness.diagrams.push(unavailable);
  harness.exportButton.dispatch("click");
  harness.flushTimers();
  assert.equal(exportRequests(harness).length, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-134
test("a page over the size bound tells the user, sends nothing and leaves the button free", () => {
  const { document, window } = stubs();
  const huge = "x".repeat(50_000_001);
  const base = document.getElementById("sphinx-myst-preview-content") as unknown as { cloneNode(): { outerHTML: string } };
  const content = { ...base, cloneNode: () => ({ ...base.cloneNode(), outerHTML: huge }) };
  const attributes = new Map<string, string>();
  let click: (() => void) | undefined;
  const button = {
    setAttribute: (name: string, value: string) => attributes.set(name, value),
    removeAttribute: (name: string) => attributes.delete(name),
    addEventListener: (_type: string, listener: () => void) => { click = listener; },
  };
  const stubbed = {
    ...document,
    getElementById: () => content,
    querySelector: (selector: string) => selector === "[data-sphinx-preview-export]" ? button : document.querySelector(selector),
    querySelectorAll: () => [],
    addEventListener: () => undefined,
  } as never;
  const asked: string[] = [];
  const reported: string[] = [];
  installExportSnapshot(stubbed, window, {
    ask: (type) => { asked.push(type); },
    report: (message) => { reported.push(message); },
  });
  click!();
  assert.deepEqual(asked, [], "nothing is sent to the host");
  assert.deepEqual(reported, [EXPORT_TOO_LARGE]);
  assert.equal(attributes.has("aria-busy"), false, "the button is free again");
});
