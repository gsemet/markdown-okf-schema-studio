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

const LINES = ["# Title", "", "First.", "", "Second paragraph.", ""];

/** Sends a page message the way the page does, for the preview that is current now. */
function sender(document: vscode.TextDocument, documentUri: string) {
  return (fields: Record<string, unknown>) => sendPreviewMessageForTests({
    documentId: documentUri,
    revision: document.version,
    requestId: getActivePreviewForTests()?.requestId,
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
  eol: string,
  body: (document: vscode.TextDocument, send: ReturnType<typeof sender>) => Promise<void>,
): Promise<void> {
  assert.equal(vscode.workspace.isTrusted, true);
  const extensionRoot = path.resolve(__dirname, "../../..");
  const directory = fs.mkdtempSync(path.join(extensionRoot, "test", "integration", "fixtures", `${name}-`));
  const sourcePath = path.join(directory, "blocks.md");
  fs.writeFileSync(sourcePath, LINES.join(eol));
  try {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(sourcePath));
    const preview = await openPreview(document);
    await body(document, sender(document, preview.documentUri));
  } finally {
    disposeActivePreviewForTests();
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

/**
 * An emptied block committed after an autosave, and Delete block, on a real file in LF and CRLF:
 * the block goes with one separator, the line endings stay, and one undo brings it back.
 */
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-264#S3
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-265#S4
export async function run(): Promise<void> {
  for (const [name, eol] of [["lf", "\n"], ["crlf", "\r\n"]] as const) {
    const original = LINES.join(eol);
    const expected = ["# Title", "", "Second paragraph.", ""].join(eol);
    const first = { editId: "e1", line: 3, endLine: 3, originalText: `First.${eol}` };
    // Only a final save may carry a pin, and it carries both fields (the page's pin of the edited element).
    const pin = { pinLine: 3, pinViewportTop: 200 };

    // Delete block: one edit, one undo, the line endings kept.
    await withFixture(`empty-blocks-delete-${name}`, eol, async (document, send) => {
      await untilApplied(document, () => send({ type: "previewBlocksDelete", line: 3, endLine: 3 }));
      assert.equal(document.getText(), expected, `${name}: Delete block`);
      await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
      await vscode.commands.executeCommand("undo");
      assert.equal(document.getText(), original, `${name}: one undo brings the block back`);
    });

    // An erased editor committed after its autosave: two edits, so two undos.
    await withFixture(`empty-blocks-emptied-${name}`, eol, async (document, send) => {
      // One open editor keeps the render identity it opened with, as the page does: the autosave
      // changes the document version, not the preview's.
      const identity = { revision: document.version, requestId: getActivePreviewForTests()?.requestId };
      await untilApplied(document, () => send({
        type: "previewEditSave", ...identity, ...first, editedText: "", final: false,
      }));
      assert.ok(!document.getText().includes("First."), `${name}: the autosave wrote the placeholder line`);
      await untilApplied(document, () => send({
        type: "previewEditSave", ...identity, ...first, editedText: "", final: true, deleteWhenEmpty: true, ...pin,
      }));
      assert.equal(document.getText(), expected, `${name}: the emptied block is gone with its separator`);
      assert.doesNotMatch(document.getText(), name === "lf" ? /\n\n\n/u : /\r\n\r\n\r\n/u);
      if (name === "crlf") assert.equal(/(?<!\r)\n/u.test(document.getText()), false, "no bare LF in a CRLF file");
      await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
      await vscode.commands.executeCommand("undo");
      await vscode.commands.executeCommand("undo");
      assert.equal(document.getText(), original, `${name}: two undos bring the block back`);
    });

    // An erased editor committed before any autosave: one edit, one undo.
    await withFixture(`empty-blocks-direct-${name}`, eol, async (document, send) => {
      await untilApplied(document, () => send({
        type: "previewEditSave", ...first, editedText: "", final: true, deleteWhenEmpty: true, ...pin,
      }));
      assert.equal(document.getText(), expected, `${name}: deleted at once`);
      await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
      await vscode.commands.executeCommand("undo");
      assert.equal(document.getText(), original, `${name}: one undo brings the block back`);
    });
  }
}
