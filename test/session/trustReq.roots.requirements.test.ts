/**
 * Requirement tests of the resource roots of a preview for rows no other test checked: the root
 * that the manager gives a session in Restricted Mode, for a document in a subfolder and in the
 * second folder of a multi-root window (`createSession` in src/session/sessionFactory.ts), and the
 * bundle folder that a rendered page adds to the roots of its panel (`updatePreview` in
 * src/session/features/rendering.ts, run on a stub manager as in readOnlyImagesSession.test.ts).
 * Each test asserts the behaviour of the current code.
 */
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import type { HostServices } from "../../src/host-api/index";
import type { PanelGroups } from "../../src/host-api/previewPanel";
import { createMemoryDocumentStore } from "../../src/host-memory/memoryDocumentStore";
import { renderPreviewDocument } from "../../src/core/render/renderPipeline";
import { nodeSchemaFiles } from "../../src/node-services/schemaFiles";
import { previewLocalResourceRoots, RenderingController } from "../../src/session/features/rendering";
import { PreviewManager } from "../../src/session/previewManager";
import { fakeAssetResolver } from "../shared/fakeAssets";
import { nodeHostPorts } from "./nodeHostPorts";
import { createNodeFileSystem } from "../../src/node-services/nodeFileSystem";

const noEvent = (): { dispose(): void } => ({ dispose: () => undefined });

/** Two workspace folders, each with a document in a subfolder, and a manager of the given trust. */
function fixture(trusted: boolean) {
  const sandbox = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "trust-roots-")));
  const first = path.join(sandbox, "first");
  const second = path.join(sandbox, "second");
  const store = createMemoryDocumentStore();
  const documents = [first, second].map((folder, index) => {
    fs.mkdirSync(path.join(folder, "notes"), { recursive: true });
    const file = path.join(folder, "notes", "page.md");
    fs.writeFileSync(file, "# Title\n");
    return store.add(`file:///ws${index}/notes/page.md`, "# Title\n", file);
  });
  const host = {
    ...nodeHostPorts,
    files: {},
    documents: store,
    settings: { section: () => ({ get: <T>(_key: string, fallback: T): T => fallback }) },
    workspace: { trusted, folders: () => [{ path: first }, { path: second }] },
    watcher: {
      watch: () => ({ onDidChange: noEvent, onDidCreate: noEvent, onDidDelete: noEvent, dispose: () => undefined }),
    },
    ui: { setPreviewEditing: () => undefined },
  } as unknown as HostServices;
  const groups: PanelGroups = { lockNewPanelGroup: () => Promise.resolve(false), release: () => undefined };
  const manager = new PreviewManager(host, groups);
  const roots: string[][] = [];
  const panel = {
    visible: true,
    active: false,
    html: "",
    title: "",
    cspSource: "csp",
    bundleRoot: path.join(sandbox, "extension", "out", "bundle"),
    column: 1,
    setResourceRoots: (value: string[]) => { roots.push([...value]); },
    onDidReceiveMessage: noEvent,
    onDidChangeLayout: noEvent,
    onDidDispose: noEvent,
    onDidChangeViewState: noEvent,
    dispose: () => undefined,
  };
  const cleanup = (): void => {
    manager.disposeAll(false);
    fs.rmSync(sandbox, { recursive: true, force: true });
  };
  return { manager, first, second, documents, panel, roots, cleanup };
}

// @tests_req SwRS-MDOKFSTUDIO-TRUST-007#S1
// @tests_req SwRS-MDOKFSTUDIO-TRUST-007#S7
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

// @tests_req SwRS-MDOKFSTUDIO-TRUST-007#S7
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

/** A value that answers every property and call with itself: the collaborators the test ignores. */
function ignored(): any {
  const target = function ignoredTarget() { return undefined; };
  return new Proxy(target, {
    get: (t, key) => (key === Symbol.toPrimitive ? () => "" : key === "then" ? undefined
      : Object.prototype.hasOwnProperty.call(t, key) ? (t as any)[key] : ignored()),
    apply: () => ignored(),
  });
}

// @tests_req SwRS-MDOKFSTUDIO-TRUST-007#S5
// @tests_req SwRS-MDOKFSTUDIO-TRUST-007#S7
test("a rendered page sets the resource root and the bundle folder as the roots of its panel", async () => {
  const sandbox = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "trust-roots-bundle-")));
  try {
    const folder = path.join(sandbox, "ws");
    const bundleRoot = path.join(sandbox, "extension", "out", "bundle");
    fs.mkdirSync(path.join(folder, "notes"), { recursive: true });
    const text = "# Title\n";
    const result = await renderPreviewDocument({
      files: createNodeFileSystem(),
      document: { uri: { scheme: "file", fsPath: path.join(folder, "notes", "page.md") }, languageId: "markdown", version: 1, getText: () => text },
      workspaceRoot: folder, requestId: 1, isWorkspaceTrusted: () => true, plantUmlEngine: "builtin",
    });
    const identity = result.stage.activeDocumentIdentity;
    let roots: readonly string[] = [];
    const manager: any = ignored();
    manager.has = () => true;
    manager.host = { schemaFiles: nodeSchemaFiles, files: createNodeFileSystem(), documents: { idOf: () => undefined } };
    manager.scroll = { initialAnchorLine: () => undefined, takePendingPin: () => undefined, visibleEditorFor: () => undefined };
    manager.choices = { editMode: false, initialPaletteMode: () => "auto", refreshThreadAuthor: () => undefined };
    manager.previewTitle = () => "page";
    const preview: any = {
      disposed: false, documentUri: identity, restrictedReads: false, workspaceRoot: folder,
      workspaceFolder: { path: folder }, state: undefined,
      configuration: { incrementalUpdates: false, maxContentWidth: undefined },
      frontmatterConfiguration: {}, frontmatter: { result: undefined }, sessionRoots: [folder],
      page: { resourceRoots: [] }, probe: { renderedStages: 0 }, overlay: {}, webview: { html: "", nonce: "" },
      panel: {
        assets: fakeAssetResolver({ cspSource: "vscode-webview://csp", url: (file) => `webview://${file}` }),
        bundleRoot,
        setResourceRoots: (next: readonly string[]) => { roots = next; },
      },
    };
    const controller: any = new RenderingController(manager);
    controller.runtimeContext = () => ({ documentId: identity, revision: 1, requestId: 1, activeSourceFile: result.stage.activeDocumentPath });
    controller.assignWebviewHtml = () => undefined;
    controller.clearPendingOverlay = () => undefined;
    await controller.updatePreview(preview, result);
    preview.stage?.dispose();
    assert.deepEqual(roots, [folder, bundleRoot], "the resource root, then the bundle folder, and nothing else");
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
});
