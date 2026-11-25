import * as assert from "node:assert/strict";
import { test } from "node:test";

import { listItemIndent } from "../../../src/core/mapping/listItemIndent";

/**
 * The indents of a list item line (CR-448): the item indent brings a line to the item column, the
 * content indent to CommonMark's content column of the innermost item. Each case runs in LF, CR LF
 * and lone CR, because the line is read by `splitLines`.
 */

const EOLS = [["LF", "\n"], ["CRLF", "\r\n"], ["CR", "\r"]] as const;

const indents = (line: string, eol: string, runLine = 3): { item: string; content: string } | undefined => {
  const found = listItemIndent([line, "", "", "", "x"].join(eol), 1, runLine);
  return found ? { item: found.item, content: found.content } : undefined;
};

for (const [name, eol] of EOLS) {
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S5
  test(`${name}: a bullet and an ordered marker give the item indent and the content column`, () => {
    assert.deepEqual(indents("- a", eol), { item: "", content: "  " });
    assert.deepEqual(indents("  * a", eol), { item: "  ", content: "    " });
    assert.deepEqual(indents("10. a", eol), { item: "", content: "    " });
    assert.deepEqual(indents("3) a", eol), { item: "", content: "   " });
    assert.deepEqual(indents("  10. a", eol), { item: "  ", content: "      " });
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S5
  test(`${name}: a tab after the marker runs to the next tab stop of 4`, () => {
    assert.deepEqual(indents("-\ta", eol), { item: "", content: "    " });
    assert.deepEqual(indents("1.\ta", eol), { item: "", content: "    " });
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S5
  test(`${name}: a second marker on the line opens an item inside the first`, () => {
    assert.deepEqual(indents("- - a", eol), { item: "  ", content: "    " });
    assert.deepEqual(indents("1. - a", eol), { item: "   ", content: "     " });
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S1
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S5
  test(`${name}: the leading spaces and tabs of the item line are kept as they are`, () => {
    assert.deepEqual(indents("\t- a", eol), { item: "\t", content: "\t  " });
    assert.deepEqual(indents(" \t- - a", eol), { item: " \t  ", content: " \t    " });
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S5
  test(`${name}: five spaces or more after the marker, or none, put the content column after one space`, () => {
    assert.deepEqual(indents("-     code", eol), { item: "", content: "  " });
    assert.deepEqual(indents("-      code", eol), { item: "", content: "  " });
    assert.deepEqual(indents("-", eol), { item: "", content: "  " });
    assert.deepEqual(indents("1.", eol), { item: "", content: "   " });
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S6
  test(`${name}: a paragraph, a thematic break, a marker without a space and a line at or after the run give nothing`, () => {
    assert.equal(indents("a paragraph", eol), undefined);
    assert.equal(indents("- - -", eol), undefined);
    assert.equal(indents("***", eol), undefined);
    assert.equal(indents("-a", eol), undefined);
    assert.equal(indents("1234567890. a", eol), undefined);
    assert.equal(indents("- a", eol, 1), undefined, "the line is the run's own line");
    assert.equal(indents("- a", eol, 0), undefined, "the line is after the run");
  });
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S1
test("a line of the frontmatter, a missing line and a line that is not an integer give nothing", () => {
  const text = "---\n- a\n---\n\n- b\n\n\nc\n";
  assert.equal(listItemIndent(text, 2, 6), undefined, "a list line in the frontmatter");
  assert.deepEqual(listItemIndent(text, 5, 6)?.content, "  ");
  assert.equal(listItemIndent(text, 99, 100), undefined);
  assert.equal(listItemIndent(text, 0, 6), undefined);
  assert.equal(listItemIndent(text, 1.5, 6), undefined);
});
