/**
 * Host side of the files dropped from the Explorer (CR 146): the real `PreviewManager` over an
 * in-memory document store, a scripted file system and workspace; every message goes through
 * `handlePageMessage`, like a page message.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import type { TextEdit } from "../../src/core/edits/textEdit";
import type { HostServices } from "../../src/host-api/index";
import type { PanelGroups } from "../../src/host-api/previewPanel";
import { createMemoryDocumentStore } from "../../src/host-memory/memoryDocumentStore";
import { PreviewManager } from "../../src/session/previewManager";
import { PreviewSession } from "../../src/session/previewSession";

const MARKDOWN = "# Title\n\nFirst paragraph.\n\nSecond paragraph.\n";
const FILES: Record<string, string> = {
  "/w/notes/The Guide.md": "---\ntitle: x\n---\n\n```\n# not this\n```\n\n## Getting *started*\n",
  "/w/notes/plain.md": "No heading.\n",
  "/w/img/logo.png": "png",
  "/outside/other.md": "# Other\n",
};

async function settle(): Promise<void> {
  for (let index = 0; index < 20; index += 1) await new Promise<void>((resolve) => setImmediate(resolve));
}

function fixture(options: { readOnly?: boolean; reject?: boolean } = {}) {
  const store = createMemoryDocumentStore();
  const document = store.add("file:///w/doc/a.md", MARKDOWN, "/w/doc/a.md");
  const applyCalls: Array<readonly TextEdit[]> = [];
  const documents = Object.assign(Object.create(store) as object, {
    applyEdits: (target: typeof document, edits: readonly TextEdit[], applyOptions?: never) => {
      applyCalls.push(edits);
      return Promise.resolve(store.applyEdits(target, edits, applyOptions));
    },
  });
  const host = {
    files: {
      readFile: (file: string) => file in FILES
        ? Promise.resolve(new TextEncoder().encode(FILES[file]))
        : Promise.reject(new Error("missing")),
    },
    documents,
    workspace: { folderOf: (file: string) => (file.startsWith("/w/") ? { path: "/w" } : undefined) },
    ui: { showWarning: () => Promise.resolve(undefined) },
  } as unknown as HostServices;
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
    readOnly: options.readOnly === true,
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
  const send = async (uris: string[], insertAfterLine = 3): Promise<void> => {
    await manager.handlePageMessage(preview, {
      type: "previewDropFiles", documentId: document.id, revision, requestId: 1, insertAfterLine, uris,
    });
    await settle();
  };
  const results = (): Array<Record<string, unknown>> => posted.filter((entry) => entry.type === "previewBlocksResult");
  return { document, applyCalls, send, results };
}

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-004
test("dropped files are written as relative links and images after the line, titled by the first heading", async () => {
  const drop = fixture();
  await drop.send(["file:///w/notes/The%20Guide.md", "file:///w/img/logo.png", "file:///w/notes/plain.md"]);
  assert.deepEqual(drop.results().map(({ ok, op }) => ({ ok, op })), [{ ok: true, op: "paste" }]);
  assert.equal(
    drop.document.getText(),
    "# Title\n\nFirst paragraph.\n\n[Getting started](../notes/The%20Guide.md) ![logo](../img/logo.png) [plain](../notes/plain.md)\n\nSecond paragraph.\n",
  );
  assert.equal(drop.applyCalls.length, 1, "one undo step");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-004
test("files outside the workspace, other addresses and unreadable files are handled without touching the source", async () => {
  const outside = fixture();
  await outside.send(["file:///outside/other.md", "https://example.com/a.md"]);
  assert.deepEqual(outside.results().map(({ ok, reason }) => ({ ok, reason })), [
    { ok: false, reason: "Only files inside a workspace folder can be dropped." },
  ]);
  assert.equal(outside.document.getText(), MARKDOWN);
  assert.equal(outside.applyCalls.length, 0);

  const mixed = fixture();
  await mixed.send(["file:///outside/other.md", "file:///w/notes/missing.md"]);
  assert.equal(mixed.document.getText().includes("[missing](../notes/missing.md)"), true, "an unreadable file takes its name");
  assert.equal(mixed.document.getText().includes("other"), false, "the outside file is skipped");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-004
test("a read-only preview and a line that is not a block end refuse a drop", async () => {
  const readOnly = fixture({ readOnly: true });
  await readOnly.send(["file:///w/img/logo.png"]);
  assert.equal(readOnly.results()[0]!.ok, false);
  assert.equal(readOnly.document.getText(), MARKDOWN);
  const blank = fixture();
  await blank.send(["file:///w/img/logo.png"], 4);
  assert.equal(blank.results()[0]!.ok, false);
  assert.equal(blank.document.getText(), MARKDOWN);
});
