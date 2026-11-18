/**
 * Requirement tests of the toolbar-navigation scope in the page runtime: which host messages the
 * Back, Next and Anchor buttons follow. Only a message of the page's own render (document,
 * revision and request) changes them.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness } from "./runtimeHarness";

/** The render the harness page shows. */
const OWN = { documentId: "file:///active.md", revision: 7, requestId: 11 } as const;

const OTHER_RENDERS = [
  { name: "another document", ids: { ...OWN, documentId: "file:///other.md" } },
  { name: "another revision", ids: { ...OWN, revision: 99 } },
  { name: "another request", ids: { ...OWN, requestId: 12 } },
] as const;

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-054
test("Back and Next ignore a history state of another document, revision or request, and follow the current render's", () => {
  const harness = createRuntimeHarness();
  for (const { name, ids } of OTHER_RENDERS) {
    harness.dispatchMessage({ type: "previewHistoryState", ...ids, canBack: true, canForward: true });
    assert.equal(harness.backButton.disabled, true, `Back keeps its state for ${name}`);
    assert.equal(harness.nextButton.disabled, true, `Next keeps its state for ${name}`);
  }
  harness.dispatchMessage({ type: "previewHistoryState", ...OWN, canBack: true, canForward: true });
  assert.equal(harness.backButton.disabled, false, "the current render's state enables Back");
  assert.equal(harness.nextButton.disabled, false, "the current render's state enables Next");
  for (const { name, ids } of OTHER_RENDERS) {
    harness.dispatchMessage({ type: "previewHistoryState", ...ids, canBack: false, canForward: false });
    assert.equal(harness.backButton.disabled, false, `an enabled Back stays enabled for ${name}`);
    assert.equal(harness.nextButton.disabled, false, `an enabled Next stays enabled for ${name}`);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-120
test("the Anchor button ignores a pairing of another document, revision or request, and follows its own document's", () => {
  const harness = createRuntimeHarness();
  assert.equal(harness.anchorButton.disabled, false);
  for (const { name, ids } of OTHER_RENDERS) {
    harness.dispatchMessage({ type: "previewPairing", ...ids, pairedTextEditor: false });
    assert.equal(harness.anchorButton.disabled, false, `the button does not change for ${name}`);
  }
  harness.dispatchMessage({ type: "previewPairing", ...OWN, pairedTextEditor: false });
  assert.equal(harness.anchorButton.disabled, true, "a pairing of the page's document is followed");
  assert.equal(harness.anchorButton.getAttribute("aria-pressed"), "false");
  assert.equal(harness.anchorButton.getAttribute("title"), "No text editor shows this file");
  for (const { name, ids } of OTHER_RENDERS) {
    harness.dispatchMessage({ type: "previewPairing", ...ids, pairedTextEditor: true });
    assert.equal(harness.anchorButton.disabled, true, `a disabled button stays disabled for ${name}`);
  }
  harness.dispatchMessage({ type: "previewPairing", ...OWN, pairedTextEditor: true });
  assert.equal(harness.anchorButton.disabled, false);
  assert.equal(harness.anchorButton.getAttribute("aria-label"), "Anchor preview to text editor");
});
