import * as assert from "node:assert/strict";
import * as vscode from "vscode";

import {
  COMMAND_ID,
  sendPreviewMessageForTests,
  disposeActivePreviewForTests,
  EDITOR_VIEW_TYPE,
  getActivePreviewForTests,
} from "./extensionApi";
import { runUntrusted as runMystDiagnostics } from "./mystDiagnostics.test";

async function waitForPreview(): Promise<void> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const preview = getActivePreviewForTests();
    if (preview?.phase === "ready" && preview.status === "success") {
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Timed out waiting for the untrusted preview to render.");
}

export async function run(): Promise<void> {
  assert.equal(vscode.workspace.isTrusted, false);
  try {
    const fixturePath = vscode.Uri.file(
      vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, "test/integration/fixtures/preview.md").fsPath,
    );
    const document = await vscode.workspace.openTextDocument(fixturePath);
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await vscode.commands.executeCommand(COMMAND_ID);
    await waitForPreview();
    const commandPreview = getActivePreviewForTests();
    assert.ok(commandPreview);
    assert.equal(commandPreview.readOnly, true);
    assert.doesNotMatch(commandPreview.html, /<button[^>]*data-sphinx-preview-edit-toggle/u);
    // A read-only preview does not store a palette mode (the page cannot post it; the host refuses).
    await sendPreviewMessageForTests({
      type: "previewPaletteModeChanged",
      documentId: commandPreview.documentUri,
      documentVersion: commandPreview.documentVersion,
      requestId: commandPreview.requestId,
      mode: "strict",
    });
    // A read-only preview never opens the image dialog.
    const windowApi = vscode.window as unknown as { showOpenDialog: typeof vscode.window.showOpenDialog };
    const originalDialog = windowApi.showOpenDialog;
    let dialogCalls = 0;
    windowApi.showOpenDialog = (async () => { dialogCalls += 1; return undefined; }) as typeof originalDialog;
    try {
      await sendPreviewMessageForTests({
        type: "previewPickImage",
        documentId: commandPreview.documentUri,
        documentVersion: commandPreview.documentVersion,
        requestId: commandPreview.requestId,
        editId: "untrusted-image",
      });
    } finally {
      windowApi.showOpenDialog = originalDialog;
    }
    assert.equal(dialogCalls, 0, "the untrusted preview must not open the image dialog");
    await vscode.commands.executeCommand("vscode.openWith", document.uri, EDITOR_VIEW_TYPE);
    await waitForPreview();
    const editorPreview = getActivePreviewForTests();
    assert.ok(editorPreview);
    assert.equal(editorPreview.readOnly, true);
    assert.match(editorPreview.html, /"initialPaletteMode":"myst"/u, "the refused message stored nothing");
    assert.doesNotMatch(editorPreview.html, /<button[^>]*data-sphinx-preview-edit-toggle/u);
    disposeActivePreviewForTests();
    await runMystDiagnostics();
  } finally {
    disposeActivePreviewForTests();
  }
}
