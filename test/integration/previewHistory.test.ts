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

function context(): { documentId: string; documentVersion: number; requestId: number } {
  const preview = getActivePreviewForTests();
  assert.ok(preview && preview.requestId !== undefined && preview.documentVersion !== undefined);
  return { documentId: preview.documentUri, documentVersion: preview.documentVersion, requestId: preview.requestId };
}

async function waitForReady(uri: vscode.Uri): Promise<void> {
  await waitFor(`the preview of ${path.basename(uri.fsPath)} to be ready`, () => {
    const preview = getActivePreviewForTests();
    return preview?.documentUri === uri.toString() && preview.phase === "ready" && preview.webviewReady;
  });
}

function historyOf(): NonNullable<ReturnType<typeof getActivePreviewForTests>>["history"] {
  const preview = getActivePreviewForTests();
  assert.ok(preview);
  return preview.history;
}

export async function run(): Promise<void> {
  assert.equal(vscode.workspace.isTrusted, true);
  const extensionRoot = path.resolve(__dirname, "../../..");
  const directory = fs.mkdtempSync(path.join(extensionRoot, "test", "integration", "fixtures", "history-"));
  const firstPath = path.join(directory, "first.md");
  const secondPath = path.join(directory, "second.md");
  fs.writeFileSync(firstPath, "# First\n\nGo to [second](second.md#target).\n\nBlocked [x](javascript:alert(1)).\n");
  fs.writeFileSync(secondPath, "# Second\n\nBack to [section](#target).\n\n## Target\n\nText.\n\n(note-label)=\nA labelled paragraph.\n");
  const firstUri = vscode.Uri.file(firstPath);
  const secondUri = vscode.Uri.file(secondPath);
  const env = vscode.env as unknown as { openExternal: (uri: vscode.Uri) => Thenable<boolean> };
  const originalOpenExternal = env.openExternal;
  const externalCalls: string[] = [];
  let externalStubbed = true;
  try {
    env.openExternal = async (uri) => { externalCalls.push(uri.toString()); return true; };
  } catch {
    externalStubbed = false;
  }
  try {
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(firstUri), vscode.ViewColumn.One);
    await vscode.commands.executeCommand(COMMAND_ID);
    await waitForReady(firstUri);

    // A fresh panel has nowhere to go.
    await waitFor("the first history state", () => getActivePreviewForTests()?.history.posted !== undefined);
    assert.deepEqual(historyOf().posted, { canBack: false, canForward: false });

    // The reader sits on line 3 (where the link is) when the link is followed.
    void sendPreviewMessageForTests({
      type: "previewState", ...context(), anchorLine: 3, line: 3, scrollTop: 0, editMode: false,
    });
    // Follow a link to the second document: it opens at the fragment, Back becomes possible.
    void sendPreviewMessageForTests({ type: "previewLink", ...context(), request: "second.md#target" });
    await waitFor("the second document to open", () =>
      vscode.window.activeTextEditor?.document.uri.fsPath === secondPath);
    await waitForReady(secondUri);
    await waitFor("Back to be enabled", () => getActivePreviewForTests()?.history.posted?.canBack === true);
    assert.deepEqual(historyOf().posted, { canBack: true, canForward: false });
    assert.equal(historyOf().entries.length, 2);
    assert.equal(historyOf().entries[1].uri, secondUri.toString());
    assert.equal(historyOf().entries[1].line, 5);

    // Back returns to the first document at the place of the link; Next goes forward again.
    void sendPreviewMessageForTests({ type: "previewHistoryGo", ...context(), direction: "back" });
    await waitFor("Back to open the first document", () =>
      vscode.window.activeTextEditor?.document.uri.fsPath === firstPath
      && vscode.window.activeTextEditor.selection.active.line === 2);
    await waitForReady(firstUri);
    await waitFor("Next to be enabled", () => getActivePreviewForTests()?.history.posted?.canForward === true);
    assert.deepEqual(historyOf().posted, { canBack: false, canForward: true });
    void sendPreviewMessageForTests({ type: "previewHistoryGo", ...context(), direction: "forward" });
    await waitFor("Next to open the second document", () =>
      vscode.window.activeTextEditor?.document.uri.fsPath === secondPath);
    // The hidden page reported line 1 for the second document before Back left it.
    assert.equal(historyOf().entries[1].line, 1);
    await waitFor("the reader's line to be restored", () =>
      vscode.window.activeTextEditor?.selection.active.line === 0);
    await waitForReady(secondUri);
    await waitFor("the end of the history", () => getActivePreviewForTests()?.history.posted?.canForward === false);
    assert.deepEqual(historyOf().posted, { canBack: true, canForward: false });

    // The reader sits on line 1 when the in-page anchor is followed.
    void sendPreviewMessageForTests({
      type: "previewState", ...context(), anchorLine: 1, line: 1, scrollTop: 0, editMode: false,
    });
    // An in-page anchor is recorded; Back restores the previous line in the same document.
    const before = historyOf().entries.length;
    void sendPreviewMessageForTests({ type: "previewLink", ...context(), request: "#target" });
    await waitFor("the anchor jump to be recorded", () => historyOf().entries.length === before + 1);
    assert.equal(historyOf().entries.at(-1)?.uri, secondUri.toString());
    assert.equal(historyOf().entries.at(-1)?.line, 5);
    void sendPreviewMessageForTests({ type: "previewHistoryGo", ...context(), direction: "back" });
    await waitFor("Back to restore the line", () => getActivePreviewForTests()?.lastSourceScrollLine !== undefined
      && historyOf().index === before - 1);
    assert.equal(getActivePreviewForTests()?.lastSourceScrollLine, 1);
    assert.equal(historyOf().entries[historyOf().index].uri, secondUri.toString());

    // A `(label)=` anchor is a target like a heading: the jump is recorded at the label line.
    const labelIndex = historyOf().index;
    void sendPreviewMessageForTests({ type: "previewLink", ...context(), request: "#note-label" });
    await waitFor("the label jump to be recorded", () => historyOf().index === labelIndex + 1);
    assert.equal(historyOf().entries[labelIndex + 1].line, 9);
    void sendPreviewMessageForTests({ type: "previewHistoryGo", ...context(), direction: "back" });
    await waitFor("Back to leave the label jump", () => historyOf().index === labelIndex);

    // Back while a block editor is open (CR 025, decision 5): the page posts the final save of the
    // typed text, then Back. The text is saved, the editor is closed, the history moves one step.
    const editBase = { ...context(), editId: "history-open-edit", line: 3, endLine: 3, insertAfterLine: 3 };
    await sendPreviewMessageForTests({ type: "previewEditOpen", ...editBase });
    const secondDocument = vscode.window.activeTextEditor!.document;
    const secondText = secondDocument.getText();
    await sendPreviewMessageForTests({
      type: "previewEditSave", ...editBase, originalText: "", editedText: "Temporary block", final: false,
    });
    await waitFor("the temporary block to reach the document", () => secondDocument.getText() !== secondText);
    assert.equal(getActivePreviewForTests()?.blockEditOpen, true, "the block editor should be open");
    const openIndex = historyOf().index;
    // Typed after the last autosave: only the final save carries it.
    void sendPreviewMessageForTests({
      type: "previewEditSave", ...editBase, originalText: "", editedText: "Temporary block typed last", final: true,
    });
    void sendPreviewMessageForTests({ type: "previewHistoryGo", ...context(), direction: "back" });
    await waitFor("Back to open the first document", () =>
      vscode.window.activeTextEditor?.document.uri.fsPath === firstPath);
    assert.equal(historyOf().index, openIndex - 1, "Back should move the history by exactly one step");
    assert.ok(secondDocument.getText().includes("Temporary block typed last"),
      "the text typed in the block editor was lost by Back");
    assert.equal(getActivePreviewForTests()?.blockEditOpen, false, "the block editor stayed open after Back");
    await waitForReady(firstUri);
    // Forward comes back to the second document; the editor is not reopened. Restore its text.
    void sendPreviewMessageForTests({ type: "previewHistoryGo", ...context(), direction: "forward" });
    await waitFor("Next to open the second document", () =>
      vscode.window.activeTextEditor?.document.uri.fsPath === secondPath);
    await waitForReady(secondUri);
    assert.equal(historyOf().index, openIndex);
    assert.equal(getActivePreviewForTests()?.blockEditOpen, false);
    const restore = new vscode.WorkspaceEdit();
    restore.replace(secondUri, new vscode.Range(0, 0, secondDocument.lineCount, 0), secondText);
    await vscode.workspace.applyEdit(restore);
    await waitFor("the second document to be restored", () => secondDocument.getText() === secondText);
    await waitForReady(secondUri);

    // Blocked and external links are not recorded.
    const count = historyOf().entries.length;
    const index = historyOf().index;
    void sendPreviewMessageForTests({ type: "previewLink", ...context(), request: "javascript:alert(1)" });
    if (externalStubbed) {
      void sendPreviewMessageForTests({ type: "previewLink", ...context(), request: "https://example.invalid/page" });
      await waitFor("the external link to be handed to the system", () => externalCalls.length === 1);
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    assert.equal(historyOf().entries.length, count);
    assert.equal(historyOf().index, index);
  } finally {
    try {
      env.openExternal = originalOpenExternal;
    } catch {
      // The stub could not be installed either.
    }
    disposeActivePreviewForTests();
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
