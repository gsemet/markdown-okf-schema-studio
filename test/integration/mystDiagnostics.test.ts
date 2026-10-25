import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

import {
  COMMAND_ID,
  disposeActivePreviewForTests,
  getActivePreviewForTests,
} from "./extensionApi";

const fixtureDirectory = path.resolve(__dirname, "../../..", "test", "integration", "fixtures", "mystconf");
const confPath = path.join(fixtureDirectory, "conf.py");
const docPath = path.join(fixtureDirectory, "doc.md");

async function waitFor(description: string, predicate: () => boolean, timeoutMs = 20_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

function mystEntries(uri: vscode.Uri): vscode.Diagnostic[] {
  return vscode.languages.getDiagnostics(uri).filter((entry) => entry.code === "myst-extension");
}

function previewReady(): boolean {
  const preview = getActivePreviewForTests();
  return preview?.phase === "ready" && preview.status === "success";
}

// @tests_req SwRS-MDOKFSTUDIO-MYST-081
/** Without a preview there are no entries; in an untrusted workspace there never are. */
export async function runUntrusted(): Promise<void> {
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(docPath));
  await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
  await vscode.commands.executeCommand(COMMAND_ID);
  await waitFor("the untrusted render", previewReady);
  await new Promise<void>((resolve) => setTimeout(resolve, 500));
  assert.deepEqual(mystEntries(document.uri), [], "an untrusted workspace published diagnostics");
}

// @tests_req StRS-MDOKFSTUDIO-MYST-007
// @tests_req SwRS-MDOKFSTUDIO-MYST-078
export async function run(): Promise<void> {
  assert.equal(vscode.workspace.isTrusted, true);
  const originalConf = fs.readFileSync(confPath, "utf8");
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(docPath));
  const colonLine = document.getText().split("\n").findIndex((line) => line.startsWith(":::{note}"));
  assert.ok(colonLine >= 0);
  try {
    assert.deepEqual(mystEntries(document.uri), [], "entries exist before any preview");
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await vscode.commands.executeCommand(COMMAND_ID);
    await waitFor("the first render", previewReady);
    await waitFor("the colon_fence entry", () => mystEntries(document.uri).length === 1);
    const [entry] = mystEntries(document.uri);
    assert.equal(entry.severity, vscode.DiagnosticSeverity.Warning);
    assert.equal(entry.source, "Markdown OKF-Schema Studio");
    assert.equal(entry.range.start.line, colonLine);
    assert.match(entry.message, /colon_fence/u);
    assert.match(entry.message, /myst_enable_extensions/u);

    // A conf.py that does not govern this document changes nothing: no render, no flicker.
    const stagesBefore = getActivePreviewForTests()!.renderedStages;
    const unrelated = fs.mkdtempSync(path.join(path.dirname(fixtureDirectory), "unrelated-conf-"));
    try {
      fs.writeFileSync(path.join(unrelated, "conf.py"), "extensions = []\n");
      await new Promise<void>((resolve) => setTimeout(resolve, 2500));
      fs.writeFileSync(path.join(unrelated, "conf.py"), "extensions = ['x']\n");
      fs.rmSync(path.join(unrelated, "conf.py"));
      await new Promise<void>((resolve) => setTimeout(resolve, 2500));
    } finally {
      fs.rmSync(unrelated, { recursive: true, force: true });
    }
    assert.equal(getActivePreviewForTests()!.renderedStages, stagesBefore, "an unrelated conf.py re-rendered the preview");
    assert.equal(mystEntries(document.uri).length, 1);

    // Editing conf.py updates the open preview without reopening it.
    fs.writeFileSync(
      confPath,
      'extensions = ["myst_parser"]\nmyst_enable_extensions = ["dollarmath", "colon_fence"]\n',
    );
    await waitFor("the entry to clear after conf.py gained colon_fence", () => mystEntries(document.uri).length === 0);
    fs.writeFileSync(confPath, originalConf);
    await waitFor("the entry to return after conf.py lost colon_fence", () => mystEntries(document.uri).length === 1);

    // Closing the preview clears the entry.
    disposeActivePreviewForTests();
    await waitFor("the entry to clear when the preview is disposed", () => mystEntries(document.uri).length === 0);

    // A second preview brings it back; closing the document clears it again.
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await vscode.commands.executeCommand(COMMAND_ID);
    await waitFor("the second render", previewReady);
    await waitFor("the entry after reopening", () => mystEntries(document.uri).length === 1);
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    disposeActivePreviewForTests();
    await waitFor("no entry after closing", () => mystEntries(document.uri).length === 0);
  } finally {
    fs.writeFileSync(confPath, originalConf);
    disposeActivePreviewForTests();
  }
}
