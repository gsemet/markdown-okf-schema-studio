import * as assert from "node:assert/strict";
import { test } from "node:test";

import { minimalReplacement } from "../../../src/core/mapping/textDiff";

function apply(before: string, replacement: { start: number; end: number; text: string }): string {
  return before.slice(0, replacement.start) + replacement.text + before.slice(replacement.end);
}

test("identical input yields an empty replacement", () => {
  const result = minimalReplacement("same", "same");
  assert.equal(result.start, result.end);
  assert.equal(result.text, "");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-042
test("insertion, deletion and replacement in the middle", () => {
  assert.deepEqual(minimalReplacement("abcdef", "abXXcdef"), { start: 2, end: 2, text: "XX" });
  assert.deepEqual(minimalReplacement("abXXcdef", "abcdef"), { start: 2, end: 4, text: "" });
  assert.deepEqual(minimalReplacement("abcdef", "abZZef"), { start: 2, end: 4, text: "ZZ" });
});

test("insertion at the start and at the end", () => {
  assert.deepEqual(minimalReplacement("abc", "Xabc"), { start: 0, end: 0, text: "X" });
  assert.deepEqual(minimalReplacement("abc", "abcX"), { start: 3, end: 3, text: "X" });
});

test("repeated characters do not let prefix and suffix overlap", () => {
  const result = minimalReplacement("aa", "aaa");
  assert.equal(apply("aa", result), "aaa");
  assert.equal(result.end - result.start + result.text.length <= 1 + 0 + 1, true);
});

test("a CRLF pair is never split", () => {
  const before = "a\r\nb";
  const after = "a\r\nXb";
  const result = minimalReplacement(before, after);
  assert.equal(apply(before, result), after);
  assert.notEqual(before[result.start - 1] === "\r" && before[result.start] === "\n", true);
  assert.notEqual(before[result.end - 1] === "\r" && before[result.end] === "\n", true);

  const removed = minimalReplacement("a\r\nb", "a\rb");
  assert.equal(apply("a\r\nb", removed), "a\rb");
  const tail = minimalReplacement("x\r\n", "x\n");
  assert.equal(apply("x\r\n", tail), "x\n");
  assert.equal(tail.start, 1);
});

test("a surrogate pair is never split", () => {
  const before = "a\u{1F600}b";
  const after = "a\u{1F601}b";
  const result = minimalReplacement(before, after);
  assert.deepEqual(result, { start: 1, end: 3, text: "\u{1F601}" });
  const grown = minimalReplacement("a\u{1F600}", "a\u{1F600}\u{1F600}");
  assert.equal(apply("a\u{1F600}", grown), "a\u{1F600}\u{1F600}");
  const code = (value: number): boolean => value >= 0xdc00 && value <= 0xdfff;
  assert.equal(code(("a\u{1F600}").charCodeAt(grown.start) ?? 0), false);
});

test("replacement reproduces the target for 200 seeded random pairs", () => {
  let seed = 12345;
  const next = (limit: number): number => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed % limit;
  };
  const alphabet = ["a", "b", "\n", "\r\n", "\r", "\u{1F600}", "\u{1F601}", " "];
  const make = (): string => {
    let text = "";
    for (let index = next(8); index > 0; index -= 1) text += alphabet[next(alphabet.length)];
    return text;
  };
  for (let round = 0; round < 200; round += 1) {
    const before = make();
    const after = make();
    const result = minimalReplacement(before, after);
    assert.equal(apply(before, result), after, JSON.stringify({ before, after, result }));
    assert.ok(result.start <= result.end);
    const isLow = (value: number): boolean => value >= 0xdc00 && value <= 0xdfff;
    for (const boundary of [result.start, result.end]) {
      assert.equal(isLow(before.charCodeAt(boundary)) && boundary > 0
        && before.charCodeAt(boundary - 1) >= 0xd800 && before.charCodeAt(boundary - 1) <= 0xdbff, false);
      assert.equal(before[boundary - 1] === "\r" && before[boundary] === "\n", false);
    }
  }
});
