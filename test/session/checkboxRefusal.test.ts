/**
 * Requirement tests of the answers the host gives to a checkbox toggle it refuses: a malformed
 * message and a read-only preview. The dispatcher runs against a fake manager that records the
 * result of each toggle.
 */
import * as assert from "node:assert/strict";
import { test } from "node:test";

import { MALFORMED_TOGGLE, READ_ONLY_NO_FOLDER, READ_ONLY_UNTRUSTED } from "../../src/core/edits/sourceEdits";
import { PageMessageDispatcher } from "../../src/session/pageMessages";
import { PreviewManager } from "../../src/session/previewManager";
import type { PreviewSession } from "../../src/session/previewSession";

const DOCUMENT = "file:///notes/doc.md";

interface Answer {
  readonly editId: string;
  readonly result: { saved?: true; error?: string };
}

function harness(options: { readOnly?: boolean; workspaceFolder?: object } = {}) {
  const answers: Answer[] = [];
  const handled: string[] = [];
  const session = {
    disposed: false,
    readOnly: options.readOnly === true,
    workspaceFolder: options.workspaceFolder,
    documentUri: DOCUMENT,
    stage: { activeDocumentIdentity: DOCUMENT, activeDocumentRevision: 4, requestId: 9 },
    edits: { active: undefined },
    page: {},
    scroll: {},
    postToPage: () => Promise.resolve(true),
  } as unknown as PreviewSession;
  const manager = {
    live: new Set<unknown>([session]),
    matchesCurrent: PreviewManager.prototype.matchesCurrent,
    has: () => true,
    sourceEdits: {
      postCheckboxResult: (_preview: unknown, message: { editId: string }, result: Answer["result"]) =>
        answers.push({ editId: message.editId, result }),
    },
  };
  const router = {
    dispatch: (message: { type: string }) => {
      handled.push(message.type);
      return { handled: true, result: undefined };
    },
  };
  const dispatcher = new PageMessageDispatcher(manager as unknown as PreviewManager, router as never);
  return { dispatcher, session, answers, handled };
}

const toggle = (extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  type: "previewCheckboxToggle", documentId: DOCUMENT, revision: 4, requestId: 9,
  editId: "c1", line: 3, endLine: 3, column: 2, checked: true, ...extra,
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-027
test("a malformed checkbox toggle is answered, so the box never stays busy", () => {
  const { dispatcher, session, answers, handled } = harness();
  for (const bad of [{ column: -1 }, { column: 1.5 }, { checked: "yes" }, { endLine: 4 }]) {
    assert.equal(dispatcher.handle(session, toggle(bad)), undefined);
  }
  assert.deepEqual(handled, []);
  assert.deepEqual(answers, Array(4).fill({ editId: "c1", result: { error: MALFORMED_TOGGLE } }));

  // A message that names no box or no document cannot be answered.
  dispatcher.handle(session, toggle({ column: -1, editId: undefined }));
  dispatcher.handle(session, toggle({ column: -1, documentId: "file:///other.md" }));
  assert.equal(answers.length, 4);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-005
test("a read-only checkbox toggle names the missing folder or the missing trust", () => {
  const standalone = harness({ readOnly: true });
  standalone.dispatcher.handle(standalone.session, toggle());
  assert.deepEqual(standalone.answers, [{ editId: "c1", result: { error: READ_ONLY_NO_FOLDER } }]);
  assert.doesNotMatch(READ_ONLY_NO_FOLDER, /trust/iu);

  const untrusted = harness({ readOnly: true, workspaceFolder: { path: "/notes" } });
  untrusted.dispatcher.handle(untrusted.session, toggle());
  assert.deepEqual(untrusted.answers, [{ editId: "c1", result: { error: READ_ONLY_UNTRUSTED } }]);
  assert.deepEqual([...standalone.handled, ...untrusted.handled], []);
});
