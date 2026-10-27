import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createMappedBlocks } from "../../src/page/features/mappedBlocks";

function block(line: number, extra: Record<string, string> = {}) {
  const attributes: Record<string, string> = {
    "data-sphinx-source-file": "/w/a.md",
    "data-sphinx-preview-document": "file:///a.md",
    "data-sphinx-source-line": String(line),
    ...extra,
  };
  return {
    parentElement: null,
    getAttribute: (name: string) => attributes[name] ?? null,
  };
}

function blocksOf(...elements: ReturnType<typeof block>[]) {
  const document = { querySelectorAll: () => elements };
  return createMappedBlocks(document as never, { activeSourceFile: "/w/a.md", documentId: "file:///a.md" } as never);
}

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-008
test("a block inside a folded section is neither selectable nor found by its line", () => {
  const blocks = blocksOf(block(1), block(3, { "data-okf-folded": "" }), block(5));
  assert.deepEqual(blocks.selectableBlocks().map((element) => element.getAttribute("data-sphinx-source-line")), ["1", "5"]);
  assert.equal(blocks.bodyBlockAtLine(3), undefined);
  assert.ok(blocks.bodyBlockAtLine(5));
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-008
test("the folded block stays mapped for scrolling, so the editor and preview still line up", () => {
  const blocks = blocksOf(block(1), block(3, { "data-okf-folded": "" }));
  assert.equal(blocks.topLevelMappedBlocks().length, 2);
});
