import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  CHECKBOX_GONE,
  checkBlocksPaste,
  COPY_INCLUDED,
  LABEL_GONE,
  MOVE_INCLUDED,
  PASTE_NEXT_TO_INCLUDED,
  planAlertPlaceholder,
  planBlockMoveEdit,
  planBlocksCopyCut,
  planBlocksDelete,
  planBlocksPaste,
  planBlockTextEdit,
  planCheckboxToggle,
  planLabelRename,
  planThreadDelete,
  planThreadReply,
  readThreadLines,
  THREAD_GONE,
  THREAD_REPLY_REFUSED,
} from "../../../src/core/edits/sourceEdits";
import { matchLineEndings } from "../../../src/core/edits/lineEndings";
import { applyTextEdits, type TextEdit } from "../../../src/core/edits/textEdit";

function applied(text: string, plan: { edit: TextEdit } | { refused: string } | { unchanged: true }): string {
  assert.ok("edit" in plan, JSON.stringify(plan));
  return applyTextEdits(text, [plan.edit]);
}

const THREAD = ["<!-- THREAD", "Ada (2026-10-16 10:47):", "  hello", "-->"];

// The placeholder of the emptied block on lines `from` to `to` (1-based) of `lines`.
function placeholderOf(lines: readonly string[], from: number, to: number, eol: string): string | undefined {
  const text = lines.map((line) => line + eol).join("");
  const originalText = lines.slice(from - 1, to).map((line) => line + eol).join("");
  const offset = lines.slice(0, from - 1).reduce((sum, line) => sum + line.length + eol.length, 0);
  return planAlertPlaceholder(text, offset, originalText, originalText);
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-264#S5
test("an emptied block of a GitHub alert body leaves the alert's prefix alone", () => {
  const alert = ["# T", "", "> [!NOTE]", "> First.", ">", "> Second,", "> wrapped.", ">", "> - a", "> - b"];
  const indented = ["- item", "", "   > [!TIP]", "   > First.", "   >", "   > Second."];
  for (const eol of ["\n", "\r\n", "\r"]) {
    assert.equal(placeholderOf(alert, 4, 4, eol), `>${eol}`, "a paragraph");
    assert.equal(placeholderOf(alert, 6, 7, eol), `>${eol}`, "a paragraph of two lines");
    assert.equal(placeholderOf(alert, 9, 9, eol), `>${eol}`, "a list item");
    assert.equal(placeholderOf(indented, 6, 6, eol), `   >${eol}`, "an alert indented in a list item");
  }
  const autosaved = "> [!NOTE]\n> Fir\n>\n> Second.\n";
  assert.equal(planAlertPlaceholder(autosaved, 10, "> Fir\n", "> First.\n"), ">\n",
    "after an autosave wrote another text");
  assert.equal(planAlertPlaceholder("> [!NOTE]\r\n> Last.", 11, "> Last.", "> Last."), ">\r\n",
    "a block with no line break of its own takes the document's");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-264#S4
test("an emptied block outside an alert body keeps the empty placeholder line", () => {
  assert.equal(placeholderOf(["Text.", "", "> A quote.", ">", "> Second."], 3, 3, "\n"), undefined, "a plain quote");
  assert.equal(placeholderOf([":::{note}", "First.", "", "Second.", ":::"], 2, 2, "\n"), undefined, "a MyST body");
  assert.equal(placeholderOf(["# T", "", "Text."], 3, 3, "\n"), undefined, "a top-level block");
  assert.equal(placeholderOf(["> [!NOTE]", "> A.", "", "Text."], 4, 4, "\n"), undefined, "a block below an alert");
  assert.equal(placeholderOf(["> [!NOTE]", "> A,", "lazy."], 2, 3, "\n"), undefined, "a block with a lazy line");
  assert.equal(planAlertPlaceholder("> [!NOTE]\n> A.\n", 12, "A.\n", "A.\n"), undefined, "inside a line");
  assert.equal(planAlertPlaceholder("> [!NOTE]\n", 40, "> A.\n", "> A.\n"), undefined, "past the end");
  assert.equal(planAlertPlaceholder("> [!NOTE]\n", 10, "", ""), undefined, "an insertion");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-117#S7
test("a move inside an alert leaves out the quote's empty lines a mapped range ends on", () => {
  const text = "> [!NOTE]\n>\n> - a\n> - b\n>\n> Last.\n>\n";
  const moved = "> [!NOTE]\n>\n> Last.\n>\n> - a\n> - b\n>\n";
  const down = planBlockMoveEdit(text, { line: 3, endLine: 5, neighbourLine: 6, neighbourEndLine: 7, direction: "down" });
  assert.equal(applied(text, down), moved);
  assert.equal("line" in down && down.line, 5);
  const up = planBlockMoveEdit(text, { line: 6, endLine: 7, neighbourLine: 3, neighbourEndLine: 5, direction: "up" });
  assert.equal(applied(text, up), moved);
  assert.equal("line" in up && up.line, 3);
  const include = "> [!NOTE]\n>\n> ```{include} other.md\n> ```\n>\n> Last.\n";
  assert.deepEqual(
    planBlockMoveEdit(include, { line: 6, endLine: 6, neighbourLine: 3, neighbourEndLine: 4, direction: "up" }),
    { refused: MOVE_INCLUDED },
  );
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-021#S1
// @tests_req SwRS-MDOKFSTUDIO-GFM-021#S5
test("a checkbox toggle changes the one character between the brackets", () => {
  const text = "# Tasks\r\n\r\n- [ ] one\r\n- [x] two\r\n";
  const toggle = planCheckboxToggle(text, 3, 2, true);
  assert.deepEqual(toggle, { edit: { start: 14, end: 15, text: "x" } });
  assert.equal(applied(text, toggle), "# Tasks\r\n\r\n- [x] one\r\n- [x] two\r\n");
  assert.equal(applied(text, planCheckboxToggle(text, 4, 2, false)), "# Tasks\r\n\r\n- [ ] one\r\n- [ ] two\r\n");
});

test("a checkbox already in the asked state is unchanged, a missing one is refused", () => {
  const text = "- [x] done\n";
  assert.deepEqual(planCheckboxToggle(text, 1, 2, true), { unchanged: true });
  assert.deepEqual(planCheckboxToggle(text, 1, 0, true), { refused: CHECKBOX_GONE });
  assert.deepEqual(planCheckboxToggle(text, 3, 2, true), { refused: CHECKBOX_GONE });
  assert.deepEqual(planCheckboxToggle(text, 0, 2, true), { refused: CHECKBOX_GONE });
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-045#S1
// @tests_req SwRS-MDOKFSTUDIO-MYST-045#S3
test("a label rename changes the label line only and counts the remaining references", () => {
  const text = "(old)=\n# Title\n\nSee {ref}`old` and {ref}`text <old>`.\n";
  const rename = planLabelRename(text, 1, "old", "new");
  assert.ok("edit" in rename);
  assert.equal(rename.remainingRefs, 2);
  assert.equal(applyTextEdits(text, [rename.edit]), "(new)=\n# Title\n\nSee {ref}`old` and {ref}`text <old>`.\n");
  assert.deepEqual(planLabelRename(text, 2, "old", "new"), { refused: LABEL_GONE });
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-186#S5
test("thread lines are read only when they are exactly one thread comment", () => {
  const text = ["Before", "", ...THREAD, ""].join("\r\n");
  assert.deepEqual(readThreadLines(text, 3, 6), { lines: THREAD });
  assert.deepEqual(readThreadLines(text, 2, 6), { refused: THREAD_GONE });
  assert.deepEqual(readThreadLines(text, 3, 99), { refused: THREAD_GONE });
  assert.deepEqual(readThreadLines(text, 0, 4), { refused: THREAD_GONE });
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-192#S3
test("deleting a thread removes whole lines and one of two surrounding blank lines", () => {
  const text = ["Before", "", ...THREAD, "", "After", ""].join("\n");
  assert.equal(applied(text, planThreadDelete(text, 3, 6)), "Before\n\nAfter\n");
  const crlf = text.replace(/\n/gu, "\r\n");
  assert.equal(applied(crlf, planThreadDelete(crlf, 3, 6)), "Before\r\n\r\nAfter\r\n");
});

test("deleting a thread at the end of the file removes the line break before it", () => {
  const text = ["Before", "", ...THREAD].join("\n");
  assert.equal(applied(text, planThreadDelete(text, 3, 6)), "Before");
  const only = THREAD.join("\n");
  assert.equal(applied(only, planThreadDelete(only, 1, 4)), "");
});

test("a thread reply replaces the closing line and uses the document's line break", () => {
  const text = ["Before", "", ...THREAD, "After"].join("\r\n");
  const reply = planThreadReply(text, 3, 6, { author: "Bob", date: "2026-10-17 08:00", body: "hi\nthere" }, "\r\n");
  assert.equal(applied(text, reply), [
    "Before", "", ...THREAD.slice(0, 3), "Bob (2026-10-17 08:00):", "  hi", "  there", "-->", "After",
  ].join("\r\n"));
  assert.deepEqual(planThreadReply(text, 3, 6, { author: "Bob", date: "d", body: "  " }, "\r\n"), {
    refused: THREAD_REPLY_REFUSED,
  });
  assert.deepEqual(planThreadReply(text, 1, 2, { author: "Bob", date: "d", body: "x" }, "\n"), { refused: THREAD_GONE });
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-117#S3
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-117#S4
test("a block move swaps the blocks in one edit and gives the moved block's new first line", () => {
  const text = "A\n\nB1\nB2\n\nC\n";
  const down = planBlockMoveEdit(text, { line: 1, endLine: 1, neighbourLine: 3, neighbourEndLine: 4, direction: "down" });
  assert.ok("edit" in down);
  assert.equal(applyTextEdits(text, [down.edit]), "B1\nB2\n\nA\n\nC\n");
  assert.equal(down.line, 4);
  const up = planBlockMoveEdit(text, { line: 6, endLine: 6, neighbourLine: 3, neighbourEndLine: 4, direction: "up" });
  assert.ok("edit" in up);
  assert.equal(applyTextEdits(text, [up.edit]), "A\n\nC\n\nB1\nB2\n");
  assert.equal(up.line, 3);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-117#S6
test("a list mapped up to its trailing blank line moves like any block", () => {
  // The renderer maps a list followed by a blank line to that blank line (lines 9-11 here).
  const text = "---\ntitle: T\n---\n\n# Title\n\n## Scenario\n\n- GIVEN a\n- WHEN b\n\n## Next\n\nTail\n";
  const up = planBlockMoveEdit(text, { line: 12, endLine: 12, neighbourLine: 9, neighbourEndLine: 11, direction: "up" });
  assert.ok("edit" in up, JSON.stringify(up));
  assert.equal(applyTextEdits(text, [up.edit]),
    "---\ntitle: T\n---\n\n# Title\n\n## Scenario\n\n## Next\n\n- GIVEN a\n- WHEN b\n\nTail\n");
  const down = planBlockMoveEdit(text, { line: 9, endLine: 11, neighbourLine: 12, neighbourEndLine: 12, direction: "down" });
  assert.ok("edit" in down, JSON.stringify(down));
  assert.equal(applyTextEdits(text, [down.edit]), applyTextEdits(text, [up.edit]));
  assert.equal(down.line, 11);
  assert.equal(up.line, 9);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-127#S2
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-127#S6
test("a block move is refused for an included block, after the planner's own checks", () => {
  const text = "A\n\n```{include} other.md\n```\n";
  assert.deepEqual(
    planBlockMoveEdit(text, { line: 1, endLine: 1, neighbourLine: 3, neighbourEndLine: 4, direction: "down" }),
    { refused: MOVE_INCLUDED },
  );
  const refused = planBlockMoveEdit(text, { line: 3, endLine: 4, neighbourLine: 1, neighbourEndLine: 1, direction: "down" });
  assert.ok("refused" in refused);
  assert.notEqual(refused.refused, MOVE_INCLUDED, "the order check comes before the include check");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-166#S2
test("copy gives the exact Markdown of the blocks, cut also removes them with one separator", () => {
  const text = "A\r\n\r\nB\r\n\r\nC\r\n";
  assert.deepEqual(planBlocksCopyCut(text, 3, 3, "copy"), { copied: "B" });
  const cut = planBlocksCopyCut(text, 3, 3, "cut");
  assert.ok("copied" in cut && cut.cut);
  assert.equal(cut.copied, "B");
  assert.equal(applyTextEdits(text, [cut.cut.edit]), "A\r\n\r\nC\r\n");
  assert.equal(cut.cut.followingLine, 5);
  const last = planBlocksCopyCut(text, 5, 5, "cut");
  assert.ok("copied" in last && last.cut);
  assert.equal(last.cut.followingLine, undefined);
});

test("copy and cut refuse an included block and a range outside the text", () => {
  const text = "A\n\n```{include} other.md\n```\n";
  assert.deepEqual(planBlocksCopyCut(text, 3, 4, "copy"), { refused: COPY_INCLUDED });
  assert.deepEqual(planBlocksCopyCut(text, 3, 4, "cut"), { refused: COPY_INCLUDED });
  assert.ok("refused" in planBlocksCopyCut(text, 9, 12, "copy"));
});

test("a paste inserts the clipboard as new blocks, never next to an included block", () => {
  const text = "A\n\nB\n";
  assert.equal(checkBlocksPaste(text, 1), undefined);
  assert.equal(applied(text, planBlocksPaste(text, 1, "New")), "A\n\nNew\n\nB\n");
  const included = "```{include} other.md\n```\n\nB\n";
  assert.deepEqual(checkBlocksPaste(included, 1), { refused: PASTE_NEXT_TO_INCLUDED });
  assert.equal(checkBlocksPaste(included, 0), undefined);
  assert.deepEqual(checkBlocksPaste(included, 2), { refused: PASTE_NEXT_TO_INCLUDED }, "after the closing fence line");
  assert.equal(checkBlocksPaste(included, 3), undefined, "the blank line after the directive");
  assert.equal(checkBlocksPaste(included, 4), undefined);
  const colon = "A\n\n:::{include} other.md\n:::\n\nB\n";
  assert.deepEqual(checkBlocksPaste(colon, 4), { refused: PASTE_NEXT_TO_INCLUDED });
  assert.equal(checkBlocksPaste(colon, 2), undefined);
  assert.equal(checkBlocksPaste(included, 99), undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-042#S3
test("a block text edit is the smallest replacement, offset by the block start", () => {
  assert.deepEqual(planBlockTextEdit(10, "Hello world", "Hello there world"), { start: 16, end: 16, text: "there " });
  assert.equal(planBlockTextEdit(10, "same", "same"), undefined);
  const source = "0123456789Hello world!";
  const edit = planBlockTextEdit(10, "Hello world", "Hi world");
  assert.ok(edit);
  assert.equal(applyTextEdits(source, [edit]), "0123456789Hi world!");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-234#S2
for (const [name, eol] of [["LF", "\n"], ["CRLF", "\r\n"], ["CR", "\r"]] as const) {
  test(`a multi-line block edited in a ${name} document keeps ${name} inside the block`, () => {
    const document = `intro${eol}${eol}- a${eol}- b${eol}${eol}outro${eol}`;
    const blockStart = document.indexOf("- a");
    const saved = `- a${eol}- b`;
    // The text box returns LF for every line break.
    const edited = matchLineEndings("- a\n- b\n- c", saved);
    assert.equal(edited, `- a${eol}- b${eol}- c`);
    const edit = planBlockTextEdit(blockStart, saved, edited);
    assert.ok(edit);
    assert.equal(
      applyTextEdits(document, [edit]),
      `intro${eol}${eol}- a${eol}- b${eol}- c${eol}${eol}outro${eol}`,
    );
  });
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-234#S2
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-234#S3
test("a block text with no line break is left as the text box returned it, and a mixed one keeps the endings of the lines left alone", () => {
  assert.equal(matchLineEndings("a\nb", "single line"), "a\nb");
  assert.equal(matchLineEndings("a\nb", "single line", "x\ny\nz"), "a\nb");
  // Was "a\nb" (mixed endings written as the text box returned them); the first line is left alone and keeps its CR LF.
  assert.equal(matchLineEndings("a\nb", "a\r\nb\nc"), "a\r\nb");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-234#S1
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-234#S2
test("a single-line block takes the line ending of the document", () => {
  assert.equal(matchLineEndings("abc\ndef", "abc", "one\r\nabc\r\ntwo"), "abc\r\ndef");
  assert.equal(matchLineEndings("abc\ndef", "abc", "one\rabc\rtwo"), "abc\rdef");
  assert.equal(matchLineEndings("abc\ndef", "abc", "one\r\nabc\ntwo"), "abc\ndef");
});

const EOLS = [["LF", "\n"], ["CRLF", "\r\n"], ["lone CR", "\r"]] as const;
const OUT_OF_DATE = { refused: "The preview is out of date. Refresh it and try again." };

for (const [name, eol] of EOLS) {
  const join = (...lines: string[]): string => lines.join(eol);

  function cutOf(text: string, line: number, endLine: number): { copied: string; text: string; followingLine?: number } {
    const plan = planBlocksCopyCut(text, line, endLine, "cut");
    assert.ok("copied" in plan && plan.cut, JSON.stringify(plan));
    return { copied: plan.copied, text: applyTextEdits(text, [plan.cut.edit]), followingLine: plan.cut.followingLine };
  }

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-166#S1
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-169#S1
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-169#S4
  test(`${name}: copy and cut of a list in the middle drop the blank lines after it`, () => {
    const doc = join("Para", "", "- a", "- b", "", "", "Next", "");
    assert.deepEqual(planBlocksCopyCut(doc, 3, 6, "copy"), { copied: join("- a", "- b") });
    const cut = cutOf(doc, 3, 6);
    assert.equal(cut.copied, join("- a", "- b"));
    assert.equal(cut.text, join("Para", "", "Next", ""));
    assert.equal(cut.followingLine, 7);
    assert.ok(!cut.text.includes(eol.repeat(3)));
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-169#S6
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-169#S7
  test(`${name}: cut of a list that is the last block`, () => {
    const cut = cutOf(join("Para", "", "- a", "- b", "", "", ""), 3, 6);
    assert.equal(cut.text, join("Para", ""));
    assert.equal(cut.followingLine, undefined);
    assert.equal(cut.copied, join("- a", "- b"));
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-166#S1
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-169#S6
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-169#S7
  test(`${name}: copy and cut of a selection that ends on a list`, () => {
    const doc = join("Alpha", "", "- a", "- b", "", "Omega", "");
    assert.deepEqual(planBlocksCopyCut(doc, 1, 5, "copy"), { copied: join("Alpha", "", "- a", "- b") });
    assert.equal(cutOf(doc, 1, 5).text, join("Omega", ""));
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-169#S6
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-169#S7
  test(`${name}: a cut gives the text and the following line of Delete block`, () => {
    const cases: [string, number, number][] = [
      [join("Para", "", "- a", "- b", "", "", "Next", ""), 3, 6],
      [join("Para", "", "- a", "- b", "", "", ""), 3, 6],
      [join("Alpha", "", "- a", "- b", "", "Omega", ""), 1, 5],
      [join("Para", "- a", "- b", "", "", "Next", ""), 2, 5],
      [join("Para", "", "- a", "- b", "", " \t", "", "Next", ""), 3, 7],
    ];
    for (const [doc, line, endLine] of cases) {
      const cut = cutOf(doc, line, endLine);
      const deleted = planBlocksDelete(doc, line, endLine);
      assert.ok("edit" in deleted, JSON.stringify(deleted));
      assert.equal(cut.text, applyTextEdits(doc, [deleted.edit]), JSON.stringify(doc));
      assert.equal(cut.followingLine, deleted.followingLine);
    }
    const spaced = join("Para", "", "- a", "- b", "", " \t", "", "Next", "");
    assert.deepEqual(planBlocksCopyCut(spaced, 3, 7, "copy"), { copied: join("- a", "- b") });
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-124#S2
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-124#S4
  test(`${name}: copy and cut still refuse blank-only, blank-first and out-of-range spans`, () => {
    const doc = join("A", "", "", "B", "");
    for (const op of ["copy", "cut"] as const) {
      assert.ok("refused" in planBlocksCopyCut(doc, 2, 3, op), `${op} blank lines only`);
      assert.ok("refused" in planBlocksCopyCut(doc, 2, 4, op), `${op} starts on a blank line`);
      assert.ok("refused" in planBlocksCopyCut(doc, 4, 9, op), `${op} past the end`);
    }
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-124#S2
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-166#S1
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-166#S4
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-169#S3
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-169#S7
  test(`${name}: a selection ending on a no-break-space line is refused, not shortened`, () => {
    const doc = join("Alpha", "", " ", "");
    assert.deepEqual(planBlocksCopyCut(doc, 1, 3, "copy"), OUT_OF_DATE);
    assert.deepEqual(planBlocksCopyCut(doc, 1, 3, "cut"), OUT_OF_DATE);
  });
}
