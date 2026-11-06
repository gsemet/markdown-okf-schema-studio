/**
 * Replies to and deletes of inline comment threads on the host side (requirements REVIEW-180 to
 * REVIEW-183): the refusals of the source edit controller, against stub ports and a stub preview.
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
  readonly document: any;
  readText(): number;
  /** Makes the author lookup wait until the returned function is called. */
  holdAuthor(): () => void;
}

function setup(options: { restrictedReads?: boolean; editOpen?: boolean; readOnly?: boolean } = {}): Setup {
  const applied: unknown[][] = [];
  const results: Array<Record<string, unknown>> = [];
  let reads = 0;
  let text = TEXT;
  let release: (() => void) | undefined;
  let authorGate: Promise<void> | undefined;
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
    vcs: { userName: async () => { await authorGate; return "Ada"; } },
    documents: { applyEdits: async (_document: unknown, edits: any[]) => {
      applied.push(edits);
      // A read-only file: VS Code accepts the edit and changes nothing.
      if (!options.readOnly) text = applyTextEdits(text, edits);
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
  return {
    handlers, results, applied, preview, document,
    readText: () => reads,
    holdAuthor: () => {
      authorGate = new Promise<void>((resolve) => { release = resolve; });
      return () => release?.();
    },
  };
}

const request = (extra: Record<string, unknown> = {}) => ({
  documentId: "file:///w/a.md", revision: 3, requestId: 1, editId: "e1", line: 3, endLine: 6, ...extra,
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-005
test("a reply or a delete from a restricted-reads preview is applied like any other", async () => {
  const restricted = setup({ restrictedReads: true });
  const afterReply = setup({ restrictedReads: true });
  await restricted.handlers.get("previewThreadReply")!(request({ text: "hi" }), restricted.preview);
  await afterReply.handlers.get("previewThreadDelete")!(request(), afterReply.preview);
  assert.deepEqual([...restricted.results, ...afterReply.results].map((result) => [result.type, result.ok]), [
    ["previewThreadReplyResult", true],
    ["previewThreadDeleteResult", true],
  ]);
  assert.equal(restricted.applied.length + afterReply.applied.length, 2, "Restricted Mode or a standalone file never makes the document read-only");

  const writable = setup();
  await writable.handlers.get("previewThreadReply")!(request({ text: "hi" }), writable.preview);
  assert.equal(writable.applied.length, 1, "a writable preview applies the reply");
  assert.deepEqual(writable.results.map((result) => [result.type, result.ok]), [["previewThreadReplyResult", true]]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-041
test("an open Markdown edit on the host side refuses a thread change before the document is read", async () => {
  const open = setup({ editOpen: true });
  await open.handlers.get("previewThreadDelete")!(request(), open.preview);
  assert.deepEqual(open.results.map((result) => [result.type, result.ok, result.reason]), [
    ["previewThreadDeleteResult", false, "Save or cancel the open Markdown edit before changing a thread."],
  ]);
  assert.deepEqual(open.applied, []);
  assert.equal(open.readText(), 0);

  const none = setup();
  await none.handlers.get("previewThreadDelete")!(request(), none.preview);
  assert.equal(none.applied.length, 1, "without an open edit the delete is applied");
  assert.equal(none.results[0]!.ok, true);
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
// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-014
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

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-131
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

// @tests_req SwRS-MDOKFSTUDIO-TRUST-065
test("a thread request that names another revision gets the out-of-date answer", async () => {
  const old = setup();
  await old.handlers.get("previewThreadReply")!(request({ revision: 2, text: "hi" }), old.preview);
  await old.handlers.get("previewThreadDelete")!(request({ revision: 2 }), old.preview);
  assert.deepEqual(old.results.map((result) => [result.type, result.ok, result.reason]), [
    ["previewThreadReplyResult", false, "The preview is out of date. Try again once it has refreshed."],
    ["previewThreadDeleteResult", false, "The preview is out of date. Try again once it has refreshed."],
  ]);
  assert.deepEqual(old.applied, []);

  const current = setup();
  await current.handlers.get("previewThreadDelete")!(request(), current.preview);
  assert.equal(current.applied.length, 1, "the current revision is handled");
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-186
test("a document that changes while the author is resolved gets the changed-meanwhile answer", async () => {
  const slow = setup();
  const release = slow.holdAuthor();
  const pending = slow.handlers.get("previewThreadReply")!(request({ text: "hi" }), slow.preview);
  // An edit of the document before the author is known: a new revision, and the page's render is stale.
  slow.preview.document = { ...slow.document, revision: 4 };
  slow.preview.stage = { activeDocumentRevision: 4 };
  release();
  await pending;
  assert.deepEqual(slow.results.map((result) => [result.type, result.ok, result.reason]), [
    ["previewThreadReplyResult", false, "The document changed meanwhile. Try again."],
  ]);
  assert.deepEqual(slow.applied, []);

  const quick = setup();
  await quick.handlers.get("previewThreadReply")!(request({ text: "hi" }), quick.preview);
  assert.equal(quick.applied.length, 1, "without an edit in between the reply is applied");
  assert.equal(quick.results[0]!.ok, true);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-001
test("a reply, a delete and a find replace on a file VS Code holds read-only answer the read-only reason", async () => {
  for (const restrictedReads of [false, true]) {
    const readOnly = setup({ readOnly: true, restrictedReads });
    await readOnly.handlers.get("previewThreadReply")!(request({ text: "hi" }), readOnly.preview);
    await readOnly.handlers.get("previewThreadDelete")!(request(), readOnly.preview);
    await readOnly.handlers.get("previewFindReplace")!(request({ items: [findItem()] }), readOnly.preview);
    assert.deepEqual(readOnly.results.map((result) => [result.type, result.ok, result.reason]), [
      ["previewThreadReplyResult", false, "This file is read-only in VS Code."],
      ["previewThreadDeleteResult", false, "This file is read-only in VS Code."],
      ["previewFindReplaceResult", false, "This file is read-only in VS Code."],
    ]);
  }
});
