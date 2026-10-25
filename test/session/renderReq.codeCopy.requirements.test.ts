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
const MAX_COPY = 1_000_000;

function setup(options: { readOnly: boolean }) {
  const clipboard: string[] = [];
  const edits: string[] = [];
  const posted: Array<Record<string, unknown>> = [];
  let failWrite = false;
  const current = { documentId: DOCUMENT, revision: 4, requestId: 9 };
  const manager = {
    host: { ui: { writeClipboard: (text: string) => {
      if (failWrite) return Promise.reject(new Error("denied"));
      clipboard.push(text);
      return Promise.resolve();
    } } },
    // The gate of a render message: the identity of the render the host holds.
    matchesCurrent: (_session: unknown, message: typeof current) =>
      message.documentId === current.documentId && message.revision === current.revision
      && message.requestId === current.requestId,
  } as unknown as PreviewManager;
  const router: PageMessageRouter = createMessageRouter();
  new HostRequestController(manager).register(router);
  router.on("previewEditOpen", () => { edits.push("edit"); });
  const preview = { disposed: false, readOnly: options.readOnly, documentUri: DOCUMENT,
    postToPage: (message: Record<string, unknown>) => { posted.push(message); return Promise.resolve(true); } } as unknown as PreviewSession;
  const dispatcher = new PageMessageDispatcher(manager, router);
  const copy = (identity: Partial<typeof current> = {}): PageToHostMessage => ({
    type: "previewCopyText", ...current, ...identity, editId: "copy-1", text: "print('x')\n",
  } as PageToHostMessage);
  return { clipboard, edits, posted, preview, dispatcher, copy, failWrite: (value: boolean) => { failWrite = value; } };
}

// @tests_req SwRS-MDOKFSTUDIO-TRUST-065
test("a copy request only needs the document; a stale version or render request still copies and is answered", async () => {
  const t = setup({ readOnly: false });
  await t.dispatcher.handle(t.preview, t.copy({ revision: 3 }));
  await t.dispatcher.handle(t.preview, t.copy({ requestId: 8 }));
  assert.deepEqual(t.clipboard, ["print('x')\n", "print('x')\n"]);
  assert.deepEqual(t.posted.map((m) => [m.type, m.editId, m.ok]), [
    ["previewCopyTextResult", "copy-1", true], ["previewCopyTextResult", "copy-1", true],
  ]);
  assert.equal(await t.dispatcher.handle(t.preview, t.copy({ documentId: "file:///other.md" })), undefined,
    "another document is dropped");
  assert.equal(t.posted.length, 2);
});

// @tests_req SwRS-MDOKFSTUDIO-CODE-026
test("an oversized text is refused with a reason and a failing clipboard is answered as not copied", async () => {
  const t = setup({ readOnly: false });
  await t.dispatcher.handle(t.preview, { ...t.copy(), text: "x".repeat(MAX_COPY + 1) });
  assert.deepEqual(t.clipboard, []);
  assert.deepEqual([t.posted[0]?.ok, t.posted[0]?.reason], [false, "Too large to copy."]);

  await t.dispatcher.handle(t.preview, { ...t.copy(), text: "x".repeat(MAX_COPY) });
  assert.equal(t.posted[1]?.ok, true);

  t.failWrite(true);
  await t.dispatcher.handle(t.preview, t.copy());
  assert.deepEqual([t.posted[2]?.ok, t.posted[2]?.reason], [false, "Could not copy."]);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-006
test("a read-only preview still writes the requested code to the clipboard and edits nothing", async () => {
  const t = setup({ readOnly: true });
  await t.dispatcher.handle(t.preview, t.copy());
  assert.deepEqual(t.clipboard, ["print('x')\n"]);
  assert.deepEqual(t.edits, [], "no edit request was processed");
});
