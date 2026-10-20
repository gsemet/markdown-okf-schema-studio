import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

import {
  COMMAND_ID,
  disposeActivePreviewForTests,
  getActivePreviewForTests,
  sendPreviewMessageForTests,
} from "./extensionApi";

async function waitFor(description: string, predicate: () => boolean, timeoutMs = 20_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

async function openPreview(document: vscode.TextDocument): Promise<NonNullable<ReturnType<typeof getActivePreviewForTests>>> {
  await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
  await vscode.commands.executeCommand(COMMAND_ID);
  await waitFor("the preview to be ready", () => {
    const preview = getActivePreviewForTests();
    return preview?.documentUri === document.uri.toString() && preview.phase === "ready"
      && preview.webviewReady && preview.documentVersion === document.version;
  });
  const preview = getActivePreviewForTests();
  assert.ok(preview);
  return preview;
}

/** Renaming a label from its anchor icon: one edit of the label line, one undo, stale lines refused. */
export async function run(): Promise<void> {
  assert.equal(vscode.workspace.isTrusted, true);
  const extensionRoot = path.resolve(__dirname, "../../..");
  const directory = fs.mkdtempSync(path.join(extensionRoot, "test", "integration", "fixtures", "label-rename-"));
  const sourcePath = path.join(directory, "labels.md");
  const original = "# Labels\n\n(old-name)=\nA paragraph.\n\nSee {ref}`old-name` and {ref}`Title <old-name>`.\n";
  fs.writeFileSync(sourcePath, original);
  try {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(sourcePath));
    const preview = await openPreview(document);
    const rename = (line: number, oldName: string, newName: string) => sendPreviewMessageForTests({
      type: "previewLabelRename",
      documentId: preview.documentUri,
      documentVersion: document.version,
      requestId: preview.requestId,
      editId: "label-test",
      line, oldName, newName,
    });

    // A stale line (not the label) and an invalid name change nothing.
    await rename(2, "old-name", "new-name");
    await rename(3, "old-name", "bad name");
    await rename(3, "other", "new-name");
    assert.equal(document.getText(), original, "a refused rename edited the document");

    // The label line changes, nothing else, in one undo step.
    await rename(3, "old-name", "new-name");
    const renamed = original.replace("(old-name)=", "(new-name)=");
    assert.equal(document.getText(), renamed);
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await vscode.commands.executeCommand("undo");
    assert.equal(document.getText(), original, "one undo should restore the label");

    // A document that changed under the page: the old line no longer holds the label.
    await waitFor("the preview to follow the undo", () => getActivePreviewForTests()?.documentVersion === document.version);
    const shift = new vscode.WorkspaceEdit();
    shift.insert(document.uri, new vscode.Position(0, 0), "Inserted line\n\n");
    assert.equal(await vscode.workspace.applyEdit(shift), true);
    const shifted = document.getText();
    await waitFor("the preview to render the shifted document", () => getActivePreviewForTests()?.documentVersion === document.version);
    await sendPreviewMessageForTests({
      type: "previewLabelRename",
      documentId: preview.documentUri,
      documentVersion: document.version,
      requestId: getActivePreviewForTests()?.requestId,
      editId: "label-test-2",
      line: 3, oldName: "old-name", newName: "new-name",
    });
    assert.equal(document.getText(), shifted, "a stale line must be refused, not guessed");
  } finally {
    disposeActivePreviewForTests();
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
