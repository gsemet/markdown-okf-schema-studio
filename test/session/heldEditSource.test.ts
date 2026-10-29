/**
 * The test hook behind the real-window scenario of CR 188 (`holdEditSourcesForTests`): while the
 * edit state of a preview holds the sources, the answer to an editor open waits in the queue, and
 * it is posted unchanged once the queue runs. The open goes through `handlePageMessage` of the real
 * `PreviewManager` over an in-memory document, like a page message.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import type { HostServices } from "../../src/host-api/index";
import type { PanelGroups } from "../../src/host-api/previewPanel";
import { createMemoryDocumentStore } from "../../src/host-memory/memoryDocumentStore";
import { PreviewManager } from "../../src/session/previewManager";
import { PreviewSession } from "../../src/session/previewSession";
import { nodeHostPorts } from "./nodeHostPorts";

async function settle(): Promise<void> {
  for (let index = 0; index < 20; index += 1) {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-255
test("CR 188: a held block source reaches the page only when the queue runs, unchanged", async () => {
  const store = createMemoryDocumentStore();
  const document = store.add("file:///w/README.md", "First paragraph.\n\nSecond paragraph.\n", "/w/README.md");
  const host = { ...nodeHostPorts, files: {}, documents: store, ui: {} } as unknown as HostServices;
  const groups: PanelGroups = { lockNewPanelGroup: () => Promise.resolve(false), release: () => undefined };
  const manager = new PreviewManager(host, groups);
  const posted: Array<Record<string, unknown>> = [];
  const preview = new PreviewSession({
    panel: { postMessage: (message: Record<string, unknown>) => { posted.push(message); return Promise.resolve(true); } },
    followsActiveEditor: false,
    document,
    documentUri: document.id,
    workspaceRoot: "/w",
    sessionRoots: [],
    navigationRoots: [],
    workspaceFolder: undefined,
    readOnly: false,
    webview: {},
    states: {},
    state: undefined,
    status: "success",
    configuration: {},
    plantUmlConfiguration: {},
    plantUmlEngineSettings: {},
    frontmatterConfiguration: {},
  } as never);
  preview.stage = { activeDocumentIdentity: document.id, activeDocumentRevision: document.revision, requestId: 1 } as never;
  preview.page.readyRequestId = 1;
  (manager as unknown as { live: Set<PreviewSession> }).live.add(preview);
  manager.rendering.refreshPreviewDocument = () => Promise.resolve() as never;

  const held: Array<() => void> = [];
  preview.edits.heldSources = held;
  await manager.handlePageMessage(preview, {
    type: "previewEditOpen", documentId: document.id, revision: document.revision, requestId: 1,
    editId: "e1", line: 3, endLine: 3,
  });
  await settle();
  assert.equal(held.length, 1, "the source waits in the queue");
  assert.deepEqual(posted.filter((message) => message.type === "previewEditSource"), [], "nothing reached the page");

  preview.edits.heldSources = undefined;
  for (const post of held.splice(0)) post();
  await settle();
  const sources = posted.filter((message) => message.type === "previewEditSource");
  assert.equal(sources.length, 1, "the source reached the page once released");
  assert.equal(sources[0]?.editId, "e1");
  assert.equal(sources[0]?.originalText, "Second paragraph.\n");
});
