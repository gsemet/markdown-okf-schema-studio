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
import { runUndo as runBlockClipboardUndo } from "./blockClipboard.test";

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

/** Moving a block from the insert bar: one swap, one undo, and every unsafe request refused. */
export async function run(): Promise<void> {
  assert.equal(vscode.workspace.isTrusted, true);
  const extensionRoot = path.resolve(__dirname, "../../..");
  const directory = fs.mkdtempSync(path.join(extensionRoot, "test", "integration", "fixtures", "block-move-"));
  const sourcePath = path.join(directory, "blocks.md");
  const original = [
    "---", "title: Moves", "---", "", "# Title", "", "First paragraph.", "", "- item a", "- item b", "",
    "<!-- a comment -->", "", "Last paragraph.", "", "```{include} other.md", "```", "", "Tail.", "",
  ].join("\n");
  fs.writeFileSync(sourcePath, original);
  try {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(sourcePath));
    const preview = await openPreview(document);
    const move = (
      line: number, endLine: number, neighbourLine: number, neighbourEndLine: number,
      direction: "up" | "down", version: number = document.version,
    ) => sendPreviewMessageForTests({
      type: "previewBlockMove",
      documentId: preview.documentUri,
      documentVersion: version,
      requestId: getActivePreviewForTests()?.requestId ?? preview.requestId,
      line, endLine, neighbourLine, neighbourEndLine, direction, pinViewportTop: 200,
    });

    // A move sent while the preview still renders the previous text is dropped as stale; the
    // caller sends it again until the document changes (a refused move never changes it).
    const moveUntilApplied = async (...args: Parameters<typeof move>): Promise<void> => {
      const before = document.getText();
      for (let attempt = 0; attempt < 20 && document.getText() === before; attempt += 1) {
        await move(...args);
        if (document.getText() === before) await new Promise<void>((resolve) => setTimeout(resolve, 250));
      }
    };

    // Refused: a stale version, ranges that overlap or are unordered, the frontmatter, text
    // between the blocks (the comment), and a block that opens an include directive.
    await move(7, 7, 9, 10, "down", document.version - 1);
    await move(7, 7, 7, 7, "down");
    await move(9, 10, 7, 7, "down");
    await move(1, 3, 5, 5, "down");
    await move(9, 10, 14, 14, "down");
    await move(14, 14, 16, 17, "down");
    await move(19, 19, 16, 17, "up");
    assert.equal(document.getText(), original, "a refused move edited the document");

    // The paragraph and the list swap: only those lines change.
    await move(7, 7, 9, 10, "down");
    const swapped = original.replace("First paragraph.\n\n- item a\n- item b\n", "- item a\n- item b\n\nFirst paragraph.\n");
    assert.notEqual(swapped, original);
    assert.equal(document.getText(), swapped);

    // Moving the paragraph up from its new place is the exact inverse.
    await moveUntilApplied(10, 10, 7, 8, "up");
    assert.equal(document.getText(), original, "down then up should restore the document");

    // One move is one undo step.
    await moveUntilApplied(7, 7, 9, 10, "down");
    assert.equal(document.getText(), swapped);
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await vscode.commands.executeCommand("undo");
    assert.equal(document.getText(), original, "one undo should restore the blocks");
  } finally {
    disposeActivePreviewForTests();
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    fs.rmSync(directory, { recursive: true, force: true });
  }
  // The undo checks live here: the locked-screen gate skips this whole suite.
  await runUndo();
  await runBlockClipboardUndo();
}

/** Moving a selection of blocks (T41): the whole span moves, and one undo restores the order. */
export async function runUndo(): Promise<void> {
  const extensionRoot = path.resolve(__dirname, "../../..");
  const directory = fs.mkdtempSync(path.join(extensionRoot, "test", "integration", "fixtures", "block-move-span-"));
  const sourcePath = path.join(directory, "span.md");
  const original = ["# Span", "", "One.", "", "Two.", "", "- three a", "- three b", "", "Four.", ""].join("\n");
  fs.writeFileSync(sourcePath, original);
  try {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(sourcePath));
    const preview = await openPreview(document);
    // "One." and "Two." (lines 3-5) move below the list (lines 7-8), as Alt+Down does.
    const before = document.getText();
    for (let attempt = 0; attempt < 20 && document.getText() === before; attempt += 1) {
      await sendPreviewMessageForTests({
        type: "previewBlockMove",
        documentId: preview.documentUri,
        documentVersion: document.version,
        requestId: getActivePreviewForTests()?.requestId ?? preview.requestId,
        line: 3, endLine: 5, neighbourLine: 7, neighbourEndLine: 8, direction: "down", pinViewportTop: 200,
      });
      if (document.getText() === before) await new Promise<void>((resolve) => setTimeout(resolve, 250));
    }
    const moved = ["# Span", "", "- three a", "- three b", "", "One.", "", "Two.", "", "Four.", ""].join("\n");
    assert.equal(document.getText(), moved, "the whole span moves past the list");
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await vscode.commands.executeCommand("undo");
    assert.equal(document.getText(), original, "one undo should restore the original order");
  } finally {
    disposeActivePreviewForTests();
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

/** An untrusted (read-only) preview never moves a block. */
export async function runUntrusted(preview: { documentUri: string; documentVersion?: number; requestId?: number }, document: vscode.TextDocument): Promise<void> {
  const before = document.getText();
  await sendPreviewMessageForTests({
    type: "previewBlockMove",
    documentId: preview.documentUri,
    documentVersion: preview.documentVersion,
    requestId: preview.requestId,
    line: 1, endLine: 1, neighbourLine: 3, neighbourEndLine: 3, direction: "down", pinViewportTop: 10,
  });
  assert.equal(document.getText(), before, "a read-only preview must not move a block");
}
