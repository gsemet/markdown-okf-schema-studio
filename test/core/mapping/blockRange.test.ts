import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  checkBlankLine, checkBlockLines, pastedBlockText, planBlankRunPaste, planBlankRunRemoval, planCut, planPaste, spanText,
} from "../../../src/core/mapping/blockRange";

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
  assert.equal(paste("A\n\nB\n", 2, "X"), "A\n\nX\n\nB\n", "a blank line under a block is its separator");
  assert.deepEqual(Object.keys(paste("A\n", 9, "X") as object), ["refused"]);
  assert.deepEqual(Object.keys(paste("A\n", -1, "X") as object), ["refused"]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-174
test("paste after the blank line that ends a list inserts after the list", () => {
  const expected = "Para\n\n- a\n- b\n\nX\n\nNext\n";
  assert.equal(paste("Para\n\n- a\n- b\n\nNext\n", 5, "X"), expected);
  assert.equal(paste("Para\n\n- a\n- b\n\n\nNext\n", 5, "X"), expected);
  assert.equal(paste("Para\n\n- a\n- b\n\n\nNext\n", 6, "X"), expected);
  assert.equal(paste("Para\n\n- a\n- b\n\n", 5, "X"), "Para\n\n- a\n- b\n\nX\n");
  assert.equal(
    paste("Para\r\n\r\n- a\r\n- b\r\n\r\nNext\r\n", 5, "X1\nX2"),
    "Para\r\n\r\n- a\r\n- b\r\n\r\nX1\r\nX2\r\n\r\nNext\r\n",
  );
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-174
test("both blank lines of a run after a list give the same pasted text", () => {
  const text = "Para\n\n- a\n- b\n\n\nNext\n";
  const first = paste(text, 5, "X");
  assert.equal(first, paste(text, 6, "X"));
  assert.ok(!(first as string).includes("\n\n\n"));
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-124
test("paste still refuses a blank line with no body above it and a no-break-space line", () => {
  const out = { refused: "The preview is out of date. Refresh it and try again." };
  assert.deepEqual(paste("\nA\n", 1, "X"), out);
  assert.deepEqual(paste("---\na: 1\n---\n\nA\n", 4, "X"), out);
  assert.deepEqual(paste("A\n\u00a0\n\nB\n", 2, "X"), out);
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

function removeLine(text: string, line: number): string | { refused: string } {
  const plan = planBlankRunRemoval(text, line);
  if ("refused" in plan) return plan;
  return text.slice(0, plan.start) + text.slice(plan.end);
}

function pasteInLine(text: string, line: number, raw: string): string | { refused: string } {
  const plan = planBlankRunPaste(text, line, raw);
  if ("refused" in plan) return plan;
  return text.slice(0, plan.offset) + plan.text + text.slice(plan.end ?? plan.offset);
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-268
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-269
test("checkBlankLine accepts a shown blank line and refuses the separator and anything the text no longer has", () => {
  const text = "a\n\n\n\nb\n";
  assert.equal(checkBlankLine(text, 3), undefined);
  assert.equal(checkBlankLine(text, 4), undefined);
  assert.ok(checkBlankLine(text, 2), "the separator, the first line of the run");
  assert.ok(checkBlankLine(text, 1), "a line of text");
  assert.ok(checkBlankLine(text, 5), "a line of text below the run");
  assert.ok(checkBlankLine(text, 40), "a line past the end");
  assert.ok(checkBlankLine(text, 0));
  assert.ok(checkBlankLine(text, 3.5));
  assert.ok(checkBlankLine("a\n\u00a0\n\nb", 3), "a no-break space is not blank, so no run is left");
  assert.ok(checkBlankLine("a\n\nb", 2), "a single blank line between two blocks");
  const frontmatter = "---\nt: x\n---\n\n\nb";
  for (const line of [1, 2, 3, 4]) assert.ok(checkBlankLine(frontmatter, line), `line ${line}: the frontmatter or the separator`);
  assert.equal(checkBlankLine(frontmatter, 5), undefined);
  assert.equal(checkBlankLine("a\n\n", 2), undefined, "a single blank line at the end of the body");
  assert.equal(checkBlankLine("\n", 1), undefined, "a text of one blank line");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-269
test("removing a blank line removes that line and its line break, never the separator", () => {
  assert.equal(removeLine("a\n\n\n\nb\n", 3), "a\n\n\nb\n");
  assert.equal(removeLine("a\n\n\n\nb\n", 4), "a\n\n\nb\n");
  assert.ok("refused" in (planBlankRunRemoval("a\n\n\n\nb\n", 2) as object), "the separator is refused");
  assert.equal(removeLine("a\r\n\r\n\r\n\r\nb\r\n", 3), "a\r\n\r\n\r\nb\r\n", "no bare LF in CR LF");
  assert.equal(removeLine("a\n\n\n\nb\n", 3).toString().includes("\r"), false, "no CR in LF");
  assert.equal(removeLine("---\nt: x\n---\n\n\n\nb\n", 5), "---\nt: x\n---\n\n\nb\n");
  const plan = planBlankRunRemoval("a\n\n\n\nb\n", 3);
  assert.equal("followingLine" in plan && plan.followingLine, 4);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-269
test("removing the last line of the text keeps its final line break, or its absence", () => {
  assert.equal(removeLine("a\n\n\n", 3), "a\n\n");
  assert.equal(removeLine("a\n\n\n", 2), "a\n\n");
  assert.equal(removeLine("a\n\n  ", 3), "a\n", "no final line break: the new last line has none");
  assert.equal(removeLine("a\r\n\r\n\r\n", 3), "a\r\n\r\n");
  const plan = planBlankRunRemoval("a\n\n\n", 3);
  assert.equal("followingLine" in plan && plan.followingLine, undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-269
test("removing a line of a text of only blank lines; the last one that is left empties the text", () => {
  assert.equal(removeLine("\n\n\n", 3), "\n\n");
  assert.equal(removeLine("\n\n\n", 1), "\n\n");
  assert.equal(removeLine("\n", 1), "");
  assert.equal(removeLine("\n\n\na\n", 1), "\n\na\n");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-269
test("removing a line that the text no longer has is refused", () => {
  assert.ok("refused" in planBlankRunRemoval("a\nb\n", 2));
  assert.ok("refused" in planBlankRunRemoval("a\n\nb\n", 2), "a single separator");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-268
test("a paste in place of a blank line adds a separator only where a neighbour line is not blank", () => {
  assert.equal(pasteInLine("a\n\n\n\nb\n", 3, "X\n"), "a\n\nX\n\nb\n");
  assert.equal(pasteInLine("a\n\n\n\nb\n", 4, "X\n"), "a\n\n\nX\n\nb\n");
  assert.equal(pasteInLine("\n\na\n", 1, "X\n"), "X\n\na\n");
  assert.equal(pasteInLine("a\n\n\n", 3, "X"), "a\n\nX\n");
  assert.equal(pasteInLine("a\n\n\n", 2, "X"), "a\n\nX\n\n");
  assert.equal(pasteInLine("a\r\n\r\n\r\nb", 3, "X\nY"), "a\r\n\r\nX\r\nY\r\n\r\nb");
  assert.deepEqual(pasteInLine("a\n\n\nb", 3, "  \n"), { refused: "The clipboard has no text to paste." });
  assert.ok(typeof pasteInLine("a\nb", 2, "X") === "object");
  assert.ok("refused" in (planBlankRunPaste("a\n\nb", 2, "X") as object), "the separator is refused");
});
