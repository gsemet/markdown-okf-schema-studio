import * as assert from "node:assert/strict";
import { test } from "node:test";

import { renderMyst } from "../../../src/core/render/mystRenderer";
import { needsHtmlTablePass } from "../../../src/core/render/mystTables";

// @tests_req SwRS-MDOKFSTUDIO-GFM-008
test("a pipe table gets its source lines from the syntax tree, with no second parse of the HTML", async () => {
  // A parse and serialize of the written HTML would rewrite `-->` as `--&gt;`.
  const { html } = await renderMyst("a --> b\n\n| x | y |\n|---|---|\n| 1 | 2 |\n");

  assert.match(html, /<p data-line="1" data-end-line="1">a --> b<\/p>/u);
  assert.match(html, /<table data-line="3" data-end-line="5">/u);
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-008
test("aligned columns and list-tables still go through the HTML pass", async () => {
  const aligned = await renderMyst("| x | y |\n|:--|--:|\n| 1 | 2 |\n");
  assert.match(aligned.html, /<th align="left">x<\/th>/u);
  assert.match(aligned.html, /<td align="right">2<\/td>/u);
  assert.match(aligned.html, /<table data-line="1" data-end-line="3">/u);

  const listTable = await renderMyst("```{list-table}\n:header-rows: 1\n\n* - h1\n  - h2\n* - a\n  - b\n```\n");
  assert.match(listTable.html, /<table data-line="1"/u);
  assert.doesNotMatch(listTable.html, /<p data-line/u);
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-008
test("only list-tables, raw HTML tables and aligned columns need the HTML pass", () => {
  assert.equal(needsHtmlTablePass([]), false);
  assert.equal(needsHtmlTablePass([undefined, { columns: [undefined, undefined], sourceLine: 1 }]), false);
  assert.equal(needsHtmlTablePass([{ columns: ["left"], sourceLine: 1 }]), true);
  assert.equal(needsHtmlTablePass([{ columns: [], listTable: true }]), true);
  assert.equal(needsHtmlTablePass([{ table: "center", columns: [], raw: true }]), true);
});
