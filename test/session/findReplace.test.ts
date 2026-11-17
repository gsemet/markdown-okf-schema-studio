/**
 * Find and replace on the host side (requirement TOOLBAR-012): the `previewFindReplace` handler of
 * the source edit controller, against stub ports and a stub preview.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { applyTextEdits } from "../../src/core/edits/textEdit";
import { SourceEditController } from "../../src/session/features/sourceEdits";

const TEXT = ["# Title", "", "<!-- THREAD", "Ada (2026-10-16 10:47):", "  hello", "-->", "", "After.", ""].join("\n");

interface Setup {
  readonly handlers: Map<string, (message: any, preview: any) => PromiseLike<void> | undefined>;
  readonly results: Array<Record<string, unknown>>;
  readonly applied: unknown[][];
  readonly preview: any;
  readText(): number;
}

function setup(options: { restrictedReads?: boolean; editOpen?: boolean } = {}): Setup {
  const applied: unknown[][] = [];
  const results: Array<Record<string, unknown>> = [];
  let reads = 0;
  let text = TEXT;
  const document: any = {
    id: "file:///w/a.md",
    path: "/w/a.md",
    revision: 3,
    eol: "\n",
    getText: () => {
      reads += 1;
      return text;
    },
  };
  const host = {
    settings: { section: () => ({ get: (_key: string, fallback: unknown) => fallback }) },
    documents: { applyEdits: async (_document: unknown, edits: any[]) => {
      applied.push(edits);
      text = applyTextEdits(text, edits);
      return true;
    } },
  };
  const manager: any = { host, edits: { trackPendingSave: (_preview: unknown, value: unknown) => value } };
  const handlers = new Map<string, (message: any, preview: any) => PromiseLike<void> | undefined>();
  new SourceEditController(manager).register({ on: (type: string, handler: any) => { handlers.set(type, handler); } } as never);
  const preview: any = {
    restrictedReads: options.restrictedReads === true,
    edits: { active: options.editOpen === true },
    document,
    documentUri: document.id,
    stage: { activeDocumentRevision: 3 },
    postToPage: (message: Record<string, unknown>) => {
      results.push(message);
      return Promise.resolve();
    },
  };
  return { handlers, results, applied, preview, readText: () => reads };
}

const request = (extra: Record<string, unknown> = {}) => ({
  documentId: "file:///w/a.md", revision: 3, requestId: 1, editId: "e1", ...extra,
});

const findItem = (extra: Record<string, unknown> = {}) =>
  ({ line: 1, endLine: 1, find: "Title", occurrence: 0, occurrences: 1, replacement: "Heading", ...extra });

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-012
test("find and replace edits the matched spans in one undo step and answers with the counts", async () => {
  const writable = setup();
  await writable.handlers.get("previewFindReplace")!(request({
    items: [findItem(), findItem({ line: 8, endLine: 8, find: "After", replacement: "Before" }), findItem({ find: "Nope", occurrences: 1 })],
  }), writable.preview);
  assert.deepEqual(writable.applied, [[{ start: 2, end: 7, text: "Heading" }, { start: TEXT.indexOf("After"), end: TEXT.indexOf("After") + 5, text: "Before" }]]);
  assert.deepEqual(writable.results.map((result) => [result.type, result.ok, result.replaced, result.skipped]),
    [["previewFindReplaceResult", true, 2, 1]]);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-012
test("find and replace applies in a restricted-reads preview, is refused during an open edit and when nothing maps", async () => {
  const restricted = setup({ restrictedReads: true });
  await restricted.handlers.get("previewFindReplace")!(request({ items: [findItem()] }), restricted.preview);
  assert.deepEqual(restricted.results.map((result) => [result.ok, result.replaced]), [[true, 1]]);
  assert.equal(restricted.applied.length, 1);

  const open = setup({ editOpen: true });
  await open.handlers.get("previewFindReplace")!(request({ items: [findItem()] }), open.preview);
  assert.deepEqual(open.results.map((result) => [result.ok, result.reason]),
    [[false, "Save or cancel the open Markdown edit before replacing."]]);
  assert.equal(open.readText(), 0);

  const none = setup();
  await none.handlers.get("previewFindReplace")!(request({ items: [findItem({ find: "Nope" })] }), none.preview);
  assert.equal(none.results[0]!.ok, false);
  assert.deepEqual(none.applied, []);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-012
test("a find and replace dry run answers the counts of the plan and never edits the document", async () => {
  const writable = setup();
  await writable.handlers.get("previewFindReplace")!(request({
    dryRun: true,
    items: [findItem(), findItem({ find: "Nope" }), findItem({ find: "Title", occurrences: 2, occurrence: 1 })],
  }), writable.preview);
  assert.deepEqual(writable.applied, [], "nothing is applied");
  assert.deepEqual(writable.results.map((result) => [result.type, result.editId, result.ok, result.replaced, result.skipped]),
    [["previewFindReplaceResult", "e1", true, 1, 2]]);

  const none = setup();
  await none.handlers.get("previewFindReplace")!(request({ dryRun: true, items: [findItem({ find: "Nope" }), findItem({ find: "Gone" })] }), none.preview);
  assert.deepEqual(none.applied, []);
  assert.deepEqual(none.results.map((result) => [result.ok, result.replaced, result.skipped]), [[true, 0, 2]],
    "when nothing maps, every match is announced as skipped");

  const restricted = setup({ restrictedReads: true });
  await restricted.handlers.get("previewFindReplace")!(request({ dryRun: true, items: [findItem()] }), restricted.preview);
  assert.deepEqual(restricted.results.map((result) => [result.ok, result.replaced]), [[true, 1]]);
  assert.deepEqual(restricted.applied, []);
});
