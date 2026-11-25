import * as assert from "node:assert/strict";
import { test } from "node:test";

import type { PageIdentity } from "../../../src/core/protocol/envelope";
import { createHostMessageFilter, MAX_PAGE_TEXT_LENGTH, type HostToPageType } from "../../../src/core/protocol/hostToPage";

/** The filter as the page runs it (the page bundle imports it). */
const filter = createHostMessageFilter();

const page: PageIdentity = { documentId: "file:///doc.md", revision: 7, requestId: 11 };

/** A message of each type that its rule accepts on `page`. */
const WELL_FORMED: { readonly [T in HostToPageType]: Record<string, unknown> } = {
  previewPendingOverlay: { visible: true, label: "Pending", message: "Rendering." },
  previewPropertiesTable: { seq: 1, markup: "<section></section>" },
  previewContentPatch: {
    next: { revision: 8, requestId: 12 }, contentHtml: "<p>x</p>", status: "success", label: "Ready", diagnostics: [],
  },
  previewFrontmatterResult: { editId: "f", saved: true },
  previewEditSource: { editId: "e", originalText: "x" },
  previewCheckboxResult: { editId: "c", saved: true },
  previewLabelRenameResult: { editId: "l", ok: true },
  previewBlockMoveResult: { ok: true, line: 3 },
  previewBlocksResult: { op: "copy", ok: true },
  previewThreadReplyResult: { editId: "h", ok: true },
  previewThreadDeleteResult: { editId: "h", ok: true },
  previewFindReplaceResult: { editId: "h", ok: true, replaced: 2, skipped: 1 },
  previewListTargetsResult: { editId: "h", ok: true, items: [], truncated: false },
  previewListCitationsResult: { editId: "h", ok: true, items: [], truncated: false },
  previewPickDocumentResult: { editId: "h", ok: true, path: "a.md" },
  previewCopyTextResult: { editId: "h", ok: true },
  previewExportHtmlResult: { editId: "h", ok: true, fileName: "a.html", missingImages: 1 },
  previewPickImageResult: { editId: "h", ok: true, cancelled: true },
  previewPasteImageResult: { editId: "h", ok: true, fileName: "a.png" },
  previewPasteHtmlResult: { editId: "h", ok: true, markdown: "**x**" },
  previewPlantUmlIncludeResult: { editId: "h", ok: true, id: "/a.puml", text: "" },
  sourceScroll: { line: 4 },
  previewRevealLine: { line: 30 },
  previewLineMarkerClear: {},
  previewLinkTargets: { targets: [] },
  previewHistoryState: { canBack: true, canForward: false },
  previewShowComments: { showComments: true },
  previewSourceText: { text: "# Title" },
  previewIncomingChanges: { enabled: true, ranges: [] },
  previewBaselineDiff: { html: "<p>x</p>", hunks: [{ baseStart: 1, baseEnd: 1, start: 1, end: 1 }] },
  previewComments: { threads: [] },
  previewCommentResult: { ok: true, kind: "create" },
  previewFlushEdit: { flushId: "flush-1" },
  navigateAnchor: { value: "#top" },
  previewEditorWatch: { editId: "e" },
  previewPlantUmlIncludesChanged: {},
  previewPairing: { pairedTextEditor: true },
  previewEditCommand: { command: "undo" },
  previewFoldCommand: { command: "foldAll" },
  previewFindCommand: { command: "open" },
  previewSaveCommand: {},
  previewExportCommand: {},
  themeChanged: { themeKind: 2 },
};

const message = (type: string, identity: Partial<PageIdentity> | Record<string, unknown>): Record<string, unknown> =>
  ({ type, ...identity, ...WELL_FORMED[type as HostToPageType] });

// @tests_req SwRS-MDOKFSTUDIO-TRUST-059#S3
// @tests_req SwRS-MDOKFSTUDIO-TRUST-059#S5
test("every host message type has a rule, and a well-formed message for the page passes it", () => {
  assert.deepEqual(Object.keys(filter.rules).sort(), Object.keys(WELL_FORMED).sort());
  for (const type of Object.keys(WELL_FORMED)) {
    assert.equal(filter.accepts(message(type, page), page), true, type);
  }
});

test("each rule matches the identity it names, and only that", () => {
  const otherDocument = { ...page, documentId: "file:///other.md" };
  const otherRevision = { ...page, revision: 8 };
  const otherRequest = { ...page, requestId: 12 };
  for (const [type, rule] of Object.entries(filter.rules)) {
    const accepted = [otherDocument, otherRevision, otherRequest, {}].map((identity) =>
      filter.accepts(message(type, identity), page));
    if (rule.addressing === "render") {
      assert.deepEqual(accepted, [false, false, false, false], type);
    } else if (rule.addressing === "document") {
      assert.deepEqual(accepted, [false, true, true, false], type);
    } else {
      assert.deepEqual(accepted, [true, true, true, true], type);
    }
  }
  assert.equal(filter.rules.previewPlantUmlIncludesChanged.addressing, "document");
  for (const type of ["previewEditorWatch", "previewFlushEdit", "previewLabelRenameResult", "previewPasteImageResult"] as const) {
    assert.equal(filter.rules[type].addressing, "own-id", type);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-059#S6
test("the payload checks refuse what the page used to refuse", () => {
  const refused: Array<[HostToPageType, Record<string, unknown>]> = [
    ["previewPropertiesTable", { markup: 42 }],
    ["previewLinkTargets", { targets: "none" }],
    ["previewFlushEdit", { flushId: 42 }],
    ["previewEditCommand", { command: "format" }],
    ["previewEditCommand", { command: undefined }],
    ["previewFoldCommand", { command: "undo" }],
    ["previewFoldCommand", { command: undefined }],
    ["previewFindCommand", { command: "replace" }],
    ["previewEditorWatch", { editId: undefined }],
    ["previewContentPatch", { next: undefined }],
    ["previewContentPatch", { next: { revision: "8", requestId: 12 } }],
    ["previewContentPatch", { next: { revision: 8, requestId: 12, initialAnchor: Number.NaN } }],
    ["previewContentPatch", { next: { revision: 8, requestId: 12, initialPin: { line: "x", viewportTop: 0 } } }],
    ["previewContentPatch", { contentHtml: "x".repeat(20 * 1024 * 1024 + 1) }],
    ["previewContentPatch", { status: "unknown" }],
    ["previewContentPatch", { label: "x".repeat(501) }],
    ["previewContentPatch", { message: 3 }],
    ["previewContentPatch", { diagnostics: [{ severity: "error" }] }],
    ["previewContentPatch", { diagnostics: Array.from({ length: 501 }, () => ({ severity: "error", text: "t" })) }],
  ];
  for (const [type, payload] of refused) {
    assert.equal(filter.accepts({ ...message(type, page), ...payload }, page), false, `${type} ${JSON.stringify(payload).slice(0, 80)}`);
  }
  assert.equal(filter.accepts({
    ...message("previewContentPatch", page),
    message: "Built.",
    diagnostics: [{ severity: "warning", text: "w", code: "myst.ext" }],
    next: { revision: 8, requestId: 12, initialAnchor: 3.5, initialPin: { line: 2, viewportTop: -4 } },
  }, page), true);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-181#S2
test("previewRevealLine needs a 1-based safe integer line and addresses its render", () => {
  const send = (extra: Record<string, unknown>): boolean =>
    filter.accepts({ type: "previewRevealLine", ...page, ...extra }, page);
  assert.equal(send({ line: 1 }), true);
  assert.equal(send({ line: 30 }), true);
  for (const line of [0, -3, 2.5, "4", undefined, null, Number.NaN, Number.MAX_SAFE_INTEGER + 2]) {
    assert.equal(send({ line }), false, String(line));
  }
  assert.equal(filter.accepts({ type: "previewRevealLine", ...page, requestId: 99, line: 3 }, page), false);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-188#S1
// @tests_req SwRS-MDOKFSTUDIO-LIFE-188#S2
test("previewRevealLine accepts the two scroll modes or none and refuses any other value", () => {
  const send = (extra: Record<string, unknown>): boolean =>
    filter.accepts({ type: "previewRevealLine", ...page, line: 4, ...extra }, page);
  assert.equal(send({}), true);
  assert.equal(send({ scroll: "reading-line" }), true);
  assert.equal(send({ scroll: "if-off-screen" }), true);
  for (const scroll of ["smooth", "", "IF-OFF-SCREEN", 1, null, true, {}]) {
    assert.equal(send({ scroll }), false, String(scroll));
  }
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-189#S1
test("previewLineMarkerClear is accepted with the render envelope only", () => {
  assert.equal(filter.accepts({ type: "previewLineMarkerClear", ...page }, page), true);
  assert.equal(filter.accepts({ type: "previewLineMarkerClear", ...page, requestId: 99 }, page), false);
});

test("values that are not host messages are refused", () => {
  for (const value of [null, undefined, 0, "sourceScroll", [], { type: 3 }, { type: "unknownType", ...page }]) {
    assert.equal(filter.accepts(value, page), false, JSON.stringify(value));
  }
  for (const type of ["__proto__", "constructor", "toString", "hasOwnProperty"]) {
    assert.equal(filter.accepts({ type, ...page }, page), false, type);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-009#S3
test("CR147: a baseline message needs an html string and well-formed hunks", () => {
  const send = (extra: Record<string, unknown>): boolean => filter.accepts({ type: "previewBaselineDiff", ...page, ...extra }, page);
  const hunk = { baseStart: 2, baseEnd: 1, start: 2, end: 3 };
  assert.equal(send({ html: "", hunks: [hunk] }), true, "an empty base side ends one line before its start");
  assert.equal(send({ html: "x", hunks: [] }), true);
  assert.equal(send({ html: 5, hunks: [] }), false);
  assert.equal(send({ html: "x" }), false);
  assert.equal(send({ html: "x", hunks: [{ ...hunk, end: 0 }] }), false, "an end more than one before its start");
  assert.equal(send({ html: "x", hunks: [{ ...hunk, start: -1 }] }), false);
  assert.equal(send({ html: "x", hunks: [{ ...hunk, baseStart: 1.5 }] }), false);
  assert.equal(send({ html: "x", hunks: [null] }), false);
  assert.equal(send({ html: "x".repeat(20 * 1024 * 1024 + 1), hunks: [] }), false);
  assert.equal(send({ html: "x", hunks: new Array(100_001).fill(hunk) }), false);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-173#S1
test("the save command names the render and carries nothing else", () => {
  const send = (identity: Record<string, unknown>): boolean => filter.accepts({ type: "previewSaveCommand", ...identity }, page);
  assert.equal(send({ ...page }), true);
  assert.equal(send({ ...page, revision: 8 }), false, "another revision");
  assert.equal(send({ ...page, requestId: 12 }), false, "another request");
  assert.equal(send({ ...page, documentId: "file:///other.md" }), false, "another document");
  assert.equal(send({}), false, "no identity");
  assert.equal(filter.rules.previewSaveCommand.addressing, "render");
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-059#S6
test("previewEditSource and previewFrontmatterResult refuse a payload of the wrong shape", () => {
  const refused: Array<[HostToPageType, Record<string, unknown>]> = [
    ["previewEditSource", { editId: undefined }],
    ["previewEditSource", { error: 3 }],
    ["previewEditSource", { unsavedText: 3 }],
    ["previewEditSource", { unsavedText: "x".repeat(MAX_PAGE_TEXT_LENGTH + 1) }],
    ["previewEditSource", { done: false }],
    ["previewEditSource", { renderFollows: "yes" }],
    ["previewEditSource", { originalText: 3 }],
    ["previewEditSource", { line: 1.5 }],
    ["previewFrontmatterResult", { editId: 3 }],
    ["previewFrontmatterResult", { saved: "yes" }],
    ["previewFrontmatterResult", { unchanged: 1 }],
    ["previewFrontmatterResult", { error: {} }],
  ];
  for (const [type, payload] of refused) {
    assert.equal(filter.accepts({ ...message(type, page), ...payload }, page), false, `${type} ${JSON.stringify(payload).slice(0, 80)}`);
  }
  assert.equal(filter.accepts({
    ...message("previewEditSource", page), error: "No.", unsavedText: "kept", originalText: undefined,
  }, page), true);
  assert.equal(filter.accepts({ ...message("previewEditSource", page), done: true, renderFollows: true }, page), true);
  assert.equal(filter.accepts({ ...message("previewFrontmatterResult", page), saved: true, unchanged: true }, page), true);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-216#S5
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-216#S8
test("the answer to a detached save finds the page after a render moved its identity", () => {
  const moved = { ...page, revision: 9, requestId: 14 };
  assert.equal(filter.accepts({ type: "previewEditSource", ...page, editId: "e", done: true }, moved), true);
  assert.equal(filter.accepts({ type: "previewEditSource", ...page, documentId: "file:///other.md", editId: "e", done: true }, moved), false);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-271#S2
test("previewSourceText carries the document text for its render: a bounded string, nothing else", () => {
  assert.equal(filter.rules.previewSourceText.addressing, "render");
  const text = (value: unknown, identity: Partial<PageIdentity> = page): boolean =>
    filter.accepts({ type: "previewSourceText", ...identity, text: value }, page);
  assert.equal(text(""), true, "an empty document is a document");
  assert.equal(text("x".repeat(MAX_PAGE_TEXT_LENGTH)), true);
  assert.equal(text("x".repeat(MAX_PAGE_TEXT_LENGTH + 1)), false, "over the bound");
  assert.equal(text(undefined), false, "no text");
  assert.equal(text(12), false, "not a string");
  assert.equal(text("x", { ...page, requestId: 12 }), false, "another render");
});
