import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  CHECKBOX_GONE,
  checkBlocksPaste,
  COPY_INCLUDED,
  LABEL_GONE,
  MOVE_INCLUDED,
  PASTE_NEXT_TO_INCLUDED,
  planBlockMoveEdit,
  planBlocksCopyCut,
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
import { applyTextEdits, type TextEdit } from "../../../src/core/edits/textEdit";

function applied(text: string, plan: { edit: TextEdit } | { refused: string } | { unchanged: true }): string {
  assert.ok("edit" in plan, JSON.stringify(plan));
  return applyTextEdits(text, [plan.edit]);
}

const THREAD = ["<!-- THREAD", "Ada (2026-10-16 10:47):", "  hello", "-->"];

// @tests_req SwRS-MDOKFSTUDIO-GFM-021
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

// @tests_req SwRS-MDOKFSTUDIO-MYST-045
test("a label rename changes the label line only and counts the remaining references", () => {
  const text = "(old)=\n# Title\n\nSee {ref}`old` and {ref}`text <old>`.\n";
  const rename = planLabelRename(text, 1, "old", "new");
  assert.ok("edit" in rename);
  assert.equal(rename.remainingRefs, 2);
  assert.equal(applyTextEdits(text, [rename.edit]), "(new)=\n# Title\n\nSee {ref}`old` and {ref}`text <old>`.\n");
  assert.deepEqual(planLabelRename(text, 2, "old", "new"), { refused: LABEL_GONE });
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-186
test("thread lines are read only when they are exactly one thread comment", () => {
  const text = ["Before", "", ...THREAD, ""].join("\r\n");
  assert.deepEqual(readThreadLines(text, 3, 6), { lines: THREAD });
  assert.deepEqual(readThreadLines(text, 2, 6), { refused: THREAD_GONE });
  assert.deepEqual(readThreadLines(text, 3, 99), { refused: THREAD_GONE });
  assert.deepEqual(readThreadLines(text, 0, 4), { refused: THREAD_GONE });
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-192
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

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-117
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

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-127
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

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-166
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
  assert.equal(checkBlocksPaste(included, 99), undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-042
test("a block text edit is the smallest replacement, offset by the block start", () => {
  assert.deepEqual(planBlockTextEdit(10, "Hello world", "Hello there world"), { start: 16, end: 16, text: "there " });
  assert.equal(planBlockTextEdit(10, "same", "same"), undefined);
  const source = "0123456789Hello world!";
  const edit = planBlockTextEdit(10, "Hello world", "Hi world");
  assert.ok(edit);
  assert.equal(applyTextEdits(source, [edit]), "0123456789Hi world!");
});
