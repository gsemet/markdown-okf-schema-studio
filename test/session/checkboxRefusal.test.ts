/**
 * Requirement tests of the answers the host gives to a checkbox toggle it refuses: a malformed
 * message. The dispatcher runs against a fake manager that records the
 * result of each toggle.
 */
import * as assert from "node:assert/strict";
import { test } from "node:test";

import { MALFORMED_TOGGLE } from "../../src/core/edits/sourceEdits";
import { PageMessageDispatcher } from "../../src/session/pageMessages";
import { PreviewManager } from "../../src/session/previewManager";
import type { PreviewSession } from "../../src/session/previewSession";

const DOCUMENT = "file:///notes/doc.md";

interface Answer {
  readonly editId: string;
  readonly result: { saved?: true; error?: string };
}

function harness(options: { restrictedReads?: boolean; workspaceFolder?: object } = {}) {
  const answers: Answer[] = [];
  const handled: string[] = [];
  const session = {
    disposed: false,
    restrictedReads: options.restrictedReads === true,
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

// @tests_req SwRS-MDOKFSTUDIO-GFM-021#S7
// @tests_req SwRS-MDOKFSTUDIO-GFM-021#S8
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

// @tests_req SwRS-MDOKFSTUDIO-TRUST-005#S1
test("a checkbox toggle of a standalone file or in Restricted Mode reaches the handler", () => {
  const standalone = harness({ restrictedReads: true });
  standalone.dispatcher.handle(standalone.session, toggle());
  assert.deepEqual(standalone.answers, []);
  assert.deepEqual(standalone.handled, ["previewCheckboxToggle"]);

  const untrusted = harness({ restrictedReads: true, workspaceFolder: { path: "/notes" } });
  untrusted.dispatcher.handle(untrusted.session, toggle());
  assert.deepEqual(untrusted.answers, []);
  assert.deepEqual(untrusted.handled, ["previewCheckboxToggle"]);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-005#S3
test("the dispatcher stops no edit or viewing request of a preview with restricted reads", () => {
  const { dispatcher, session, handled } = harness({ restrictedReads: true });
  const identity = { documentId: DOCUMENT, revision: 4, requestId: 9 };
  const requests = [
    { type: "previewEditOpen", editId: "e1", line: 3, endLine: 4 },
    // The theme message comes right after the edit request: it stays accepted.
    { type: "previewThemeModeChanged", previewThemeMode: "white" },
    { type: "previewViewPreferenceChanged", preference: "toc", value: true },
    { type: "previewHistoryGo", direction: "back" },
    { type: "previewLink", request: "sibling.md" },
    { type: "previewLinkDiscover", requests: ["sibling.md"] },
  ];
  for (const request of requests) dispatcher.handle(session, { ...identity, ...request });
  assert.deepEqual(handled, requests.map((request) => request.type));
});
