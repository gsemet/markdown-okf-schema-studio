import * as assert from "node:assert/strict";
import { test } from "node:test";

import { blankRunAround, blankRuns, quoteBlankRuns, shownBlankLines } from "../../../src/core/mapping/blankRuns";
import { isCommonMarkBlank } from "../../../src/core/mapping/blockRange";

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("a CommonMark blank line holds only spaces and tabs", () => {
  assert.equal(isCommonMarkBlank(""), true);
  assert.equal(isCommonMarkBlank("  \t "), true);
  assert.equal(isCommonMarkBlank(" "), false, "a no-break space renders as a paragraph");
  assert.equal(isCommonMarkBlank(" x "), false);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("one blank line between two blocks is the separator, two or more are a run", () => {
  assert.deepEqual(blankRuns("a\n\nb\n"), []);
  assert.deepEqual(blankRuns("a\n\n\nb\n"), [{ line: 2, endLine: 3 }]);
  assert.deepEqual(blankRuns("a\n\n\n\n\nb\n\n\nc"), [{ line: 2, endLine: 5 }, { line: 7, endLine: 8 }]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("runs at the start and at the end of the body count, the empty line after the final break does not", () => {
  assert.deepEqual(blankRuns("\n\na\n"), [{ line: 1, endLine: 2 }]);
  assert.deepEqual(blankRuns("a\n\n\n"), [{ line: 2, endLine: 3 }]);
  // A single blank line at the end of the body is shown (it has no block below to separate): a run of one line.
  assert.deepEqual(blankRuns("a\n\n"), [{ line: 2, endLine: 2 }]);
  assert.deepEqual(blankRuns("\n"), [{ line: 1, endLine: 1 }]);
  assert.deepEqual(blankRuns("a\n\n  "), [{ line: 2, endLine: 3 }]);
  assert.deepEqual(blankRuns("\n\n\n"), [{ line: 1, endLine: 3 }]);
  assert.deepEqual(blankRuns(""), []);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("spaces and tabs are blank, a no-break space is not", () => {
  assert.deepEqual(blankRuns("a\n \n\t\nb"), [{ line: 2, endLine: 3 }]);
  assert.deepEqual(blankRuns("a\n \n\nb"), []);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("CR LF and lone CR line endings give the same runs", () => {
  assert.deepEqual(blankRuns("a\r\n\r\n\r\nb\r\n"), [{ line: 2, endLine: 3 }]);
  assert.deepEqual(blankRuns("a\r\r\rb\r"), [{ line: 2, endLine: 3 }]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("the frontmatter is not part of a run, and the lines after it can be", () => {
  assert.deepEqual(blankRuns("---\ntitle: x\n\n\nkind: y\n---\nbody\n"), []);
  assert.deepEqual(blankRuns("---\ntitle: x\n---\n\n\nbody\n"), [{ line: 4, endLine: 5 }]);
  assert.deepEqual(blankRuns("---\ntitle: x\n---\nbody\n\n\nend\n"), [{ line: 5, endLine: 6 }]);
});

const shown = (text: string): string[] => shownBlankLines(text).map((run) => `${run.line}-${run.endLine}`);

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("N blank lines between two paragraphs show N minus one blocks, starting at the second blank line", () => {
  assert.deepEqual(shown("a\n\nb\n"), []);
  assert.deepEqual(shown("a\n\n\nb\n"), ["3-3"]);
  assert.deepEqual(shown("a\n\n\n\nb\n"), ["3-4"]);
  assert.deepEqual(shown("a\n\n\n\n\n\n\nb\n"), ["3-7"]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("a line of text then 6 blank lines shows 6 blocks, with and without a final line break", () => {
  assert.deepEqual(shown("Text\n\n\n\n\n\n\n"), ["2-7"], "with a final line break");
  assert.deepEqual(shown("Text\n\n\n\n\n\n "), ["2-7"], "without one, the last line holds spaces");
  assert.deepEqual(shown("Text\n\n\n\n\n\n"), ["2-6"], "the empty line after a final break is not a line");
  assert.deepEqual(shown("a\n\n"), ["2-2"], "one blank line at the end of the body is a block");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("at the top of a file without frontmatter every blank line shows, after the frontmatter the first is the separator", () => {
  assert.deepEqual(shown("\n\n\na\n"), ["1-3"]);
  assert.deepEqual(shown("\na\n"), ["1-1"], "a single blank line at line 1");
  assert.deepEqual(shown("---\ntitle: x\n---\n\n\n\nbody\n"), ["5-6"]);
  assert.deepEqual(shown("---\ntitle: x\n---\n\nbody\n"), []);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("a body of only blank lines shows every line, after the frontmatter and in a file without one", () => {
  assert.deepEqual(shown("---\ntitle: x\n---\n\n\n\n"), ["4-6"]);
  assert.deepEqual(shown("---\ntitle: x\n---\n\n"), ["4-4"]);
  assert.deepEqual(shown("\n\n\n"), ["1-3"]);
  assert.deepEqual(shown(""), []);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("a quote run never shows its first line, wherever it stands", () => {
  assert.deepEqual(quoteBlankRuns("> a\n>\n>\n>\n\nb\n"), [{ line: 2, endLine: 4 }]);
  assert.deepEqual(shown("> a\n>\n>\n>\n\nb\n"), ["3-4"]);
  assert.deepEqual(shown("> a\n>\n>\n"), ["3-3"], "at the end of the body");
  assert.deepEqual(shown(">\n>\n>\nText\n"), ["2-3"], "at line 1");
  assert.deepEqual(shown("> a\n>\nb\n"), [], "a single empty quote line is the separator");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("a no-break space line breaks a run, and CR LF and lone CR give the same ranges", () => {
  assert.deepEqual(shown("a\n\n\n \n\n\nb"), ["3-3", "6-6"], "split at the U+00A0 line");
  assert.deepEqual(shown("a\r\n\r\n\r\n\r\nb\r\n"), ["3-4"]);
  assert.deepEqual(shown("a\r\r\r\rb\r"), ["3-4"]);
  assert.deepEqual(shown("Text\r\n\r\n\r\n"), ["2-3"]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("blankRunAround gives the maximal run that holds a line, plain or quote, and nothing elsewhere", () => {
  const text = "a\n\n\n\nb\n> q\n>\n>\nc\n";
  assert.deepEqual(blankRunAround(text, 3), { line: 2, endLine: 4 });
  assert.deepEqual(blankRunAround(text, 2), { line: 2, endLine: 4 });
  assert.deepEqual(blankRunAround(text, 8), { line: 7, endLine: 8 });
  assert.equal(blankRunAround(text, 1), undefined);
  assert.equal(blankRunAround(text, 99), undefined);
  assert.equal(blankRunAround("---\ntitle: x\n---\n\n", 2), undefined, "a line of the frontmatter");
  assert.deepEqual(blankRunAround("a\n\n", 2), { line: 2, endLine: 2 }, "a single line at the end");
});
