/**
 * The page-state messages (readiness, scrolling, reveal, the toolbar toggles and the inline edits)
 * used to be validated by one boolean chain in the host. They now have one validator per type in
 * the protocol registry. This test keeps that chain, frozen as it was (with the wire field renamed
 * to `revision`), as the oracle, and checks that the registry accepts exactly the same messages on
 * a corpus of well-formed messages, every single-field variant and every pair of variants.
 */
import * as assert from "node:assert/strict";
import { test } from "node:test";

import { isPageToHostMessage } from "../../src/protocol/pageToHost";
import { isPreviewThemeMode, isPreviewThemeModeChangedMessage } from "../../src/state/previewTheme";

/** The validator of the page-state family before the protocol registry existed. */
function frozenStateValidator(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }
  const message = value as Record<string, any>;
  const themeModeChange = isPreviewThemeModeChangedMessage(value);
  const validType = message.type === "previewReady"
    || message.type === "previewScroll"
    || message.type === "previewReveal"
    || message.type === "previewState"
    || message.type === "previewLink"
    || message.type === "previewLinkDiscover"
    || message.type === "previewRefresh"
    || message.type === "previewAnchorModeChanged"
    || message.type === "previewEditOpen"
    || message.type === "previewEditSave"
    || message.type === "previewEditCancel"
    || message.type === "previewFrontmatterSave"
    || message.type === "previewCheckboxToggle"
    || message.type === "previewEditModeChanged"
    || themeModeChange;
  const validLine = message.line === undefined
    || (Number.isSafeInteger(message.line) && message.line >= 1);
  const validEndLine = message.endLine === undefined
    || (Number.isSafeInteger(message.endLine) && message.endLine >= 1);
  const validSourceLine = message.sourceLine === undefined
    || (Number.isSafeInteger(message.sourceLine) && message.sourceLine >= 1);
  const validAnchorLine = message.anchorLine === undefined
    || (typeof message.anchorLine === "number" && Number.isFinite(message.anchorLine) && message.anchorLine >= 1);
  const validPin = (message.pinLine === undefined && message.pinViewportTop === undefined)
    || ((message.type === "previewFrontmatterSave"
      || (message.type === "previewEditSave" && message.final === true))
      && Number.isSafeInteger(message.pinLine)
      && message.pinLine >= 1
      && typeof message.pinViewportTop === "number"
      && Number.isFinite(message.pinViewportTop)
      && Math.abs(message.pinViewportTop) <= 100000);
  const validSelectionLine = message.selectionLine === undefined
    || (Number.isSafeInteger(message.selectionLine) && message.selectionLine >= 1);
  const validScrollTop = message.scrollTop === undefined
    || (typeof message.scrollTop === "number" && Number.isFinite(message.scrollTop) && message.scrollTop >= 0);
  const validThemeMode = message.previewThemeMode === undefined
    || isPreviewThemeMode(message.previewThemeMode);
  const validAnchorMode = message.anchorToEditor === undefined
    || typeof message.anchorToEditor === "boolean";
  const validEditMode = message.type === "previewEditModeChanged"
    ? typeof message.editMode === "boolean"
    : (message.editMode === undefined || typeof message.editMode === "boolean");
  const editRequest = message.type === "previewEditOpen"
    || message.type === "previewEditSave"
    || message.type === "previewEditCancel"
    || message.type === "previewFrontmatterSave"
    || message.type === "previewCheckboxToggle";
  const validEditRequest = !editRequest || (
    typeof message.editId === "string"
    && message.editId.length > 0
    && (message.type !== "previewFrontmatterSave"
      || (typeof message.fieldName === "string" && message.fieldName.length > 0))
    && (message.type === "previewFrontmatterSave"
      || (message.line !== undefined
        && message.endLine !== undefined
        && message.endLine >= message.line))
  );
  const validInsertAfterLine = message.insertAfterLine === undefined
    || ((message.type === "previewEditOpen"
      || message.type === "previewEditSave"
      || message.type === "previewEditCancel")
      && Number.isSafeInteger(message.insertAfterLine)
      && message.insertAfterLine >= 0);
  const validBlockEditOpen = message.blockEditOpen === undefined
    || (message.type === "previewReady" && typeof message.blockEditOpen === "boolean");
  const validEditPayload = message.type !== "previewEditSave"
    || (typeof message.originalText === "string" && typeof message.editedText === "string");
  const validEditFinal = message.final === undefined
    || (message.type === "previewEditSave" && typeof message.final === "boolean");
  const validFrontmatterPayload = message.type !== "previewFrontmatterSave"
    || message.frontmatterAction === "remove"
    || Object.prototype.hasOwnProperty.call(message, "fieldValue");
  const validFrontmatterFormat = message.fieldValueFormat === undefined
    || (message.type === "previewFrontmatterSave" && message.fieldValueFormat === "yaml");
  const validFrontmatterStyle = message.fieldValueStyle === undefined
    || (message.type === "previewFrontmatterSave"
      && message.fieldValueStyle === "plain"
      && message.frontmatterAction === undefined
      && message.fieldValueFormat === undefined);
  const validFlush = message.flush === undefined
    || ((message.type === "previewFrontmatterSave" || message.type === "previewEditSave")
      && message.flush === true);
  const validFrontmatterKey = message.newFieldName === undefined
    || (message.type === "previewFrontmatterSave" && typeof message.newFieldName === "string");
  const validCheckbox = message.type !== "previewCheckboxToggle"
    ? message.column === undefined && message.checked === undefined
    : Number.isSafeInteger(message.column) && message.column >= 0
      && typeof message.checked === "boolean"
      && message.line === message.endLine;
  const validAfterField = message.afterField === undefined
    || (message.type === "previewFrontmatterSave"
      && message.frontmatterAction === "add"
      && typeof message.afterField === "string"
      && message.afterField.length >= 1
      && message.afterField.length <= 1024
      && !/[\r\n]/u.test(message.afterField));
  const validFrontmatterAction = message.frontmatterAction === undefined
    || (message.type === "previewFrontmatterSave"
      && (message.frontmatterAction === "add" || message.frontmatterAction === "remove"));
  return validType
    && typeof message.documentId === "string"
    && Number.isSafeInteger(message.revision)
    && Number.isSafeInteger(message.requestId)
    && validLine && validEndLine && validSourceLine && validAnchorLine && validPin && validSelectionLine
    && validScrollTop && validThemeMode && validAnchorMode && validEditMode && validEditRequest
    && validInsertAfterLine && validBlockEditOpen && validEditPayload && validEditFinal
    && validFrontmatterPayload && validFrontmatterFormat && validFrontmatterKey && validFlush
    && validFrontmatterStyle && validFrontmatterAction && validAfterField && validCheckbox
    && (message.type !== "previewThemeModeChanged" || themeModeChange)
    && (message.type !== "previewAnchorModeChanged" || typeof message.anchorToEditor === "boolean")
    && (message.type !== "previewLinkDiscover" || (Array.isArray(message.requests)
      && message.requests.length <= 64
      && message.requests.every((request: unknown) => typeof request === "string" && request.length <= 4096)))
    && (message.request === undefined || typeof message.request === "string");
}

const envelope = { documentId: "file:///doc.md", revision: 4, requestId: 9 };

/** One well-formed message per page-state type (several for the types with variants). */
const BASES: ReadonlyArray<Record<string, unknown>> = [
  { type: "previewReady", ...envelope },
  { type: "previewReady", ...envelope, blockEditOpen: true },
  { type: "previewScroll", ...envelope, line: 3, anchorLine: 3.5, scrollTop: 10 },
  { type: "previewReveal", ...envelope, line: 3, activation: "click" },
  { type: "previewState", ...envelope, sourceLine: 2, scrollTop: 0, openDisclosures: [1] },
  { type: "previewLink", ...envelope, request: "other.md" },
  { type: "previewLinkDiscover", ...envelope, requests: ["a.md", "b.md"] },
  { type: "previewThemeModeChanged", ...envelope, previewThemeMode: "dark" },
  { type: "previewRefresh", ...envelope },
  { type: "previewAnchorModeChanged", ...envelope, anchorToEditor: false },
  { type: "previewEditModeChanged", ...envelope, editMode: true },
  { type: "previewEditOpen", ...envelope, editId: "e1", line: 3, endLine: 4 },
  { type: "previewEditOpen", ...envelope, editId: "e1", line: 3, endLine: 3, insertAfterLine: 0 },
  { type: "previewEditSave", ...envelope, editId: "e1", line: 3, endLine: 4, originalText: "a", editedText: "b", final: false },
  { type: "previewEditSave", ...envelope, editId: "e1", line: 3, endLine: 4, originalText: "a", editedText: "b",
    final: true, pinLine: 3, pinViewportTop: -20, flush: true },
  { type: "previewEditCancel", ...envelope, editId: "e1", line: 3, endLine: 4 },
  { type: "previewFrontmatterSave", ...envelope, editId: "f1", fieldName: "title", fieldValue: "x" },
  { type: "previewFrontmatterSave", ...envelope, editId: "f1", fieldName: "title", frontmatterAction: "remove" },
  { type: "previewFrontmatterSave", ...envelope, editId: "f1", fieldName: "new", frontmatterAction: "add",
    afterField: "title", fieldValue: 1, fieldValueFormat: "yaml" },
  { type: "previewFrontmatterSave", ...envelope, editId: "f1", fieldName: "k", fieldValue: "v", fieldValueStyle: "plain",
    newFieldName: "key", pinLine: 1, pinViewportTop: 0, flush: true },
  { type: "previewCheckboxToggle", ...envelope, editId: "c1", line: 5, endLine: 5, column: 2, checked: true },
];

/** Values each field is tried with: valid ones, invalid ones and absent. */
const VARIANTS: Readonly<Record<string, readonly unknown[]>> = {
  type: ["previewThemeModeChanged", "previewSomething", 7],
  documentId: [undefined, 3, "x".repeat(5000)],
  revision: [undefined, 1.5, "4", 0, -2],
  requestId: [undefined, Number.NaN, 2 ** 53],
  line: [undefined, 0, 1, 1.5, "3", 6],
  endLine: [undefined, 0, 2, 5, 9],
  sourceLine: [0, 2],
  anchorLine: [0.5, 1, Infinity, "2"],
  selectionLine: [0, 4],
  scrollTop: [-1, 0, Number.NaN],
  previewThemeMode: [undefined, "cream", "neon"],
  anchorToEditor: [undefined, true, "yes"],
  editMode: [undefined, false, 1],
  request: [undefined, "x.md", 4],
  editId: [undefined, "", "e2", 5],
  insertAfterLine: [undefined, 0, -1, 2.5],
  blockEditOpen: [undefined, false, "no"],
  originalText: [undefined, 3],
  editedText: [undefined, ""],
  final: [undefined, true, false, "true"],
  pinLine: [undefined, 0, 2],
  pinViewportTop: [undefined, 200000, 12, Number.NaN],
  flush: [undefined, true, false],
  fieldName: [undefined, "", "other"],
  fieldValue: [undefined, null],
  frontmatterAction: [undefined, "add", "remove", "rename"],
  afterField: [undefined, "", "a\nb", "x".repeat(1025), "title"],
  newFieldName: [undefined, 3, "renamed"],
  fieldValueFormat: [undefined, "yaml", "json"],
  fieldValueStyle: [undefined, "plain", "quoted"],
  column: [undefined, -1, 0, 1.5],
  checked: [undefined, false, "true"],
  requests: [undefined, [], ["a"], [1], Array.from({ length: 65 }, () => "x"), ["x".repeat(4097)]],
};

/** A message with one field replaced; `undefined` removes the field (not merely sets it). */
function withField(base: Record<string, unknown>, field: string, value: unknown): Record<string, unknown> {
  const next = { ...base };
  if (value === undefined) delete next[field];
  else next[field] = value;
  return next;
}

function variantsOf(base: Record<string, unknown>): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const [field, values] of Object.entries(VARIANTS)) {
    for (const value of values) out.push(withField(base, field, value));
  }
  return out;
}

test("the page-state validators accept exactly what the frozen validator accepted", () => {
  let checked = 0;
  let accepted = 0;
  const fields = Object.entries(VARIANTS);
  for (const base of BASES) {
    assert.equal(isPageToHostMessage(base), true, `well-formed ${String(base.type)}`);
    assert.equal(frozenStateValidator(base), true, `the oracle accepts ${String(base.type)}`);
    for (const single of variantsOf(base)) {
      const expected = frozenStateValidator(single);
      assert.equal(isPageToHostMessage(single), expected, JSON.stringify(single));
      checked += 1;
      if (expected) accepted += 1;
      // Pairs: the single variant combined with every variant of a later field.
      for (const [field, values] of fields) {
        for (const value of values) {
          const pair = withField(single, field, value);
          const pairExpected = frozenStateValidator(pair);
          assert.equal(isPageToHostMessage(pair), pairExpected, JSON.stringify(pair));
          checked += 1;
          if (pairExpected) accepted += 1;
        }
      }
    }
  }
  // The corpus is not vacuous: it holds many messages of both outcomes.
  assert.ok(checked > 100_000, `checked ${checked}`);
  assert.ok(accepted > 10_000 && checked - accepted > 10_000, `accepted ${accepted} of ${checked}`);
});

test("a page-state message keeps accepting a document id longer than the registered bound", () => {
  const long = { type: "previewScroll", documentId: "x".repeat(5000), revision: 1, requestId: 1, line: 2 };
  assert.equal(isPageToHostMessage(long), true);
  assert.equal(isPageToHostMessage({ ...long, type: "previewCopyText", text: "code" }), false);
});

test("non-objects and inherited keys are not page messages", () => {
  for (const value of [null, undefined, 0, "previewReady", []]) {
    assert.equal(isPageToHostMessage(value), false, String(value));
  }
  for (const type of ["__proto__", "constructor", "toString", "hasOwnProperty"]) {
    assert.equal(isPageToHostMessage({ type, ...envelope }), false, type);
  }
});
