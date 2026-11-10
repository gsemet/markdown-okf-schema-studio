import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createMarkdownTableTools } from "../../../src/page/modules/markdownTable";

/**
 * The move of a column of a pipe table (the model) and of a `{list-table}` (the directive source),
 * in modules/markdownTable.ts and modules/listTableMove.ts.
 */

const tools = createMarkdownTableTools();

const PIPE = "| H1 | H2 | H3 |\n| :--- | --- | ---: |\n| a1 | a2 | a3 |\n| b1 | b2 | b3 |\n";

function movedPipe(source: string, from: number, to: number): string | undefined {
  const model = tools.parse(source);
  assert.ok(model);
  return tools.moveColumn(model, from, to) === undefined ? undefined : tools.serialize(model);
}

// @tests_req SwRS-MDOKFSTUDIO-TABLE-007
test("moving a pipe table column moves its cells and its alignment colons in every line", () => {
  assert.equal(movedPipe(PIPE, 0, 2),
    "| H2 | H3 | H1 |\n| --- | ---: | :--- |\n| a2 | a3 | a1 |\n| b2 | b3 | b1 |\n");
  assert.equal(movedPipe(PIPE, 2, 0),
    "| H3 | H1 | H2 |\n| ---: | :--- | --- |\n| a3 | a1 | a2 |\n| b3 | b1 | b2 |\n");
  assert.equal(movedPipe(PIPE, 1, 0),
    "| H2 | H1 | H3 |\n| --- | :--- | ---: |\n| a2 | a1 | a3 |\n| b2 | b1 | b3 |\n");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-007
test("a moved pipe column keeps the padding and the outer pipes of every line as written", () => {
  const padded = "  | Name   | Qty |\n  |--------|-----|\n  | apple  | 3   |\n  | banana | 12  |\n";
  assert.equal(movedPipe(padded, 0, 1),
    "  | Qty | Name   |\n  |-----|--------|\n  | 3   | apple  |\n  | 12  | banana |\n");
  // Without outer pipes, each segment between pipes travels as written (with its own spaces).
  const bare = "H1 | H2\n--- | ---\na | b\n";
  assert.equal(movedPipe(bare, 0, 1), " H2|H1 \n ---|--- \n b|a \n");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-007
test("the pipe table model refuses a column move outside the table or onto the same place", () => {
  for (const [from, to] of [[0, 0], [-1, 1], [0, 3], [3, 0], [0.5, 1]] as const) {
    const model = tools.parse(PIPE)!;
    assert.equal(tools.moveColumn(model, from, to), undefined, `${from} -> ${to}`);
    assert.equal(tools.serialize(model), PIPE, "a refused move leaves the model unchanged");
  }
});

const LIST = [
  "```{list-table} Fruit",
  ":header-rows: 1",
  ":widths: 20 30 50",
  "",
  "* - H1",
  "  - H2",
  "  - H3",
  "* - a1",
  "  - a2",
  "  - a3",
  "* - b1",
  "  - b2",
  "",
  "    more of b2",
  "  - b3",
  "```",
  "",
].join("\n");

// @tests_req SwRS-MDOKFSTUDIO-TABLE-007
test("moving a list-table column reorders the cells of every row and the :widths: numbers", () => {
  assert.equal(tools.moveListTableColumn(LIST, 0, 2), [
    "```{list-table} Fruit",
    ":header-rows: 1",
    ":widths: 30 50 20",
    "",
    "* - H2",
    "  - H3",
    "  - H1",
    "* - a2",
    "  - a3",
    "  - a1",
    "* - b2",
    "",
    "    more of b2",
    "  - b3",
    "  - b1",
    "```",
    "",
  ].join("\n"));
  assert.equal(tools.moveListTableColumn(LIST, 2, 1)?.split("\n").slice(4, 7).join("|"), "* - H1|  - H3|  - H2");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-007
test("a moved list-table column keeps empty cells, nested content, indentation, fence and line endings", () => {
  const source = [
    "  :::{list-table}", "  :header-rows: 0", "", "  * - x", "    -", "    - - nested", "      - list",
    "  * -", "    - y", "    - z", "  :::",
  ].join("\r\n");
  assert.equal(tools.moveListTableColumn(source, 1, 0), [
    "  :::{list-table}", "  :header-rows: 0", "", "  * -", "    - x", "    - - nested", "      - list",
    "  * - y", "    -", "    - z", "  :::",
  ].join("\r\n"));
  // The last line has no line ending: the result has none either.
  const open = "```{list-table}\n\n* - a\n  - b";
  assert.equal(tools.moveListTableColumn(open, 0, 1), "```{list-table}\n\n* - b\n  - a");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-007
test("a list-table column move is refused for ragged rows, a bad index or a source that is no list-table", () => {
  const ragged = "```{list-table}\n\n* - a\n  - b\n* - c\n```\n";
  assert.equal(tools.moveListTableColumn(ragged, 0, 1), undefined);
  assert.equal(tools.moveListTableColumn(LIST, 0, 0), undefined);
  assert.equal(tools.moveListTableColumn(LIST, 0, 3), undefined);
  assert.equal(tools.moveListTableColumn(LIST, -1, 1), undefined);
  assert.equal(tools.moveListTableColumn(PIPE, 0, 1), undefined);
  assert.equal(tools.moveListTableColumn("```{list-table}\n\n* text\n```\n", 0, 1), undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-007
test("a :widths: option that does not match the columns stays as written", () => {
  const source = "```{list-table}\n:widths: auto\n\n* - a\n  - b\n```\n";
  assert.equal(tools.moveListTableColumn(source, 0, 1), "```{list-table}\n:widths: auto\n\n* - b\n  - a\n```\n");
  const odd = "```{list-table}\n:widths: 1 2 3\n\n* - a\n  - b\n```\n";
  assert.equal(tools.moveListTableColumn(odd, 0, 1), "```{list-table}\n:widths: 1 2 3\n\n* - b\n  - a\n```\n");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-007
test("converting a pipe table to a list-table and moving a column in each gives the same grid", () => {
  const list = tools.convertTable(PIPE, "list-table");
  assert.ok(list && list.ok);
  const moved = tools.moveListTableColumn(list.text, 0, 2);
  assert.ok(moved);
  const back = tools.convertTable(moved, "pipe");
  assert.ok(back && back.ok);
  // The alignment colons are not in a list-table: compare the cells only.
  const cells = (text: string): string[] => text.split("\n").filter((line) => !line.includes("---"))
    .map((line) => line.replace(/\s+/gu, " ").trim());
  assert.deepEqual(cells(back.text), cells(movedPipe(PIPE, 0, 2)!));
});

const T2 = "| Name | Value | Note |\n| --- | --- | --- |\n| alpha | 1 | first ^row-b |\n| beta | 2 | second |\n| gamma | 3 | third |\n";

// @tests_req SwRS-MDOKFSTUDIO-TABLE-007
test("a column move leaves a block id ending the last cell at the end of its row", () => {
  assert.equal(movedPipe(T2, 2, 1),
    "| Name | Note | Value |\n| --- | --- | --- |\n| alpha | first | 1 | ^row-b\n| beta | second | 2 |\n| gamma | third | 3 |\n");
  // Moving the column back keeps the token in the tail.
  const model = tools.parse(T2)!;
  tools.moveColumn(model, 2, 1);
  const moved = tools.parse(tools.serialize(model))!;
  tools.moveColumn(moved, 1, 2);
  assert.equal(tools.serialize(moved),
    "| Name | Value | Note |\n| --- | --- | --- |\n| alpha | 1 | first | ^row-b\n| beta | 2 | second |\n| gamma | 3 | third |\n");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-007
test("a column move keeps a row tail at the end of its line and an anchor element with its cell", () => {
  const tailed = "| Name | Value | Note |\n| --- | --- | --- |\n| alpha | 1 | first | ^row-a\n| beta | 2 | second |\n";
  assert.equal(movedPipe(tailed, 0, 2),
    "| Value | Note | Name |\n| --- | --- | --- |\n| 1 | first | alpha | ^row-a\n| 2 | second | beta |\n");
  const anchor = "| Name | Value | Note |\n| --- | --- | --- |\n| alpha | 1 | first <a id=\"x\"></a> |\n";
  assert.equal(movedPipe(anchor, 2, 1),
    "| Name | Note | Value |\n| --- | --- | --- |\n| alpha | first <a id=\"x\"></a> | 1 |\n");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-007
test("a column inserted after the last also lifts the block id, and a cell holding only the id is emptied", () => {
  const model = tools.parse(T2)!;
  const at = tools.insertColumnAfter(model, 2);
  model.rows[0]![at] = "New";
  assert.equal(tools.serialize(model).split("\n")[2], "| alpha | 1 | first |  | ^row-b");
  const only = tools.parse("| A | B |\n| --- | --- |\n| x | ^row-b |\n")!;
  tools.moveColumn(only, 1, 0);
  assert.equal(tools.serialize(only), "| B | A |\n| --- | --- |\n| | x | ^row-b\n");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-007
test("a block id is not lifted out of a row that has no closing pipe", () => {
  for (const source of [
    "Name | Value | Note\n--- | --- | ---\nalpha | 1 | first ^row-b\n",
    "| Name | Value | Note\n| --- | --- | ---\n| alpha | 1 | first ^row-b\n",
  ]) {
    const out = movedPipe(source, 2, 1)!;
    const reparsed = tools.parse(out);
    assert.ok(reparsed, out);
    assert.deepEqual(reparsed.rows[2], ["alpha", "first ^row-b", "1"], out);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-007
test("a list-table model takes no tail: a column move and an insert keep the id in the written list-table", () => {
  const source = [
    "```{list-table}", ":header-rows: 1", "", "* - H1", "  - H2", "* - a", "  - one ^row-b", "```", "",
  ].join("\n");
  const moved = tools.parseListTable(source)!;
  tools.moveColumn(moved, 1, 0);
  assert.equal(tools.serialize(moved), [
    "```{list-table}", ":header-rows: 1", "", "* - H2", "  - H1", "* - one ^row-b", "  - a", "```", "",
  ].join("\n"));
  const inserted = tools.parseListTable(source)!;
  tools.insertColumnAfter(inserted, 1);
  assert.match(tools.serialize(inserted), /one \^row-b/u);
  assert.notEqual(tools.serialize(inserted), source);
});
