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

function fixture(options: { restrictedReads?: boolean; reject?: boolean; readOnly?: boolean; standalone?: boolean } = {}) {
  const store = createMemoryDocumentStore();
  const documentFile = options.standalone ? "/lone/doc/a.md" : "/w/doc/a.md";
  const document = store.add(`file://${documentFile}`, MARKDOWN, documentFile);
  const applyCalls: Array<readonly TextEdit[]> = [];
  const reads: string[] = [];
  const documents = Object.assign(Object.create(store) as object, {
    applyEdits: (target: typeof document, edits: readonly TextEdit[], applyOptions?: never) => {
      applyCalls.push(edits);
      // A read-only file: VS Code accepts the edit and changes nothing.
      if (options.readOnly) return Promise.resolve(true);
      return Promise.resolve(store.applyEdits(target, edits, applyOptions));
    },
  });
  const host = {
    files: {
      readFile: (file: string) => (reads.push(file), file) && file in FILES
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
    restrictedReads: options.restrictedReads === true,
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
  return { document, applyCalls, reads, send, results };
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
test("a restricted-reads preview takes a drop, and a line that is not a block end refuses it", async () => {
  const restricted = fixture({ restrictedReads: true });
  await restricted.send(["file:///w/img/logo.png"]);
  assert.equal(restricted.results()[0]!.ok, true);
  assert.notEqual(restricted.document.getText(), MARKDOWN);
  const blank = fixture();
  await blank.send(["file:///w/img/logo.png"], 4);
  assert.equal(blank.results()[0]!.ok, false);
  assert.equal(blank.document.getText(), MARKDOWN);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-005
// @tests_req SwRS-MDOKFSTUDIO-TRUST-001
test("a dropped Markdown file is not read under restricted reads: its link has no title", async () => {
  const restricted = fixture({ restrictedReads: true });
  await restricted.send(["file:///w/notes/The%20Guide.md"]);
  assert.deepEqual(restricted.reads, [], "no file is read");
  assert.equal(restricted.results()[0]!.ok, true);
  assert.equal(restricted.document.getText().includes("[The Guide](../notes/The%20Guide.md)"), true);
  assert.equal(restricted.document.getText().includes("Getting"), false, "the heading is not read");
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-001
test("a drop on a file VS Code holds read-only answers the read-only reason", async () => {
  for (const restrictedReads of [false, true]) {
    const drop = fixture({ readOnly: true, restrictedReads });
    await drop.send(["file:///w/img/logo.png"]);
    assert.deepEqual(drop.results().map(({ ok, reason }) => ({ ok, reason })), [
      { ok: false, reason: "This file is read-only in VS Code." },
    ]);
    assert.equal(drop.document.getText(), MARKDOWN);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-005
test("a drop on a standalone file links any file relative to the document, reading none", async () => {
  const drop = fixture({ standalone: true, restrictedReads: true });
  await drop.send(["file:///lone/img/logo.png", "file:///w/notes/The%20Guide.md"]);
  assert.equal(drop.results()[0]!.ok, true);
  assert.deepEqual(drop.reads, [], "no file is read");
  assert.equal(
    drop.document.getText().includes("![logo](../img/logo.png) [The Guide](../../w/notes/The%20Guide.md)"),
    true,
  );
});
