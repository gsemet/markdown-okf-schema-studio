import * as assert from "node:assert/strict";
import { test } from "node:test";

import { carriesFiles, droppedFileUris, nearestPointIndex } from "../../../src/page/modules/dropFiles";

const data = (items: Record<string, string>) => ({ types: Object.keys(items), getData: (format: string) => items[format] ?? "" });

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-004
test("an Explorer drag is recognised and its file addresses read", () => {
  assert.equal(carriesFiles(data({ "text/plain": "x" })), false);
  assert.equal(carriesFiles(data({ "text/uri-list": "file:///a.md" })), true);
  assert.equal(carriesFiles(data({ ResourceURLs: "[]" })), true);
  assert.equal(carriesFiles(null), false);
  assert.deepEqual(droppedFileUris(data({ "text/uri-list": "# c\r\nfile:///a.md\r\nfile:///a.md\r\nhttps://x.y/z\r\nfile:///b.png" })), [
    "file:///a.md", "file:///b.png",
  ]);
  assert.deepEqual(droppedFileUris(data({ ResourceURLs: JSON.stringify(["file:///c.md", 4, "vscode-remote://x"]) })), ["file:///c.md"]);
  assert.deepEqual(droppedFileUris(data({ ResourceURLs: "{not json" })), []);
  assert.deepEqual(droppedFileUris(undefined), []);
  const many = Array.from({ length: 80 }, (_, index) => "file:///f" + index).join("\n");
  assert.equal(droppedFileUris(data({ "text/uri-list": many })).length, 50);
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-004
test("the insertion bar nearest to the pointer is chosen", () => {
  assert.equal(nearestPointIndex([], 10), -1);
  assert.equal(nearestPointIndex([100, 200, 300], 190), 1);
  assert.equal(nearestPointIndex([100, 200, 300], 0), 0);
  assert.equal(nearestPointIndex([100, 200, 300], 900), 2);
});
