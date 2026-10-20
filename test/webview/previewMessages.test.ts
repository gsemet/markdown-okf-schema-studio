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

test("the shipped registry rejects an unregistered type", () => {
  assert.equal(isRegisteredPreviewMessage(valid), false);
});

test("previewCopyText accepts text up to 1 MB and rejects anything else", () => {
  const copy = { type: "previewCopyText", documentId: "doc", documentVersion: 1, requestId: 1, text: "code" };
  assert.equal(isRegisteredPreviewMessage(copy), true);
  assert.equal(isRegisteredPreviewMessage({ ...copy, text: "" }), true);
  assert.equal(isRegisteredPreviewMessage({ ...copy, text: "x".repeat(1_000_000) }), true);
  assert.equal(isRegisteredPreviewMessage({ ...copy, text: "x".repeat(1_000_001) }), false);
  assert.equal(isRegisteredPreviewMessage({ ...copy, text: 5 }), false);
  assert.equal(isRegisteredPreviewMessage({ ...copy, text: undefined }), false);
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

test("previewViewPreferenceChanged validates the value per preference", () => {
  const base = { type: "previewViewPreferenceChanged", documentId: "doc", documentVersion: 1, requestId: 1 };
  const ok = (preference: unknown, value: unknown): boolean =>
    isRegisteredPreviewMessage({ ...base, preference, value });
  assert.equal(ok("zoom", 70), true);
  assert.equal(ok("zoom", 130), true);
  assert.equal(ok("zoom", 200), true);
  assert.equal(ok("zoom", 60), false);
  assert.equal(ok("zoom", 210), false);
  assert.equal(ok("zoom", 1.2), false);
  assert.equal(ok("zoom", "100"), false);
  assert.equal(ok("zoom", Number.NaN), false);
  assert.equal(ok("widthMode", "margin"), true);
  assert.equal(ok("widthMode", "auto"), true);
  assert.equal(ok("widthMode", "full"), true);
  assert.equal(ok("widthMode", "wide"), false);
  assert.equal(ok("toc", true), true);
  assert.equal(ok("toc", "yes"), false);
  assert.equal(ok("incomingChanges", false), true);
  assert.equal(ok("incomingChanges", 0), false);
  assert.equal(ok("other", true), false);
  assert.equal(ok(undefined, true), false);
  assert.equal(ok("__proto__", true), false);
});

test("previewHistoryGo accepts only back or forward", () => {
  const base = { type: "previewHistoryGo", documentId: "doc", documentVersion: 1, requestId: 1 };
  assert.equal(isRegisteredPreviewMessage({ ...base, direction: "back" }), true);
  assert.equal(isRegisteredPreviewMessage({ ...base, direction: "forward" }), true);
  assert.equal(isRegisteredPreviewMessage({ ...base, direction: "up" }), false);
  assert.equal(isRegisteredPreviewMessage({ ...base }), false);
});

test("previewPaletteModeChanged accepts only strict, gfm or myst", () => {
  const base = { type: "previewPaletteModeChanged", documentId: "doc", documentVersion: 1, requestId: 1 };
  for (const mode of ["strict", "gfm", "myst"]) {
    assert.equal(isRegisteredPreviewMessage({ ...base, mode }), true, mode);
  }
  assert.equal(isRegisteredPreviewMessage({ ...base, mode: "html" }), false);
  assert.equal(isRegisteredPreviewMessage({ ...base, mode: "" }), false);
  assert.equal(isRegisteredPreviewMessage({ ...base, mode: true }), false);
  assert.equal(isRegisteredPreviewMessage({ ...base }), false);
});

test("previewLabelRename validates the line and both label names", () => {
  const rename = {
    type: "previewLabelRename", documentId: "doc", documentVersion: 1, requestId: 1, editId: "e",
    line: 3, oldName: "old", newName: "new.name:1",
  };
  assert.equal(isRegisteredPreviewMessage(rename), true);
  assert.equal(isRegisteredPreviewMessage({ ...rename, newName: "x".repeat(100) }), true);
  for (const patch of [
    { newName: "x".repeat(101) }, { newName: "" }, { newName: "-x" }, { newName: "a b" }, { newName: "a)=" },
    { oldName: "a b" }, { oldName: undefined }, { newName: 4 },
    { line: 0 }, { line: 1.5 }, { line: "3" }, { line: undefined },
  ]) {
    assert.equal(isRegisteredPreviewMessage({ ...rename, ...patch }), false, JSON.stringify(patch));
  }
});

test("T30: the list and pick messages carry an edit id and no other payload", () => {
  for (const type of ["previewListTargets", "previewListCitations", "previewPickDocument"]) {
    const base = { type, documentId: "doc", documentVersion: 1, requestId: 1, editId: "host-1" };
    assert.equal(isRegisteredPreviewMessage(base), true, type);
    assert.equal(isRegisteredPreviewMessage({ ...base, editId: "" }), false, type);
    assert.equal(isRegisteredPreviewMessage({ ...base, editId: "x".repeat(101) }), false, type);
    assert.equal(isRegisteredPreviewMessage({ ...base, editId: undefined }), false, type);
    assert.equal(isRegisteredPreviewMessage({ ...base, editId: 4 }), false, type);
  }
});
