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
    item(3, 3, "The Studio", 0, 1, "never"), // markup inside the match: the source has no such text
    item(10, 10, "studio", 0, 1, "atelier"),
    item(1, 1, "Studio", 0, 3, "never"), // the page counted three, the source has one
  ]);
  assert.equal(result.replaced, 1);
  assert.equal(result.skipped, 2);
  assert.equal(applyTextEdits(SOURCE, result.edits).split("\n")[2], "The **Studio** keeps the studio source,");
  assert.equal(applyTextEdits(SOURCE, result.edits).split("\n")[9], "| atelier | x |");
});

/** The block of the bug report: a list whose link target repeats the query. */
const LIST = [
  "# Heading", //                                                         1
  "", //                                                                  2
  "Para needle one.", //                                                  3
  "", //                                                                  4
  "- list needle", //                                                     5
  "- [link needle](https://example.com/needle)", //                       6
  "", //                                                                  7
  "Tail needle.", //                                                      8
  "",
].join("\n");

const planIn = (source: string, items: FindReplaceItem[]) => {
  const result = planFindReplace(source, items);
  assert.ok(!isRefusal(result), "the plan is not refused");
  return { ...result, text: applyTextEdits(source, result.edits) };
};

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-012
test("a link target that repeats the text is left out: the visible matches are replaced, the target kept", () => {
  const result = planIn(LIST, [
    item(3, 3, "needle", 0, 1, "PIN"),
    item(5, 6, "needle", 0, 2, "PIN"),
    item(5, 6, "needle", 1, 2, "PIN"),
    item(8, 8, "needle", 0, 1, "PIN"),
  ]);
  assert.equal(result.replaced, 4);
  assert.equal(result.skipped, 0);
  assert.equal(result.text, LIST.replace("Para needle", "Para PIN").replace("list needle", "list PIN")
    .replace("[link needle]", "[link PIN]").replace("Tail needle", "Tail PIN"));
  assert.match(result.text, /\(https:\/\/example\.com\/needle\)/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-012
test("link titles, angle-bracket targets and targets with parentheses are left out too", () => {
  const source = 'A needle [needle](<x needle> "a needle") and [b](u/(needle)) [c](needle \'needle\') [needle][r]\n';
  const result = planIn(source, [item(1, 1, "needle", 0, 3, "PIN"), item(1, 1, "needle", 1, 3, "PIN"), item(1, 1, "needle", 2, 3, "PIN")]);
  assert.equal(result.replaced, 3);
  assert.equal(result.text, 'A PIN [PIN](<x needle> "a needle") and [b](u/(needle)) [c](needle \'needle\') [PIN][r]\n');
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-012
test("an inline image is left out as a whole: its alt text is neither counted nor replaced", () => {
  const source = "One needle ![alt needle](img/needle.png \"needle\") [![needle](a.png)](needle) two needle.\n";
  const result = planIn(source, [item(1, 1, "needle", 0, 2, "PIN"), item(1, 1, "needle", 1, 2, "PIN")]);
  assert.equal(result.replaced, 2);
  assert.equal(result.text, "One PIN ![alt needle](img/needle.png \"needle\") [![needle](a.png)](needle) two PIN.\n");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-012
test("a reference definition is left out; a footnote definition stays counted", () => {
  const source = ["See [needle][ref] here.", "", "[ref]: https://example.com/needle \"needle\"", "[^n]: a needle note", ""].join("\n");
  const result = planIn(source, [item(1, 4, "needle", 0, 2, "PIN"), item(1, 4, "needle", 1, 2, "PIN")]);
  assert.equal(result.replaced, 2);
  assert.equal(result.text, ["See [PIN][ref] here.", "", "[ref]: https://example.com/needle \"needle\"", "[^n]: a PIN note", ""].join("\n"));
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-012
test("an autolink and a link written in a code span stay counted: the reader sees their text", () => {
  const source = "Go <https://example.com/needle> or `[x](needle)` now.\n";
  const result = planIn(source, [item(1, 1, "needle", 0, 2, "PIN"), item(1, 1, "needle", 1, 2, "PIN")]);
  assert.equal(result.replaced, 2);
  assert.equal(result.text, "Go <https://example.com/PIN> or `[x](PIN)` now.\n");
  const skipped = planFindReplace(source, [item(1, 1, "needle", 0, 1, "PIN")]);
  assert.deepEqual(skipped, { refused: FIND_REPLACE_NOTHING }, "one rendered occurrence against two visible ones is skipped");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-012
test("a link or a definition in a fenced code block stays counted: the reader sees it as code", () => {
  const backticks = ["```text", "[x]: https://needle.example", "See [a](needle).", "```", ""].join("\n");
  const result = planIn(backticks, [item(1, 4, "needle", 0, 2, "PIN"), item(1, 4, "needle", 1, 2, "PIN")]);
  assert.equal(result.replaced, 2);
  assert.equal(result.text, ["```text", "[x]: https://PIN.example", "See [a](PIN).", "```", ""].join("\n"));
  const tildes = ["> ~~~~", "> [x]: needle", "> ~~~~", ""].join("\n");
  assert.equal(planIn(tildes, [item(1, 3, "needle", 0, 1, "PIN")]).text, ["> ~~~~", "> [x]: PIN", "> ~~~~", ""].join("\n"));
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-012
test("the info string of a fence is not taken for the visible match of a definition or link in it", () => {
  // The page shows one `foo` (the info string is not rendered); the source has two visible ones.
  for (const source of ["```foo\n[x]: foo\n```\n", "~~~foo\n[a](foo)\n~~~\n"]) {
    assert.deepEqual(planFindReplace(source, [item(1, 3, "foo", 0, 1, "PIN")]), { refused: FIND_REPLACE_NOTHING }, source);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-012
test("a definition indented by four spaces or a tab is code and stays counted", () => {
  for (const indent of ["    ", "\t"]) {
    const source = `${indent}[x]: needle\n`;
    assert.equal(planIn(source, [item(1, 1, "needle", 0, 1, "PIN")]).text, `${indent}[x]: PIN\n`);
  }
  assert.equal(planIn("   [x]: needle\nA needle.\n", [item(1, 2, "needle", 0, 1, "PIN")]).text, "   [x]: needle\nA PIN.\n");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-012
test("no link inside a link: the outer target after an inner link is visible text", () => {
  const source = "[one [two](needle) three](needle) needle\n";
  const result = planIn(source, [item(1, 1, "needle", 0, 2, "PIN"), item(1, 1, "needle", 1, 2, "PIN")]);
  assert.equal(result.text, "[one [two](needle) three](PIN) PIN\n");
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
