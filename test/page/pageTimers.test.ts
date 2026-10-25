/**
 * Timer ordering of the preview page runtime, pinned with the harness clock (no wall-clock time):
 * the webview-state and `previewState` throttles, the block-editor autosave debounce, the flush of
 * a hidden page, and the bounded wait of a host flush request. Each test states the exact delay
 * boundary, so a later move of the runtime cannot shift a timer by a few milliseconds unnoticed.
 */
import * as assert from "node:assert/strict";
import { test } from "node:test";

import { HARNESS_PAGE } from "../shared/previewIdentity";
import { createRuntimeHarness, type RuntimeHarness } from "./runtimeHarness";

const IDS = HARNESS_PAGE;

function scrollTo(harness: RuntimeHarness, scrollY: number): void {
  harness.windowState.scrollY = scrollY;
  harness.dispatchWindow("scroll");
  harness.flushFrames();
}

function typesSince(harness: RuntimeHarness, index: number): string[] {
  return harness.messages.slice(index).map((message) => String(message.type));
}

function openBlockEditor(harness: RuntimeHarness): RuntimeHarness["createdElements"][number] {
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  harness.dispatchMessage({
    type: "previewEditSource",
    ...IDS,
    editId: harness.messages.at(-1)?.editId,
    originalText: "Second paragraph.\n",
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea, "the block editor opened");
  return textarea;
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-125
test("the webview state is written at once, then at most once per 100 ms with the last state", () => {
  const harness = createRuntimeHarness({ virtualClock: true });
  harness.flushFrames();
  harness.advanceTimers(1_000);
  const start = harness.now();
  const at = (elapsed: number): void => harness.advanceTimers(start + elapsed - harness.now());
  const before = harness.setStateCalls;
  scrollTo(harness, 7);
  assert.equal(harness.setStateCalls - before, 1, "the first write of a window goes through at once");
  for (const [elapsed, scrollY] of [[10, 14], [30, 21], [60, 28]] as const) {
    at(elapsed);
    scrollTo(harness, scrollY);
  }
  assert.equal(harness.setStateCalls - before, 1, "writes inside the window are held back");
  at(99);
  assert.equal(harness.setStateCalls - before, 1, "nothing before the window ends (99 ms)");
  harness.advanceTimers(1);
  assert.equal(harness.setStateCalls - before, 2, "one trailing write when the window ends (100 ms)");
  assert.equal(harness.getWebviewState().scrollTop, 28, "the trailing write carries the last state");
  harness.advanceTimers(1_000);
  assert.equal(harness.setStateCalls - before, 2, "no write without a new state");
  scrollTo(harness, 35);
  assert.equal(harness.setStateCalls - before, 3, "a write after a quiet window goes through at once");
});

test("an unthrottled state write replaces the held-back one and restarts the window", () => {
  const harness = createRuntimeHarness({ virtualClock: true, viewportWidth: 900 });
  harness.flushFrames();
  harness.advanceTimers(1_000);
  scrollTo(harness, 7);
  harness.advanceTimers(20);
  scrollTo(harness, 14);
  const before = harness.setStateCalls;
  assert.equal(harness.pendingTimerCount() > 0, true, "a trailing write is pending");
  // The Description toggle writes the state unthrottled.
  harness.dispatchDocument("click", { target: harness.descriptionButton });
  assert.equal(harness.setStateCalls - before, 1, "the unthrottled write goes through at once");
  assert.equal(harness.getWebviewState().descriptionsCollapsed, true);
  harness.advanceTimers(50);
  assert.equal(harness.setStateCalls - before, 1, "the held-back write was dropped, not written later");
  assert.equal(harness.getWebviewState().descriptionsCollapsed, true, "nothing older overwrites it");
  // The unthrottled write opened a new window: a scroll 50 ms later waits for its end.
  scrollTo(harness, 21);
  assert.equal(harness.setStateCalls - before, 1, "a scroll 50 ms after the unthrottled write is held back");
  harness.advanceTimers(49);
  assert.equal(harness.setStateCalls - before, 1);
  harness.advanceTimers(1);
  assert.equal(harness.setStateCalls - before, 2, "and written 100 ms after the unthrottled write");
  assert.equal(harness.getWebviewState().scrollTop, 21);
});

test("previewState messages are throttled to one per 100 ms; previewScroll is never held back", () => {
  // Without scrollEditorWithPreview, a scroll only reports its state.
  const throttled = createRuntimeHarness({ virtualClock: true, scrollEditorWithPreview: false });
  throttled.flushFrames();
  throttled.advanceTimers(1_000);
  const start = throttled.messages.length;
  scrollTo(throttled, 500);
  assert.deepEqual(typesSince(throttled, start), ["previewState"]);
  throttled.advanceTimers(40);
  scrollTo(throttled, 600);
  throttled.advanceTimers(40);
  scrollTo(throttled, 1_000);
  assert.deepEqual(typesSince(throttled, start), ["previewState"], "held back inside the window");
  throttled.advanceTimers(19);
  assert.deepEqual(typesSince(throttled, start), ["previewState"], "nothing at 99 ms");
  throttled.advanceTimers(1);
  assert.deepEqual(typesSince(throttled, start), ["previewState", "previewState"], "the trailing message at 100 ms");
  assert.equal(throttled.messages.at(-1)?.scrollTop, 1_000, "it carries the last scroll position");

  // With the editor following the preview, every line change is posted at once.
  const leading = createRuntimeHarness({ virtualClock: true });
  leading.flushFrames();
  leading.advanceTimers(1_000);
  const first = leading.messages.length;
  scrollTo(leading, 500);
  leading.advanceTimers(1);
  scrollTo(leading, 1_000);
  assert.deepEqual(typesSince(leading, first), ["previewScroll", "previewScroll"]);
});

test("a hidden page writes the held-back state and posts the held-back previewState at once", () => {
  for (const hide of ["pagehide", "visibilitychange"] as const) {
    const harness = createRuntimeHarness({ virtualClock: true, scrollEditorWithPreview: false });
    harness.flushFrames();
    harness.advanceTimers(1_000);
    scrollTo(harness, 500);
    harness.advanceTimers(10);
    scrollTo(harness, 1_000);
    const writes = harness.setStateCalls;
    const messages = harness.messages.length;
    if (hide === "pagehide") {
      harness.dispatchWindow("pagehide");
    } else {
      harness.setVisibilityState("hidden");
      harness.dispatchDocument("visibilitychange", {});
    }
    assert.equal(harness.setStateCalls - writes, 1, `${hide}: the held-back state is written now`);
    assert.equal(harness.getWebviewState().scrollTop, 1_000);
    assert.deepEqual(typesSince(harness, messages), ["previewState"], `${hide}: the held-back message is posted now`);
    assert.equal(harness.messages.at(-1)?.scrollTop, 1_000);
    harness.advanceTimers(1_000);
    assert.equal(harness.setStateCalls - writes, 1, `${hide}: nothing is written twice`);
    assert.deepEqual(typesSince(harness, messages), ["previewState"], `${hide}: nothing is posted twice`);
  }
});

test("the block editor autosaves 400 ms after the last input, and each input restarts the delay", () => {
  const harness = createRuntimeHarness({ virtualClock: true });
  const textarea = openBlockEditor(harness);
  const before = harness.messages.length;
  const saves = (): Array<Record<string, unknown>> =>
    harness.messages.slice(before).filter((message) => message.type === "previewEditSave");
  textarea.value = "S";
  textarea.dispatch("input");
  harness.advanceTimers(300);
  textarea.value = "Second";
  textarea.dispatch("input");
  harness.advanceTimers(399);
  assert.equal(saves().length, 0, "no save 399 ms after the last input (699 ms after the first)");
  harness.advanceTimers(1);
  assert.equal(saves().length, 1, "one save 400 ms after the last input");
  assert.equal(saves()[0].final, false);
  assert.equal(saves()[0].editedText, "Second\n");
  harness.advanceTimers(10_000);
  assert.equal(saves().length, 1, "no further save without a new input");
});

test("a host flush waiting on a pending frontmatter save answers after exactly 1000 ms", () => {
  const harness = createRuntimeHarness({ virtualClock: true });
  harness.frontmatterRow.setAttribute("data-okf-type", "object");
  harness.frontmatterRow.setAttribute("data-okf-value", JSON.stringify({ a: 1 }));
  harness.frontmatterRow.setAttribute("data-okf-value-yaml", "a: 1\n");
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  textarea.value = "[unclosed";
  textarea.dispatch("blur");
  const plainSave = [...harness.messages].reverse().find((message) => message.type === "previewFrontmatterSave");
  assert.ok(plainSave, "the blur posted a plain save");
  const before = harness.messages.length;
  harness.dispatchMessage({ type: "previewFlushEdit", flushId: "flush-1" });
  harness.advanceTimers(999);
  assert.deepEqual(typesSince(harness, before), [], "the answer waits for the pending save (999 ms)");
  harness.advanceTimers(1);
  assert.deepEqual(typesSince(harness, before), ["previewEditFlushed"], "then answers (1000 ms)");
  assert.equal(harness.messages.at(-1)?.flushId, "flush-1");
  // A late result of the plain save does not answer the flush a second time.
  harness.dispatchMessage({ type: "previewFrontmatterResult", ...IDS, editId: plainSave.editId, saved: true });
  harness.advanceTimers(10_000);
  assert.equal(typesSince(harness, before).filter((type) => type === "previewEditFlushed").length, 1);
});
