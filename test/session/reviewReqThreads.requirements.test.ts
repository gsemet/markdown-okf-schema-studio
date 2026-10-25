/**
 * Replies to and deletes of inline comment threads on the host side (requirements REVIEW-180 to
 * REVIEW-183): the refusals of the source edit controller, against stub ports and a stub preview.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { SourceEditController } from "../../src/session/features/sourceEdits";
import { READ_ONLY_NO_FOLDER } from "../../src/core/edits/sourceEdits";

const TEXT = ["# Title", "", "<!-- THREAD", "Ada (2026-10-16 10:47):", "  hello", "-->", "", "After.", ""].join("\n");
const TRUSTED_REFUSAL = READ_ONLY_NO_FOLDER;

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

function setup(options: { readOnly?: boolean; editOpen?: boolean } = {}): Setup {
  const applied: unknown[][] = [];
  const results: Array<Record<string, unknown>> = [];
  let reads = 0;
  let release: (() => void) | undefined;
  let authorGate: Promise<void> | undefined;
  const document: any = {
    id: "file:///w/a.md",
    path: "/w/a.md",
    revision: 3,
    eol: "\n",
    getText: () => {
      reads += 1;
      return TEXT;
    },
  };
  const host = {
    settings: { section: () => ({ get: (_key: string, fallback: unknown) => fallback }) },
    vcs: { userName: async () => { await authorGate; return "Ada"; } },
    documents: { applyEdits: async (_document: unknown, edits: unknown[]) => { applied.push(edits); return true; } },
  };
  const manager: any = { host, edits: { trackPendingSave: (_preview: unknown, value: unknown) => value } };
  const handlers = new Map<string, (message: any, preview: any) => PromiseLike<void> | undefined>();
  new SourceEditController(manager).register({ on: (type: string, handler: any) => { handlers.set(type, handler); } } as never);
  const preview: any = {
    readOnly: options.readOnly === true,
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
test("a reply or a delete from a read-only preview is refused and changes nothing", async () => {
  const refused = setup({ readOnly: true });
  await refused.handlers.get("previewThreadReply")!(request({ text: "hi" }), refused.preview);
  await refused.handlers.get("previewThreadDelete")!(request(), refused.preview);
  assert.deepEqual(refused.results.map((result) => [result.type, result.ok, result.reason]), [
    ["previewThreadReplyResult", false, TRUSTED_REFUSAL],
    ["previewThreadDeleteResult", false, TRUSTED_REFUSAL],
  ]);
  assert.deepEqual(refused.applied, [], "the document is unchanged");
  assert.equal(refused.readText(), 0, "answered before the document is read");

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
