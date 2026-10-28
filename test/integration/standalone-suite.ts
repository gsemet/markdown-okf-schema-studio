import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as vscode from "vscode";

import {
  disposeActivePreviewForTests,
  EDITOR_VIEW_TYPE,
  getActivePreviewForTests,
  sendPreviewMessageForTests,
} from "./extensionApi";
import { withSuiteWatchdog } from "./stepWatchdog";

async function waitForPreview(): Promise<void> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const preview = getActivePreviewForTests();
    if (preview?.phase === "ready" && preview.status === "success") {
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Timed out waiting for the standalone preview to render.");
}

async function waitForDocument(documentUri: string): Promise<void> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const preview = getActivePreviewForTests();
    if (preview?.documentUri === documentUri && preview.phase === "ready" && preview.status === "success") {
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for preview document ${documentUri}.`);
}

// @tests_req StRS-MDOKFSTUDIO-TRUST-001
// @tests_req StRS-MDOKFSTUDIO-TRUST-004
// @tests_req SwRS-MDOKFSTUDIO-TRUST-001
// @tests_req SwRS-MDOKFSTUDIO-TRUST-005
// @tests_req SwRS-MDOKFSTUDIO-TRUST-007
export async function run(): Promise<void> {
  // Heartbeat and timeout dumps of the hang watchdog (stepWatchdog.ts).
  await withSuiteWatchdog("standalone-suite", runStandaloneSuite);
}

async function runStandaloneSuite(): Promise<void> {
  assert.equal(vscode.workspace.isTrusted, true);
  // The fixture must lie in no workspace folder (a standalone, untrusted-by-workspace file).
  // Prefer os.tmpdir(); the test workspace can hold /tmp on Linux, then fall back to the home folder.
  const parent = [os.tmpdir(), os.homedir()].find((candidate) =>
    !vscode.workspace.getWorkspaceFolder(vscode.Uri.file(path.join(candidate, "probe.md")))) ?? os.homedir();
  const directory = fs.mkdtempSync(path.join(parent, "markdown-okf-schema-standalone-"));
  const schemaDirectory = path.join(directory, "_schema");
  const filePath = path.join(directory, "finding.md");
  const source = [
    "---",
    "type: finding",
    "status: draft",
    "---",
    "# Standalone document",
    "",
  ].join("\n");
  const schema = [
    "type: object",
    "properties:",
    "  status:",
    "    type: string",
    "    enum: [draft, active]",
    "required: [status]",
    "",
  ].join("\n");
  fs.mkdirSync(schemaDirectory);
  fs.writeFileSync(filePath, source, "utf8");
  fs.writeFileSync(path.join(schemaDirectory, "finding.schema.yaml"), schema, "utf8");

  try {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
    assert.equal(vscode.workspace.getWorkspaceFolder(document.uri), undefined);
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await vscode.commands.executeCommand("markdown-okf-schema-studio.openPreview");
    await waitForDocument(document.uri.toString());

    const standaloneSidePreview = getActivePreviewForTests();
    assert.ok(standaloneSidePreview);
    assert.equal(standaloneSidePreview.readOnly, true);
    assert.equal(standaloneSidePreview.outputDirectory, directory);

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
    assert.ok(workspaceRoot);
    const workspaceDocument = await vscode.workspace.openTextDocument(
      vscode.Uri.joinPath(workspaceRoot, "test/integration/fixtures/preview.md"),
    );
    await vscode.window.showTextDocument(workspaceDocument, vscode.ViewColumn.One);
    await waitForDocument(workspaceDocument.uri.toString());
    const trustedSidePreview = getActivePreviewForTests();
    assert.ok(trustedSidePreview);
    assert.equal(trustedSidePreview.readOnly, false);
    assert.ok(
      trustedSidePreview.localResourceRoots.some((root) => root.fsPath === workspaceRoot.fsPath),
      "the workspace document should restore the workspace resource root",
    );

    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await waitForDocument(document.uri.toString());
    const restoredStandalonePreview = getActivePreviewForTests();
    assert.ok(restoredStandalonePreview);
    assert.equal(restoredStandalonePreview.readOnly, true);
    assert.equal(restoredStandalonePreview.outputDirectory, directory);

    disposeActivePreviewForTests();
    await vscode.commands.executeCommand("vscode.openWith", document.uri, EDITOR_VIEW_TYPE);
    await waitForPreview();

    const preview = getActivePreviewForTests();
    assert.ok(preview);
    assert.equal(preview.readOnly, true);
    assert.equal(preview.outputDirectory, directory);
    assert.match(preview.html, /Standalone document/u);
    assert.match(preview.html, /data-okf-schema-found="false"/u);
    assert.doesNotMatch(preview.html, /data-okf-enums=/u);
    assert.match(preview.html, /<button[^>]*data-sphinx-preview-edit-toggle[^>]*aria-disabled="true"/u);
    assert.ok(
      preview.localResourceRoots.some((root) => root.fsPath === directory),
      "the standalone document directory should be the local resource root",
    );

    sendPreviewMessageForTests({
      type: "previewFrontmatterSave",
      documentId: preview.documentUri,
      revision: preview.documentVersion,
      requestId: preview.requestId,
      editId: "standalone-edit-attempt",
      fieldName: "status",
      fieldValue: "active",
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
    assert.equal(document.getText(), source);
  } finally {
    disposeActivePreviewForTests();
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
