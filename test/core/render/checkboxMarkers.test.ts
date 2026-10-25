import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  checkboxToggleEdit,
  hasCheckboxPlaceholder,
  prepareCheckboxMarkers,
  restoreCheckboxPlaceholders,
  splitCheckboxPlaceholders,
} from "../../../src/core/render/checkboxMarkers";

test("markers are found with document line and UTF-16 column, and line breaks are preserved", () => {
  const source = "- [ ] open\r\n- [x] done\n\n| [X] | é [ ] |\n";
  const prepared = prepareCheckboxMarkers(source, 4);
  assert.deepEqual(prepared.markers.map(({ line, column, checked, text }) => ({ line, column, checked, text })), [
    { line: 4, column: 2, checked: false, text: "[ ]" },
    { line: 5, column: 2, checked: true, text: "[x]" },
    { line: 7, column: 2, checked: true, text: "[X]" },
    { line: 7, column: 10, checked: false, text: "[ ]" },
  ]);
  assert.equal(prepared.text.split(/\r\n|\n|\r/u).length, source.split(/\r\n|\n|\r/u).length);
  assert.ok(prepared.text.includes("\r\n"), "CRLF line endings are kept");
  assert.doesNotMatch(prepared.text, /\[[ xX]\]/u);
  assert.ok(hasCheckboxPlaceholder(prepared.text));
});

test("placeholders contain no character Markdown could interpret", () => {
  const prepared = prepareCheckboxMarkers(Array.from({ length: 300 }, () => "[ ]").join(" "));
  assert.equal(prepared.markers.length, 300);
  assert.doesNotMatch(prepared.text.replace(/ /gu, ""), /[\x00-\x7f]/u);
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-016
test("link syntax, escapes, wikilinks, images and headings are not checkboxes", () => {
  const cases = [
    "[x](https://example.com)",
    "[ ](relative.md)",
    "[x][ref]",
    "[text][x]",
    "[[x]]",
    "![x](image.png)",
    "\\[ ] escaped",
    "[x]: https://example.com",
    "   [ ]: still a definition shape",
    "# Heading [ ]",
    "### Heading [x] too",
  ];
  for (const line of cases) {
    const prepared = prepareCheckboxMarkers(line);
    assert.deepEqual(prepared.markers, [], `"${line}" must stay literal`);
    assert.equal(prepared.text, line);
  }
});

test("a defined [x] reference label keeps [x] as a link but [ ] stays a checkbox", () => {
  const prepared = prepareCheckboxMarkers("See [x] and [ ].\n\n[x]: https://example.com\n");
  assert.deepEqual(prepared.markers.map((marker) => marker.text), ["[ ]"]);
});

test("a colon after a marker mid-line does not prevent a checkbox", () => {
  const prepared = prepareCheckboxMarkers("- [x]: shipped");
  assert.deepEqual(prepared.markers.map((marker) => marker.column), [2]);
});

test("placeholders split and restore to the original marker text", () => {
  const prepared = prepareCheckboxMarkers("a [ ] b [X] c");
  assert.deepEqual(splitCheckboxPlaceholders(prepared.text, prepared.markers), [
    { text: "a " }, { marker: 0 }, { text: " b " }, { marker: 1 }, { text: " c" },
  ]);
  assert.equal(restoreCheckboxPlaceholders(prepared.text, prepared.markers), "a [ ] b [X] c");
  assert.equal(restoreCheckboxPlaceholders("no markers", prepared.markers), "no markers");
});

test("toggling computes a one-character edit and validates the marker", () => {
  assert.deepEqual(checkboxToggleEdit("- [ ] task", 2, true), { column: 3, replacement: "x", changed: true });
  assert.deepEqual(checkboxToggleEdit("- [x] task", 2, false), { column: 3, replacement: " ", changed: true });
  assert.deepEqual(checkboxToggleEdit("- [X] task", 2, false), { column: 3, replacement: " ", changed: true });
  assert.deepEqual(checkboxToggleEdit("- [X] task", 2, true), { column: 3, replacement: "x", changed: false });
  assert.equal(checkboxToggleEdit("- [ ] task", 3, true), undefined);
  assert.equal(checkboxToggleEdit("- (x) task", 2, true), undefined);
  assert.equal(checkboxToggleEdit("- [ ] task", -1, true), undefined);
  assert.equal(checkboxToggleEdit("- [ ] task", 1.5, true), undefined);
  assert.equal(checkboxToggleEdit("[ ", 0, true), undefined);
});
