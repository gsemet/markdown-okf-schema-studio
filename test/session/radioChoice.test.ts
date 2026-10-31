/**
 * The host side of a radio choice: the page sends a `previewCheckboxToggle` with the options of the
 * group, and the host takes the checkbox path (its guards and its answer). The controller runs on the
 * real router with a fake manager, preview and document; the gates run in the real dispatcher.
 */
import * as assert from "node:assert/strict";
import { test } from "node:test";

import { MALFORMED_TOGGLE, RADIO_GONE, READ_ONLY_NO_FOLDER } from "../../src/core/edits/sourceEdits";
import { applyTextEdits, type TextEdit } from "../../src/core/edits/textEdit";
import { isPageToHostMessage, type PageToHostMessage } from "../../src/core/protocol/pageToHost";
import { createMessageRouter } from "../../src/core/protocol/router";
import { SourceEditController } from "../../src/session/features/sourceEdits";
import { PageMessageDispatcher, type PageMessageRouter } from "../../src/session/pageMessages";
import { PreviewManager } from "../../src/session/previewManager";
import type { PreviewSession } from "../../src/session/previewSession";

const DOCUMENT = "file:///ws/plan.md";
const TEXT = "Fix direction:\n\n- (x) margin click\n- ( ) Alt+click\n- ( ) leave as is\n";
const GROUP = [{ line: 3, column: 2 }, { line: 4, column: 2 }, { line: 5, column: 2 }];

function choice(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    type: "previewCheckboxToggle", documentId: DOCUMENT, revision: 4, requestId: 9, editId: "checkbox-9-1",
    line: 5, endLine: 5, column: 2, checked: true, radioGroup: GROUP, ...extra,
  };
}

function controller(options: { text?: string; blockEditOpen?: boolean } = {}) {
  const applied: Array<{ edits: readonly TextEdit[]; options: unknown }> = [];
  const posted: Array<Record<string, unknown>> = [];
  const manager = {
    host: {
      documents: {
        applyEdits: (_document: unknown, edits: readonly TextEdit[], applyOptions: unknown) => {
          applied.push({ edits, options: applyOptions });
          return Promise.resolve(true);
        },
      },
      logger: { error: () => undefined, warn: () => undefined, info: () => undefined },
    },
    edits: { trackPendingSave: (_preview: unknown, work: unknown) => work },
  } as unknown as PreviewManager;
  const router: PageMessageRouter = createMessageRouter();
  new SourceEditController(manager).register(router);
  const preview = {
    documentUri: DOCUMENT,
    document: { id: DOCUMENT, revision: 4, path: "/ws/plan.md", getText: () => options.text ?? TEXT },
    stage: { activeDocumentRevision: 4 },
    edits: { active: options.blockEditOpen ? { editId: "e1" } : undefined },
    postToPage: (message: Record<string, unknown>) => { posted.push(message); return Promise.resolve(true); },
  } as unknown as PreviewSession;
  return {
    applied,
    posted,
    run: async (message: Record<string, unknown>) => {
      const outcome = router.dispatch(message as unknown as PageToHostMessage, preview);
      await (outcome.handled ? outcome.result : undefined);
    },
  };
}

// @tests_req SwRS-MDOKFSTUDIO-GFM-039
test("a radio choice is applied as one undo step that changes the old and the new option", async () => {
  const host = controller();
  await host.run(choice());
  assert.equal(host.applied.length, 1, "one apply: one undo step");
  assert.deepEqual(host.applied[0].options, { ownUndoStep: true });
  assert.equal(applyTextEdits(TEXT, host.applied[0].edits),
    "Fix direction:\n\n- ( ) margin click\n- ( ) Alt+click\n- (x) leave as is\n");
  assert.deepEqual(host.posted.map((message) => [message.type, message.editId, message.saved]),
    [["previewCheckboxResult", "checkbox-9-1", true]]);
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-039
test("a choice of the selected option applies nothing and is answered as saved", async () => {
  const host = controller();
  await host.run(choice({ line: 3, endLine: 3 }));
  assert.deepEqual(host.applied, []);
  assert.equal(host.posted[0].saved, true);
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-039
test("a choice whose group moved, or that races an open editor, is refused and changes nothing", async () => {
  const moved = controller({ text: TEXT.replace("- ( ) leave", "leave") });
  await moved.run(choice());
  assert.deepEqual(moved.applied, []);
  assert.equal(moved.posted[0].error, RADIO_GONE);

  const editing = controller({ blockEditOpen: true });
  await editing.run(choice());
  assert.deepEqual(editing.applied, []);
  assert.equal(editing.posted[0].error, "Save or cancel the open Markdown edit before choosing an option.");
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-039
test("a forged choice that names the options of two groups is refused and changes nothing", async () => {
  const text = `${TEXT}\nTests:\n\n- (x) unit\n- ( ) e2e\n`;
  const host = controller({ text });
  await host.run(choice({ radioGroup: [...GROUP, { line: 9, column: 2 }, { line: 10, column: 2 }] }));
  assert.deepEqual(host.applied, [], "the (x) of the other group stays");
  assert.equal(host.posted[0].error, RADIO_GONE);
});

function dispatcher(options: { readOnly?: boolean } = {}) {
  const answers: Array<{ editId: string; result: unknown }> = [];
  const handled: string[] = [];
  const session = {
    disposed: false,
    readOnly: options.readOnly === true,
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
      postCheckboxResult: (_preview: unknown, message: { editId: string }, result: unknown) =>
        answers.push({ editId: message.editId, result }),
    },
  };
  const router = {
    dispatch: (message: { type: string }) => {
      handled.push(message.type);
      return { handled: true, result: undefined };
    },
  };
  return { session, answers, handled, dispatcher: new PageMessageDispatcher(manager as unknown as PreviewManager, router as never) };
}

// @tests_req SwRS-MDOKFSTUDIO-GFM-039
// @tests_req SwRS-MDOKFSTUDIO-GFM-027
test("a malformed radio group is answered as not understood, and a read-only preview refuses the choice", () => {
  const gate = dispatcher();
  const malformed = [
    { radioGroup: [GROUP[2]] },
    { radioGroup: [GROUP[0], GROUP[1]] },
    { radioGroup: [GROUP[0], GROUP[2], GROUP[2]] },
    { radioGroup: [GROUP[0], { line: 0, column: 2 }, GROUP[2]] },
    { radioGroup: [GROUP[0], { line: 4, column: -1 }, GROUP[2]] },
    { radioGroup: "3:2" },
    { radioGroup: Array.from({ length: 257 }, (_, index) => ({ line: index + 1, column: 2 })) },
    { checked: false },
  ];
  for (const bad of malformed) gate.dispatcher.handle(gate.session, choice(bad));
  assert.deepEqual(gate.handled, []);
  assert.deepEqual(gate.answers, Array(malformed.length).fill({ editId: "checkbox-9-1", result: { error: MALFORMED_TOGGLE } }));
  gate.dispatcher.handle(gate.session, choice());
  assert.deepEqual(gate.handled, ["previewCheckboxToggle"], "a well-formed choice reaches the handler");
  assert.equal(isPageToHostMessage({
    type: "previewScroll", documentId: DOCUMENT, revision: 4, requestId: 9, line: 3, radioGroup: GROUP,
  }), false, "only a checkbox toggle carries a radio group");

  const readOnly = dispatcher({ readOnly: true });
  readOnly.dispatcher.handle(readOnly.session, choice());
  assert.deepEqual(readOnly.answers, [{ editId: "checkbox-9-1", result: { error: READ_ONLY_NO_FOLDER } }]);
  assert.deepEqual(readOnly.handled, []);
});
