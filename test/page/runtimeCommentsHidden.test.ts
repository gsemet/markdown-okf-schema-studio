import * as assert from "node:assert/strict";
import { test } from "node:test";

import { HARNESS_PAGE } from "../shared/previewIdentity";
import { createRuntimeHarness, RuntimeElement, type RuntimeHarness } from "./runtimeHarness";

/**
 * The whole page with the review comments hidden (toolbar Comments button off): a click on a former
 * highlight inside a mapped block is a click on plain text. The thread interceptor of
 * modules/commentThreads.ts lets it through to the page input, which reveals the source line.
 */

const THREAD = {
  id: "t1",
  orphaned: true,
  anchor: { line: 50, endLine: 50, quote: "needle", prefix: "", suffix: "" },
  resolved: false,
  createdAt: "2026-10-21T10:00:00Z",
  comments: [{ id: "c1", author: "Ada", createdAt: "2026-10-21T10:00:00Z", body: "Why this?" }],
};

/** A page whose second mapped block (line 50) holds the highlight of thread t1. */
function pageWithHighlight(comments: boolean): { harness: RuntimeHarness; mark: RuntimeElement } {
  const harness = createRuntimeHarness({
    captureOrder: true,
    initialViewPreferences: { zoom: 100, widthMode: "margin", toc: false, incomingChanges: true, comments, toolbarCollapsed: false },
  });
  harness.dispatchMessage({ type: "previewComments", ...HARNESS_PAGE, threads: [THREAD] });
  const block = harness.mappings[1]!;
  const mark = new RuntimeElement({ "data-okf-comment-thread": "t1" }, harness.windowState, block.top, 20, "mark");
  block.appendChild(mark);
  return { harness, mark };
}

function click(harness: RuntimeHarness, target: RuntimeElement): { prevented: boolean; stopped: boolean } {
  const event = {
    type: "click",
    target,
    prevented: false,
    immediatePropagationStopped: false,
    preventDefault(): void { this.prevented = true; },
    stopImmediatePropagation(): void { this.immediatePropagationStopped = true; },
  };
  harness.dispatchDocument("click", event);
  return { prevented: event.prevented, stopped: event.immediatePropagationStopped };
}

const popovers = (harness: RuntimeHarness): RuntimeElement[] => harness.createdElements
  .filter((element) => element.getAttribute("data-okf-comment-popover") !== null && !element.removed);

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-152
test("comments hidden: a click on a former highlight reveals the source line and opens no popover", () => {
  const { harness, mark } = pageWithHighlight(false);
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-comments"), "off");
  const before = harness.messages.length;
  const outcome = click(harness, mark);
  assert.deepEqual(outcome, { prevented: false, stopped: false }, "the click is not swallowed");
  const reveals = harness.messages.slice(before).filter((message) => message.type === "previewReveal");
  assert.equal(reveals.length, 1, "the page reveals the source line of the block, as for plain text");
  assert.equal(reveals[0]!.line, 50);
  assert.equal(reveals[0]!.activation, "click");
  assert.equal(popovers(harness).length, 0, "no thread popover");
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-021
test("comments shown: the same click opens the thread popover and reveals nothing", () => {
  const { harness, mark } = pageWithHighlight(true);
  const before = harness.messages.length;
  const outcome = click(harness, mark);
  assert.deepEqual(outcome, { prevented: true, stopped: true });
  assert.equal(harness.messages.slice(before).filter((message) => message.type === "previewReveal").length, 0);
  assert.equal(popovers(harness).length, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-152
test("the setting false closes the open thread popover and a click on the highlight is plain text; true restores it", () => {
  const { harness, mark } = pageWithHighlight(true);
  click(harness, mark);
  assert.equal(popovers(harness).length, 1, "the popover is open while comments are shown");

  harness.dispatchMessage({ type: "previewShowComments", ...HARNESS_PAGE, showComments: false });
  assert.equal(harness.documentElement.getAttribute("data-okf-show-comments"), "false");
  assert.equal(popovers(harness).length, 0, "the setting turned off: the open popover is removed");

  const before = harness.messages.length;
  assert.deepEqual(click(harness, mark), { prevented: false, stopped: false }, "the click is not swallowed");
  assert.equal(harness.messages.slice(before).filter((message) => message.type === "previewReveal").length, 1);
  assert.equal(popovers(harness).length, 0, "no popover opens while the setting is off");

  harness.dispatchMessage({ type: "previewShowComments", ...HARNESS_PAGE, showComments: true });
  click(harness, mark);
  assert.equal(popovers(harness).length, 1, "the setting turned on again: the highlight opens the popover");
});
