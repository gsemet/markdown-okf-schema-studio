import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

import {
  COMMAND_ID,
  disposeActivePreviewForTests,
  EXPORT_HTML_COMMAND_ID,
  getActivePreviewForTests,
  stubExportDialogsForTests,
} from "./extensionApi";

async function waitFor(description: string, predicate: () => boolean, timeoutMs = 40_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

const PAGE = [
  "# Exported page",
  "",
  "An [other file](other.md) and an [outside link](https://example.com/guide).",
  "",
  "![Logo](markdown-logo.png)",
  "",
  "```mermaid",
  "flowchart LR",
  "  A[Preview] --> B[Export]",
  "```",
  "",
].join("\n");

async function openPreview(uri: vscode.Uri): Promise<void> {
  await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(uri), vscode.ViewColumn.One);
  await vscode.commands.executeCommand(COMMAND_ID);
  await waitFor("the preview to be ready", () => {
    const preview = getActivePreviewForTests();
    return preview?.documentUri === uri.toString() && preview.phase === "ready" && preview.webviewReady;
  });
}

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-134
// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-135
// @tests_req SwRS-MDOKFSTUDIO-DIAG-128
/**
 * The Export to HTML command in the real host: the command is declared and registered; a page with a
 * Mermaid diagram, a PNG and a relative link is written as one file with the image and the diagram
 * embedded and the link as text, after the warning; and a cancelled warning writes no file.
 */
export async function run(): Promise<void> {
  assert.equal(vscode.workspace.isTrusted, true);
  const extensionRoot = path.resolve(__dirname, "../../..");
  const manifest = JSON.parse(fs.readFileSync(path.join(extensionRoot, "package.json"), "utf8")) as {
    contributes: { commands: { command: string; title: string }[]; menus: { commandPalette: { command: string }[] } };
  };
  assert.equal(manifest.contributes.commands.find((entry) => entry.command === EXPORT_HTML_COMMAND_ID)?.title, "Export to HTML");
  assert.ok(manifest.contributes.menus.commandPalette.some((entry) => entry.command === EXPORT_HTML_COMMAND_ID));
  assert.ok((await vscode.commands.getCommands(true)).includes(EXPORT_HTML_COMMAND_ID));

  const fixtures = path.join(extensionRoot, "test", "integration", "fixtures");
  const directory = fs.mkdtempSync(path.join(fixtures, "export-"));
  fs.copyFileSync(path.join(fixtures, "markdown-logo.png"), path.join(directory, "markdown-logo.png"));
  const sourcePath = path.join(directory, "page.md");
  fs.writeFileSync(sourcePath, PAGE);
  const outputPath = path.join(directory, "saved.html");
  const uri = vscode.Uri.file(sourcePath);
  try {
    await openPreview(uri);

    // Cancel the warning: no save dialog and no file.
    const cancelled = stubExportDialogsForTests({ confirm: false, savePath: outputPath });
    await vscode.commands.executeCommand(EXPORT_HTML_COMMAND_ID);
    await waitFor("the warning", () => cancelled.record.confirms.length === 1);
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    assert.deepEqual(cancelled.record.saves, []);
    assert.equal(fs.existsSync(outputPath), false);
    assert.match(cancelled.record.confirms[0]?.detail ?? "", /other\.md/u);
    cancelled.restore();

    // Accept the warning and save.
    const accepted = stubExportDialogsForTests({ confirm: true, savePath: outputPath });
    await vscode.commands.executeCommand(EXPORT_HTML_COMMAND_ID);
    await waitFor("the exported file", () => fs.existsSync(outputPath));
    accepted.restore();
    assert.equal(accepted.record.saves.length, 1);
    assert.equal(path.basename(accepted.record.saves[0] ?? ""), "page.html");
    const html = fs.readFileSync(outputPath, "utf8");
    assert.doesNotMatch(html, /<script|<link|@import|javascript:/u);
    assert.match(html, /<img[^>]+src="data:image\/png;base64,/u);
    assert.match(html, /<img[^>]+class="myst-mermaid-image"[^>]+src="data:image\/svg\+xml/u);
    assert.match(html, /href="https:\/\/example\.com\/guide"/u);
    assert.doesNotMatch(html, /href="other\.md"/u);
    assert.match(html, /other file/u);
  } finally {
    disposeActivePreviewForTests();
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
