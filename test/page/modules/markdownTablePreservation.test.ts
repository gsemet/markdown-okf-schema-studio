import * as assert from "node:assert/strict";
import { test } from "node:test";

import { lineDelta } from "../../shared/lineDelta";
import { createMarkdownTableTools } from "../../../src/page/modules/markdownTable";

// Formatting-preservation contract for the table editor (QA-01). The runtime edits one cell and
// serializes the whole table. Every byte outside the edited cell must stay identical.
//
// Padding rule (the T04 contract):
// - Keep the edited cell's leading whitespace.
// - If the cell had trailing whitespace, pad with spaces so the segment between the pipes keeps
//   its original width.
// - When the new text is too long, use exactly one trailing space.
// - A cell without surrounding whitespace stays without.

interface CorpusEntry {
  name: string;
  source: string;
  row: number;
  column: number;
  value: string;
  expected: string;
}

const compactBook = "| Step | Owner |\n|---|---|\n| Plan | Ana |\n| Ship | Bo |";
const padded = "| Column A | Column B |\n|----------|----------|\n| first    | second   |";

const corpus: CorpusEntry[] = [
  {
    name: "compact-book",
    source: compactBook,
    row: 2,
    column: 1,
    value: "Ana Lee",
    expected: "| Plan | Ana Lee |",
  },
  {
    name: "padded",
    source: padded,
    row: 2,
    column: 1,
    value: "second X",
    expected: "| first    | second X |",
  },
  {
    name: "no-spaces",
    source: "|a|b|\n|---|---|\n|c|d|",
    row: 2,
    column: 1,
    value: "dee",
    expected: "|c|dee|",
  },
  {
    name: "alignment",
    source: "| L | R | C |\n| :--- | ---: | :---: |\n| 1 | 2 | 3 |",
    row: 2,
    column: 2,
    value: "30",
    expected: "| 1 | 2 | 30 |",
  },
  {
    name: "no-outer-pipes",
    source: "a | b\n--- | ---\nc | d",
    row: 2,
    column: 1,
    value: "dd",
    expected: "c | dd",
  },
  {
    name: "escaped-and-code",
    source: "| Key | Value | Code |\n|---|---|---|\n| a \\| b | x | `y|z` |\n| k | v | z |",
    row: 3,
    column: 1,
    value: "w",
    expected: "| k | w | z |",
  },
  {
    name: "indented",
    source: "  | a | b |\n  |---|---|\n  | c | d |",
    row: 2,
    column: 0,
    value: "cc",
    expected: "  | cc | d |",
  },
  {
    name: "crlf",
    source: `${compactBook.replace(/\n/gu, "\r\n")}\r\n`,
    row: 3,
    column: 1,
    value: "Bob",
    expected: "| Ship | Bob |\r",
  },
  {
    name: "wider-than-padding",
    source: padded,
    row: 2,
    column: 0,
    value: "a much longer value",
    expected: "| a much longer value | second   |",
  },
];

test("lineDelta: identical input has no removed or added lines", () => {
  assert.deepEqual(lineDelta("a\nb\nc", "a\nb\nc"), { removed: [], added: [] });
});

test("lineDelta: one changed line is reported as one removed and one added line", () => {
  assert.deepEqual(lineDelta("a\nb\nc", "a\nB\nc"), { removed: ["b"], added: ["B"] });
});

test("lineDelta: one inserted line is reported as one added line", () => {
  assert.deepEqual(lineDelta("a\nc", "a\nb\nc"), { removed: [], added: ["b"] });
});

for (const entry of corpus) {
  // @tests_req SwRS-MDOKFSTUDIO-TABLE-094
  test(`round trip preserves the source: ${entry.name}`, () => {
    const tools = createMarkdownTableTools();
    const model = tools.parse(entry.source);
    assert.ok(model);
    assert.equal(tools.serialize(model), entry.source);
  });
}

for (const entry of corpus) {
  test(`one-cell edit changes exactly one line: ${entry.name}`, () => {
    const tools = createMarkdownTableTools();
    const model = tools.parse(entry.source);
    assert.ok(model);
    model.rows[entry.row][entry.column] = entry.value;
    const output = tools.serialize(model);
    const delta = lineDelta(entry.source, output);
    assert.equal(delta.removed.length, 1);
    assert.equal(delta.added.length, 1);
    assert.equal(delta.added[0], entry.expected);
  });
}

// Safety net for every corpus table: any single-cell edit (header and body rows, every column,
// empty, plain and pipe-containing values) must reparse to the edited model and touch one line.
for (const entry of corpus) {
  // @tests_req SwRS-MDOKFSTUDIO-TABLE-091
  test(`every single-cell edit reparses and changes at most one line: ${entry.name}`, () => {
    const tools = createMarkdownTableTools();
    const original = tools.parse(entry.source);
    assert.ok(original);
    const rowCount = original.rows.length;
    for (let row = 0; row < rowCount; row += 1) {
      if (row === 1) continue;
      for (let column = 0; column < original.rows[row].length; column += 1) {
        for (const value of ["", "x", "a|b"]) {
          const model = tools.parse(entry.source);
          assert.ok(model);
          model.rows[row][column] = value;
          const output = tools.serialize(model);
          const reparsed = tools.parse(output);
          assert.ok(reparsed, `${row},${column},${JSON.stringify(value)} is not a table`);
          const expected = model.rows.map((cells) => [...cells]);
          expected[row][column] = value.replace(/\|/gu, "\\|");
          assert.deepEqual(reparsed.rows, expected, `${row},${column},${JSON.stringify(value)}`);
          const normalize = (text: string) => text.replace(/\r\n/gu, "\n");
          const delta = lineDelta(normalize(entry.source), normalize(output));
          const unchanged: boolean = original.rows[row][column] === value;
          assert.equal(delta.removed.length, unchanged ? 0 : 1, `${row},${column}`);
          assert.equal(delta.added.length, unchanged ? 0 : 1, `${row},${column}`);
        }
      }
    }
  });
}
