import * as assert from "node:assert/strict";
import { test } from "node:test";

import type { PageIdentity } from "../../../src/core/protocol/envelope";
import { createHostMessageFilter } from "../../../src/core/protocol/hostToPage";

// Tests added by the mutation campaign of src/core (CR-450): they pin the survivors of the first run.

const filter = createHostMessageFilter();
const page: PageIdentity = { documentId: "file:///doc.md", revision: 7, requestId: 11 };

const patch = (extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  type: "previewContentPatch",
  ...page,
  next: { revision: 8, requestId: 12 },
  contentHtml: "<p>x</p>",
  status: "success",
  label: "Ready",
  diagnostics: [],
  ...extra,
});
const accepts = (message: Record<string, unknown>) => filter.accepts(message, page);
const diagnosticsOf = (...entries: unknown[]) => accepts(patch({ diagnostics: entries }));

// @tests_req SwRS-MDOKFSTUDIO-TRUST-059#S3
test("a value that is not an object is never a host message", () => {
  for (const value of [null, undefined, "previewContentPatch", 5, true]) assert.equal(filter.accepts(value, page), false, String(value));
  assert.equal(filter.accepts({}, page), false);
  assert.equal(filter.accepts({ type: 5, ...page }, page), false);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-059#S4
test("the patch content and its text fields are accepted up to their cap and refused one past it", () => {
  assert.equal(accepts(patch({ contentHtml: "x".repeat(20 * 1024 * 1024) })), true, "20 MiB of content");
  assert.equal(accepts(patch({ contentHtml: "x".repeat(20 * 1024 * 1024 + 1) })), false);
  assert.equal(accepts(patch({ label: "x".repeat(500) })), true);
  assert.equal(accepts(patch({ label: "x".repeat(501) })), false);
  assert.equal(accepts(patch({ message: "x".repeat(20000) })), true);
  assert.equal(accepts(patch({ message: "x".repeat(20001) })), false);
  assert.equal(accepts(patch({ message: undefined })), true, "the message is optional");
  assert.equal(accepts(patch({ label: 3 })), false);
  assert.equal(accepts(patch({ contentHtml: 3 })), false);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-059#S4
test("a patch status is one of the six known ones", () => {
  for (const status of ["pending", "success", "stale", "error", "missing-source", "recovery"]) {
    assert.equal(accepts(patch({ status })), true, status);
  }
  for (const status of ["", "done", "Success", undefined, 1]) assert.equal(accepts(patch({ status })), false, String(status));
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-059#S6
test("a patch carries at most 500 diagnostics, each with bounded severity, text and code", () => {
  const entry = { severity: "error", text: "t" };
  assert.equal(accepts(patch({ diagnostics: Array.from({ length: 500 }, () => entry) })), true);
  assert.equal(accepts(patch({ diagnostics: Array.from({ length: 501 }, () => entry) })), false);
  assert.equal(accepts(patch({ diagnostics: "none" })), false, "not an array");
  assert.equal(accepts(patch({ diagnostics: undefined })), false);
  assert.equal(diagnosticsOf(null), false);
  assert.equal(diagnosticsOf(undefined), false);
  assert.equal(diagnosticsOf(0), false);
  assert.equal(diagnosticsOf({ severity: 1, text: "t" }), false);
  assert.equal(diagnosticsOf({ text: "t" }), false);
  assert.equal(diagnosticsOf({ severity: "e".repeat(50), text: "t" }), true);
  assert.equal(diagnosticsOf({ severity: "e".repeat(51), text: "t" }), false);
  assert.equal(diagnosticsOf({ severity: "error", text: 1 }), false);
  assert.equal(diagnosticsOf({ severity: "error" }), false);
  assert.equal(diagnosticsOf({ severity: "error", text: "t".repeat(20000) }), true);
  assert.equal(diagnosticsOf({ severity: "error", text: "t".repeat(20001) }), false);
  assert.equal(diagnosticsOf({ ...entry, code: "c".repeat(100) }), true);
  assert.equal(diagnosticsOf({ ...entry, code: "c".repeat(101) }), false);
  assert.equal(diagnosticsOf({ ...entry, code: undefined }), true, "the code is optional");
  assert.equal(diagnosticsOf({ ...entry, code: null }), false);
  assert.equal(diagnosticsOf({ ...entry, code: 5 }), false);
  assert.equal(diagnosticsOf(entry, { severity: "error" }), false, "every entry is checked, not only the first");
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-059#S1
// @tests_req SwRS-MDOKFSTUDIO-TRUST-059#S4
test("the next render of a patch is a plain object with safe integers, and its pin and anchor are finite", () => {
  const nonObject = (value: Record<string, unknown>) => Object.assign(() => undefined, value);
  assert.equal(accepts(patch({ next: null })), false);
  assert.equal(accepts(patch({ next: "next" })), false);
  assert.equal(accepts(patch({ next: nonObject({ revision: 8, requestId: 12 }) })), false, "a function is not an object");
  assert.equal(accepts(patch({ next: { revision: 8.5, requestId: 12 } })), false);
  assert.equal(accepts(patch({ next: { revision: 8, requestId: 12.5 } })), false);
  assert.equal(accepts(patch({ next: { revision: 8 } })), false);
  assert.equal(accepts(patch({ next: { requestId: 12 } })), false);
  assert.equal(accepts(patch({ next: { revision: 8, requestId: 12, initialPin: null } })), false);
  assert.equal(accepts(patch({ next: { revision: 8, requestId: 12, initialPin: "pin" } })), false);
  assert.equal(accepts(patch({ next: { revision: 8, requestId: 12, initialPin: nonObject({ line: 1, viewportTop: 2 }) } })), false);
  assert.equal(accepts(patch({ next: { revision: 8, requestId: 12, initialPin: { line: 1 } } })), false);
  assert.equal(accepts(patch({ next: { revision: 8, requestId: 12, initialPin: { viewportTop: 1 } } })), false);
  assert.equal(accepts(patch({ next: { revision: 8, requestId: 12, initialPin: { line: 1, viewportTop: 2 } } })), true);
  assert.equal(accepts(patch({ next: { revision: 8, requestId: 12, initialAnchor: Number.POSITIVE_INFINITY } })), false);
  assert.equal(accepts(patch({ next: { revision: 8, requestId: 12, initialAnchor: 0 } })), true);
});

const baseline = (extra: Record<string, unknown>) => accepts({ type: "previewBaselineDiff", ...page, ...extra });

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-009
test("a baseline diff is accepted up to 20 MiB of html and 100,000 hunks, with hunk bounds exact", () => {
  const hunk = { baseStart: 2, baseEnd: 1, start: 2, end: 1 };
  assert.equal(baseline({ html: "x".repeat(20 * 1024 * 1024), hunks: [] }), true);
  assert.equal(baseline({ html: "x", hunks: new Array(100_000).fill(hunk) }), true);
  assert.equal(baseline({ html: "x", hunks: [{ baseStart: 0, baseEnd: 0, start: 0, end: 0 }] }), true, "zero is a valid line");
  assert.equal(baseline({ html: "x", hunks: [hunk] }), true, "empty on both sides");
  assert.equal(baseline({ html: "x", hunks: [{ ...hunk, baseEnd: 0 }] }), false, "base end more than one before its start");
  assert.equal(baseline({ html: "x", hunks: [{ ...hunk, end: 0 }] }), false, "end more than one before its start");
  assert.equal(baseline({ html: "x", hunks: [{ ...hunk, baseEnd: -1 }] }), false);
  assert.equal(baseline({ html: "x", hunks: [hunk, { ...hunk, start: -1 }] }), false, "every hunk is checked");
  assert.equal(baseline({ html: "x", hunks: "none" }), false);
  assert.equal(baseline({ html: "x", hunks: [5] }), false);
});
