import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

import {
  COMMAND_ID,
  disposeActivePreviewForTests,
  getActivePreviewForTests,
  getActivePreviewPanelForTests,
  sendPreviewMessageForTests,
} from "./extensionApi";

/** A 1x1 transparent PNG. */
const PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

async function waitFor(description: string, predicate: () => boolean, timeoutMs = 20_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

// @tests_req StRS-MDOKFSTUDIO-PALETTE-018
// @tests_req SwRS-MDOKFSTUDIO-TRUST-090
// @tests_req SwRS-MDOKFSTUDIO-PALETTE-196
// @tests_req SwRS-MDOKFSTUDIO-TRUST-005
/** Pasting an image: written next to the document, numbered names, refusals. Files are removed. */
export async function run(): Promise<void> {
  assert.equal(vscode.workspace.isTrusted, true);
  const extensionRoot = path.resolve(__dirname, "../../..");
  const directory = fs.mkdtempSync(path.join(extensionRoot, "test", "integration", "fixtures", "image-paste-"));
  const sourcePath = path.join(directory, "chapter.md");
  fs.writeFileSync(sourcePath, "# Chapter\n\nText.\n");
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
    let counter = 0;
    const paste = async (mime: string, dataBase64: string) => {
      counter += 1;
      const editId = `paste-${counter}`;
      await sendPreviewMessageForTests({
        type: "previewPasteImage",
        documentId: preview.documentUri,
        revision: document.version,
        requestId: preview.requestId,
        editId,
        mime,
        dataBase64,
      });
      return posted.filter((message) => message.type === "previewPasteImageResult" && message.editId === editId).at(-1);
    };
    const images = () => fs.readdirSync(directory).filter((name) => name !== "chapter.md");

    await sendPreviewMessageForTests({
      type: "previewEditOpen",
      documentId: preview.documentUri,
      revision: document.version,
      requestId: preview.requestId,
      editId: "paste-edit",
      line: 3,
      endLine: 3,
    });

    const first = await paste("image/png", PNG_BASE64);
    assert.equal(first?.ok, true, String(first?.reason));
    assert.equal(first?.fileName, "image.png");
    assert.deepEqual(fs.readFileSync(path.join(directory, "image.png")), Buffer.from(PNG_BASE64, "base64"));

    const second = await paste("image/png", PNG_BASE64);
    assert.equal(second?.fileName, "image-1.png", "the second paste does not overwrite the first");
    assert.deepEqual(images().sort(), ["image-1.png", "image.png"]);

    const spoofed = await paste("image/jpeg", PNG_BASE64);
    assert.equal(spoofed?.ok, false, "bytes that do not match the announced type are refused");
    const notAnImage = await paste("image/png", Buffer.from("<svg onload=alert(1)/>").toString("base64"));
    assert.equal(notAnImage?.ok, false, "bytes that are not an image are refused");
    assert.deepEqual(images().sort(), ["image-1.png", "image.png"], "refusals write nothing");
    assert.equal(document.getText(), "# Chapter\n\nText.\n", "pasting edits nothing by itself");
  } finally {
    disposeActivePreviewForTests();
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
