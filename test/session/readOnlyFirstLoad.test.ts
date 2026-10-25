/**
 * The first load of a read-only page: its properties table carries no edit cells, because the
 * host builds the page with the read-only flag instead of replacing the table afterwards.
 */
import * as assert from "node:assert/strict";
import { test } from "node:test";

import { analyzeFrontmatter } from "../../src/core/frontmatter/okfFrontmatter";
import { renderPreviewDocument } from "../../src/core/render/renderPipeline";
import { buildPreviewWebviewHtml } from "../../src/session/webview";
import { editingBootState } from "../../src/session/features/rendering";
import { READ_ONLY_NO_FOLDER, READ_ONLY_UNTRUSTED } from "../../src/core/edits/sourceEdits";
import { nodeSchemaFiles } from "../../src/node-services/schemaFiles";
import { fakeAssetResolver } from "../shared/fakeAssets";

const SOURCE = "---\ntitle: Hello\n---\n\n# Heading\n";

async function firstLoad(editingEnabled: boolean): Promise<string> {
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
    { result: frontmatter, tableEnabled: true }, undefined, editingEnabled,
  );
  result.stage.dispose();
  return built.html;
}

// @tests_req SwRS-MDOKFSTUDIO-TRUST-001
test("the first load of a read-only page has no edit cells in the properties table", async () => {
  assert.doesNotMatch(await firstLoad(false), /data-okf-editable="true"/u);
  assert.match(await firstLoad(true), /data-okf-editable="true"/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-005
test("the boot context of a read-only preview carries the read-only reason, a writable one none", () => {
  assert.deepEqual(editingBootState({ readOnly: true, workspaceFolder: undefined }),
    { commentsEnabled: false, readOnlyReason: READ_ONLY_NO_FOLDER });
  assert.deepEqual(editingBootState({ readOnly: true, workspaceFolder: { path: "/ws" } as never }),
    { commentsEnabled: false, readOnlyReason: READ_ONLY_UNTRUSTED });
  assert.deepEqual(editingBootState({ readOnly: false, workspaceFolder: { path: "/ws" } as never }),
    { commentsEnabled: true });
});
