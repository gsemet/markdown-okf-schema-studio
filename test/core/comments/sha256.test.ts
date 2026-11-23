import * as assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import { hashText } from "../../../src/core/comments/commentStore";
import { sha256Hex } from "../../../src/core/comments/sha256";

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-054
test("the synchronous sha256 equals node:crypto on empty, ASCII, multibyte, long and block-boundary inputs", () => {
  const inputs = [
    "",
    "abc",
    "Hello, world",
    "héllo wörld, 日本語 and an emoji 😀",
    "x".repeat(10_000),
    ...[0, 1, 54, 55, 56, 57, 63, 64, 65, 119, 120, 127, 128, 129].map((length) => "a".repeat(length)),
  ];
  for (const input of inputs) {
    assert.equal(sha256Hex(input), createHash("sha256").update(input).digest("hex"), JSON.stringify(input.slice(0, 20)));
    assert.equal(hashText(input), sha256Hex(input));
  }
});
