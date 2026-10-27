/**
 * Host side of the edit-mode key bindings (CR 119): the context that tells VS Code a focused
 * preview has an editor open, and the commands its key bindings run, which go to that preview's
 * page. The real `PreviewManager` runs over an in-memory document store and a recording panel.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import type { HostServices } from "../../src/host-api/index";
import { nodeHostPorts } from "./nodeHostPorts";
import type { PanelGroups } from "../../src/host-api/previewPanel";
import { createMemoryDocumentStore } from "../../src/host-memory/memoryDocumentStore";
import { PreviewManager } from "../../src/session/previewManager";
import { PreviewSession } from "../../src/session/previewSession";

const MARKDOWN = "# Title\n\nFirst paragraph.\n\nSecond paragraph.\n";

async function settle(): Promise<void> {
  for (let index = 0; index < 20; index += 1) {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
}

function fixture() {
  const store = createMemoryDocumentStore();
  const document = store.add("file:///w/a.md", MARKDOWN, "/w/a.md");
  const contexts: boolean[] = [];
  const host = {
    ...nodeHostPorts,
    files: {},
    documents: store,
    ui: { setPreviewEditing: (editing: boolean) => { contexts.push(editing); } },
  } as unknown as HostServices;
  const groups: PanelGroups = { lockNewPanelGroup: () => Promise.resolve(false), release: () => undefined };
  const manager = new PreviewManager(host, groups);
  const posted: Array<Record<string, unknown>> = [];
  const panel = {
    active: true,
    postMessage: (message: Record<string, unknown>) => { posted.push(message); return Promise.resolve(true); },
  };
  const preview = new PreviewSession({
    panel,
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
  const revision = document.revision;
  preview.stage = { activeDocumentIdentity: document.id, activeDocumentRevision: revision, requestId: 1 } as never;
  preview.page.readyRequestId = 1;
  (manager as unknown as { live: Set<PreviewSession> }).live.add(preview);
  manager.rendering.refreshPreviewDocument = () => Promise.resolve() as never;
  const send = async (type: string, extra: Record<string, unknown> = {}): Promise<void> => {
    await manager.handlePageMessage(preview, { type, documentId: document.id, revision, requestId: 1, ...extra });
    await settle();
  };
  return { manager, preview, panel, posted, contexts, send, document };
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-003
test("CR 119: the previewEditing context is on while the focused preview has an editor open, and off after", async () => {
  const f = fixture();
  assert.deepEqual(f.contexts, []);
  await f.send("previewEditOpen", { editId: "e1", line: 5, endLine: 5 });
  assert.deepEqual(f.contexts, [true]);
  await f.send("previewEditOpen", { editId: "e1", line: 5, endLine: 5 });
  assert.deepEqual(f.contexts, [true], "the host hears only a change");
  f.panel.active = false;
  f.manager.syncEditingContext();
  assert.deepEqual(f.contexts, [true, false], "a preview that lost the focus is not edited");
  f.panel.active = true;
  f.manager.syncEditingContext();
  assert.deepEqual(f.contexts, [true, false, true]);
  await f.send("previewEditClosed", { editId: "e1" });
  assert.deepEqual(f.contexts, [true, false, true, false]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-003
test("CR 119: an editing command goes to the focused preview with an open editor, and to no other", async () => {
  const f = fixture();
  assert.equal(f.manager.runEditCommand("undo"), false, "no editor open");
  await f.send("previewEditOpen", { editId: "e1", line: 5, endLine: 5 });
  f.posted.length = 0;
  for (const command of ["undo", "redo", "selectAll", "deleteLine"] as const) {
    assert.equal(f.manager.runEditCommand(command), true, command);
  }
  assert.deepEqual(f.posted.map((message) => [message.type, message.command, message.requestId]), [
    ["previewEditCommand", "undo", 1],
    ["previewEditCommand", "redo", 1],
    ["previewEditCommand", "selectAll", 1],
    ["previewEditCommand", "deleteLine", 1],
  ]);
  f.panel.active = false;
  assert.equal(f.manager.runEditCommand("undo"), false, "the preview is not focused");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-005
test("CR 143: a fold command goes to the focused preview, whether an editor is open or not", async () => {
  const f = fixture();
  f.posted.length = 0;
  assert.equal(f.manager.runFoldCommand("foldAll"), true);
  assert.equal(f.manager.runFoldCommand("unfoldAll"), true);
  assert.deepEqual(f.posted.map((message) => [message.type, message.command, message.requestId]), [
    ["previewFoldCommand", "foldAll", 1],
    ["previewFoldCommand", "unfoldAll", 1],
  ]);
  f.panel.active = false;
  assert.equal(f.manager.runFoldCommand("foldAll"), false, "no preview has the focus");
  assert.equal(f.posted.length, 2);
});
