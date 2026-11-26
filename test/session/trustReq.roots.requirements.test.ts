/**
 * Requirement tests of the resource roots of a preview for rows no other test checked: the root
 * that the manager gives a session in Restricted Mode, for a document in a subfolder, in the
 * second folder of a multi-root window and outside every workspace folder (`createSession` in
 * src/session/sessionFactory.ts), and the roots of the panel once the session's own render queue
 * has shown the page (`updatePreview` in src/session/features/rendering.ts), bundle folder
 * included.
 * Each test asserts the behaviour of the current code.
 */
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import type { HostServices } from "../../src/host-api/index";
import type { HostDocument } from "../../src/host-api/documentStore";
import type { PanelGroups } from "../../src/host-api/previewPanel";
import { createMemoryDocumentStore } from "../../src/host-memory/memoryDocumentStore";
import { nodeSchemaFiles } from "../../src/node-services/schemaFiles";
import { previewLocalResourceRoots } from "../../src/session/features/rendering";
import { PreviewManager } from "../../src/session/previewManager";
import type { PreviewSession } from "../../src/session/previewSession";
import { fakeAssetResolver } from "../shared/fakeAssets";
import { recordingLogger } from "./memoryPorts";
import { nodeHostPorts } from "./nodeHostPorts";
import { createNodeFileSystem } from "../../src/node-services/nodeFileSystem";

const noEvent = (): { dispose(): void } => ({ dispose: () => undefined });

/**
 * Two workspace folders, each with a document in a subfolder, a document with an image beside it
 * outside both, and a manager of the given trust.
 */
function fixture(trusted: boolean) {
  const sandbox = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "trust-roots-")));
  const first = path.join(sandbox, "first");
  const second = path.join(sandbox, "second");
  const outside = path.join(sandbox, "outside");
  const store = createMemoryDocumentStore();
  const documents = [first, second].map((folder, index) => {
    fs.mkdirSync(path.join(folder, "notes"), { recursive: true });
    const file = path.join(folder, "notes", "page.md");
    fs.writeFileSync(file, "# Title\n");
    return store.add(`file:///ws${index}/notes/page.md`, "# Title\n", file);
  });
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, "page.md"), "![x](beside.png)\n");
  fs.writeFileSync(path.join(outside, "beside.png"), "png");
  const outsideDocument = store.add("file:///outside/page.md", "![x](beside.png)\n", path.join(outside, "page.md"));
  const errors: string[] = [];
  const host = {
    ...nodeHostPorts,
    files: createNodeFileSystem(),
    schemaFiles: nodeSchemaFiles,
    documents: store,
    settings: { section: () => ({ get: <T>(_key: string, fallback: T): T => fallback }) },
    capabilities: { processes: false, editorPairing: false },
    theme: { kind: "light" },
    diagnostics: { create: () => ({ set: () => undefined, delete: () => undefined, dispose: () => undefined }) },
    logger: recordingLogger(errors),
    workspace: { trusted, folders: () => [{ path: first }, { path: second }] },
    watcher: {
      watch: () => ({ onDidChange: noEvent, onDidCreate: noEvent, onDidDelete: noEvent, dispose: () => undefined }),
    },
    ui: { setPreviewEditing: () => undefined },
  } as unknown as HostServices;
  const groups: PanelGroups = { lockNewPanelGroup: () => Promise.resolve(false), release: () => undefined };
  const manager = new PreviewManager(host, groups);
  const roots: string[][] = [];
  const bundleRoot = path.join(sandbox, "extension", "out", "bundle");
  const panel = {
    visible: true,
    active: false,
    html: "",
    title: "",
    cspSource: "csp",
    assets: fakeAssetResolver({ cspSource: "vscode-webview://csp", url: (file) => `webview://${file}` }),
    bundleRoot,
    column: 1,
    setResourceRoots: (value: string[]) => { roots.push([...value]); },
    postMessage: () => Promise.resolve(true),
    onDidReceiveMessage: noEvent,
    onDidChangeLayout: noEvent,
    onDidDispose: noEvent,
    onDidChangeViewState: noEvent,
    dispose: () => undefined,
  };
  /** Renders the document through the session's own queue and waits until the page is shown. */
  const show = async (session: PreviewSession, document: HostDocument): Promise<void> => {
    await manager.requestDocument(session, document);
    await manager.rendering.pendingShow(session);
    assert.deepEqual(errors, []);
    assert.equal(session.status, "success", session.webview.html);
  };
  const cleanup = (): void => {
    manager.disposeAll(false);
    fs.rmSync(sandbox, { recursive: true, force: true });
  };
  return { manager, first, second, outside, documents, outsideDocument, panel, bundleRoot, roots, show, cleanup };
}

// @tests_req SwRS-MDOKFSTUDIO-TRUST-007#S1
test("a preview of a file outside every workspace folder has its folder as resource root and loads the image beside it", async () => {
  // A trusted window, so only the place of the file restricts the reads.
  const f = fixture(true);
  try {
    const session = f.manager.createSession(f.panel as never, f.outsideDocument, undefined);
    assert.equal(session.restrictedReads, true);
    assert.equal(session.workspaceRoot, f.outside);
    await f.show(session, f.outsideDocument);
    assert.deepEqual(f.roots[f.roots.length - 1], [f.outside, f.bundleRoot]);
    const address = `src="webview://${path.join(f.outside, "beside.png")}"`;
    assert.ok(session.webview.html.includes(address), session.webview.html);
  } finally {
    f.cleanup();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-007#S2
test("in Restricted Mode the resource root of a document in a subfolder is that subfolder", async () => {
  const f = fixture(false);
  try {
    const session = f.manager.createSession(f.panel as never, f.documents[0], { path: f.first } as never);
    const subfolder = path.join(f.first, "notes");
    assert.equal(session.restrictedReads, true);
    assert.equal(session.workspaceRoot, subfolder);
    assert.deepEqual(session.navigationRoots, [subfolder]);
    assert.deepEqual(session.sessionRoots, []);
    // The workspace folder is added to the panel roots for its images only (SwRS-MDOKFSTUDIO-TRUST-002).
    assert.deepEqual(await previewLocalResourceRoots(createNodeFileSystem(), session.workspaceRoot, true, session.workspaceFolder?.path), [subfolder, f.first]);
  } finally {
    f.cleanup();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-007#S3
test("in a trusted window the resource root is the folder that holds the document, the second one in a multi-root window", async () => {
  const f = fixture(true);
  try {
    const inFirst = f.manager.createSession(f.panel as never, f.documents[0], { path: f.first } as never);
    assert.equal(inFirst.restrictedReads, false);
    assert.equal(inFirst.workspaceRoot, f.first, "a document in a subfolder has the workspace folder as root");
    const inSecond = f.manager.createSession(f.panel as never, f.documents[1], { path: f.second } as never);
    assert.equal(inSecond.restrictedReads, false);
    assert.equal(inSecond.workspaceRoot, f.second);
    assert.deepEqual(inSecond.sessionRoots, [f.first, f.second]);
    assert.deepEqual(await previewLocalResourceRoots(createNodeFileSystem(), inSecond.workspaceRoot, false), [f.second]);
  } finally {
    f.cleanup();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-007#S4
test("a shown page may load from its resource root and the bundle folder, and a restricted-reads workspace document also from its workspace folder", async () => {
  const full = fixture(true);
  try {
    const document = full.documents[0];
    const session = full.manager.createSession(full.panel as never, document, { path: full.first } as never);
    await full.show(session, document);
    assert.deepEqual(full.roots[full.roots.length - 1], [full.first, full.bundleRoot], "full reads");
  } finally {
    full.cleanup();
  }
  const outside = fixture(true);
  try {
    const session = outside.manager.createSession(outside.panel as never, outside.outsideDocument, undefined);
    await outside.show(session, outside.outsideDocument);
    assert.deepEqual(outside.roots[outside.roots.length - 1], [outside.outside, outside.bundleRoot],
      "restricted reads of a file outside the workspace");
  } finally {
    outside.cleanup();
  }
  const restricted = fixture(false);
  try {
    const document = restricted.documents[0];
    const session = restricted.manager.createSession(restricted.panel as never, document, { path: restricted.first } as never);
    await restricted.show(session, document);
    assert.deepEqual(restricted.roots[restricted.roots.length - 1],
      [path.join(restricted.first, "notes"), restricted.first, restricted.bundleRoot],
      "restricted reads of a workspace document");
  } finally {
    restricted.cleanup();
  }
});
