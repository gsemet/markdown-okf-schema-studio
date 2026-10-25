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

const ORIGINAL = [
  "---", "title: Clip", "---", "", "# Title", "", "First paragraph.", "", "- item a", "- item b", "",
  "```{include} other.md", "```", "", "Last paragraph.", "",
].join("\n");

/** Sends a block clipboard message the way the page does, for the preview that is current now. */
function sender(document: vscode.TextDocument, documentUri: string) {
  return (fields: Record<string, unknown>, version: number = document.version) => sendPreviewMessageForTests({
    documentId: documentUri,
    revision: version,
    requestId: getActivePreviewForTests()?.requestId,
    pinViewportTop: 200,
    ...fields,
  });
}

/** A message sent while the preview still renders the previous text is dropped as stale: retry. */
async function untilApplied(document: vscode.TextDocument, send: () => Thenable<void> | undefined): Promise<void> {
  const before = document.getText();
  for (let attempt = 0; attempt < 20 && document.getText() === before; attempt += 1) {
    await send();
    if (document.getText() === before) await new Promise<void>((resolve) => setTimeout(resolve, 250));
  }
}

async function withFixture(
  name: string,
  body: (document: vscode.TextDocument, send: ReturnType<typeof sender>) => Promise<void>,
): Promise<void> {
  assert.equal(vscode.workspace.isTrusted, true);
  const extensionRoot = path.resolve(__dirname, "../../..");
  const directory = fs.mkdtempSync(path.join(extensionRoot, "test", "integration", "fixtures", `${name}-`));
  const sourcePath = path.join(directory, "blocks.md");
  fs.writeFileSync(sourcePath, ORIGINAL);
  const savedClipboard = await vscode.env.clipboard.readText();
  try {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(sourcePath));
    const preview = await openPreview(document);
    await body(document, sender(document, preview.documentUri));
  } finally {
    await vscode.env.clipboard.writeText(savedClipboard);
    disposeActivePreviewForTests();
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

// @tests_req StRS-MDOKFSTUDIO-BLOCK-025
// @tests_req StRS-MDOKFSTUDIO-BLOCK-016
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-166
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-174
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-127
// @tests_req SwRS-MDOKFSTUDIO-TRUST-065
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-124
/** Copy, cut and paste of blocks as Markdown, and every unsafe request refused. */
export async function run(): Promise<void> {
  await withFixture("block-clipboard", async (document, send) => {
    const sentinel = "sentinel text";
    await vscode.env.clipboard.writeText(sentinel);

    // Refused: stale version, the frontmatter, an include directive, a blank line, bad bounds.
    await send({ type: "previewBlocksCopy", line: 7, endLine: 10 }, document.version - 1);
    await send({ type: "previewBlocksCopy", line: 1, endLine: 3 });
    await send({ type: "previewBlocksCopy", line: 12, endLine: 13 });
    await send({ type: "previewBlocksCut", line: 5, endLine: 12 });
    await send({ type: "previewBlocksCut", line: 8, endLine: 8 });
    await send({ type: "previewBlocksCut", line: 15, endLine: 99 });
    await send({ type: "previewBlocksCut", line: 2, endLine: 2 });
    await send({ type: "previewBlocksPaste", insertAfterLine: 2 });
    await send({ type: "previewBlocksPaste", insertAfterLine: 12 });
    assert.equal(document.getText(), ORIGINAL, "a refused request edited the document");
    assert.equal(await vscode.env.clipboard.readText(), sentinel, "a refused request wrote the clipboard");

    // Copy: the exact Markdown of the lines, nothing edited.
    await send({ type: "previewBlocksCopy", line: 7, endLine: 10 });
    assert.equal(await vscode.env.clipboard.readText(), "First paragraph.\n\n- item a\n- item b");
    assert.equal(document.getText(), ORIGINAL);

    // Cut the list: it goes with one blank separator and lands on the clipboard.
    const cutText = ORIGINAL.replace("- item a\n- item b\n\n", "");
    assert.notEqual(cutText, ORIGINAL);
    await untilApplied(document, () => send({ type: "previewBlocksCut", line: 9, endLine: 10 }));
    assert.equal(document.getText(), cutText);
    assert.equal(await vscode.env.clipboard.readText(), "- item a\n- item b");
    assert.doesNotMatch(document.getText(), /\n\n\n/u, "a cut never leaves two blank lines in a row");

    // Paste it back after the first paragraph: the original text, exactly.
    await untilApplied(document, () => send({ type: "previewBlocksPaste", insertAfterLine: 7, pinLine: 7 }));
    assert.equal(document.getText(), ORIGINAL, "cut then paste should restore the document");

    // An empty clipboard pastes nothing.
    await vscode.env.clipboard.writeText("  \n");
    await send({ type: "previewBlocksPaste", insertAfterLine: 7 });
    assert.equal(document.getText(), ORIGINAL);

    // Paste at the start of the body and cut of the last block.
    await vscode.env.clipboard.writeText("\n\nIntro.\n\n");
    await untilApplied(document, () => send({ type: "previewBlocksPaste", insertAfterLine: 0 }));
    assert.equal(document.getText(), ORIGINAL.replace("---\n\n# Title", "---\n\nIntro.\n\n# Title"));
    await untilApplied(document, () => send({ type: "previewBlocksCut", line: 17, endLine: 17 }));
    assert.ok(document.getText().endsWith("```\n"), "the last block and its separator are gone");
    assert.doesNotMatch(document.getText(), /Last paragraph/u);
  });
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-058
/** One cut is one undo step, one paste is one undo step. Needs a real keyboard-free undo command. */
export async function runUndo(): Promise<void> {
  await withFixture("block-clipboard-undo", async (document, send) => {
    const cutText = ORIGINAL.replace("- item a\n- item b\n\n", "");
    await untilApplied(document, () => send({ type: "previewBlocksCut", line: 9, endLine: 10 }));
    assert.equal(document.getText(), cutText);
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await vscode.commands.executeCommand("undo");
    assert.equal(document.getText(), ORIGINAL, "one undo should restore the cut blocks");

    await untilApplied(document, () => send({ type: "previewBlocksCut", line: 9, endLine: 10 }));
    assert.equal(document.getText(), cutText);
    await untilApplied(document, () => send({ type: "previewBlocksPaste", insertAfterLine: 7, pinLine: 7 }));
    assert.equal(document.getText(), ORIGINAL);
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await vscode.commands.executeCommand("undo");
    assert.equal(document.getText(), cutText, "one undo should remove the pasted blocks only");
  });
}

// @tests_req SwRS-MDOKFSTUDIO-TRUST-005
/** An untrusted (read-only) preview neither edits the document nor touches the clipboard. */
export async function runUntrusted(
  preview: { documentUri: string; documentVersion?: number; requestId?: number },
  document: vscode.TextDocument,
): Promise<void> {
  const before = document.getText();
  const savedClipboard = await vscode.env.clipboard.readText();
  const sentinel = "untrusted sentinel";
  await vscode.env.clipboard.writeText(sentinel);
  try {
    const base = {
      documentId: preview.documentUri,
      revision: preview.documentVersion,
      requestId: preview.requestId,
    };
    await sendPreviewMessageForTests({ ...base, type: "previewBlocksCopy", line: 1, endLine: 1 });
    await sendPreviewMessageForTests({ ...base, type: "previewBlocksCut", line: 1, endLine: 1, pinViewportTop: 10 });
    await sendPreviewMessageForTests({ ...base, type: "previewBlocksPaste", insertAfterLine: 1 });
    assert.equal(document.getText(), before, "a read-only preview must not cut or paste");
    assert.equal(await vscode.env.clipboard.readText(), sentinel, "a read-only preview must not copy");
  } finally {
    await vscode.env.clipboard.writeText(savedClipboard);
  }
}
