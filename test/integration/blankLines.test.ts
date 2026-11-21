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

const LINES = ["# Title", "", "A", "", "", "", "B", ""];

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
  const sourcePath = path.join(directory, "blank.md");
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
 * A blank run written in place and removed on a real file in LF and CRLF: the run takes one block
 * with one blank line on each side, a delete keeps one blank line, the line endings stay, one undo
 * brings the run back.
 */
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-268
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-269
export async function run(): Promise<void> {
  for (const [name, eol] of [["lf", "\n"], ["crlf", "\r\n"]] as const) {
    const original = LINES.join(eol);
    const run = { line: 4, endLine: 6 };

    await withFixture(`blank-lines-write-${name}`, eol, async (document, send) => {
      await untilApplied(document, () => send({
        type: "previewEditSave", editId: "e1", line: 4, endLine: 6, insertAfterLine: 3, replaceBlankRun: run,
        originalText: "", editedText: "X", final: false,
      }));
      assert.equal(document.getText(), ["# Title", "", "A", "", "X", "", "B", ""].join(eol), `${name}: block in place`);
      if (name === "crlf") assert.equal(/(?<!\r)\n/u.test(document.getText()), false, "no bare LF in a CRLF file");
      await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
      await vscode.commands.executeCommand("undo");
      assert.equal(document.getText(), original, `${name}: one undo brings the run back`);
    });

    await withFixture(`blank-lines-delete-${name}`, eol, async (document, send) => {
      await untilApplied(document, () => send({ type: "previewBlankRunDelete", line: 4, endLine: 6 }));
      assert.equal(document.getText(), ["# Title", "", "A", "", "B", ""].join(eol), `${name}: one blank line kept`);
      if (name === "crlf") assert.equal(/(?<!\r)\n/u.test(document.getText()), false, "no bare LF in a CRLF file");
      await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
      await vscode.commands.executeCommand("undo");
      assert.equal(document.getText(), original, `${name}: one undo brings the run back`);
    });
  }
}
