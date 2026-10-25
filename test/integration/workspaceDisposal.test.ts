import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

import {
  COMMAND_ID,
  disposeActivePreviewForTests,
  getActivePreviewForTests,
} from "./extensionApi";

async function waitFor(
  description: string,
  predicate: () => boolean,
  timeoutMs = 20_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

// @tests_req StRS-MDOKFSTUDIO-LIFE-014
export async function run(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(workspaceFolder);
  const extensionRoot = path.resolve(__dirname, "../../..");
  const fixturePath = path.join(extensionRoot, "test", "integration", "fixtures", "preview.md");
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(fixturePath));

  await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
  await vscode.commands.executeCommand(COMMAND_ID);
  await waitFor("the workspace-disposal render", () => {
    const preview = getActivePreviewForTests();
    return preview?.phase === "ready" && preview.status === "success";
  });

  const outputDirectory = getActivePreviewForTests()?.outputDirectory;
  assert.ok(outputDirectory);
  assert.equal(outputDirectory, path.dirname(fixturePath));
  const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
  assert.ok(workspaceFolders.length >= 2, "workspace disposal requires a multi-root host");
  const activeFolderIndex = workspaceFolders.findIndex(
    (folder) => folder.uri.toString() === workspaceFolder.uri.toString(),
  );
  assert.ok(activeFolderIndex >= 0);
  assert.equal(
    vscode.workspace.updateWorkspaceFolders(activeFolderIndex, 1),
    true,
    "the extension-host workspace folder could not be removed",
  );
  // @tests_req SwRS-MDOKFSTUDIO-LIFE-143
  await waitFor("preview disposal after workspace removal", () => getActivePreviewForTests() === undefined);
  assert.equal(outputDirectory, path.dirname(fixturePath));
  assert.equal(fs.existsSync(outputDirectory), true, "workspace removal deleted the source directory");

  disposeActivePreviewForTests();
}
