import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness } from "./runtimeHarness";
import { patchMessage } from "./runtimeTestSupport";

/**
 * Headless attempt to force the `toc` integration flake ("Edit mode did not switch"). It covers
 * rapid clicks on the edit toggle, content patches between and right after them, a page that boots
 * from a saved mode (`src/page/runtime.ts`). None of them reproduced the flake. This does not
 * cover a full re-render of the webview (a theme change) nor a click that never reaches the page,
 * so those stay open: they are only observable in the real window (the `toc-loop` CI job).
 */
const mode = (harness: ReturnType<typeof createRuntimeHarness>): string | null =>
  harness.documentElement.getAttribute("data-sphinx-preview-edit-mode");
const editModeMessages = (harness: ReturnType<typeof createRuntimeHarness>): unknown[] =>
  harness.messages.filter((message) => message.type === "previewEditModeChanged").map((message) => message.editMode);

test("the edit toggle sets the mode attribute at boot, before any click", () => {
  assert.equal(mode(createRuntimeHarness()), "off");
  assert.equal(mode(createRuntimeHarness({ savedState: { editMode: true } })), "on");
});

test("rapid clicks alternate the mode, the button state and the messages to the host", () => {
  const harness = createRuntimeHarness();
  const expected: string[] = [];
  for (let click = 1; click <= 9; click += 1) {
    harness.editModeButton.dispatch("click");
    const wanted = click % 2 === 1 ? "on" : "off";
    expected.push(wanted);
    assert.equal(mode(harness), wanted, `click ${click}`);
    assert.equal(harness.editModeButton.getAttribute("data-edit-mode"), wanted);
    assert.equal(harness.editModeButton.getAttribute("aria-pressed"), String(wanted === "on"));
  }
  assert.deepEqual(editModeMessages(harness), expected.map((value) => value === "on"));
});

test("a content patch between clicks keeps the mode the last click set", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  harness.dispatchMessage(patchMessage());
  assert.equal(mode(harness), "on");
  harness.editModeButton.dispatch("click");
  harness.dispatchMessage(patchMessage({ next: { revision: 9, requestId: 13 }, revision: 8, requestId: 12 }));
  assert.equal(mode(harness), "off");
  assert.equal(harness.editModeButton.getAttribute("data-edit-mode"), "off");
});

test("a boot from a saved state follows it, then clicks switch from it", () => {
  const savedOff = createRuntimeHarness({ savedState: { editMode: false } });
  assert.equal(mode(savedOff), "off");
  savedOff.editModeButton.dispatch("click");
  assert.equal(mode(savedOff), "on");
  assert.deepEqual(editModeMessages(savedOff), [true]);
  const savedOn = createRuntimeHarness({ savedState: { editMode: true } });
  assert.equal(mode(savedOn), "on");
  savedOn.editModeButton.dispatch("click");
  assert.equal(mode(savedOn), "off");
  assert.deepEqual(editModeMessages(savedOn), [false]);
});
