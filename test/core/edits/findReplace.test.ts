import * as assert from "node:assert/strict";
import { test } from "node:test";

import { FIND_REPLACE_NOTHING, planFindReplace } from "../../../src/core/edits/findReplace";
import { applyTextEdits, isRefusal } from "../../../src/core/edits/textEdit";
import type { FindReplaceItem } from "../../../src/core/protocol/pageToHost";

const SOURCE = [
  "# Studio notes", //                                                    1
  "", //                                                                  2
  "The **Studio** keeps the studio source,", //                           3
  "wrapped over two lines of Studio text.", //                            4
  "", //                                                                  5
  "See [studio](https://example.com/studio).", //                         6
  "", //                                                                  7
  "| a | b |", //                                                         8
  "| --- | --- |", //                                                     9
  "| studio | x |", //                                                    10
  "",
].join("\n");

function item(line: number, endLine: number, find: string, occurrence: number, occurrences: number, replacement: string): FindReplaceItem {
  return { line, endLine, find, occurrence, occurrences, replacement };
}

function plan(items: FindReplaceItem[]) {
  const result = planFindReplace(SOURCE, items);
  assert.ok(!isRefusal(result), "the plan is not refused");
  return result;
}

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-012
test("a match is replaced at its own span and the rest of the file is byte-identical", () => {
  const result = plan([item(1, 1, "Studio", 0, 1, "Atelier")]);
  assert.equal(result.replaced, 1);
  assert.equal(result.skipped, 0);
  assert.equal(applyTextEdits(SOURCE, result.edits), SOURCE.replace("# Studio notes", "# Atelier notes"));
  assert.deepEqual(result.edits, [{ start: 2, end: 8, text: "Atelier" }]);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-012
test("the occurrence picks the right one among several in a block, markup around it kept", () => {
  const result = plan([
    item(3, 4, "Studio", 0, 2, "S1"), // inside the bold markup
    item(3, 4, "Studio", 1, 2, "S2"), // second line of the paragraph
    item(3, 4, "studio", 0, 1, "s"),
  ]);
  assert.equal(applyTextEdits(SOURCE, result.edits).split("\n").slice(2, 4).join("\n"),
    "The **S1** keeps the s source,\nwrapped over two lines of S2 text.");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-012
test("a white space of the matched text stands for a wrapped line break of the source", () => {
  const result = plan([item(3, 4, "source, wrapped", 0, 1, "text; folded")]);
  assert.equal(applyTextEdits(SOURCE, result.edits).split("\n")[2],
    "The **Studio** keeps the studio text; folded over two lines of Studio text.");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-012
test("a match that does not map one-to-one to the source is skipped and counted", () => {
  const result = plan([
    item(6, 6, "studio", 0, 1, "atelier"), // the link target holds a second occurrence: the page shows one
    item(10, 10, "studio", 0, 1, "atelier"),
    item(1, 1, "Studio", 0, 3, "never"), // the page counted three, the source has one
  ]);
  assert.equal(result.replaced, 1);
  assert.equal(result.skipped, 2);
  assert.equal(applyTextEdits(SOURCE, result.edits).split("\n")[5], "See [studio](https://example.com/studio).");
  assert.equal(applyTextEdits(SOURCE, result.edits).split("\n")[9], "| atelier | x |");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-012
test("lines that are gone and overlapping spans are skipped; nothing to replace is refused", () => {
  const result = plan([item(1, 1, "Studio", 0, 1, "A"), item(1, 1, "Studio notes", 0, 1, "B"), item(99, 99, "x", 0, 1, "y")]);
  assert.equal(result.replaced, 1);
  assert.equal(result.skipped, 2);
  assert.deepEqual(planFindReplace(SOURCE, [item(99, 99, "x", 0, 1, "y")]), { refused: FIND_REPLACE_NOTHING });
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-012
test("a replacement with a dollar sign or regex characters is inserted as given", () => {
  const result = plan([item(1, 1, "notes", 0, 1, "$1 (a|b) \\n")]);
  assert.equal(applyTextEdits(SOURCE, result.edits).split("\n")[0], "# Studio $1 (a|b) \\n");
});
