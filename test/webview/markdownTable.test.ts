import * as assert from "node:assert/strict";
import { test } from "node:test";

import { lineDelta } from "../shared/lineDelta";
import { createMarkdownTableTools } from "../../src/webview/markdownTable";

test("pipe tables round-trip escaped cells and CRLF line endings", () => {
  const tools = createMarkdownTableTools();
  const source = "| Name | Detail |\r\n| :--- | ---: |\r\n| Brake | `a|b` and x\\|y |\r\n";
  const table = tools.parse(source);
  assert.ok(table);
  assert.deepEqual(table.rows, [
    ["Name", "Detail"], [":---", "---:"], ["Brake", "`a|b` and x\\|y"],
  ]);
  assert.equal(tools.serialize(table), source);
});

test("inserting and deleting table rows and columns preserves the remaining cells", () => {
  const tools = createMarkdownTableTools();
  const source = "| A | B |\n| --- | :---: |\n| x | y |\n| p | q |\n";
  const table = tools.parse(source);
  assert.ok(table);
  const insertedRow = tools.insertRowAfter(table, 1);
  assert.equal(insertedRow, 2);
  table.rows[insertedRow + 1][0] = "new";
  const insertedColumn = tools.insertColumnAfter(table, 0);
  table.rows[insertedRow + 1][insertedColumn] = "cell";
  assert.match(tools.serialize(table), /\| new \| cell \|  \|/u);
  tools.deleteRow(table, insertedRow);
  tools.deleteColumn(table, insertedColumn);
  assert.equal(tools.serialize(table), source);
});

test("table tools cannot delete the header, final body row, or final column", () => {
  const tools = createMarkdownTableTools();
  const source = "| A |\n| --- |\n| x |\n";
  const table = tools.parse(source);
  assert.ok(table);
  assert.equal(tools.deleteRow(table, 0), undefined);
  assert.equal(tools.deleteRow(table, 1), undefined);
  assert.equal(tools.deleteColumn(table, 0), undefined);
  assert.equal(tools.serialize(table), source);
});

test("non-table blocks and malformed separator rows cannot be edited as pipe tables", () => {
  const tools = createMarkdownTableTools();
  for (const source of ["", "Ordinary paragraph\n", "| A |\n", "| A |\n| invalid |\n"]) {
    assert.equal(tools.parse(source), undefined, source);
  }
});

test("cellSegments returns the text between the delimiting pipes, offsets in the untrimmed line", () => {
  const tools = createMarkdownTableTools();
  assert.deepEqual(tools.cellSegments("| a | b |"), [{ start: 1, end: 4 }, { start: 5, end: 8 }]);
  assert.deepEqual(tools.cellSegments("|a|b|"), [{ start: 1, end: 2 }, { start: 3, end: 4 }]);
  assert.deepEqual(tools.cellSegments("a | b"), [{ start: 0, end: 2 }, { start: 3, end: 5 }]);
  const escaped = "  | a \\| b | `x|y` |";
  assert.deepEqual(tools.cellSegments(escaped), [{ start: 3, end: 11 }, { start: 12, end: 19 }]);
  assert.equal(tools.cellSegments(escaped).length, 2);
});

test("inserting a row after the first body row of a padded table adds one padded line", () => {
  const tools = createMarkdownTableTools();
  const source = "| Column A | Column B |\n|----------|----------|\n| first    | second   |";
  const table = tools.parse(source);
  assert.ok(table);
  tools.insertRowAfter(table, 1);
  const delta = lineDelta(source, tools.serialize(table));
  assert.deepEqual(delta, { removed: [], added: ["|          |          |"] });
});

test("a shrinking value in a padded table keeps the original cell width", () => {
  const tools = createMarkdownTableTools();
  const source = "| Column A | Column B |\n|----------|----------|\n| first    | second   |";
  const table = tools.parse(source);
  assert.ok(table);
  table.rows[2][1] = "s";
  const delta = lineDelta(source, tools.serialize(table));
  assert.deepEqual(delta, { removed: ["| first    | second   |"], added: ["| first    | s        |"] });
});

test("deleting the first body row of a compact table removes exactly one line", () => {
  const tools = createMarkdownTableTools();
  const source = "| Step | Owner |\n|---|---|\n| Plan | Ana |\n| Ship | Bo |";
  const table = tools.parse(source);
  assert.ok(table);
  tools.deleteRow(table, 1);
  const delta = lineDelta(source, tools.serialize(table));
  assert.deepEqual(delta, { removed: ["| Plan | Ana |"], added: [] });
});

test("inserting a column re-serializes the table with one more column", () => {
  const tools = createMarkdownTableTools();
  const source = "| Column A | Column B |\n|----------|----------|\n| first    | second   |";
  const table = tools.parse(source);
  assert.ok(table);
  tools.insertColumnAfter(table, 0);
  const reparsed = tools.parse(tools.serialize(table));
  assert.ok(reparsed);
  assert.equal(reparsed.rows[0].length, 3);
  assert.equal(reparsed.rows[2].length, 3);
});

test("a row inserted into a CRLF table keeps CRLF line endings", () => {
  const tools = createMarkdownTableTools();
  const table = tools.parse("| A | B |\r\n|---|---|\r\n| 1 | 2 |\r\n");
  assert.ok(table);
  tools.insertRowAfter(table, 1);
  const output = tools.serialize(table);
  assert.equal(output, "| A | B |\r\n|---|---|\r\n| 1 | 2 |\r\n|   |   |\r\n");
  assert.equal(output.replace(/\r\n/gu, "").includes("\n"), false);
});

test("rows without outer pipes stay parseable when an edge cell is emptied", () => {
  const tools = createMarkdownTableTools();
  const source = "a | b\n--- | ---\nc | d";
  const first = tools.parse(source);
  assert.ok(first);
  first.rows[2][0] = "";
  const firstOutput = tools.serialize(first);
  const reparsedFirst = tools.parse(firstOutput);
  assert.ok(reparsedFirst);
  assert.deepEqual(reparsedFirst.rows[2], ["", "d"]);
  const firstDelta = lineDelta(source, firstOutput);
  assert.equal(firstDelta.removed.length, 1);
  assert.equal(firstDelta.added.length, 1);

  const last = tools.parse(source);
  assert.ok(last);
  last.rows[2][1] = "";
  const lastOutput = tools.serialize(last);
  const reparsedLast = tools.parse(lastOutput);
  assert.ok(reparsedLast);
  assert.deepEqual(reparsedLast.rows[2], ["c", ""]);
  const lastDelta = lineDelta(source, lastOutput);
  assert.equal(lastDelta.removed.length, 1);
  assert.equal(lastDelta.added.length, 1);
});

test("inserting a row into a table without outer pipes adds one parseable row", () => {
  const tools = createMarkdownTableTools();
  const source = "a | b\n--- | ---\nc | d";
  const table = tools.parse(source);
  assert.ok(table);
  tools.insertRowAfter(table, 1);
  const output = tools.serialize(table);
  assert.deepEqual(lineDelta(source, output), { removed: [], added: ["|  |  |"] });
  const reparsed = tools.parse(output);
  assert.ok(reparsed);
  assert.deepEqual(reparsed.rows[3], ["", ""]);

  table.rows[3][0] = "n";
  const filledOutput = tools.serialize(table);
  const reparsedFilled = tools.parse(filledOutput);
  assert.ok(reparsedFilled);
  assert.deepEqual(reparsedFilled.rows[3], ["n", ""]);
});

test("rows with only one outer pipe stay parseable", () => {
  const tools = createMarkdownTableTools();
  const leading = "| a | b\n| --- | ---\n| c | d";
  const leadingTable = tools.parse(leading);
  assert.ok(leadingTable);
  leadingTable.rows[2][1] = "";
  const leadingReparsed = tools.parse(tools.serialize(leadingTable));
  assert.ok(leadingReparsed);
  assert.deepEqual(leadingReparsed.rows[2], ["c", ""]);

  const trailing = "a | b |\n--- | --- |\nc | d |";
  const trailingTable = tools.parse(trailing);
  assert.ok(trailingTable);
  trailingTable.rows[2][0] = "";
  const trailingReparsed = tools.parse(tools.serialize(trailingTable));
  assert.ok(trailingReparsed);
  assert.deepEqual(trailingReparsed.rows[2], ["", "d"]);

  for (const source of [leading, trailing]) {
    const table = tools.parse(source);
    assert.ok(table);
    tools.insertRowAfter(table, 1);
    assert.notEqual(tools.parse(tools.serialize(table)), undefined, source);
  }
});

test("filling an empty cell keeps the table's padding", () => {
  const tools = createMarkdownTableTools();
  const padded = "| A        | B        |\n|----------|----------|\n| first    |          |";
  const paddedTable = tools.parse(padded);
  assert.ok(paddedTable);
  paddedTable.rows[2][1] = "x";
  assert.deepEqual(lineDelta(padded, tools.serialize(paddedTable)), {
    removed: ["| first    |          |"],
    added: ["| first    | x        |"],
  });

  const corpusTable = tools.parse("| Column A | Column B |\n|----------|----------|\n| first    | second   |");
  assert.ok(corpusTable);
  tools.insertRowAfter(corpusTable, 1);
  const s1 = tools.serialize(corpusTable);
  const reparsed = tools.parse(s1);
  assert.ok(reparsed);
  reparsed.rows[3][0] = "x";
  assert.deepEqual(lineDelta(s1, tools.serialize(reparsed)), {
    removed: ["|          |          |"],
    added: ["| x        |          |"],
  });

  const compactEmpty = tools.parse("| a | b |\n| --- | --- |\n| c |  |");
  assert.ok(compactEmpty);
  compactEmpty.rows[2][1] = "x";
  assert.deepEqual(lineDelta("| a | b |\n| --- | --- |\n| c |  |", tools.serialize(compactEmpty)), {
    removed: ["| c |  |"],
    added: ["| c | x |"],
  });

  const noSpaces = "|a|b|\n|---|---|\n|c||";
  const noSpacesTable = tools.parse(noSpaces);
  assert.ok(noSpacesTable);
  noSpacesTable.rows[2][1] = "x";
  assert.deepEqual(lineDelta(noSpaces, tools.serialize(noSpacesTable)), {
    removed: ["|c||"],
    added: ["|c|x|"],
  });
});
