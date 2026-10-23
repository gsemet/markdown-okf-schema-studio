import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as vscode from "vscode";

import {
  COMMAND_ID,
  disposeActivePreviewForTests,
  getActivePreviewForTests,
  getActivePreviewPanelForTests,
  sendPreviewMessageForTests,
} from "./extensionApi";

type OpenDialog = typeof vscode.window.showOpenDialog;

async function waitFor(description: string, predicate: () => boolean, timeoutMs = 20_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

/** The image button's native dialog: relative path of the pick, refusals, cancel (dialog stubbed). */
export async function run(): Promise<void> {
  assert.equal(vscode.workspace.isTrusted, true);
  const extensionRoot = path.resolve(__dirname, "../../..");
  const directory = fs.mkdtempSync(path.join(extensionRoot, "test", "integration", "fixtures", "image-picker-"));
  // The test workspace also holds /tmp (os.tmpdir() on Linux): use a parent that no workspace
  // folder contains, so the pick really is outside the workspace.
  const outsideParent = [os.tmpdir(), os.homedir()].find((candidate) =>
    !vscode.workspace.getWorkspaceFolder(vscode.Uri.file(path.join(candidate, "probe.png")))) ?? os.homedir();
  const outside = fs.mkdtempSync(path.join(outsideParent, "image-picker-outside-"));
  assert.equal(vscode.workspace.getWorkspaceFolder(vscode.Uri.file(outside)), undefined,
    "the outside folder is in no workspace folder");
  const sourcePath = path.join(directory, "chapter.md");
  fs.writeFileSync(sourcePath, "# Chapter\n\nText.\n");
  fs.mkdirSync(path.join(directory, "my pics"));
  fs.writeFileSync(path.join(directory, "my pics", "a (1).png"), "x");
  fs.writeFileSync(path.join(directory, "notes.txt"), "x");
  fs.writeFileSync(path.join(outside, "far.png"), "x");
  const windowApi = vscode.window as unknown as { showOpenDialog: OpenDialog };
  const originalDialog = windowApi.showOpenDialog;
  try {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(sourcePath));
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await vscode.commands.executeCommand(COMMAND_ID);
    await waitFor("the preview to be ready", () => {
      const preview = getActivePreviewForTests();
      return preview?.documentUri === document.uri.toString() && preview.phase === "ready"
        && preview.webviewReady && preview.documentVersion === document.version;
    });
    const preview = getActivePreviewForTests()!;
    const webview = getActivePreviewPanelForTests()!.webview;
    const posted: Array<Record<string, unknown>> = [];
    const originalPost = webview.postMessage.bind(webview);
    webview.postMessage = (message: unknown) => {
      posted.push(message as Record<string, unknown>);
      return originalPost(message);
    };
    let dialogCalls = 0;
    let lastOptions: vscode.OpenDialogOptions | undefined;
    const pick = async (file: string | undefined, editId: string, version = document.version) => {
      windowApi.showOpenDialog = (async (options?: vscode.OpenDialogOptions) => {
        dialogCalls += 1;
        lastOptions = options;
        return file === undefined ? undefined : [vscode.Uri.file(file)];
      }) as OpenDialog;
      await sendPreviewMessageForTests({
        type: "previewPickImage",
        documentId: preview.documentUri,
        revision: version,
        requestId: preview.requestId,
        editId,
      });
      return posted.filter((message) => message.type === "previewPickImageResult" && message.editId === editId).at(-1);
    };

    const inside = await pick(path.join(directory, "my pics", "a (1).png"), "img-1");
    assert.equal(inside?.ok, true);
    assert.equal(inside?.path, "my pics/a (1).png");
    assert.equal(lastOptions?.defaultUri?.fsPath, directory, "the dialog opens in the document folder");
    assert.deepEqual(lastOptions?.filters?.Images?.includes("png"), true);
    assert.equal(document.getText(), "# Chapter\n\nText.\n", "picking edits nothing");

    const cancelled = await pick(undefined, "img-2");
    assert.equal(cancelled?.cancelled, true);

    const far = await pick(path.join(outside, "far.png"), "img-3");
    assert.equal(far?.ok, false, "a file outside the workspace is refused");
    assert.equal(typeof far?.reason, "string");

    const notImage = await pick(path.join(directory, "notes.txt"), "img-4");
    assert.equal(notImage?.ok, false, "a file that is not an image is refused");

    const callsBefore = dialogCalls;
    const stale = await pick(path.join(directory, "my pics", "a (1).png"), "img-5", document.version + 5);
    assert.notEqual(stale?.ok, true, "a stale preview is refused (answered with a refusal or dropped)");
    assert.equal(dialogCalls, callsBefore, "and the dialog is not even opened");
  } finally {
    windowApi.showOpenDialog = originalDialog;
    disposeActivePreviewForTests();
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    fs.rmSync(directory, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
}
