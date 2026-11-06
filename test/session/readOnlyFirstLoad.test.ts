/**
 * The first load of a page with restricted reads (Restricted Mode, a standalone file): its
 * properties table carries edit cells like any other, and the Edit button is enabled.
 */
import * as assert from "node:assert/strict";
import { test } from "node:test";

import { analyzeFrontmatter } from "../../src/core/frontmatter/okfFrontmatter";
import { renderPreviewDocument } from "../../src/core/render/renderPipeline";
import { buildPreviewWebviewHtml } from "../../src/session/webview";
import { nodeSchemaFiles } from "../../src/node-services/schemaFiles";
import { fakeAssetResolver } from "../shared/fakeAssets";

const SOURCE = "---\ntitle: Hello\n---\n\n# Heading\n";

async function firstLoad(): Promise<string> {
  const result = await renderPreviewDocument({
    document: { uri: { scheme: "file", fsPath: "/ws/doc.md" }, languageId: "markdown", version: 1, getText: () => SOURCE },
    workspaceRoot: "/ws",
    requestId: 1,
    isWorkspaceTrusted: () => true,
  });
  const frontmatter = analyzeFrontmatter({
    schemaFiles: nodeSchemaFiles,
    filePath: "/ws/doc.md",
    sourceText: SOURCE,
    allowSchemaResolution: false,
    strictAdditionalProperties: false,
  });
  const assets = fakeAssetResolver({ cspSource: "vscode-webview://csp", url: (file) => `file://${file}`, extensionRoot: "/ext" });
  const context = {
    documentId: result.stage.activeDocumentIdentity,
    revision: 1,
    requestId: 1,
    activeSourceFile: result.stage.activeDocumentPath,
  };
  const built = buildPreviewWebviewHtml(
    result.html, result.stage.outputDirectory, assets, context, "/ws",
    { result: frontmatter, tableEnabled: true }, undefined, false, [], "host", true,
  );
  result.stage.dispose();
  return built.html;
}

// @tests_req SwRS-MDOKFSTUDIO-TRUST-001
test("the first load of a page with restricted reads has edit cells in the properties table and an enabled Edit button", async () => {
  const html = await firstLoad();
  assert.match(html, /data-okf-editable="true"/u);
  assert.match(html, /<button[^>]*data-sphinx-preview-edit-toggle/u);
  assert.doesNotMatch(html, /<button[^>]*data-sphinx-preview-edit-toggle[^>]*aria-disabled/u);
});
