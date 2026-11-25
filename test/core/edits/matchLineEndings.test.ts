import * as assert from "node:assert/strict";
import { test } from "node:test";

import { matchLineEndings } from "../../../src/core/edits/lineEndings";
import { LINE_ENDING_FIXTURE_NAMES, readLineEndingFixture } from "../../shared/lineEndingFixtures";

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-234#S1
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-234#S3
test("a text with the LF a text box returns takes the one line ending of the reference", () => {
  assert.equal(matchLineEndings("a\nb\n", "a\r\nb\r\n"), "a\r\nb\r\n");
  assert.equal(matchLineEndings("a\nb\n", "x\ny\n"), "a\nb\n");
  assert.equal(matchLineEndings("a\nb", "a\rb"), "a\rb");
  assert.equal(matchLineEndings("a\nb", "single", "x\r\ny\r\n"), "a\r\nb");
  assert.equal(matchLineEndings("a\nb", "single"), "a\nb");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-263#S1
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-263#S3
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-234#S1
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-234#S2
test("a text unchanged but for its line endings is the reference again, every fixture, every block", () => {
  for (const name of LINE_ENDING_FIXTURE_NAMES) {
    const text = readLineEndingFixture(name);
    const lines = text.match(/[^\r\n]*(?:\r\n|\n|\r)|[^\r\n]+$/gu) ?? [];
    for (let from = 0; from < lines.length; from += 1) {
      for (let to = from + 1; to <= Math.min(lines.length, from + 4); to += 1) {
        const block = lines.slice(from, to).join("");
        const typed = block.replace(/\r\n|\r/gu, "\n");
        assert.equal(matchLineEndings(typed, block, text), block, `${name} lines ${from + 1}-${to}`);
      }
    }
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-234#S1
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-234#S3
test("with mixed endings, the lines left alone keep theirs and a changed line takes the one it replaces", () => {
  const reference = "one\r\ntwo\nthree\r\nfour\n";
  assert.equal(matchLineEndings("one\ntwo\nTHREE\nfour\n", reference), "one\r\ntwo\nTHREE\r\nfour\n");
  assert.equal(matchLineEndings("one\ntwo\nthree\nfour\nfive\n", reference), "one\r\ntwo\nthree\r\nfour\nfive\n");
  assert.equal(matchLineEndings("zero\none\ntwo\nthree\nfour\n", reference), "zero\r\none\r\ntwo\nthree\r\nfour\n");
  assert.equal(matchLineEndings("one\nfour\n", reference), "one\r\nfour\n");
  assert.equal(matchLineEndings("", reference), "");
});
