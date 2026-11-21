import * as assert from "node:assert/strict";
import { test } from "node:test";

import { installLineMarker } from "../../src/page/features/lineMarker";
import type { PageRuntime } from "../../src/page/features/pageRuntime";
import { createRuntimeHarness, RuntimeElement, type RuntimeHarness } from "./runtimeHarness";
import { noop, openRawEditor, openTableCellEditorForTab, patchMessage } from "./runtimeTestSupport";

/**
 * The line marker of the page (features/lineMarker.ts): `previewRevealLine` places an arrow and a
 * band on a source line, scrolls to it silently, and removes the marker on a pointer press, an
 * edit or a new request. The fake page has three mapped blocks: line 1 (top 0), lines 50-52 (top
 * 500) and line 100 (top 1000), each 40 px tall.
 */

const IDS = { documentId: "file:///active.md", revision: 7, requestId: 11 };

function reveal(harness: RuntimeHarness, line: number): void {
  harness.dispatchMessage({ type: "previewRevealLine", ...IDS, line });
  harness.flushFrames();
}

function overlays(harness: RuntimeHarness): RuntimeElement[] {
  return harness.createdElements.filter((element) => element.className === "sphinx-preview-line-marker" && !element.removed);
}

function top(overlay: RuntimeElement | undefined): string {
  return overlay?.style.getPropertyValue("top") ?? "";
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
test("a requested line gets one decorative overlay at its block and the page scrolls to it silently", () => {
  const harness = createRuntimeHarness();
  const before = harness.messages.length;
  reveal(harness, 50);

  const [overlay] = overlays(harness);
  assert.equal(overlays(harness).length, 1);
  assert.equal(overlay!.getAttribute("aria-hidden"), "true");
  assert.equal(overlay!.parentElement, harness.body);
  assert.equal(overlay!.childElements[0]!.className, "sphinx-preview-line-marker-arrow");
  assert.equal(top(overlay), "500px");
  assert.equal(harness.mappings[1]!.getAttribute("aria-current"), "location");
  // The line sits at the reading line, where a source scroll to it puts the block.
  const reference = createRuntimeHarness();
  reference.dispatchMessage({ type: "sourceScroll", ...IDS, line: 50 });
  reference.flushFrames();
  assert.equal(harness.windowState.scrollY, reference.windowState.scrollY);
  assert.ok(harness.windowState.scrollY > 0);
  harness.flushTimers();
  assert.equal(harness.messages.slice(before).some((message) => message.type === "previewScroll"), false);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
test("a line outside every block takes the nearest block, and a later line of a block takes the block top", () => {
  const harness = createRuntimeHarness();
  reveal(harness, 75);
  // Nearest edge: 52 is 23 lines away, 100 is 25 away.
  assert.equal(top(overlays(harness)[0]), "500px");
  reveal(harness, 52);
  assert.equal(top(overlays(harness)[0]), "500px");
  assert.equal(overlays(harness).length, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
test("a code line takes its span, counted back from the closing fence", () => {
  const harness = createRuntimeHarness();
  const block = harness.mappings[1]!;
  const spans = [0, 1, 2].map((index) => {
    const span = new RuntimeElement({}, harness.windowState, 520 + index * 20, 20, "span");
    span.className = "myst-code-line";
    block.appendChild(span);
    return span;
  });
  // The block spans lines 50-52 in the harness: fence at 50, code on 51, closing fence at 52.
  assert.equal(spans.length, 3);
  reveal(harness, 51);
  // The closing fence is line 52: line 51 is the last span (index 3 - (52 - 51) = 2).
  assert.equal(top(overlays(harness)[0]), "560px");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
test("a closed details block holding the line is opened first", () => {
  const harness = createRuntimeHarness();
  const details = new RuntimeElement({}, harness.windowState, 400, 40, "details");
  const closed = details as RuntimeElement & { open: boolean };
  closed.open = false;
  details.appendChild(harness.mappings[1]!);
  reveal(harness, 50);
  assert.equal(closed.open, true);
  assert.equal(overlays(harness).length, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-179
test("the marker stays when the reader scrolls and is placed again after a layout change", () => {
  const harness = createRuntimeHarness();
  reveal(harness, 50);
  harness.windowState.scrollY = 700;
  harness.dispatchWindow("scroll");
  harness.flushFrames();
  assert.equal(overlays(harness).length, 1);

  harness.mappings[1]!.top = 640;
  harness.dispatchWindow("resize");
  harness.flushFrames();
  assert.equal(top(overlays(harness)[0]), "640px");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-179
test("a pointer press, an edit or a new line removes or moves the marker", () => {
  const harness = createRuntimeHarness();
  reveal(harness, 50);
  harness.dispatchDocument("pointerdown", { target: harness.mappings[1] });
  assert.equal(overlays(harness).length, 0);
  assert.equal(harness.mappings[1]!.getAttribute("aria-current"), null);

  reveal(harness, 50);
  reveal(harness, 100);
  assert.equal(overlays(harness).length, 1);
  assert.equal(top(overlays(harness)[0]), "1000px");
  assert.equal(harness.mappings[1]!.getAttribute("aria-current"), null);
  assert.equal(harness.mappings[2]!.getAttribute("aria-current"), "location");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-180
test("in edit mode the marker opens no editor and the overlay is never an edit target", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  reveal(harness, 50);
  assert.equal(overlays(harness).length, 1);
  assert.equal(harness.mappings[1]!.getAttribute("data-sphinx-preview-editing"), null);
  assert.equal(harness.messages.some((message) => message.type === "previewEdit" || message.type === "previewEditStart"), false);
  // Opening an editor with a click removes the marker, as any pointer press does.
  harness.dispatchDocument("pointerdown", { target: harness.mappings[1] });
  assert.equal(overlays(harness).length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
test("a page with no mapped block draws nothing", () => {
  const harness = createRuntimeHarness({ emptyBody: true });
  reveal(harness, 5);
  assert.equal(overlays(harness).length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
test("a code block with no end line (a code-block directive) takes the block top, not a span", () => {
  const harness = createRuntimeHarness({ secondBlockEndLine: 50 });
  const block = harness.mappings[1]!;
  [0, 1].forEach((index) => {
    const span = new RuntimeElement({}, harness.windowState, 520 + index * 20, 20, "span");
    span.className = "myst-code-line";
    block.appendChild(span);
  });
  reveal(harness, 52);
  // Line 52 is past the block's one known line: the top of the block (500), never a span.
  assert.equal(top(overlays(harness)[0]), "500px");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
test("a table line marks the top of the table", () => {
  const harness = createRuntimeHarness();
  const table = new RuntimeElement({
    "data-sphinx-preview-document": "file:///active.md",
    "data-sphinx-source-end-line": "52",
    "data-sphinx-source-file": "/workspace/active.md",
    "data-sphinx-source-line": "50",
  }, harness.windowState, 500, 120, "table");
  harness.mappings[1]!.top = 2_000;
  harness.mappings.push(table);
  reveal(harness, 51);
  assert.equal(top(overlays(harness)[0]), "500px");
  assert.equal(overlays(harness).length, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
test("a line inside a hidden tab of a tab-set marks the tab-set top and selects no tab", () => {
  const harness = createRuntimeHarness({ secondBlockEndLine: 60 });
  const tabSet = harness.mappings[1]!;
  // The block of a tab that is not shown has no box: it is not in the layout.
  const hiddenTab = new RuntimeElement({
    "data-sphinx-preview-document": "file:///active.md",
    "data-sphinx-source-end-line": "56",
    "data-sphinx-source-file": "/workspace/active.md",
    "data-sphinx-source-line": "54",
  }, harness.windowState, 0, 0, "div");
  tabSet.appendChild(hiddenTab);
  const before = harness.messages.length;
  reveal(harness, 55);
  assert.equal(top(overlays(harness)[0]), "500px");
  assert.equal(overlays(harness).length, 1);
  assert.equal(hiddenTab.getAttribute("aria-current"), null);
  assert.equal(harness.messages.slice(before).some((message) => message.type === "previewEdit"), false);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
test("a front matter line marks the top of the front matter block", () => {
  const harness = createRuntimeHarness({ frontmatterHeight: 120, firstMappedSourceLine: 8 });
  reveal(harness, 4);
  assert.equal(top(overlays(harness)[0]), "0px");
  assert.equal(harness.mappings[0]!.getAttribute("aria-current"), "location");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-179
test("a re-render of the content places the marker again on its line", () => {
  const harness = createRuntimeHarness();
  reveal(harness, 50);
  harness.mappings[1]!.top = 700;
  harness.dispatchMessage(patchMessage());
  harness.flushFrames();
  assert.equal(overlays(harness).length, 1);
  assert.equal(top(overlays(harness)[0]), "700px");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-179
test("opening a block editor removes the marker", () => {
  const harness = createRuntimeHarness();
  reveal(harness, 50);
  assert.equal(overlays(harness).length, 1);
  openRawEditor(harness);
  harness.flushFrames();
  assert.equal(overlays(harness).length, 0);
  assert.equal(harness.mappings[1]!.getAttribute("aria-current"), null);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-179
test("opening a table cell editor removes the marker", () => {
  const harness = createRuntimeHarness();
  reveal(harness, 50);
  assert.equal(overlays(harness).length, 1);
  openTableCellEditorForTab(harness);
  harness.flushFrames();
  assert.equal(overlays(harness).length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-179
test("a source edit the page posts removes the marker", () => {
  const harness = createRuntimeHarness();
  reveal(harness, 50);
  harness.checkbox.checked = true;
  harness.dispatchDocument("click", { target: harness.checkbox, stopImmediatePropagation: noop, preventDefault: noop });
  assert.ok(harness.messages.some((message) => message.type === "previewCheckboxToggle"));
  assert.equal(overlays(harness).length, 0);
  assert.equal(harness.mappings[1]!.getAttribute("aria-current"), null);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-179
test("the editor selection mark and the line marker each keep their own aria-current", () => {
  const harness = createRuntimeHarness({ markEditorSelection: true });
  reveal(harness, 50);
  // The editor selection moves to another block: its mark clears everywhere else, never the marker's.
  harness.dispatchMessage({ type: "sourceScroll", ...IDS, line: 100 });
  harness.flushFrames();
  assert.equal(harness.mappings[1]!.getAttribute("aria-current"), "location");
  assert.equal(harness.mappings[2]!.getAttribute("aria-current"), "location");
  // The editor selection mark moves onto the marker's block, then the marker goes: the mark stays.
  harness.dispatchMessage({ type: "sourceScroll", ...IDS, line: 50 });
  harness.flushFrames();
  harness.dispatchDocument("pointerdown", { target: harness.mappings[1] });
  assert.equal(harness.mappings[1]!.getAttribute("aria-current"), "location");
  assert.equal(harness.mappings[1]!.getAttribute("data-sphinx-line-marker"), null);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
test("a line under a folded heading unfolds the section first, then the marker is drawn", () => {
  const harness = createRuntimeHarness();
  const block = harness.mappings[1]!;
  let folded = true;
  const unfolds: unknown[] = [];
  const created: RuntimeElement[] = [];
  const body = new RuntimeElement({}, harness.windowState, 800, 2000, "body");
  const listeners = new Map<string, Array<() => void>>();
  const document = {
    body,
    querySelectorAll: () => [block],
    createElement: (tag: string) => {
      const element = new RuntimeElement({}, harness.windowState, 0, 0, tag);
      created.push(element);
      return element;
    },
    getElementById: () => undefined,
    addEventListener: (type: string, listener: () => void) => listeners.set(type, [...(listeners.get(type) ?? []), listener]),
  };
  const revealed: number[] = [];
  const rt = {
    document,
    window: harness.windowState,
    context: { documentId: "file:///active.md" },
    state: {},
    bus: { on: noop },
    parts: { headingFold: { reveal: (target: unknown) => { unfolds.push(target); const was = folded; folded = false; return was; } } },
    scroll: {
      measure: noop,
      stabilizeLayout: noop,
      entryForLine: () => folded ? undefined
        : { element: block, sourceLine: 50, endLine: 52, top: 500, height: 40 },
      revealPositionSilently: (top: number) => { revealed.push(top); },
    },
  } as unknown as PageRuntime;
  const marker = installLineMarker(rt);
  marker.reveal(50);
  assert.deepEqual(unfolds, [block], "the heading section around the block was unfolded");
  assert.equal(folded, false);
  assert.deepEqual(revealed, [500]);
  assert.equal(created.filter((element) => element.className === "sphinx-preview-line-marker" && !element.removed).length, 1);
});
