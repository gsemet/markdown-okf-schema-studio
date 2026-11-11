import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createMarkdownTableTools } from "../../../src/page/modules/markdownTable";
import { containedTable } from "../../../src/page/modules/tableInContainer";

const QUOTE = "> | Q1 | Q2 |\n> | --- | --- |\n> | qa | qb |\n> | qc | qd |\n";
const NOTE = "> [!NOTE]\n> | N1 | N2 |\n> | --- | --- |\n> | na | nb |\n";
const MYST = "```{note}\n:class: wide\n| M1 | M2 |\n| --- | --- |\n| ma | mb |\n```\n";
const TWO = "> intro\n> | P | Q |\n> | - | - |\n> | x | y |\n>\n> | R | S |\n> | - | - |\n> | u | v |\n";

/** Opens the table of `rank` in `source`, edits cell [row, column] and returns the container text. */
function edit(source: string, rank: number, row: number, column: number, value: string, count?: number) {
  const tools = createMarkdownTableTools();
  const located = containedTable(source, rank, count);
  assert.ok(located, "the table is located");
  const model = tools.parse(located.tableText);
  assert.ok(model, "the table text parses");
  model.container = { write: located.write };
  model.rows[row]![column] = value;
  return tools.serialize(model);
}

// @tests_req SwRS-MDOKFSTUDIO-TABLE-121
test("the table of a quote is read without its prefix and written back with it", () => {
  const located = containedTable(QUOTE, 0, 1);
  assert.ok(located);
  assert.equal(located.tableText, "| Q1 | Q2 |\n| --- | --- |\n| qa | qb |\n| qc | qd |\n");
  assert.equal(
    edit(QUOTE, 0, 2, 0, "qaX", 1),
    "> | Q1 | Q2 |\n> | --- | --- |\n> | qaX | qb |\n> | qc | qd |\n",
  );
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-121
test("the table of a GitHub alert keeps the marker line byte for byte", () => {
  assert.equal(
    edit(NOTE, 0, 2, 1, "nb2", 1),
    "> [!NOTE]\n> | N1 | N2 |\n> | --- | --- |\n> | na | nb2 |\n",
  );
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-121
test("the table of a MyST directive keeps the fence and the option lines byte for byte", () => {
  assert.equal(
    edit(MYST, 0, 0, 0, "M1x", 1),
    "```{note}\n:class: wide\n| M1x | M2 |\n| --- | --- |\n| ma | mb |\n```\n",
  );
  const colon = ":::{note}\n:class: wide\n  | a | b |\n  | - | - |\n  | 1 | 2 |\n:::\n";
  assert.equal(edit(colon, 0, 2, 0, "11", 1), ":::{note}\n:class: wide\n  | a | b |\n  | - | - |\n  | 11 | 2 |\n:::\n");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-121
test("a nested quote keeps its two markers", () => {
  const nested = "> > | A | B |\n> > | - | - |\n> > | 1 | 2 |\n";
  assert.equal(containedTable(nested, 0)?.tableText, "| A | B |\n| - | - |\n| 1 | 2 |\n");
  assert.equal(edit(nested, 0, 2, 1, "22"), "> > | A | B |\n> > | - | - |\n> > | 1 | 22 |\n");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-121
test("a quote marker without a space after it is kept as written", () => {
  const tight = ">| A | B |\n>| - | - |\n>| 1 | 2 |\n";
  assert.equal(edit(tight, 0, 2, 0, "x"), ">| A | B |\n>| - | - |\n>| x | 2 |\n");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-121
test("the second of two tables in one quote is edited by its rank, the first stays as it is", () => {
  const second = containedTable(TWO, 1, 2);
  assert.equal(second?.tableText, "| R | S |\n| - | - |\n| u | v |\n");
  assert.equal(
    edit(TWO, 1, 2, 0, "u2", 2),
    "> intro\n> | P | Q |\n> | - | - |\n> | x | y |\n>\n> | R | S |\n> | - | - |\n> | u2 | v |\n",
  );
  assert.equal(containedTable(TWO, 0, 2)?.tableText, "| P | Q |\n| - | - |\n| x | y |\n");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-121
test("a new row and a new column line carry the prefix of the table lines", () => {
  const tools = createMarkdownTableTools();
  const located = containedTable(QUOTE, 0)!;
  const model = tools.parse(located.tableText)!;
  model.container = { write: located.write };
  const row = tools.insertRowAfter(model, 1);
  model.rows[row + 1]![0] = "new";
  assert.equal(
    tools.serialize(model),
    "> | Q1 | Q2 |\n> | --- | --- |\n> | qa | qb |\n> | new |    |\n> | qc | qd |\n",
  );
  tools.insertColumnAfter(model, 1);
  const lines = tools.serialize(model).split("\n").filter((line) => line !== "");
  assert.equal(lines.length, 5);
  assert.ok(lines.every((line) => line.startsWith("> | ")), lines.join("\n"));
  assert.ok(lines.every((line) => line.split("|").length === 5), lines.join("\n"));
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-121
test("Windows line endings stay and the closing line break is kept or absent as in the source", () => {
  const crlf = "> [!NOTE]\r\n> | A | B |\r\n> | - | - |\r\n> | 1 | 2 |\r\n> after\r\n";
  assert.equal(
    edit(crlf, 0, 2, 0, "9"),
    "> [!NOTE]\r\n> | A | B |\r\n> | - | - |\r\n> | 9 | 2 |\r\n> after\r\n",
  );
  const bare = "> | A | B |\n> | - | - |\n> | 1 | 2 |";
  assert.equal(edit(bare, 0, 2, 1, "3"), "> | A | B |\n> | - | - |\n> | 1 | 3 |");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-121
test("a table written back without a change gives the container text byte for byte", () => {
  const tools = createMarkdownTableTools();
  for (const [source, rank] of [[QUOTE, 0], [NOTE, 0], [MYST, 0], [TWO, 0], [TWO, 1]] as const) {
    const located = containedTable(source, rank)!;
    const model = tools.parse(located.tableText)!;
    model.container = { write: located.write };
    assert.equal(tools.serialize(model), source);
  }
  const padded = ">   | A   | B |\n>   | --- | - |\n>   | 1   | 2 |\n";
  const located = containedTable(padded, 0)!;
  const model = tools.parse(located.tableText)!;
  model.container = { write: located.write };
  assert.equal(tools.serialize(model), padded);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-121
test("a table that cannot be located safely gives nothing", () => {
  // A line without the quote marker among the table lines (a lazy continuation).
  assert.equal(containedTable("> | A | B |\n> | - | - |\n> | 1 | 2 |\n| lazy | row |\n", 0), undefined);
  // `>` and `> ` mixed in one table.
  assert.equal(containedTable("> | A | B |\n>| - | - |\n> | 1 | 2 |\n", 0), undefined);
  // A rank out of range, negative or not an integer.
  assert.equal(containedTable(QUOTE, 1), undefined);
  assert.equal(containedTable(QUOTE, -1), undefined);
  assert.equal(containedTable(QUOTE, 0.5), undefined);
  // The rendered tables are not the pipe tables of the source (a table inside a fence, say).
  assert.equal(containedTable(QUOTE, 0, 2), undefined);
  assert.equal(containedTable("> text only\n", 0), undefined);
  assert.equal(containedTable("", 0), undefined);
});
