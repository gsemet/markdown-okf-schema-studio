/**
 * Requirement test of the selected text a scroll report carries: the page turns a selection into
 * text once, and again only when the selection changes (issue 547). A change of the content under an
 * unmoved selection is covered in a real page by `frameReadsInChromium.test.ts`.
 */
import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, type RuntimeHarness } from "./runtimeHarness";

interface FakeSelection {
  /** How often the page turned the selection into text. */
  reads: number;
  text: string;
  anchorNode: object;
  anchorOffset: number;
  focusNode: object;
  focusOffset: number;
}

function selectionOn(harness: RuntimeHarness): FakeSelection {
  const node = {};
  const selection: FakeSelection = { reads: 0, text: "first words", anchorNode: node, anchorOffset: 0, focusNode: node, focusOffset: 11 };
  harness.window.getSelection = () => Object.assign(selection, {
    rangeCount: 1,
    isCollapsed: false,
    toString: () => {
      selection.reads += 1;
      return selection.text;
    },
  });
  return selection;
}

/** Scrolls, runs the frame, and answers with the selected text of the report the scroll posted. */
function scrollTo(harness: RuntimeHarness, scrollY: number): unknown {
  const before = harness.messages.length;
  harness.windowState.scrollY = scrollY;
  harness.dispatchWindow("scroll");
  harness.flushFrames();
  harness.advanceTimers(200); // a held-back previewState goes out
  const report = harness.messages.slice(before)
    .filter((message) => message.type === "previewScroll" || message.type === "previewState").at(-1);
  assert.ok(report, `a scroll to ${scrollY} posts a report`);
  return report.selectedText;
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-108#S11
test("scroll reports over an unchanged selection turn it into text once and keep carrying it", () => {
  const harness = createRuntimeHarness({ virtualClock: true });
  harness.flushFrames();
  const selection = selectionOn(harness);
  assert.equal(scrollTo(harness, 100), "first words");
  assert.equal(scrollTo(harness, 400), "first words");
  assert.equal(scrollTo(harness, 700), "first words");
  assert.equal(selection.reads, 1, "one text for three reports");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-108#S11
test("a changed selection is turned into text again for the next scroll report", () => {
  const harness = createRuntimeHarness({ virtualClock: true });
  harness.flushFrames();
  const selection = selectionOn(harness);
  assert.equal(scrollTo(harness, 100), "first words");

  // The browser announces the change; the ends happen to be the same objects and offsets.
  selection.text = "other words";
  harness.dispatchDocument("selectionchange", {});
  harness.flushFrames();
  selection.reads = 0;
  assert.equal(scrollTo(harness, 400), "other words");
  assert.equal(selection.reads, 1);

  // A scroll that comes before the announcement sees the new ends.
  selection.text = "more";
  selection.focusOffset = 4;
  assert.equal(scrollTo(harness, 700), "more");
  assert.equal(selection.reads, 2);

  // No text any more: the report carries none.
  selection.text = "";
  harness.dispatchDocument("selectionchange", {});
  harness.flushFrames();
  assert.equal(scrollTo(harness, 100), undefined);
});
