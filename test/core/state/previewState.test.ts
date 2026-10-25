import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  isPreviewPanelState,
  parsePreviewPanelState,
} from "../../../src/core/state/previewState";

// @tests_req SwRS-MDOKFSTUDIO-LIFE-127
test("parses bounded preview panel state and preserves supported fields", () => {
  const state = parsePreviewPanelState({
    documentId: "file:///workspace/active.md",
    sourceFile: "/workspace/active.md",
    sourceLine: 42,
    scrollTop: 128.5,
    focusedBlockId: "source-block-42",
    selectedText: "selected source text",
    openDisclosures: [0, -1, 2, 10_000, "3", 2],
    descriptionsCollapsed: true,
  });

  assert.deepEqual(state, {
    documentId: "file:///workspace/active.md",
    sourceFile: "/workspace/active.md",
    sourceLine: 42,
    scrollTop: 128.5,
    focusedBlockId: "source-block-42",
    selectedText: "selected source text",
    openDisclosures: [0, 2, 2],
    descriptionsCollapsed: true,
  });
  assert.equal(isPreviewPanelState(state), true);
});

test("rejects invalid identity and drops malformed optional state", () => {
  assert.equal(parsePreviewPanelState(undefined), undefined);
  assert.equal(parsePreviewPanelState({ documentId: "", sourceFile: "/workspace/active.md" }), undefined);
  assert.equal(parsePreviewPanelState({ documentId: "file:///active.md", sourceFile: "" }), undefined);

  const state = parsePreviewPanelState({
    documentId: "file:///active.md",
    sourceFile: "/workspace/active.md",
    sourceLine: 0,
    scrollTop: -1,
    focusedBlockId: "x".repeat(201),
    selectedText: "x".repeat(4_097),
    openDisclosures: [Number.NaN, -1, 10_000],
    descriptionsCollapsed: "true",
  });

  assert.deepEqual(state, {
    documentId: "file:///active.md",
    sourceFile: "/workspace/active.md",
  });
  assert.equal(isPreviewPanelState({ documentId: "file:///active.md" }), false);
});
