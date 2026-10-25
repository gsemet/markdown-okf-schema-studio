/**
 * Requirement tests of the host side of a label rename (`features/sourceEdits.ts`): the refusals of
 * a read-only preview and of an open block edit leave the document unchanged. The controller runs
 * on the real router with a fake manager and preview.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createMessageRouter } from "../../src/core/protocol/router";
import type { PageToHostMessage } from "../../src/core/protocol/pageToHost";
import { SourceEditController } from "../../src/session/features/sourceEdits";
import type { PageMessageRouter } from "../../src/session/pageMessages";
import type { PreviewManager } from "../../src/session/previewManager";
import type { PreviewSession } from "../../src/session/previewSession";
import { READ_ONLY_NO_FOLDER } from "../../src/core/edits/sourceEdits";

function setup(options: { readOnly: boolean; blockEditOpen: boolean }) {
  const applied: unknown[] = [];
  const posted: Array<Record<string, unknown>> = [];
  const manager = {
    host: { documents: { applyEdits: (...args: unknown[]) => { applied.push(args); return Promise.resolve(true); } } },
    edits: { trackPendingSave: (_preview: unknown, work: unknown) => work },
  } as unknown as PreviewManager;
  const router: PageMessageRouter = createMessageRouter();
  new SourceEditController(manager).register(router);
  const preview = {
    readOnly: options.readOnly,
    edits: { active: options.blockEditOpen ? { editId: "e1" } : undefined },
    postToPage: (message: Record<string, unknown>) => { posted.push(message); return Promise.resolve(true); },
  } as unknown as PreviewSession;
  const rename = {
    type: "previewLabelRename", documentId: "file:///ws/doc.md", revision: 4, requestId: 9,
    editId: "label-1", line: 3, oldName: "old", newName: "new",
  } as unknown as PageToHostMessage;
  return { applied, posted, run: () => router.dispatch(rename, preview) };
}

// @tests_req SwRS-MDOKFSTUDIO-TRUST-005
test("a rename in an untrusted or read-only preview changes nothing and answers with the read-only reason", () => {
  const t = setup({ readOnly: true, blockEditOpen: false });
  t.run();
  assert.equal(t.posted.length, 1);
  assert.equal(t.posted[0].type, "previewLabelRenameResult");
  assert.equal(t.posted[0].ok, false);
  assert.equal(t.posted[0].reason, READ_ONLY_NO_FOLDER);
  assert.equal(t.posted[0].editId, "label-1");
  assert.deepEqual(t.applied, [], "the document is unchanged");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-041
test("a rename while a block edit is open changes nothing and answers Save or cancel the open Markdown edit", () => {
  const t = setup({ readOnly: false, blockEditOpen: true });
  t.run();
  assert.equal(t.posted.length, 1);
  assert.equal(t.posted[0].ok, false);
  assert.equal(t.posted[0].reason, "Save or cancel the open Markdown edit before renaming a label.");
  assert.deepEqual(t.applied, [], "the document is unchanged");
});
