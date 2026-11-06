/**
 * Restricted Mode, the session wiring (CR 238): the rendering controller gives the page policy and
 * the webview the workspace folder next to the document folder, so an image of the workspace
 * folder outside the document folder is shown. Runs `updatePreview` on a stub manager.
 */
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, test } from "node:test";

import { renderPreviewDocument } from "../../src/core/render/renderPipeline";
import { nodeSchemaFiles } from "../../src/node-services/schemaFiles";
import { RenderingController } from "../../src/session/features/rendering";
import { fakeAssetResolver } from "../shared/fakeAssets";

let sandbox = "";

beforeEach(() => {
  sandbox = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "readonly-session-")));
  fs.mkdirSync(path.join(sandbox, "ws", "docs", "guide"), { recursive: true });
  fs.mkdirSync(path.join(sandbox, "ws", "images"), { recursive: true });
  fs.writeFileSync(path.join(sandbox, "ws", "images", "x.png"), "png");
});

afterEach(() => {
  fs.rmSync(sandbox, { recursive: true, force: true });
});

/** A value that answers every property and call with itself: the collaborators the test ignores. */
function ignored(): any {
  const target = function ignoredTarget() { return undefined; };
  return new Proxy(target, {
    get: (_t, key) => (key === Symbol.toPrimitive ? () => "" : key === "then" ? undefined : ignored()),
    apply: () => ignored(),
  });
}

async function show(): Promise<{ html: string; roots: readonly string[]; toolbar: unknown }> {
  const ws = path.join(sandbox, "ws");
  const guide = path.join(ws, "docs", "guide");
  const text = "![x](../../images/x.png)\n";
  const result = await renderPreviewDocument({
    document: {
      uri: { scheme: "file", fsPath: path.join(guide, "doc.md") },
      languageId: "markdown",
      version: 1,
      getText: () => text,
    },
    workspaceRoot: guide,
    restrictedReads: true,
    requestId: 1,
    isWorkspaceTrusted: () => false,
    allowUntrusted: true,
    plantUmlEngine: "builtin",
  });
  const identity = result.stage.activeDocumentIdentity;
  let roots: readonly string[] = [];
  let toolbar: unknown;
  const manager: any = ignored();
  manager.has = () => true;
  manager.host = { schemaFiles: nodeSchemaFiles, documents: { idOf: () => undefined } };
  manager.scroll = { initialAnchorLine: () => undefined, takePendingPin: () => undefined, visibleEditorFor: () => undefined };
  manager.choices = { editMode: false, initialPaletteMode: () => "auto", refreshThreadAuthor: () => undefined };
  manager.previewTitle = () => "doc";
  const preview: any = {
    disposed: false,
    documentUri: identity,
    restrictedReads: true,
    workspaceRoot: guide,
    workspaceFolder: { path: ws },
    state: undefined,
    configuration: { incrementalUpdates: false, maxContentWidth: undefined },
    frontmatterConfiguration: {},
    frontmatter: { result: undefined },
    sessionRoots: [],
    page: { resourceRoots: [] },
    probe: { renderedStages: 0 },
    overlay: {},
    webview: { html: "", nonce: "" },
    panel: {
      assets: fakeAssetResolver({ cspSource: "vscode-webview://csp", url: (file) => `webview://${file}` }),
      bundleRoot: undefined,
      setResourceRoots: (next: readonly string[]) => { roots = next; },
    },
  };
  const controller: any = new RenderingController(manager);
  controller.runtimeContext = (...args: unknown[]) => (toolbar = args[5], { documentId: identity, revision: 1, requestId: 1, activeSourceFile: result.stage.activeDocumentPath });
  controller.assignWebviewHtml = () => undefined;
  controller.clearPendingOverlay = () => undefined;
  controller.updatePreview(preview, result);
  const html: string = preview.webview.html;
  preview.stage?.dispose();
  return { html, roots, toolbar };
}

// @tests_req SwRS-MDOKFSTUDIO-TRUST-002
test("Restricted Mode: an image of the workspace folder outside the document folder is shown and its folder is a webview root", async () => {
  const { html, roots } = await show();
  assert.ok(html.includes(`src="webview://${path.join(sandbox, "ws", "images", "x.png")}"`), html);
  assert.deepEqual(roots, [path.join(sandbox, "ws", "docs", "guide"), path.join(sandbox, "ws")]);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-001
test("Restricted Mode: the page boots with the Comment button and the reply box on", async () => {
  const { toolbar } = await show();
  assert.equal((toolbar as { commentsEnabled?: boolean }).commentsEnabled, true);
});
