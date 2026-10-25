/**
 * Requirement tests of the page message gates (trust and security scope): which page messages the
 * host gives to a handler, and which it drops. The dispatcher runs against the real
 * `matchesCurrent` of the preview manager, a fake router that records the handled types, and a
 * fake session that holds one render.
 */
import * as assert from "node:assert/strict";
import { test } from "node:test";

import type { PageToHostMessage } from "../../src/core/protocol/pageToHost";
import { RenderingController } from "../../src/session/features/rendering";
import { PageMessageDispatcher } from "../../src/session/pageMessages";
import { PreviewManager } from "../../src/session/previewManager";
import type { PreviewSession } from "../../src/session/previewSession";

const DOCUMENT = "file:///notes/doc.md";

interface Harness {
  readonly dispatcher: PageMessageDispatcher;
  readonly session: PreviewSession;
  readonly handled: string[];
  readonly errors: string[];
  readonly state: { disposed: boolean };
}

/** A dispatcher over a session that holds revision 4, request 9 of `DOCUMENT`. */
function harness(options: { stage?: boolean; activeEdit?: { editId: string; revision: number } } = {}): Harness {
  const handled: string[] = [];
  const errors: string[] = [];
  const stage = options.stage === false ? undefined : {
    activeDocumentIdentity: DOCUMENT,
    activeDocumentRevision: 4,
    requestId: 9,
  };
  const session = {
    disposed: false,
    readOnly: false,
    documentUri: DOCUMENT,
    stage,
    edits: {
      active: options.activeEdit
        ? { ...options.activeEdit, documentId: DOCUMENT, requestId: 9 }
        : undefined,
    },
    page: {},
    scroll: {},
    postToPage: () => Promise.resolve(true),
  } as unknown as PreviewSession;
  const manager = {
    live: new Set<unknown>([session]),
    matchesCurrent: PreviewManager.prototype.matchesCurrent,
    has: () => true,
    edits: { postEditSourceError: (_preview: unknown, _message: unknown, text: string) => errors.push(text) },
    sourceEdits: { postCheckboxResult: (_preview: unknown, _message: unknown, result: { error?: string }) => errors.push(String(result.error)) },
    frontmatter: { postEditError: (_preview: unknown, _message: unknown, text: string) => errors.push(text) },
  };
  const router = {
    dispatch: (message: PageToHostMessage) => {
      handled.push(message.type);
      return { handled: true, result: undefined };
    },
  };
  const dispatcher = new PageMessageDispatcher(manager as unknown as PreviewManager, router as never);
  return { dispatcher, session, handled, errors, state: session as unknown as { disposed: boolean } };
}

const blockMove = (identity: { documentId?: string; revision: number; requestId: number }): Record<string, unknown> => ({
  type: "previewBlockMove",
  documentId: DOCUMENT,
  line: 3,
  endLine: 4,
  neighbourLine: 6,
  neighbourEndLine: 7,
  direction: "down",
  ...identity,
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-065
test("a render-gated page message must name the render the host holds", () => {
  const { dispatcher, session, handled, state } = harness();

  dispatcher.handle(session, blockMove({ revision: 4, requestId: 9 }));
  assert.deepEqual(handled, ["previewBlockMove"]);

  // Each of the three identifiers is compared.
  assert.equal(dispatcher.handle(session, blockMove({ revision: 3, requestId: 9 })), undefined);
  assert.equal(dispatcher.handle(session, blockMove({ revision: 4, requestId: 8 })), undefined);
  assert.equal(dispatcher.handle(session, { ...blockMove({ revision: 4, requestId: 9 }), documentId: "file:///other.md" }), undefined);
  assert.deepEqual(handled, ["previewBlockMove"]);

  // A disposed preview drops it, and so does a preview without a rendered stage.
  state.disposed = true;
  assert.equal(dispatcher.handle(session, blockMove({ revision: 4, requestId: 9 })), undefined);
  assert.deepEqual(handled, ["previewBlockMove"]);
  const bare = harness({ stage: false });
  assert.equal(bare.dispatcher.handle(bare.session, blockMove({ revision: 4, requestId: 9 })), undefined);
  assert.deepEqual(bare.handled, []);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-065
// @tests_req SwRS-MDOKFSTUDIO-MYST-038
test("a label rename from an older render is answered with the stale-line refusal", () => {
  const { dispatcher, session, handled, state } = harness();
  const posted: Array<Record<string, unknown>> = [];
  (session as unknown as { postToPage: unknown }).postToPage = (message: Record<string, unknown>) => {
    posted.push(message);
    return Promise.resolve(true);
  };
  const rename = (identity: Record<string, unknown>): Record<string, unknown> => ({
    type: "previewLabelRename", documentId: DOCUMENT, line: 3, oldName: "a", newName: "b", editId: "label-1", ...identity,
  });

  assert.equal(dispatcher.handle(session, rename({ revision: 3, requestId: 9 })), undefined);
  assert.deepEqual(handled, []);
  assert.equal(posted.length, 1);
  assert.equal(posted[0].type, "previewLabelRenameResult");
  assert.equal(posted[0].editId, "label-1");
  assert.equal(posted[0].ok, false);
  assert.equal(posted[0].reason, "The label is no longer on that line. Refresh the preview.");

  // Another document or a disposed preview gets no answer.
  dispatcher.handle(session, rename({ revision: 3, requestId: 9, documentId: "file:///other.md" }));
  assert.equal(posted.length, 1);
  state.disposed = true;
  dispatcher.handle(session, rename({ revision: 3, requestId: 9 }));
  assert.equal(posted.length, 1);
});

test("a document-gated page message must name the shown document", () => {
  const { dispatcher, session, handled, state } = harness();
  const banner = { type: "previewWarningBannerClosed", key: "ab-0123abcd", revision: 1, requestId: 1 };

  // The render may be one behind: revision and request are not compared.
  dispatcher.handle(session, { ...banner, documentId: DOCUMENT });
  dispatcher.handle(session, { type: "previewShowProblems", documentId: DOCUMENT, revision: 0, requestId: 0 });
  dispatcher.handle(session, { type: "previewPlantUmlInclude", documentId: DOCUMENT, revision: 0, requestId: 0, path: "a.puml", from: null, editId: "e1" });
  assert.deepEqual(handled.slice(0, 2), ["previewWarningBannerClosed", "previewShowProblems"]);
  const accepted = handled.length;

  assert.equal(dispatcher.handle(session, { ...banner, documentId: "file:///other.md" }), undefined);
  assert.equal(dispatcher.handle(session, { type: "previewShowProblems", documentId: "file:///other.md", revision: 4, requestId: 9 }), undefined);
  assert.equal(handled.length, accepted);

  state.disposed = true;
  assert.equal(dispatcher.handle(session, { ...banner, documentId: DOCUMENT }), undefined);
  assert.equal(handled.length, accepted);
});

test("an own-identifier page message is matched by its own identifier", () => {
  const { dispatcher, session, handled, state } = harness();
  // The identifiers of the render are not those the host holds: the stage moved on.
  const stale = { documentId: "file:///older.md", revision: 1, requestId: 1 };
  dispatcher.handle(session, { type: "previewEditFlushed", flushId: "flush-1", flushed: true, ...stale });
  dispatcher.handle(session, { type: "previewEditClosed", editId: "edit-1", ...stale });
  assert.deepEqual(handled, ["previewEditFlushed", "previewEditClosed"]);

  state.disposed = true;
  assert.equal(dispatcher.handle(session, { type: "previewEditFlushed", flushId: "flush-2", flushed: true, ...stale }), undefined);
  assert.equal(dispatcher.handle(session, { type: "previewEditClosed", editId: "edit-2", ...stale }), undefined);
  assert.deepEqual(handled, ["previewEditFlushed", "previewEditClosed"]);
});

test("a page-state message must name the render the host holds, except the save of the open editor", () => {
  const { dispatcher, session, handled, errors } = harness({ activeEdit: { editId: "edit-1", revision: 3 } });
  const identity = { documentId: DOCUMENT, revision: 4, requestId: 9 };

  dispatcher.handle(session, { type: "previewScroll", ...identity, sourceLine: 5 });
  assert.deepEqual(handled, ["previewScroll"]);

  // An older request: dropped, nothing reaches a handler.
  assert.equal(dispatcher.handle(session, { type: "previewScroll", ...identity, requestId: 8, sourceLine: 5 }), undefined);
  assert.deepEqual(handled, ["previewScroll"]);

  // The save of the block editor the host has open is accepted for the revision it was opened on.
  dispatcher.handle(session, {
    type: "previewEditSave", ...identity, revision: 3, editId: "edit-1", line: 3, endLine: 4,
    originalText: "old", editedText: "new",
  });
  assert.deepEqual(handled, ["previewScroll", "previewEditSave"]);
  assert.deepEqual(errors, []);

  // A save of an older page (another editor id) is answered with an error, not dropped silently.
  assert.equal(dispatcher.handle(session, {
    type: "previewEditSave", ...identity, revision: 2, editId: "edit-0", line: 3, endLine: 4,
    originalText: "old", editedText: "new",
  }), undefined);
  assert.deepEqual(handled, ["previewScroll", "previewEditSave"]);
  assert.equal(errors.length, 1);
  assert.match(errors[0]!, /The preview changed while this block was being edited/u);
});

/** A session that holds a rendered page, with the pieces the rendering controller touches. */
function renderedSession(roots: string[][]): PreviewSession {
  return {
    disposed: false,
    stage: { requestId: 9 },
    state: {},
    status: "success",
    shownStatus: undefined,
    webview: { html: "<html></html>", diagnostics: [], nonce: "n" },
    probe: { htmlAssignments: 0 },
    page: { resourceRoots: ["/workspace"], recordKeepsLoadedNonce: false },
    edits: { active: undefined, lock: { pageEditorOpen: false, drop: () => undefined }, watchedPageEditorId: undefined },
    overlay: { timer: undefined, due: false, visible: false },
    queue: { cancel: () => undefined, clearLastGood: () => undefined },
    panel: {
      html: "<html>previous</html>",
      cspSource: "vscode-webview://csp",
      setResourceRoots: (next: string[]) => roots.push(next),
    },
  } as unknown as PreviewSession;
}

// @tests_req SwRS-MDOKFSTUDIO-TRUST-007
test("the pending page that clears the content and the missing-source page allow no local file", () => {
  const roots: string[][] = [];
  const controller = new RenderingController({} as unknown as PreviewManager);

  const pending = renderedSession(roots);
  controller.showPending(pending, true);
  assert.deepEqual(roots, [[]]);
  assert.deepEqual(pending.page.resourceRoots, []);
  assert.match(pending.panel.html, /data-sphinx-preview-status="pending"/u);

  const missing = renderedSession(roots);
  controller.setMissingSource(missing);
  assert.deepEqual(roots, [[], []]);
  assert.deepEqual(missing.page.resourceRoots, []);
  assert.match(missing.panel.html, /data-sphinx-preview-status="missing-source"/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-065
test("every request of the render gate from an older render is answered with the out-of-date reason", () => {
  const { dispatcher, session, handled, errors } = harness();
  const posted: Array<Record<string, unknown>> = [];
  (session as unknown as { postToPage: unknown }).postToPage = (message: Record<string, unknown>) => {
    posted.push(message);
    return Promise.resolve(true);
  };
  const stale = { documentId: DOCUMENT, revision: 3, requestId: 9 };
  const reason = "The preview is out of date. Try again once it has refreshed.";
  const requests: Array<[Record<string, unknown>, string, Record<string, unknown>]> = [
    [{ type: "previewBlockMove", line: 3, endLine: 4, neighbourLine: 6, neighbourEndLine: 7, direction: "down" }, "previewBlockMoveResult", {}],
    [{ type: "previewBlocksCopy", line: 3, endLine: 4 }, "previewBlocksResult", { op: "copy" }],
    [{ type: "previewBlocksCut", line: 3, endLine: 4 }, "previewBlocksResult", { op: "cut" }],
    [{ type: "previewBlocksPaste", insertAfterLine: 3 }, "previewBlocksResult", { op: "paste" }],
    [{ type: "previewThreadReply", editId: "e", line: 3, endLine: 4, text: "x" }, "previewThreadReplyResult", { editId: "e" }],
    [{ type: "previewThreadDelete", editId: "e", line: 3, endLine: 4 }, "previewThreadDeleteResult", { editId: "e" }],
    [{ type: "previewListTargets", editId: "e" }, "previewListTargetsResult", { editId: "e" }],
    [{ type: "previewListCitations", editId: "e" }, "previewListCitationsResult", { editId: "e" }],
    [{ type: "previewPickDocument", editId: "e" }, "previewPickDocumentResult", { editId: "e" }],
    [{ type: "previewPickImage", editId: "e" }, "previewPickImageResult", { editId: "e" }],
    [{ type: "previewPasteImage", editId: "e", mime: "image/png", dataBase64: "AA==" }, "previewPasteImageResult", { editId: "e" }],
    [{ type: "previewPasteHtml", editId: "e", html: "<b>x</b>" }, "previewPasteHtmlResult", { editId: "e" }],
  ];
  for (const [request, answer, extra] of requests) {
    posted.length = 0;
    assert.equal(dispatcher.handle(session, { ...request, ...stale }), undefined, String(request.type));
    assert.equal(posted.length, 1, String(request.type));
    assert.deepEqual(posted[0], { ...stale, type: answer, ok: false, reason, ...extra }, String(request.type));
  }
  assert.deepEqual(handled, []);

  // An open of an editor is answered through the block editor error.
  dispatcher.handle(session, { type: "previewEditOpen", editId: "e", line: 3, endLine: 4, ...stale });
  assert.deepEqual(errors, [reason]);
  dispatcher.handle(session, { type: "previewCheckboxToggle", editId: "c", line: 3, endLine: 3, column: 2, checked: true, ...stale });
  assert.deepEqual(errors, [reason, reason]);
});
