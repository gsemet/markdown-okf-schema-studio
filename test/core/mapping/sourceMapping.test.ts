import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  parseSourceMappings,
  sourceRangeForLines,
  type MappingElement,
} from "../../../src/core/mapping/sourceMapping";

function element(attributes: Record<string, string>): MappingElement {
  return {
    getAttribute: (name) => attributes[name] ?? null,
  };
}

test("keeps only active-document mappings in DOM order for ties", () => {
  const mappings = parseSourceMappings(
    [
      element({
        "data-sphinx-preview-block": "second",
        "data-sphinx-preview-document": "file:///active.md",
        "data-sphinx-source-file": "/workspace/active.md",
        "data-sphinx-source-line": "12",
      }),
      element({
        "data-sphinx-preview-block": "wrong-document",
        "data-sphinx-preview-document": "file:///other.md",
        "data-sphinx-source-file": "/workspace/active.md",
        "data-sphinx-source-line": "4",
      }),
      element({
        "data-sphinx-preview-block": "first",
        "data-sphinx-preview-document": "file:///active.md",
        "data-sphinx-source-file": "/workspace/active.md",
        "data-sphinx-source-line": "12",
      }),
      element({
        "data-sphinx-preview-block": "included",
        "data-sphinx-preview-document": "file:///active.md",
        "data-sphinx-source-file": "/workspace/included.md",
        "data-sphinx-source-line": "7",
      }),
      element({
        "data-sphinx-preview-block": "invalid-line",
        "data-sphinx-preview-document": "file:///active.md",
        "data-sphinx-source-file": "/workspace/active.md",
        "data-sphinx-source-line": "0",
      }),
      element({
        "data-sphinx-preview-block": "unsafe-line",
        "data-sphinx-preview-document": "file:///active.md",
        "data-sphinx-source-file": "/workspace/active.md",
        "data-sphinx-source-line": "9007199254740992",
      }),
    ],
    {
      documentId: "file:///active.md",
      activeSourceFile: "/workspace/active.md",
    },
  );

  assert.deepEqual(
    mappings.map((mapping) => [mapping.blockId, mapping.sourceLine]),
    [["second", 12], ["first", 12]],
  );
});

test("accepts Windows separators without weakening document identity", () => {
  const mappings = parseSourceMappings(
    [element({
      "data-sphinx-preview-document": "preview-1",
      "data-sphinx-source-file": "C:\\workspace\\active.md",
      "data-sphinx-source-line": "8",
    })],
    {
      documentId: "preview-1",
      activeSourceFile: "C:/workspace/active.md",
    },
  );

  assert.equal(mappings[0]?.sourceLine, 8);
});

test("source ranges preserve line endings and reject invalid bounds", () => {
  const source = "one\r\ntwo\r\nthree";
  const middle = sourceRangeForLines(source, 2, 2);
  const final = sourceRangeForLines(source, 3, 3);

  assert.deepEqual(middle, { start: 5, end: 10 });
  assert.equal(source.slice(middle!.start, middle!.end), "two\r\n");
  assert.deepEqual(final, { start: 10, end: 15 });
  assert.equal(sourceRangeForLines(source, 3, 2), undefined);
  assert.equal(sourceRangeForLines(source, 1, 4), undefined);
});
