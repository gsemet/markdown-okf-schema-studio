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

const THREAD = ["<!-- THREAD", "Ada (2026-10-16 10:47):", "  first message", "-->"];

function sourceOf(eol: string): string {
  return ["# Notes", "", "First paragraph.", "", ...THREAD, "", "Last paragraph.", ""].join(eol);
}

async function restore(document: vscode.TextDocument, text: string): Promise<void> {
  const edit = new vscode.WorkspaceEdit();
  edit.replace(document.uri, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), text);
  assert.equal(await vscode.workspace.applyEdit(edit), true);
  await waitFor("the preview to follow the restored text", () => getActivePreviewForTests()?.documentVersion === document.version);
}

/** Sends the request again until the document changes: the preview may still be catching up with a restore. */
async function sendUntilApplied(
  document: vscode.TextDocument,
  send: (type: string, fields: Record<string, unknown>) => Thenable<unknown> | undefined,
  type: string,
  fields: Record<string, unknown>,
): Promise<void> {
  const before = document.getText();
  for (let attempt = 0; attempt < 40 && document.getText() === before; attempt += 1) {
    await send(type, fields);
    if (document.getText() === before) await new Promise<void>((resolve) => setTimeout(resolve, 250));
  }
  assert.notEqual(document.getText(), before, `${type} was never applied`);
}

async function withThreadPreview(
  name: string,
  eol: string,
  body: (context: {
    document: vscode.TextDocument;
    original: string;
    send: (type: string, fields: Record<string, unknown>) => Thenable<unknown> | undefined;
  }) => Promise<void>,
): Promise<void> {
  const extensionRoot = path.resolve(__dirname, "../../..");
  const directory = fs.mkdtempSync(path.join(extensionRoot, "test", "integration", "fixtures", "inline-thread-"));
  const settings = vscode.workspace.getConfiguration("markdownOkfSchemaStudio.comments");
  const originalAuthor = settings.inspect<string>("authorName")?.globalValue;
  try {
    await settings.update("authorName", "Bob Reviewer", vscode.ConfigurationTarget.Global);
    const sourcePath = path.join(directory, `${name}.md`);
    const original = sourceOf(eol);
    fs.writeFileSync(sourcePath, original);
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(sourcePath));
    const preview = await openPreview(document);
    const send = (type: string, fields: Record<string, unknown>) => sendPreviewMessageForTests({
      type,
      documentId: preview.documentUri,
      revision: document.version,
      requestId: getActivePreviewForTests()?.requestId ?? preview.requestId,
      editId: "thread-test",
      ...fields,
    });
    await body({ document, original, send });
  } finally {
    await settings.update("authorName", originalAuthor, vscode.ConfigurationTarget.Global);
    disposeActivePreviewForTests();
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

// @tests_req StRS-MDOKFSTUDIO-REVIEW-015
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-058
// @tests_req SwRS-MDOKFSTUDIO-TRUST-090
// @tests_req SwRS-MDOKFSTUDIO-REVIEW-186
// @tests_req SwRS-MDOKFSTUDIO-REVIEW-192
/**
 * Inline comment threads: a reply appends one message above the closing marker with the configured
 * author and the local date, and changes nothing else (CRLF kept); Delete removes the thread and one
 * blank line; stale lines and non-threads are refused. The undo checks are in `runUndo`.
 */
export async function run(): Promise<void> {
  assert.equal(vscode.workspace.isTrusted, true);
  for (const eol of ["\n", "\r\n"]) {
    const label = eol === "\n" ? "LF" : "CRLF";
    await withThreadPreview(label.toLowerCase(), eol, async ({ document, original, send }) => {
      // Lines that are not exactly the thread change nothing.
      await send("previewThreadReply", { line: 3, endLine: 3, text: "nope" });
      await send("previewThreadReply", { line: 5, endLine: 7, text: "nope" });
      await send("previewThreadDelete", { line: 1, endLine: 4 });
      assert.equal(document.getText(), original, `${label}: a refused request edited the document`);

      // A reply: one message above the closing marker, the rest byte for byte.
      await send("previewThreadReply", { line: 5, endLine: 8, text: "second message\nof two lines" });
      const replied = document.getText();
      assert.match(
        replied,
        new RegExp(
          `Ada \\(2026-10-16 10:47\\):${eol}  first message${eol}`
          + `Bob Reviewer \\(\\d{4}-\\d\\d-\\d\\d \\d\\d:\\d\\d\\):${eol}  second message${eol}  of two lines${eol}-->${eol}`,
          "u",
        ),
        `${label}: the reply is appended above the closing marker`,
      );
      assert.equal(replied.split(eol === "\n" ? /\r\n/u : /(?<!\r)\n/u).length, 1, `${label}: the line ends are kept`);
      assert.ok(replied.startsWith(original.slice(0, original.indexOf("-->"))), `${label}: text before the marker unchanged`);
      assert.ok(replied.endsWith(`-->${eol}${eol}Last paragraph.${eol}`), `${label}: text after the thread unchanged`);

      // Delete: the thread and one blank line go.
      await restore(document, original);
      await sendUntilApplied(document, send, "previewThreadDelete", { line: 5, endLine: 8 });
      assert.equal(
        document.getText(),
        ["# Notes", "", "First paragraph.", "", "Last paragraph.", ""].join(eol),
        `${label}: the thread is deleted with one blank line`,
      );
    });
  }
  // The undo checks live here: the locked-screen gate skips this whole suite.
  await runUndo();
}

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-171
/** One reply and one delete are each one undo step in the source editor (needs a focused window). */
export async function runUndo(): Promise<void> {
  await withThreadPreview("undo", "\n", async ({ document, original, send }) => {
    await sendUntilApplied(document, send, "previewThreadReply", { line: 5, endLine: 8, text: "second message" });
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await vscode.commands.executeCommand("undo");
    assert.equal(document.getText(), original, "one undo should remove the reply");
    await waitFor("the preview to follow the undo", () => getActivePreviewForTests()?.documentVersion === document.version);
    await sendUntilApplied(document, send, "previewThreadDelete", { line: 5, endLine: 8 });
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await vscode.commands.executeCommand("undo");
    assert.equal(document.getText(), original, "one undo should restore the thread");
  });
}
