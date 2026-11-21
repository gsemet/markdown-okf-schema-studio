import * as assert from "node:assert/strict";
import { test } from "node:test";

import { minimalReplacement } from "../../../src/core/mapping/textDiff";

// Tests added by the mutation campaign of src/core (CR-450): they pin the survivors of the first run.

const splitsPair = (text: string, index: number): boolean => {
  const left = text.charCodeAt(index - 1);
  const right = text.charCodeAt(index);
  return (left === 13 && right === 10)
    || (left >= 0xd800 && left <= 0xdbff && right >= 0xdc00 && right <= 0xdfff);
};

function reference(before: string, after: string) {
  const limit = Math.min(before.length, after.length);
  let prefix = 0;
  while (prefix < limit && before[prefix] === after[prefix]) prefix += 1;
  while (prefix > 0 && (splitsPair(before, prefix) || splitsPair(after, prefix))) prefix -= 1;
  let suffix = 0;
  while (suffix < limit - prefix && before[before.length - 1 - suffix] === after[after.length - 1 - suffix]) suffix += 1;
  while (suffix > 0 && (splitsPair(before, before.length - suffix) || splitsPair(after, after.length - suffix))) suffix -= 1;
  return { start: prefix, end: before.length - suffix, text: after.slice(prefix, after.length - suffix) };
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-042
test("every pair of short texts is replaced minimally without splitting a CRLF or surrogate pair", () => {
  // The code units sit on both sides of each surrogate boundary: 0xd7ff, 0xd800, 0xdbff, 0xdc00, 0xdfff, 0xe000.
  const alphabet = ["a", "\r", "\n", "\ud7ff", "\ud800", "\udbff", "\udc00", "\udfff", "\ue000"];
  const texts = [""];
  for (const first of alphabet) {
    texts.push(first);
    for (const second of alphabet) {
      texts.push(first + second);
      for (const third of alphabet) texts.push(first + second + third);
    }
  }
  for (const before of texts) {
    for (const after of texts) {
      const got = minimalReplacement(before, after);
      const want = reference(before, after);
      assert.deepEqual(got, want, JSON.stringify([before, after]));
      assert.equal(before.slice(0, got.start) + got.text + before.slice(got.end), after);
    }
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-042
test("a CRLF pair is kept whole when only one of the two texts holds it, at the start or the end of the change", () => {
  assert.deepEqual(minimalReplacement("a\r\nb", "a\rb"), { start: 1, end: 3, text: "\r" });
  assert.deepEqual(minimalReplacement("a\rb", "a\r\nb"), { start: 1, end: 2, text: "\r\n" });
  assert.deepEqual(minimalReplacement("a\r\nb", "a\nb"), { start: 1, end: 3, text: "\n" });
  assert.deepEqual(minimalReplacement("a\nb", "a\r\nb"), { start: 1, end: 2, text: "\r\n" });
  assert.deepEqual(minimalReplacement("x\r\n", "x\n"), { start: 1, end: 3, text: "\n" });
  assert.deepEqual(minimalReplacement("\r\nx", "\nx"), { start: 0, end: 2, text: "\n" });
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-042
test("a surrogate pair is kept whole when only one of the two texts holds it", () => {
  assert.deepEqual(minimalReplacement("a\ud83d\ude00b", "a\ud83d\ude01b"), { start: 1, end: 3, text: "\ud83d\ude01" });
  assert.deepEqual(minimalReplacement("a\ud83d\ude00b", "a\ud83dxb"), { start: 1, end: 3, text: "\ud83dx" });
  assert.deepEqual(minimalReplacement("a\ud83dxb", "a\ud83d\ude00b"), { start: 1, end: 3, text: "\ud83d\ude00" });
  assert.deepEqual(minimalReplacement("\ud83d\ude00", "\ud83d\ude01"), { start: 0, end: 2, text: "\ud83d\ude01" });
  assert.deepEqual(minimalReplacement("a\ud83d\ude00", "a\ud83d\ude00\ud83d\ude00"), { start: 3, end: 3, text: "\ud83d\ude00" });
});
