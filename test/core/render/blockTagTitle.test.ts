import * as assert from "node:assert/strict";
import { test } from "node:test";

import { commentTagTitle, openingTagTitle, TAG_TITLE_MAX } from "../../../src/core/render/blockTagTitle";

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-003
test("a comment is titled with its literal opener", () => {
  assert.equal(commentTagTitle(false), "<!-- -->");
  assert.equal(commentTagTitle(true), "<!-- TODO -->");
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-003
test("an HTML element block is titled with its real opening tag, attributes included", () => {
  assert.equal(openingTagTitle('<div align="center">'), '<div align="center">');
  assert.equal(openingTagTitle("<details>\n<summary>S</summary>"), "<details>");
  assert.equal(openingTagTitle('  <p   align="center"\n  class="x">text'), '<p align="center" class="x">');
  assert.equal(openingTagTitle("<picture>"), "<picture>");
  assert.equal(openingTagTitle("<br/>"), "<br/>");
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-003
test("a long opening tag is shortened with an ellipsis and keeps its closing bracket", () => {
  const long = `<div align="center" class="${"x".repeat(80)}" id="top">`;
  const title = openingTagTitle(long)!;
  assert.ok(title.length <= TAG_TITLE_MAX, title);
  assert.ok(title.startsWith('<div align="center"'), title);
  assert.ok(title.endsWith("…>"), title);
  assert.equal(openingTagTitle(long, 200), long);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-003
test("text that is not an opening tag has no title", () => {
  assert.equal(openingTagTitle("plain text"), undefined);
  assert.equal(openingTagTitle("</div>"), undefined);
  assert.equal(openingTagTitle("<!-- note -->"), undefined);
});
