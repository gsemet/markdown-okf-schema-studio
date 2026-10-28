import * as assert from "node:assert/strict";
import { test } from "node:test";

import { checkBlockLines, pastedBlockText, planCut, planPaste, spanText } from "../../../src/core/mapping/blockRange";

function cut(text: string, line: number, endLine: number): string | { refused: string } {
  const plan = planCut(text, line, endLine);
  if ("refused" in plan) return plan;
  return text.slice(0, plan.start) + text.slice(plan.end);
}

function paste(text: string, afterLine: number, raw: string): string | { refused: string } {
  const plan = planPaste(text, afterLine, raw);
  if ("refused" in plan) return plan;
  return text.slice(0, plan.offset) + plan.text + text.slice(plan.offset);
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-166
test("spanText returns the exact lines without the final line break", () => {
  assert.equal(spanText("A\n\nB1\nB2\n\nC\n", 3, 4), "B1\nB2");
  assert.equal(spanText("A\n\nB", 3, 3), "B");
  assert.equal(spanText("A\r\n\r\nB1\r\nB2\r\n", 3, 4), "B1\r\nB2");
  assert.equal(spanText("A\n\n  B  \n", 3, 3), "  B  ", "inner whitespace is kept");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-124
test("spanText refuses bad ranges and the frontmatter", () => {
  const text = "---\na: 1\n---\n\nB\n";
  assert.deepEqual(Object.keys(spanText(text, 1, 3) as object), ["refused"]);
  assert.deepEqual(Object.keys(spanText(text, 4, 5) as object), ["refused"], "starts on a blank line");
  assert.deepEqual(Object.keys(spanText(text, 5, 9) as object), ["refused"], "out of bounds");
  assert.deepEqual(Object.keys(spanText(text, 5, 4) as object), ["refused"]);
  assert.deepEqual(Object.keys(spanText(text, 0, 1) as object), ["refused"]);
  assert.equal(spanText(text, 5, 5), "B");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-169
test("cutting a middle block removes it with one separator", () => {
  assert.equal(cut("A\n\nB\n\nC\n", 3, 3), "A\n\nC\n");
  assert.equal(cut("A\n\nB1\nB2\n\n\nC\n", 3, 4), "A\n\nC\n", "all the blank lines after go with it");
  assert.equal(cut("A\n\nB\n\nC\n\nD\n", 3, 5), "A\n\nD\n", "a span of several blocks");
});

test("cutting the first block leaves no blank line at the top", () => {
  assert.equal(cut("A\n\nB\n", 1, 1), "B\n");
  assert.equal(cut("---\ntitle: x\n---\n\nA\n\nB\n", 5, 5), "---\ntitle: x\n---\n\nB\n");
});

test("cutting the last block removes the blank line before it", () => {
  assert.equal(cut("A\n\nB\n", 3, 3), "A\n");
  assert.equal(cut("A\n\nB\n\n\n", 3, 3), "A\n", "trailing blank lines go too");
  assert.equal(cut("A\n\n\nB\n", 4, 4), "A\n", "never leaves a blank line before the end");
  assert.equal(cut("---\na: 1\n---\n\nB\n", 5, 5), "---\na: 1\n---\n");
});

test("cutting the last block of a document without a final newline keeps it without one", () => {
  assert.equal(cut("A\n\nB", 3, 3), "A");
  assert.equal(cut("A\n\nB1\nB2", 3, 4), "A");
  assert.equal(cut("A\n\nB\n\nC", 5, 5), "A\n\nB");
});

test("cutting the only block empties the body", () => {
  assert.equal(cut("A\n", 1, 1), "");
  assert.equal(cut("A", 1, 1), "");
  assert.equal(cut("\n\nA\n\n", 3, 3), "");
});

test("cutting keeps CRLF line breaks of what remains", () => {
  assert.equal(cut("A\r\n\r\nB\r\n\r\nC\r\n", 3, 3), "A\r\n\r\nC\r\n");
  assert.equal(cut("A\r\n\r\nB\r\n", 3, 3), "A\r\n");
  assert.equal(cut("A\r\n\r\nB", 3, 3), "A");
});

test("cutting never glues a block to the one after the span", () => {
  // The block above touches the span: the blank line after it stays so B and C remain apart.
  assert.equal(cut("A\nB\n\nC\n", 2, 2), "A\n\nC\n");
  // Everything already touched: nothing to preserve.
  assert.equal(cut("A\nB\nC\n", 2, 2), "A\nC\n");
  // The span touches the following block: it just goes.
  assert.equal(cut("A\n\nB\nC\n", 3, 3), "A\n\nC\n");
});

test("a cut never leaves three blank lines in a row", () => {
  const out = cut("A\n\nB\n\nC\n\nD\n", 5, 5) as string;
  assert.equal(out, "A\n\nB\n\nD\n");
  assert.doesNotMatch(out, /\n\n\n/u);
});

test("cut refuses the frontmatter and bad ranges", () => {
  assert.deepEqual(Object.keys(planCut("---\na: 1\n---\n\nB\n", 2, 2)), ["refused"]);
  assert.deepEqual(Object.keys(planCut("A\n\nB\n", 3, 9)), ["refused"]);
  assert.deepEqual(Object.keys(planCut("A\n\nB\n", 2, 2)), ["refused"], "a blank line is not a block");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-174
test("pastedBlockText trims blank lines at both ends and normalises line breaks", () => {
  assert.equal(pastedBlockText("\n\n  \nA\r\nB\n\n"), "A\nB");
  assert.equal(pastedBlockText("  \n\t\n"), "");
  assert.equal(pastedBlockText("  indented\n"), "  indented");
});

test("paste inserts after a block with one blank line on each side", () => {
  assert.equal(paste("A\n\nB\n", 1, "X"), "A\n\nX\n\nB\n");
  assert.equal(paste("A\n\nB\n", 3, "X"), "A\n\nB\n\nX\n");
  assert.equal(paste("A\n\nB", 3, "X"), "A\n\nB\n\nX");
  assert.equal(paste("A\n\nB\n", 1, "\n\nX1\nX2\n\n\n"), "A\n\nX1\nX2\n\nB\n", "no extra blank lines");
});

test("paste does not glue the new text to a block that follows without a blank line", () => {
  assert.equal(paste("A\nB\n", 1, "X"), "A\n\nX\n\nB\n");
});

test("paste at the start of the body", () => {
  assert.equal(paste("A\n", 0, "X"), "X\n\nA\n");
  assert.equal(paste("---\na: 1\n---\n\nA\n", 0, "X"), "---\na: 1\n---\n\nX\n\nA\n");
  assert.equal(paste("", 0, "X"), "X\n");
});

test("paste keeps CRLF", () => {
  assert.equal(paste("A\r\n\r\nB\r\n", 1, "X1\nX2"), "A\r\n\r\nX1\r\nX2\r\n\r\nB\r\n");
});

test("paste refuses an empty clipboard, the frontmatter and stale lines", () => {
  assert.deepEqual(paste("A\n", 1, " \n\n"), { refused: "The clipboard has no text to paste." });
  assert.deepEqual(Object.keys(paste("---\na: 1\n---\n\nA\n", 2, "X") as object), ["refused"]);
  assert.deepEqual(Object.keys(paste("A\n\nB\n", 2, "X") as object), ["refused"], "blank line");
  assert.deepEqual(Object.keys(paste("A\n", 9, "X") as object), ["refused"]);
  assert.deepEqual(Object.keys(paste("A\n", -1, "X") as object), ["refused"]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-256
test("checkBlockLines refuses a range that starts on a blank line or leaves the document", () => {
  const text = "A\n\n### Edit\n\nB\n";
  const disagree = { refused: "The preview and the document disagree about this block's lines. Refresh the preview and try again." };
  assert.deepEqual(checkBlockLines(text, 2, 3), disagree, "the shifted range: a blank line, then the heading");
  assert.deepEqual(checkBlockLines(text, 3, 9), disagree, "past the end");
  assert.deepEqual(checkBlockLines(text, 3, 2), disagree, "unordered");
  assert.deepEqual(checkBlockLines(text, 0, 1), disagree);
  assert.deepEqual(checkBlockLines(text, 1.5, 3), disagree);
  assert.deepEqual(checkBlockLines("A\n", 2, 2), disagree, "the empty line after the final line break");
});

test("checkBlockLines accepts blocks with blank lines inside, a list ending on its separator and the frontmatter", () => {
  assert.equal(checkBlockLines("```\na\n\nb\n```\n", 1, 5), undefined);
  assert.equal(checkBlockLines("- a\n\n- b\n\nC\n", 1, 4), undefined, "a list range ending on its blank separator");
  assert.equal(checkBlockLines("A", 1, 1), undefined);
  assert.equal(checkBlockLines("A\r\n\r\nB", 3, 3), undefined);
  assert.equal(checkBlockLines("---\na: 1\n---\n\nB\n", 1, 3), undefined, "the frontmatter rule is not part of this check");
});
