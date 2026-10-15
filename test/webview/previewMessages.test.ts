import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  createPreviewMessageChecker,
  isBoundedString,
  isOneOf,
  isRegisteredPreviewMessage,
  isSourceLine,
} from "../../src/preview/previewMessages";

const check = createPreviewMessageChecker({ sample: (m) => m.text === "ok" });
const valid = { type: "sample", documentId: "doc", documentVersion: 3, requestId: 7, text: "ok" };

test("accepts a valid registered message", () => {
  assert.equal(check(valid), true);
});

test("rejects missing or non-integer ids and oversize documentId", () => {
  assert.equal(check({ ...valid, documentId: undefined }), false);
  assert.equal(check({ ...valid, documentId: 1 }), false);
  assert.equal(check({ ...valid, documentId: "x".repeat(4097) }), false);
  assert.equal(check({ ...valid, documentId: "x".repeat(4096) }), true);
  assert.equal(check({ ...valid, documentVersion: 1.5 }), false);
  assert.equal(check({ ...valid, documentVersion: "3" }), false);
  assert.equal(check({ ...valid, requestId: undefined }), false);
  assert.equal(check({ ...valid, requestId: Number.NaN }), false);
  assert.equal(check({ ...valid, requestId: 2 ** 53 }), false);
});

test("rejects non-objects, unregistered and prototype-key types", () => {
  assert.equal(check(null), false);
  assert.equal(check("sample"), false);
  assert.equal(check({ ...valid, type: "other" }), false);
  for (const type of ["__proto__", "constructor", "toString", "hasOwnProperty"]) {
    assert.equal(check({ ...valid, type }), false, type);
  }
});

test("rejects a message the validator refuses", () => {
  assert.equal(check({ ...valid, text: "no" }), false);
});

test("the shipped registry accepts nothing yet", () => {
  assert.equal(isRegisteredPreviewMessage(valid), false);
});

test("field helpers respect their boundaries", () => {
  assert.equal(isBoundedString("abc", 3), true);
  assert.equal(isBoundedString("abcd", 3), false);
  assert.equal(isBoundedString(3, 3), false);
  assert.equal(isSourceLine(1), true);
  assert.equal(isSourceLine(0), false);
  assert.equal(isSourceLine(1.5), false);
  assert.equal(isSourceLine("1"), false);
  assert.equal(isOneOf("a", ["a", "b"] as const), true);
  assert.equal(isOneOf("c", ["a", "b"] as const), false);
  assert.equal(isOneOf(1, ["a", "b"] as const), false);
});
