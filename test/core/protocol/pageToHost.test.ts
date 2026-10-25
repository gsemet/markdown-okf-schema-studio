import * as assert from "node:assert/strict";
import { test } from "node:test";

import { isBoundedString, isOneOf, isSourceLine } from "../../../src/core/protocol/envelope";
import {
  createMessageChecker as createPreviewMessageChecker,
  isPageToHostMessage as isRegisteredPreviewMessage,
} from "../../../src/core/protocol/pageToHost";

const check = createPreviewMessageChecker({ sample: (m) => m.text === "ok" });
const valid = { type: "sample", documentId: "doc", revision: 3, requestId: 7, text: "ok" };

test("accepts a valid registered message", () => {
  assert.equal(check(valid), true);
});

test("rejects missing or non-integer ids and oversize documentId", () => {
  assert.equal(check({ ...valid, documentId: undefined }), false);
  assert.equal(check({ ...valid, documentId: 1 }), false);
  assert.equal(check({ ...valid, documentId: "x".repeat(4097) }), false);
  assert.equal(check({ ...valid, documentId: "x".repeat(4096) }), true);
  assert.equal(check({ ...valid, revision: 1.5 }), false);
  assert.equal(check({ ...valid, revision: "3" }), false);
  assert.equal(check({ ...valid, requestId: undefined }), false);
  assert.equal(check({ ...valid, requestId: Number.NaN }), false);
  assert.equal(check({ ...valid, requestId: 2 ** 53 }), false);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-052
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

// @tests_req SwRS-MDOKFSTUDIO-CODE-026
test("previewCopyText needs an edit id and a string; the 1 MB limit is the host's to answer", () => {
  const copy = { type: "previewCopyText", documentId: "doc", revision: 1, requestId: 1, editId: "e", text: "code" };
  assert.equal(isRegisteredPreviewMessage(copy), true);
  assert.equal(isRegisteredPreviewMessage({ ...copy, text: "" }), true);
  assert.equal(isRegisteredPreviewMessage({ ...copy, text: "x".repeat(1_000_001) }), true);
  assert.equal(isRegisteredPreviewMessage({ ...copy, text: "x".repeat(20_000_001) }), false);
  assert.equal(isRegisteredPreviewMessage({ ...copy, text: 5 }), false);
  assert.equal(isRegisteredPreviewMessage({ ...copy, text: undefined }), false);
  assert.equal(isRegisteredPreviewMessage({ ...copy, editId: undefined }), false);
  assert.equal(isRegisteredPreviewMessage({ ...copy, editId: "" }), false);
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

// @tests_req SwRS-MDOKFSTUDIO-LIFE-169
// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-013
test("previewViewPreferenceChanged validates the value per preference", () => {
  const base = { type: "previewViewPreferenceChanged", documentId: "doc", revision: 1, requestId: 1 };
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
  assert.equal(ok("comments", false), true);
  assert.equal(ok("comments", "no"), false);
  assert.equal(ok("toolbarCollapsed", true), true);
  assert.equal(ok("toolbarCollapsed", "yes"), false);
  assert.equal(ok("other", true), false);
  assert.equal(ok(undefined, true), false);
  assert.equal(ok("__proto__", true), false);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-058
test("previewHistoryGo accepts only back or forward", () => {
  const base = { type: "previewHistoryGo", documentId: "doc", revision: 1, requestId: 1 };
  assert.equal(isRegisteredPreviewMessage({ ...base, direction: "back" }), true);
  assert.equal(isRegisteredPreviewMessage({ ...base, direction: "forward" }), true);
  assert.equal(isRegisteredPreviewMessage({ ...base, direction: "up" }), false);
  assert.equal(isRegisteredPreviewMessage({ ...base }), false);
});

test("previewPaletteModeChanged accepts only strict, gfm or myst", () => {
  const base = { type: "previewPaletteModeChanged", documentId: "doc", revision: 1, requestId: 1 };
  for (const mode of ["strict", "gfm", "myst"]) {
    assert.equal(isRegisteredPreviewMessage({ ...base, mode }), true, mode);
  }
  assert.equal(isRegisteredPreviewMessage({ ...base, mode: "html" }), false);
  assert.equal(isRegisteredPreviewMessage({ ...base, mode: "" }), false);
  assert.equal(isRegisteredPreviewMessage({ ...base, mode: true }), false);
  assert.equal(isRegisteredPreviewMessage({ ...base }), false);
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-038
// @tests_req SwRS-MDOKFSTUDIO-MYST-051
test("previewLabelRename validates the line and both label names", () => {
  const rename = {
    type: "previewLabelRename", documentId: "doc", revision: 1, requestId: 1, editId: "e",
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

// @tests_req SwRS-MDOKFSTUDIO-TRUST-090
test("T30: the list and pick messages carry an edit id and no other payload", () => {
  for (const type of ["previewListTargets", "previewListCitations", "previewPickDocument", "previewPickImage"]) {
    const base = { type, documentId: "doc", revision: 1, requestId: 1, editId: "host-1" };
    assert.equal(isRegisteredPreviewMessage(base), true, type);
    assert.equal(isRegisteredPreviewMessage({ ...base, editId: "" }), false, type);
    assert.equal(isRegisteredPreviewMessage({ ...base, editId: "x".repeat(101) }), false, type);
    assert.equal(isRegisteredPreviewMessage({ ...base, editId: undefined }), false, type);
    assert.equal(isRegisteredPreviewMessage({ ...base, editId: 4 }), false, type);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-109
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-240
test("previewBlockMove validates both ranges, the direction and the optional pin", () => {
  const move = {
    type: "previewBlockMove", documentId: "doc", revision: 1, requestId: 1,
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

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-241
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-242
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-243
test("T40: the block clipboard messages validate their lines and the optional pin", () => {
  const base = { documentId: "doc", revision: 1, requestId: 1 };
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

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-196
test("T38: previewPasteImage caps the size and accepts plain base64 of an allowed type only", () => {
  const base = {
    type: "previewPasteImage", documentId: "doc", revision: 1, requestId: 1,
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

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-213
test("T1: previewPasteHtml accepts a bounded non-empty HTML string with an edit id", () => {
  const base = { type: "previewPasteHtml", documentId: "doc", revision: 1, requestId: 1, editId: "host-1", html: "<b>x</b>" };
  assert.equal(isRegisteredPreviewMessage(base), true);
  for (const patch of [{ html: "" }, { html: 5 }, { html: undefined }, { html: "x".repeat(1_000_001) }, { editId: "" }]) {
    assert.equal(isRegisteredPreviewMessage({ ...base, ...patch }), false, JSON.stringify(patch).slice(0, 40));
  }
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-069
// @tests_req SwRS-MDOKFSTUDIO-REVIEW-070
test("T43: previewCommentCreate and previewCommentReply validate anchor, id and body limits", () => {
  const anchor = { line: 2, endLine: 3, quote: "q", prefix: "p", suffix: "s" };
  const create = { type: "previewCommentCreate", documentId: "doc", revision: 1, requestId: 1, anchor, body: "Why?" };
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
  const reply = { type: "previewCommentReply", documentId: "doc", revision: 1, requestId: 1, threadId: "t_0a0b0c0d", body: "Because" };
  assert.equal(isRegisteredPreviewMessage(reply), true);
  for (const patch of [{ body: "" }, { body: "x".repeat(10_001) }, { threadId: "" }, { threadId: 3 },
    { threadId: "t".repeat(10_001) }, { threadId: undefined }]) {
    assert.equal(isRegisteredPreviewMessage({ ...reply, ...patch }), false, JSON.stringify(patch).slice(0, 60));
  }
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-071
test("T44: previewCommentResolve and previewCommentDelete validate the thread id and the flag", () => {
  const base = { documentId: "doc", revision: 1, requestId: 1, threadId: "t_0a0b0c0d" };
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

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-245
test("CR 025: previewEditFlushed validates the flush id and the flag", () => {
  const flushed = {
    type: "previewEditFlushed", documentId: "doc", revision: 1, requestId: 1, flushId: "flush-1", flushed: true,
  };
  assert.equal(isRegisteredPreviewMessage(flushed), true);
  assert.equal(isRegisteredPreviewMessage({ ...flushed, flushed: false }), true);
  for (const patch of [{ flushId: "" }, { flushId: 3 }, { flushId: undefined }, { flushId: "f".repeat(101) },
    { flushed: "yes" }, { flushed: undefined }]) {
    assert.equal(isRegisteredPreviewMessage({ ...flushed, ...patch }), false, JSON.stringify(patch));
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-244
test("STAB-03: previewEditClosed carries the id of the closed editor", () => {
  const closed = { type: "previewEditClosed", documentId: "doc", revision: 1, requestId: 1, editId: "edit-3" };
  assert.equal(isRegisteredPreviewMessage(closed), true);
  for (const patch of [{ editId: "" }, { editId: 3 }, { editId: undefined }, { editId: "e".repeat(101) }]) {
    assert.equal(isRegisteredPreviewMessage({ ...closed, ...patch }), false, JSON.stringify(patch));
  }
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-178
test("previewThreadReply and previewThreadDelete validate the lines, the edit id and the text", () => {
  const reply = {
    type: "previewThreadReply", documentId: "doc", revision: 1, requestId: 1, editId: "host-1",
    line: 3, endLine: 7, text: "an answer",
  };
  assert.equal(isRegisteredPreviewMessage(reply), true);
  for (const patch of [
    { text: "" }, { text: "   " }, { text: "x".repeat(10001) }, { text: 4 }, { text: undefined },
    { line: 0 }, { endLine: 2 }, { endLine: undefined }, { editId: "" }, { editId: undefined },
  ]) {
    assert.equal(isRegisteredPreviewMessage({ ...reply, ...patch }), false, JSON.stringify(patch));
  }
  const { text: _text, ...rest } = reply;
  const remove = { ...rest, type: "previewThreadDelete" };
  assert.equal(isRegisteredPreviewMessage(remove), true);
  assert.equal(isRegisteredPreviewMessage({ ...remove, line: 8 }), false);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-050
test("previewPlantUmlInclude carries a bounded file name, the including file id or null, and an edit id", () => {
  const base = { type: "previewPlantUmlInclude", documentId: "doc", revision: 1, requestId: 1, editId: "plantuml-1", path: "styles/common.puml", from: null };
  assert.equal(isRegisteredPreviewMessage(base), true);
  assert.equal(isRegisteredPreviewMessage({ ...base, from: "/docs/styles/common.puml" }), true);
  assert.equal(isRegisteredPreviewMessage({ ...base, path: "x".repeat(4096) }), true);
  assert.equal(isRegisteredPreviewMessage({ ...base, path: "x".repeat(4097) }), false);
  assert.equal(isRegisteredPreviewMessage({ ...base, path: "  " }), false);
  assert.equal(isRegisteredPreviewMessage({ ...base, path: 3 }), false);
  assert.equal(isRegisteredPreviewMessage({ ...base, from: "" }), false);
  assert.equal(isRegisteredPreviewMessage({ ...base, from: undefined }), false);
  assert.equal(isRegisteredPreviewMessage({ ...base, from: 1 }), false);
  assert.equal(isRegisteredPreviewMessage({ ...base, editId: "" }), false);
  assert.equal(isRegisteredPreviewMessage({ ...base, editId: undefined }), false);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-086
test("CR 050: the warning banner messages are registered with a bounded key", () => {
  const envelope = { documentId: "file:///chapter.md", revision: 3, requestId: 7 };
  assert.equal(isRegisteredPreviewMessage({ ...envelope, type: "previewShowProblems" }), true);
  assert.equal(isRegisteredPreviewMessage({ ...envelope, type: "previewWarningBannerClosed", key: "2-0a1b2c3d" }), true);
  for (const key of [undefined, 2, "", "2-0A1B2C3D", "2-0a1b2c3", "x".repeat(40), "2-0a1b2c3d\n"]) {
    assert.equal(isRegisteredPreviewMessage({ ...envelope, type: "previewWarningBannerClosed", key }), false, String(key));
  }
  assert.equal(isRegisteredPreviewMessage({ type: "previewShowProblems" }), false, "the envelope is required");
});
