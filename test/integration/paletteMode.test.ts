import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

import {
  clearStoredPaletteModeForTests,
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

async function openPreview(uri: vscode.Uri): Promise<NonNullable<ReturnType<typeof getActivePreviewForTests>>> {
  await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(uri), vscode.ViewColumn.One);
  await vscode.commands.executeCommand(COMMAND_ID);
  await waitFor("the preview to be ready", () => {
    const preview = getActivePreviewForTests();
    return preview?.documentUri === uri.toString() && preview.phase === "ready" && preview.webviewReady;
  });
  const preview = getActivePreviewForTests();
  assert.ok(preview);
  return preview;
}

function startMode(html: string): string | undefined {
  return /"initialPaletteMode":"([a-z]+)"/u.exec(html)?.[1];
}

/** Palette mode: the setting gives the start, a choice in the page is stored per workspace. */
export async function run(): Promise<void> {
  assert.equal(vscode.workspace.isTrusted, true);
  const extensionRoot = path.resolve(__dirname, "../../..");
  const directory = fs.mkdtempSync(path.join(extensionRoot, "test", "integration", "fixtures", "palette-"));
  const sourcePath = path.join(directory, "palette.md");
  fs.writeFileSync(sourcePath, "# Palette mode\n\nA paragraph to edit.\n");
  const uri = vscode.Uri.file(sourcePath);
  const settings = vscode.workspace.getConfiguration("markdownOkfSchemaStudio.editing");
  const original = settings.inspect<string>("defaultPaletteMode")?.globalValue;
  try {
    // Nothing stored yet: the setting decides. The suite pinned MyST as a stored choice
    // (storedChoices.ts), so forget it first; the end of this test stores MyST again.
    await clearStoredPaletteModeForTests();
    await settings.update("defaultPaletteMode", "strict", vscode.ConfigurationTarget.Global);
    let preview = await openPreview(uri);
    assert.equal(startMode(preview.html), "strict", "the setting gives the first mode");

    // A choice in the page is stored and wins over the setting in the next panel.
    await sendPreviewMessageForTests({
      type: "previewPaletteModeChanged",
      documentId: preview.documentUri,
      revision: preview.documentVersion,
      requestId: preview.requestId,
      mode: "gfm",
    });
    disposeActivePreviewForTests();
    preview = await openPreview(uri);
    assert.equal(startMode(preview.html), "gfm", "the stored mode wins over the setting");

    // An invalid mode is not stored.
    await sendPreviewMessageForTests({
      type: "previewPaletteModeChanged",
      documentId: preview.documentUri,
      revision: preview.documentVersion,
      requestId: preview.requestId,
      mode: "html",
    });
    disposeActivePreviewForTests();
    preview = await openPreview(uri);
    assert.equal(startMode(preview.html), "gfm");

    // Leave the workspace on the pinned MyST mode (storedChoices.ts) for the suites that follow.
    await sendPreviewMessageForTests({
      type: "previewPaletteModeChanged",
      documentId: preview.documentUri,
      revision: preview.documentVersion,
      requestId: preview.requestId,
      mode: "myst",
    });
  } finally {
    disposeActivePreviewForTests();
    await settings.update("defaultPaletteMode", original, vscode.ConfigurationTarget.Global);
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
