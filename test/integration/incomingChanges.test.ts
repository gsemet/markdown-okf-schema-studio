import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

import { COMMAND_ID, disposeActivePreviewForTests, getActivePreviewForTests } from "./extensionApi";

async function waitFor(description: string, predicate: () => boolean, timeoutMs = 20_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

/** An untracked file (new, never committed) gets no incoming-change message and no error. */
export async function run(): Promise<void> {
  assert.equal(vscode.workspace.isTrusted, true);
  const extensionRoot = path.resolve(__dirname, "../../..");
  const directory = fs.mkdtempSync(path.join(extensionRoot, "test", "integration", "fixtures", "incoming-"));
  const filePath = path.join(directory, "untracked.md");
  fs.writeFileSync(filePath, "# Untracked\n\nA paragraph.\n");
  const uri = vscode.Uri.file(filePath);
  try {
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(uri), vscode.ViewColumn.One);
    await vscode.commands.executeCommand(COMMAND_ID);
    await waitFor("the preview to be ready", () => {
      const preview = getActivePreviewForTests();
      return preview?.documentUri === uri.toString() && preview.phase === "ready" && preview.webviewReady;
    });
    // Longer than the 300 ms debounce, so a message would have been posted by now.
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    const edit = new vscode.WorkspaceEdit();
    edit.insert(uri, new vscode.Position(2, 0), "Typed text.\n\n");
    assert.equal(await vscode.workspace.applyEdit(edit), true);
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    assert.equal(getActivePreviewForTests()?.incomingChanges.posts, 0);
  } finally {
    disposeActivePreviewForTests();
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
