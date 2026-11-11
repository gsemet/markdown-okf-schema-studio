import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createMarkdownTableTools } from "../../../src/page/modules/markdownTable";
import { fillGrid, spreadsheetGrid } from "../../../src/page/modules/tableGridPaste";

const tools = createMarkdownTableTools();
const SOURCE = "| A | B |\n| --- | --- |\n| x | y |\n| p | q |\n";

function paste(source: string, row: number, column: number, text: string): string[] {
  const model = tools.parse(source);
  assert.ok(model);
  const grid = spreadsheetGrid(text);
  assert.ok(grid);
  fillGrid(model, tools, row, column, grid);
  return tools.serialize(model).split("\n");
}

// @tests_req SwRS-MDOKFSTUDIO-TABLE-120
test("a text with a tab is a grid, any other text is not", () => {
  assert.deepEqual(spreadsheetGrid("a\tb\tc\n1\t2\t3\n"), [["a", "b", "c"], ["1", "2", "3"]]);
  assert.deepEqual(spreadsheetGrid("a\tb\r\n"), [["a", "b"]]);
  assert.deepEqual(spreadsheetGrid("a\t\tc"), [["a", "", "c"]]);
  assert.deepEqual(spreadsheetGrid("a\tb\r1\tc"), [["a", "b"], ["1", "c"]]);
  assert.deepEqual(spreadsheetGrid(" a \t b "), [["a", "b"]]);
  assert.equal(spreadsheetGrid("a\n"), undefined);
  assert.equal(spreadsheetGrid("abc"), undefined);
  assert.equal(spreadsheetGrid("a\nb"), undefined);
  assert.equal(spreadsheetGrid(""), undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-120
test("a grid that fits fills the cells and leaves the others", () => {
  assert.deepEqual(paste(SOURCE, 1, 0, "1\t2\n3\t4"), [
    "| A | B |", "| --- | --- |", "| 1 | 2 |", "| 3 | 4 |", "",
  ]);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-120
test("a grid past the table adds the missing column and row", () => {
  const model = tools.parse(SOURCE)!;
  fillGrid(model, tools, 2, 1, spreadsheetGrid("a\tb\tc\n1\t2\t3\n")!);
  assert.deepEqual(model.rows, [
    ["A", "B", "", ""], ["---", "---", "---", "---"], ["x", "y", "", ""], ["p", "a", "b", "c"], ["", "1", "2", "3"],
  ]);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-120
test("the QA grid on the cell row five adds one column and one row", () => {
  const source = "| N | Name | Who |\n| --- | --- | --- |\n| Four | dan | dan |\n| Five | row five | erin |\n";
  const model = tools.parse(source)!;
  fillGrid(model, tools, 2, 1, spreadsheetGrid("a\tb\tc\n1\t2\t3\n")!);
  assert.deepEqual(model.rows, [
    ["N", "Name", "Who", ""], ["---", "---", "---", "---"], ["Four", "dan", "dan", ""],
    ["Five", "a", "b", "c"], ["", "1", "2", "3"],
  ]);
  const text = tools.serialize(model);
  assert.equal(text.includes("\t"), false);
  assert.match(text.split("\n")[3]!, /^\| Five +\| a +\| b +\| c +\|$/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-120
test("a grid started in the header row skips the delimiter row", () => {
  const model = tools.parse(SOURCE)!;
  fillGrid(model, tools, 0, 0, spreadsheetGrid("H1\tH2\nR1\tR2\nR3\tR4\nR5\tR6")!);
  assert.deepEqual(model.rows, [
    ["H1", "H2"], ["---", "---"], ["R1", "R2"], ["R3", "R4"], ["R5", "R6"],
  ]);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-120
test("a value with a pipe is written escaped and empty values empty the cell", () => {
  const model = tools.parse(SOURCE)!;
  fillGrid(model, tools, 1, 0, spreadsheetGrid("a|b\t\n")!);
  const lines = tools.serialize(model).split("\n");
  assert.match(lines[2]!, /^\| a\\\|b +\| +\|$/u);
  assert.deepEqual(tools.parse(tools.serialize(model))!.rows[2], ["a\\|b", ""]);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-120
test("a list-table model grows and writes back as a list-table", () => {
  const list = "```{list-table}\n:header-rows: 1\n\n* - Name\n  - Qty\n* - apple\n  - 3\n```";
  const model = tools.parseListTable(list);
  assert.ok(model);
  fillGrid(model, tools, 1, 1, spreadsheetGrid("5\t6\n7\t8")!);
  const written = tools.serialize(model);
  assert.equal(written, [
    "```{list-table}", ":header-rows: 1", "",
    "* - Name", "  - Qty", "  -",
    "* - apple", "  - 5", "  - 6",
    "* -", "  - 7", "  - 8",
    "```",
  ].join("\n"));
});
