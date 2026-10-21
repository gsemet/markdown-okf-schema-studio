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
  for (const type of ["previewListTargets", "previewListCitations", "previewPickDocument", "previewPickImage"]) {
    const base = { type, documentId: "doc", documentVersion: 1, requestId: 1, editId: "host-1" };
    assert.equal(isRegisteredPreviewMessage(base), true, type);
    assert.equal(isRegisteredPreviewMessage({ ...base, editId: "" }), false, type);
    assert.equal(isRegisteredPreviewMessage({ ...base, editId: "x".repeat(101) }), false, type);
    assert.equal(isRegisteredPreviewMessage({ ...base, editId: undefined }), false, type);
    assert.equal(isRegisteredPreviewMessage({ ...base, editId: 4 }), false, type);
  }
});

test("previewBlockMove validates both ranges, the direction and the optional pin", () => {
  const move = {
    type: "previewBlockMove", documentId: "doc", documentVersion: 1, requestId: 1,
    line: 5, endLine: 6, neighbourLine: 1, neighbourEndLine: 3, direction: "up", pinViewportTop: 120.5,
  };
  assert.equal(isRegisteredPreviewMessage(move), true);
  assert.equal(isRegisteredPreviewMessage({ ...move, direction: "down", pinViewportTop: undefined }), true);
  for (const patch of [
    { direction: "left" }, { direction: undefined }, { line: 0 }, { endLine: 1.5 }, { neighbourLine: "1" },
    { neighbourEndLine: undefined }, { line: undefined }, { pinViewportTop: Number.NaN },
    { pinViewportTop: 200000 }, { pinViewportTop: "10" },
  ]) {
    assert.equal(isRegisteredPreviewMessage({ ...move, ...patch }), false, JSON.stringify(patch));
  }
});

test("T40: the block clipboard messages validate their lines and the optional pin", () => {
  const base = { documentId: "doc", documentVersion: 1, requestId: 1 };
  for (const type of ["previewBlocksCopy", "previewBlocksCut"]) {
    const message = { ...base, type, line: 5, endLine: 8, pinViewportTop: 10 };
    assert.equal(isRegisteredPreviewMessage(message), true, type);
    assert.equal(isRegisteredPreviewMessage({ ...message, pinViewportTop: undefined }), true, type);
    for (const patch of [{ line: 0 }, { endLine: 1.5 }, { line: undefined }, { endLine: "8" }]) {
      assert.equal(isRegisteredPreviewMessage({ ...message, ...patch }), false, `${type} ${JSON.stringify(patch)}`);
    }
  }
  assert.equal(isRegisteredPreviewMessage({ ...base, type: "previewBlocksCut", line: 1, endLine: 1, pinViewportTop: Number.NaN }), false);
  const paste = { ...base, type: "previewBlocksPaste", insertAfterLine: 0, pinLine: 4, pinViewportTop: 99 };
  assert.equal(isRegisteredPreviewMessage(paste), true);
  assert.equal(isRegisteredPreviewMessage({ ...paste, pinLine: undefined, pinViewportTop: undefined }), true);
  for (const patch of [{ insertAfterLine: -1 }, { insertAfterLine: 1.5 }, { insertAfterLine: undefined },
    { pinLine: 0 }, { pinViewportTop: 200000 }]) {
    assert.equal(isRegisteredPreviewMessage({ ...paste, ...patch }), false, JSON.stringify(patch));
  }
});

test("T38: previewPasteImage caps the size and accepts plain base64 of an allowed type only", () => {
  const base = {
    type: "previewPasteImage", documentId: "doc", documentVersion: 1, requestId: 1,
    editId: "host-1", mime: "image/png", dataBase64: "aGVsbG8=",
  };
  assert.equal(isRegisteredPreviewMessage(base), true);
  assert.equal(isRegisteredPreviewMessage({ ...base, mime: "image/jpeg" }), true);
  assert.equal(isRegisteredPreviewMessage({ ...base, dataBase64: "A".repeat(14_000_000) }), true);
  for (const patch of [
    { dataBase64: "A".repeat(14_000_004) }, { dataBase64: "" }, { dataBase64: "data:image/png;base64,AAAA" },
    { dataBase64: "AA AA" }, { dataBase64: "AAA" }, { dataBase64: 5 }, { dataBase64: undefined },
    { mime: "image/svg+xml" }, { mime: "text/html" }, { mime: undefined }, { editId: "" }, { editId: undefined },
  ]) {
    assert.equal(isRegisteredPreviewMessage({ ...base, ...patch }), false, JSON.stringify(patch).slice(0, 60));
  }
});

test("T43: previewCommentCreate and previewCommentReply validate anchor, id and body limits", () => {
  const anchor = { line: 2, endLine: 3, quote: "q", prefix: "p", suffix: "s" };
  const create = { type: "previewCommentCreate", documentId: "doc", documentVersion: 1, requestId: 1, anchor, body: "Why?" };
  assert.equal(isRegisteredPreviewMessage(create), true);
  assert.equal(isRegisteredPreviewMessage({ ...create, body: "x".repeat(10_000) }), true);
  for (const patch of [
    { body: "" }, { body: "x".repeat(10_001) }, { body: 5 }, { body: undefined },
    { anchor: undefined }, { anchor: null }, { anchor: { ...anchor, line: 0 } },
    { anchor: { ...anchor, endLine: 1 } }, { anchor: { ...anchor, quote: "q".repeat(501) } },
    { anchor: { ...anchor, prefix: "p".repeat(33) } }, { anchor: { ...anchor, suffix: "s".repeat(33) } },
    { anchor: { ...anchor, quote: 1 } },
  ]) {
    assert.equal(isRegisteredPreviewMessage({ ...create, ...patch }), false, JSON.stringify(patch).slice(0, 60));
  }
  const reply = { type: "previewCommentReply", documentId: "doc", documentVersion: 1, requestId: 1, threadId: "t_0a0b0c0d", body: "Because" };
  assert.equal(isRegisteredPreviewMessage(reply), true);
  for (const patch of [{ body: "" }, { body: "x".repeat(10_001) }, { threadId: "" }, { threadId: 3 },
    { threadId: "t".repeat(10_001) }, { threadId: undefined }]) {
    assert.equal(isRegisteredPreviewMessage({ ...reply, ...patch }), false, JSON.stringify(patch).slice(0, 60));
  }
});

test("T44: previewCommentResolve and previewCommentDelete validate the thread id and the flag", () => {
  const base = { documentId: "doc", documentVersion: 1, requestId: 1, threadId: "t_0a0b0c0d" };
  const resolve = { type: "previewCommentResolve", ...base, resolved: true };
  assert.equal(isRegisteredPreviewMessage(resolve), true);
  assert.equal(isRegisteredPreviewMessage({ ...resolve, resolved: false }), true);
  for (const patch of [{ resolved: "yes" }, { resolved: undefined }, { resolved: 1 }, { threadId: "" },
    { threadId: 3 }, { threadId: undefined }, { threadId: "t".repeat(10_001) }]) {
    assert.equal(isRegisteredPreviewMessage({ ...resolve, ...patch }), false, JSON.stringify(patch).slice(0, 60));
  }
  const remove = { type: "previewCommentDelete", ...base };
  assert.equal(isRegisteredPreviewMessage(remove), true);
  for (const patch of [{ threadId: "" }, { threadId: 3 }, { threadId: undefined }]) {
    assert.equal(isRegisteredPreviewMessage({ ...remove, ...patch }), false, JSON.stringify(patch).slice(0, 60));
  }
});
