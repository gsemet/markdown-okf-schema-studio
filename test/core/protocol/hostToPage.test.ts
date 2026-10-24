import * as assert from "node:assert/strict";
import { test } from "node:test";

import type { PageIdentity } from "../../../src/core/protocol/envelope";
import { createHostMessageFilter, type HostToPageType } from "../../../src/core/protocol/hostToPage";

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
  previewListTargetsResult: { editId: "h", ok: true, items: [], truncated: false },
  previewListCitationsResult: { editId: "h", ok: true, items: [], truncated: false },
  previewPickDocumentResult: { editId: "h", ok: true, path: "a.md" },
  previewPickImageResult: { editId: "h", ok: true, cancelled: true },
  previewPasteImageResult: { editId: "h", ok: true, fileName: "a.png" },
  previewPasteHtmlResult: { editId: "h", ok: true, markdown: "**x**" },
  previewPlantUmlIncludeResult: { editId: "h", ok: true, id: "/a.puml", text: "" },
  sourceScroll: { line: 4 },
  previewLinkTargets: { targets: [] },
  previewHistoryState: { canBack: true, canForward: false },
  previewShowComments: { showComments: true },
  previewIncomingChanges: { enabled: true, ranges: [] },
  previewComments: { threads: [] },
  previewCommentResult: { ok: true, kind: "create" },
  previewFlushEdit: { flushId: "flush-1" },
  navigateAnchor: { value: "#top" },
  previewEditorWatch: { editId: "e" },
  previewPlantUmlIncludesChanged: {},
  previewPairing: { pairedTextEditor: true },
  themeChanged: { themeKind: 2 },
};

const message = (type: string, identity: Partial<PageIdentity> | Record<string, unknown>): Record<string, unknown> =>
  ({ type, ...identity, ...WELL_FORMED[type as HostToPageType] });

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

test("the payload checks refuse what the page used to refuse", () => {
  const refused: Array<[HostToPageType, Record<string, unknown>]> = [
    ["previewPropertiesTable", { markup: 42 }],
    ["previewLinkTargets", { targets: "none" }],
    ["previewFlushEdit", { flushId: 42 }],
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

test("values that are not host messages are refused", () => {
  for (const value of [null, undefined, 0, "sourceScroll", [], { type: 3 }, { type: "unknownType", ...page }]) {
    assert.equal(filter.accepts(value, page), false, JSON.stringify(value));
  }
  for (const type of ["__proto__", "constructor", "toString", "hasOwnProperty"]) {
    assert.equal(filter.accepts({ type, ...page }, page), false, type);
  }
});
