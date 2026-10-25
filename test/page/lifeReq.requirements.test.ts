/**
 * Requirement tests of the page side of the lifecycle: the pending notice fields and the blocks the
 * scroll measurement accepts.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness } from "./runtimeHarness";
import { overlayMessage, pendingOverlays } from "./runtimeTestSupport";

// @tests_req SwRS-MDOKFSTUDIO-LIFE-055
test("the page ignores a pending notice with an oversized or malformed field", () => {
  const harness = createRuntimeHarness();
  harness.dispatchMessage(overlayMessage({ message: "x".repeat(501) }));
  harness.dispatchMessage(overlayMessage({ label: "x".repeat(501) }));
  harness.dispatchMessage(overlayMessage({ visible: "true" }));
  assert.equal(pendingOverlays(harness).length, 0, "no notice appears");
  harness.dispatchMessage(overlayMessage({ message: "x".repeat(500) }));
  const [overlay] = pendingOverlays(harness);
  assert.equal(pendingOverlays(harness).length, 1, "a message of 500 characters is accepted");
  harness.dispatchMessage(overlayMessage({ message: "y".repeat(501) }));
  assert.equal(pendingOverlays(harness).length, 1);
  assert.equal(overlay!.childElements[1]?.textContent, "x".repeat(500), "an existing notice is unchanged");
  harness.dispatchMessage(overlayMessage({ visible: false }));
  assert.equal(pendingOverlays(harness).length, 0, "a valid hide removes the notice");
});

/** The source line the page reports after it scrolled to the block that maps line 100. */
function reportedLine(change?: (block: ReturnType<typeof createRuntimeHarness>["mappings"][number]) => void): unknown {
  const harness = createRuntimeHarness({ scrollEditorWithPreview: true });
  if (change) {
    change(harness.mappings[2]!);
    harness.triggerResizeObserver();
    harness.flushFrames();
  }
  harness.windowState.scrollY = 1_000;
  harness.dispatchWindow("scroll");
  harness.flushFrames();
  return harness.messages.filter((message) => message.type === "previewScroll").at(-1)?.line;
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-119
test("the page uses only mapped blocks of its own document and file that are visible", () => {
  const own = reportedLine();
  assert.ok(Number(own) >= 100, `a block of the page's own document and file is used (${String(own)})`);
  assert.notEqual(reportedLine((block) => block.setAttribute("data-sphinx-source-file", "/workspace/other.md")), own, "another file");
  assert.notEqual(reportedLine((block) => block.setAttribute("data-sphinx-preview-document", "file:///other.md")), own, "another document");
  assert.notEqual(reportedLine((block) => block.setAttribute("data-sphinx-source-line", "0")), own, "a line that is not positive");
  assert.notEqual(reportedLine((block) => block.setAttribute("data-sphinx-source-line", "5x")), own, "a line that is not an integer");
  assert.notEqual(reportedLine((block) => { block.height = 0; }), own, "a block without height is not visible");
  assert.equal(reportedLine((block) => block.setAttribute("data-sphinx-source-file", "\\workspace\\active.md")), own,
    "backslashes of the file path are normalized");
});
