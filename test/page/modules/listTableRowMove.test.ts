import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createMarkdownTableTools } from "../../../src/page/modules/markdownTable";

/**
 * The move of a row of a `{list-table}` on the directive source (modules/markdownTable.ts).
 */

const tools = createMarkdownTableTools();

const SIMPLE = [
  "```{list-table} Fruit prices",
  ":header-rows: 1",
  ":widths: 25 75",
  ":align: center",
  "",
  "* - Fruit",
  "  - Notes",
  "* - apple",
  "  - sold by the **kilo**",
  "* - pear",
  "  - sold in boxes",
  "* - plum",
  "  - sold loose",
  "```",
  "",
].join("\n");

// @tests_req SwRS-MDOKFSTUDIO-TABLE-002
test("moving a list-table row reorders its items and keeps the directive, options and fence", () => {
  assert.equal(tools.moveListTableRow(SIMPLE, 1, 3), [
    "```{list-table} Fruit prices",
    ":header-rows: 1",
    ":widths: 25 75",
    ":align: center",
    "",
    "* - Fruit",
    "  - Notes",
    "* - pear",
    "  - sold in boxes",
    "* - plum",
    "  - sold loose",
    "* - apple",
    "  - sold by the **kilo**",
    "```",
    "",
  ].join("\n"));
  assert.equal(tools.moveListTableRow(tools.moveListTableRow(SIMPLE, 1, 3)!, 3, 1), SIMPLE);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-002
test("a list-table item moves with its continuation lines, nested content and inner blank lines", () => {
  const source = [
    "```{list-table}",
    ":header-rows: 1",
    "",
    "* - Name",
    "  - Detail",
    "",
    "* - first",
    "  - line one",
    "    continued here",
    "",
    "    second paragraph",
    "",
    "    - nested a",
    "    - nested b",
    "",
    "* - second",
    "  - short",
    "```",
  ].join("\n");
  assert.equal(tools.moveListTableRow(source, 1, 2), [
    "```{list-table}",
    ":header-rows: 1",
    "",
    "* - Name",
    "  - Detail",
    "",
    "* - second",
    "  - short",
    "",
    "* - first",
    "  - line one",
    "    continued here",
    "",
    "    second paragraph",
    "",
    "    - nested a",
    "    - nested b",
    "```",
  ].join("\n"));
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-002
test("the header rows of a list-table never move and nothing moves into them", () => {
  const rows = (headerRows: string): string => [
    "```{list-table}", ...(headerRows === "" ? [] : [`:header-rows: ${headerRows}`]), "",
    "* - a", "  - 1", "* - b", "  - 2", "* - c", "  - 3", "```", "",
  ].join("\n");
  // No option: every row is a body row.
  assert.ok(tools.moveListTableRow(rows(""), 0, 2));
  assert.ok(tools.moveListTableRow(rows("0"), 0, 1));
  // One header row.
  assert.equal(tools.moveListTableRow(rows("1"), 0, 1), undefined);
  assert.equal(tools.moveListTableRow(rows("1"), 1, 0), undefined);
  assert.ok(tools.moveListTableRow(rows("1"), 1, 2));
  // Two header rows: only the last two rows can swap.
  assert.equal(tools.moveListTableRow(rows("2"), 1, 2), undefined);
  assert.equal(tools.moveListTableRow(rows("2"), 2, 1), undefined);
  assert.equal(tools.moveListTableRow(rows("2"), 2, 2), undefined);
  assert.equal(tools.moveListTableRow(rows("2"), 2, 3), undefined);
  // Three header rows leave one body row: nothing to reorder.
  assert.equal(tools.moveListTableRow(rows("3"), 2, 0), undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-002
test("a list-table inside a container keeps its indentation, fence style and line endings", () => {
  const indented = [
    "  :::{list-table}",
    "  :header-rows: 1",
    "",
    "  * - h",
    "    - h2",
    "  * - x",
    "    - 1",
    "",
    "  * - y",
    "    - 2",
    "  :::",
  ].join("\r\n");
  assert.equal(tools.moveListTableRow(indented, 1, 2), [
    "  :::{list-table}",
    "  :header-rows: 1",
    "",
    "  * - h",
    "    - h2",
    "  * - y",
    "    - 2",
    "",
    "  * - x",
    "    - 1",
    "  :::",
  ].join("\r\n"));
  const unclosed = "````{list-table}\n* - a\n  - 1\n* - b\n  - 2";
  assert.equal(tools.moveListTableRow(unclosed, 0, 1), "````{list-table}\n* - b\n  - 2\n* - a\n  - 1");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-002
test("the list-table move refuses what it cannot read as rows", () => {
  assert.equal(tools.moveListTableRow("| a | b |\n| --- | --- |\n| 1 | 2 |\n", 1, 2), undefined);
  assert.equal(tools.moveListTableRow("```{list-table}\n:header-rows: x\n\n* - a\n* - b\n```\n", 0, 1), undefined);
  assert.equal(tools.moveListTableRow("```{list-table}\nnot a list\n```\n", 0, 1), undefined);
  assert.equal(tools.moveListTableRow(SIMPLE, 1, 9), undefined);
  assert.equal(tools.moveListTableRow(SIMPLE, 2, 2), undefined);
});
