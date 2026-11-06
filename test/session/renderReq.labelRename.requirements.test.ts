/**
 * Requirement tests of the host side of a label rename (`features/sourceEdits.ts`): the refusals of
 * an open block edit leave the document unchanged. The controller runs
 * on the real router with a fake manager and preview.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { applyTextEdits, type TextEdit } from "../../src/core/edits/textEdit";
import { createMessageRouter } from "../../src/core/protocol/router";
import type { PageToHostMessage } from "../../src/core/protocol/pageToHost";
import { SourceEditController } from "../../src/session/features/sourceEdits";
import type { PageMessageRouter } from "../../src/session/pageMessages";
import type { PreviewManager } from "../../src/session/previewManager";
import type { PreviewSession } from "../../src/session/previewSession";

function setup(options: { restrictedReads: boolean; blockEditOpen: boolean; readOnly?: boolean }) {
  const applied: unknown[] = [];
  let text = "# Title\n\n(old)=\n## Section\n";
  const posted: Array<Record<string, unknown>> = [];
  const manager = {
    host: { documents: { applyEdits: (...args: unknown[]) => {
        applied.push(args);
        // A read-only file: VS Code accepts the edit and changes nothing.
        if (!options.readOnly) text = applyTextEdits(text, args[1] as TextEdit[]);
        return Promise.resolve(true);
      } } },
    edits: { trackPendingSave: (_preview: unknown, work: unknown) => work },
  } as unknown as PreviewManager;
  const router: PageMessageRouter = createMessageRouter();
  new SourceEditController(manager).register(router);
  const preview = {
    restrictedReads: options.restrictedReads,
    document: { id: "file:///ws/doc.md", path: "/ws/doc.md", revision: 4, getText: () => text },
    documentUri: "file:///ws/doc.md",
    stage: { activeDocumentRevision: 4 },
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
test("a rename in a standalone file or in Restricted Mode is not refused for the missing trust", async () => {
  const t = setup({ restrictedReads: true, blockEditOpen: false });
  await (t.run() as { result?: unknown }).result;
  assert.equal(t.applied.length, 1, "the label line is renamed in the document");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-041
test("a rename while a block edit is open changes nothing and answers Save or cancel the open Markdown edit", () => {
  const t = setup({ restrictedReads: false, blockEditOpen: true });
  t.run();
  assert.equal(t.posted.length, 1);
  assert.equal(t.posted[0].ok, false);
  assert.equal(t.posted[0].reason, "Save or cancel the open Markdown edit before renaming a label.");
  assert.deepEqual(t.applied, [], "the document is unchanged");
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-001
test("a rename on a file VS Code holds read-only answers the read-only reason", async () => {
  for (const restrictedReads of [false, true]) {
    const t = setup({ restrictedReads, blockEditOpen: false, readOnly: true });
    await (t.run() as { result?: unknown }).result;
    assert.deepEqual(t.posted.map((message) => [message.type, message.ok, message.reason]), [
      ["previewLabelRenameResult", false, "This file is read-only in VS Code."],
    ]);
  }
});
