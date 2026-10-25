/**
 * Requirement tests of the host side of the code copy: the render gate of `previewCopyText`
 * (`pageMessages.ts`) and the clipboard write of the host request controller
 * (`features/hostRequests.ts`), through the real dispatcher and router.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createMessageRouter } from "../../src/core/protocol/router";
import type { PageToHostMessage } from "../../src/core/protocol/pageToHost";
import { HostRequestController } from "../../src/session/features/hostRequests";
import { PageMessageDispatcher, type PageMessageRouter } from "../../src/session/pageMessages";
import type { PreviewManager } from "../../src/session/previewManager";
import type { PreviewSession } from "../../src/session/previewSession";

const DOCUMENT = "file:///ws/doc.md";

function setup(options: { readOnly: boolean }) {
  const clipboard: string[] = [];
  const edits: string[] = [];
  const current = { documentId: DOCUMENT, revision: 4, requestId: 9 };
  const manager = {
    host: { ui: { writeClipboard: (text: string) => { clipboard.push(text); } } },
    // The gate of a render message: the identity of the render the host holds.
    matchesCurrent: (_session: unknown, message: typeof current) =>
      message.documentId === current.documentId && message.revision === current.revision
      && message.requestId === current.requestId,
  } as unknown as PreviewManager;
  const router: PageMessageRouter = createMessageRouter();
  new HostRequestController(manager).register(router);
  router.on("previewEditOpen", () => { edits.push("edit"); });
  const preview = { disposed: false, readOnly: options.readOnly, documentUri: DOCUMENT } as unknown as PreviewSession;
  const dispatcher = new PageMessageDispatcher(manager, router);
  const copy = (identity: Partial<typeof current> = {}): PageToHostMessage => ({
    type: "previewCopyText", ...current, ...identity, text: "print('x')\n",
  } as PageToHostMessage);
  return { clipboard, edits, preview, dispatcher, copy };
}

// @tests_req SwRS-MDOKFSTUDIO-TRUST-065
test("a copy request of a page whose version or request is stale is dropped; a current one is written", async () => {
  const t = setup({ readOnly: false });
  assert.equal(t.dispatcher.handle(t.preview, t.copy({ revision: 3 })), undefined, "stale document version");
  assert.equal(t.dispatcher.handle(t.preview, t.copy({ requestId: 8 })), undefined, "stale render request");
  assert.deepEqual(t.clipboard, [], "the clipboard is unchanged");

  await t.dispatcher.handle(t.preview, t.copy());
  assert.deepEqual(t.clipboard, ["print('x')\n"]);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-006
test("a read-only preview still writes the requested code to the clipboard and edits nothing", async () => {
  const t = setup({ readOnly: true });
  await t.dispatcher.handle(t.preview, t.copy());
  assert.deepEqual(t.clipboard, ["print('x')\n"]);
  assert.deepEqual(t.edits, [], "no edit request was processed");
});
