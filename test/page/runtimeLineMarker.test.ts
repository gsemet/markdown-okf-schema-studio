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

function revealWith(harness: RuntimeHarness, line: number, scroll: string): void {
  harness.dispatchMessage({ type: "previewRevealLine", ...IDS, line, scroll });
  harness.flushFrames();
}

function overlays(harness: RuntimeHarness): RuntimeElement[] {
  return harness.createdElements.filter((element) => element.className === "sphinx-preview-line-marker" && !element.removed);
}

function top(overlay: RuntimeElement | undefined): string {
  return overlay?.style.getPropertyValue("top") ?? "";
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178#S1
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

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178#S1
// @tests_req SwRS-MDOKFSTUDIO-LIFE-178#S2
test("a line outside every block takes the nearest block, and a later line of a block takes the block top", () => {
  const harness = createRuntimeHarness();
  reveal(harness, 75);
  // Nearest edge: 52 is 23 lines away, 100 is 25 away.
  assert.equal(top(overlays(harness)[0]), "500px");
  reveal(harness, 52);
  assert.equal(top(overlays(harness)[0]), "500px");
  assert.equal(overlays(harness).length, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178#S1
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

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178#S1
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

// @tests_req SwRS-MDOKFSTUDIO-LIFE-179#S1
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

// @tests_req SwRS-MDOKFSTUDIO-LIFE-179#S1
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

// @tests_req SwRS-MDOKFSTUDIO-LIFE-180#S2
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

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178#S2
test("a page with no mapped block draws nothing", () => {
  const harness = createRuntimeHarness({ emptyBody: true });
  reveal(harness, 5);
  assert.equal(overlays(harness).length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178#S1
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

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178#S1
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

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178#S1
test("a front matter line marks the top of the front matter block", () => {
  const harness = createRuntimeHarness({ frontmatterHeight: 120, firstMappedSourceLine: 8 });
  reveal(harness, 4);
  assert.equal(top(overlays(harness)[0]), "0px");
  assert.equal(harness.mappings[0]!.getAttribute("aria-current"), "location");
});

function child(harness: RuntimeHarness, parent: RuntimeElement, attributes: Record<string, string>, top: number, height: number, tag: string): RuntimeElement {
  const element = new RuntimeElement(attributes, harness.windowState, top, height, tag);
  parent.appendChild(element);
  return element;
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178#S1
test("a pipe table row line marks that row, and the delimiter line marks the header row", () => {
  const harness = createRuntimeHarness({ secondBlockEndLine: 60 });
  const table = harness.mappings[1]!;
  child(harness, table, { "data-okf-marker-line": "50" }, 510, 20, "tr");
  child(harness, table, { "data-okf-marker-line": "52" }, 540, 20, "tr");
  child(harness, table, { "data-okf-marker-line": "53" }, 560, 20, "tr");
  reveal(harness, 53);
  assert.equal(top(overlays(harness)[0]), "560px");
  reveal(harness, 51);
  assert.equal(top(overlays(harness)[0]), "510px");
  assert.equal(overlays(harness).length, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178#S1
test("a front matter line marks its property row, a fence or a comment line the section top", () => {
  const harness = createRuntimeHarness({ frontmatterHeight: 120, firstMappedSourceLine: 8 });
  const section = harness.mappings[0]!;
  section.setAttribute("data-okf-properties", "true");
  section.setAttribute("data-okf-frontmatter-end-line", "7");
  section.setAttribute("data-sphinx-source-end-line", "1");
  child(harness, section, { "data-okf-field": "title", "data-okf-line": "2", "data-okf-end-line": "2" }, 40, 20, "tr");
  child(harness, section, { "data-okf-field": "tags", "data-okf-line": "3", "data-okf-end-line": "5" }, 60, 40, "tr");
  reveal(harness, 4);
  assert.equal(top(overlays(harness)[0]), "60px");
  reveal(harness, 2);
  assert.equal(top(overlays(harness)[0]), "40px");
  reveal(harness, 6);
  assert.equal(top(overlays(harness)[0]), "0px");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-179#S1
test("a re-render of the content places the marker again on its line", () => {
  const harness = createRuntimeHarness();
  reveal(harness, 50);
  harness.mappings[1]!.top = 700;
  harness.dispatchMessage(patchMessage());
  harness.flushFrames();
  assert.equal(overlays(harness).length, 1);
  assert.equal(top(overlays(harness)[0]), "700px");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-179#S2
test("opening a block editor removes the marker", () => {
  const harness = createRuntimeHarness();
  reveal(harness, 50);
  assert.equal(overlays(harness).length, 1);
  openRawEditor(harness);
  harness.flushFrames();
  assert.equal(overlays(harness).length, 0);
  assert.equal(harness.mappings[1]!.getAttribute("aria-current"), null);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-179#S1
test("opening a table cell editor removes the marker", () => {
  const harness = createRuntimeHarness();
  reveal(harness, 50);
  assert.equal(overlays(harness).length, 1);
  openTableCellEditorForTab(harness);
  harness.flushFrames();
  assert.equal(overlays(harness).length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-179#S1
test("a source edit the page posts removes the marker", () => {
  const harness = createRuntimeHarness();
  reveal(harness, 50);
  harness.checkbox.checked = true;
  harness.dispatchDocument("click", { target: harness.checkbox, stopImmediatePropagation: noop, preventDefault: noop });
  assert.ok(harness.messages.some((message) => message.type === "previewCheckboxToggle"));
  assert.equal(overlays(harness).length, 0);
  assert.equal(harness.mappings[1]!.getAttribute("aria-current"), null);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-179#S1
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

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178#S1
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
  marker.reveal(50, "reading-line");
  assert.deepEqual(unfolds, [block], "the heading section around the block was unfolded");
  assert.equal(folded, false);
  assert.deepEqual(revealed, [500]);
  assert.equal(created.filter((element) => element.className === "sphinx-preview-line-marker" && !element.removed).length, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-188#S1
test("if-off-screen draws the marker and leaves the page where it is when the line is on screen", () => {
  const harness = createRuntimeHarness({ viewportHeight: 900 });
  const before = harness.messages.length;
  revealWith(harness, 50, "if-off-screen");
  assert.equal(overlays(harness).length, 1);
  assert.equal(top(overlays(harness)[0]), "500px");
  assert.equal(harness.windowState.scrollY, 0, "the page did not move");
  harness.flushTimers();
  assert.equal(harness.messages.slice(before).some((message) => message.type === "previewScroll"), false);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-188#S1
test("if-off-screen scrolls the line to the reading line when it is off screen, as reading-line does", () => {
  const harness = createRuntimeHarness();
  const before = harness.messages.length;
  revealWith(harness, 100, "if-off-screen");
  assert.equal(overlays(harness).length, 1);
  const reference = createRuntimeHarness();
  reveal(reference, 100);
  assert.equal(harness.windowState.scrollY, reference.windowState.scrollY);
  assert.ok(harness.windowState.scrollY > 0);
  harness.flushTimers();
  assert.equal(harness.messages.slice(before).some((message) => message.type === "previewScroll"), false);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-188#S1
// @tests_req SwRS-MDOKFSTUDIO-LIFE-188#S2
test("a message with no scroll field scrolls to the reading line like reading-line", () => {
  const absent = createRuntimeHarness();
  reveal(absent, 100);
  const explicit = createRuntimeHarness();
  revealWith(explicit, 100, "reading-line");
  assert.equal(absent.windowState.scrollY, explicit.windowState.scrollY);
  assert.ok(absent.windowState.scrollY > 0);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-188#S1
// @tests_req SwRS-MDOKFSTUDIO-LIFE-188#S2
test("if-off-screen unfolds a closed details block holding the line in both modes", () => {
  for (const scroll of ["reading-line", "if-off-screen"]) {
    const harness = createRuntimeHarness({ viewportHeight: 900 });
    const details = new RuntimeElement({}, harness.windowState, 400, 40, "details");
    const closed = details as RuntimeElement & { open: boolean };
    closed.open = false;
    details.appendChild(harness.mappings[1]!);
    revealWith(harness, 50, scroll);
    assert.equal(closed.open, true, scroll);
    assert.equal(overlays(harness).length, 1, scroll);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-189#S1
test("previewLineMarkerClear removes the marker and a later reveal draws it again", () => {
  const harness = createRuntimeHarness();
  reveal(harness, 50);
  assert.equal(overlays(harness).length, 1);
  harness.dispatchMessage({ type: "previewLineMarkerClear", ...IDS });
  harness.flushFrames();
  assert.equal(overlays(harness).length, 0);
  assert.equal(harness.mappings[1]!.getAttribute("aria-current"), null);
  reveal(harness, 50);
  assert.equal(overlays(harness).length, 1);
});
