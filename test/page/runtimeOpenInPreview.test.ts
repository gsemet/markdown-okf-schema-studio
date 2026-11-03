import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, RuntimeElement } from "./runtimeHarness";

const mode = (harness: ReturnType<typeof createRuntimeHarness>): string | null =>
  harness.documentElement.getAttribute("data-sphinx-preview-edit-mode");

// @tests_req SwRS-MDOKFSTUDIO-LIFE-172
test("a document opened after another one in the same panel starts in preview mode", () => {
  const harness = createRuntimeHarness({
    savedState: { documentId: "file:///other.md", editMode: true },
  });
  assert.equal(mode(harness), "off");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-172
test("a fresh panel starts in preview mode, whatever the workspace remembers", () => {
  assert.equal(mode(createRuntimeHarness()), "off");
  // A host that still sends the retired initialEditMode choice changes nothing.
  const retired = { initialEditMode: true } as Record<string, unknown>;
  assert.equal(mode(createRuntimeHarness(retired)), "off");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-172
test("the same document keeps its edit mode when the page reloads", () => {
  const harness = createRuntimeHarness({ savedState: { documentId: "file:///active.md", editMode: true } });
  assert.equal(mode(harness), "on");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-172
test("E alone in the preview switches to edit mode", () => {
  const harness = createRuntimeHarness();
  assert.equal(mode(harness), "off");
  let prevented = false;
  harness.dispatchDocument("keydown", { key: "e", target: harness.previewContent, preventDefault: () => { prevented = true; } });
  assert.equal(mode(harness), "on");
  assert.equal(prevented, true);
  assert.deepEqual(
    harness.messages.filter((message) => message.type === "previewEditModeChanged").map((message) => message.editMode),
    [true],
  );
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-172
test("E with a modifier, or typed in a text field, does not switch the mode", () => {
  const harness = createRuntimeHarness();
  harness.dispatchDocument("keydown", { key: "e", ctrlKey: true, target: harness.previewContent, preventDefault: () => undefined });
  harness.dispatchDocument("keydown", { key: "e", metaKey: true, target: harness.previewContent, preventDefault: () => undefined });
  assert.equal(mode(harness), "off");
  const field = new RuntimeElement({}, { scrollY: 0 }, 0, 20, "textarea");
  harness.dispatchDocument("keydown", { key: "e", target: field, preventDefault: () => assert.fail("typing is not prevented") });
  assert.equal(mode(harness), "off");
});
