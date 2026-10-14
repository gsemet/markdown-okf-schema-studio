import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as vscode from "vscode";

import {
  COMMAND_ID,
  disposeActivePreviewForTests,
  EDITOR_VIEW_TYPE,
  getActivePreviewForTests,
  getActivePreviewPanelForTests,
  setRenderDelayForTests,
} from "./extensionApi";
import { buildStatusWebviewHtml } from "../../src/preview/webview";

async function waitFor(
  description: string,
  predicate: () => boolean,
  timeoutMs = 20_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

function tabs(): readonly vscode.Tab[] {
  return vscode.window.tabGroups.all.flatMap((group) => group.tabs);
}

function customEditorTabs(viewType: string): vscode.Tab[] {
  return tabs().filter((tab) => tab.input instanceof vscode.TabInputCustom
    && tab.input.viewType === viewType);
}

function snapshotStockSettings(): string {
  const configuration = vscode.workspace.getConfiguration("markdown");
  const keys = [
    "preview.breaks",
    "preview.linkify",
    "preview.typographer",
    "preview.frontMatter",
    "preview.fontSize",
    "preview.lineHeight",
    "styles",
  ];
  return JSON.stringify(keys.map((key) => [key, configuration.inspect(key)]));
}

function markdownExtensionManifest(): {
  commands: Array<{ command: string }>;
  customEditors: Array<{ viewType: string; priority?: { diffEditor?: string } }>;
} {
  const manifestPath = path.join(
    vscode.env.appRoot,
    "extensions",
    "markdown-language-features",
    "package.json",
  );
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
    contributes: {
      commands: Array<{ command: string }>;
      customEditors: Array<{ viewType: string; priority?: { diffEditor?: string } }>;
    };
  };
  return manifest.contributes;
}

export async function run(): Promise<void> {
  assert.equal(vscode.workspace.isTrusted, true);
  for (const status of ["pending", "error"] as const) {
    const html = buildStatusWebviewHtml(status, "vscode-webview://unit", "Sphinx message");
    const nonce = html.match(/<style nonce="([^"]+)"/u)?.[1];
    assert.ok(nonce);
    assert.match(html, /color: var\(--vscode-editor-foreground, CanvasText\)/u);
    assert.match(html, /background: var\(--vscode-editor-background, Canvas\)/u);
    assert.match(html, /Sphinx message/u);
    // T35: the two-line status layout is scoped to status pages through this body marker.
    assert.match(html, /<body data-sphinx-preview-status-page>/u);
    assert.match(html, /<strong>[^<]+<\/strong><span data-sphinx-preview-status-message>/u);
    assert.match(html, new RegExp(`style-src [^;]+ 'nonce-${nonce}'`, "u"));
  }
  const extensionRoot = path.resolve(__dirname, "../../..");
  const fixturePath = path.join(extensionRoot, "test", "integration", "fixtures", "preview.md");
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(fixturePath));
  const stockExtension = vscode.extensions.getExtension("vscode.markdown-language-features");
  assert.ok(stockExtension, "the built-in Markdown extension is not registered");
  await stockExtension.activate();
  const stockManifest = markdownExtensionManifest();
  const stockCommandIds = new Set(stockManifest.commands.map((command) => command.command));
  const requiredCommands = [
    "markdown.showPreview",
    "markdown.showPreviewToSide",
    "markdown.showLockedPreviewToSide",
    "markdown.showSource",
    "markdown.reopenAsPreview",
    "markdown.reopenAsSource",
    "markdown.togglePreview",
    "markdown.preview.refresh",
  ];
  const availableCommands = new Set(await vscode.commands.getCommands(true));
  for (const command of requiredCommands) {
    assert.equal(availableCommands.has(command), true, `missing stock command ${command}`);
    assert.equal(stockCommandIds.has(command), true, `manifest lost stock command ${command}`);
  }

  const previewEditor = stockManifest.customEditors.find(
    (editor) => editor.viewType === "vscode.markdown.preview.editor",
  );
  assert.equal(previewEditor?.priority?.diffEditor, "option");
  assert.equal(stockCommandIds.has(COMMAND_ID), false);
  const settingsBefore = snapshotStockSettings();
  const createdDiffFiles: string[] = [];

  try {
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    const originalPath = path.join(os.tmpdir(), `sphinx-myst-stock-original-${process.pid}.md`);
    const modifiedPath = path.join(os.tmpdir(), `sphinx-myst-stock-modified-${process.pid}.md`);
    createdDiffFiles.push(originalPath, modifiedPath);
    fs.writeFileSync(originalPath, "# Stock diff original\n\nOriginal text\n", "utf8");
    fs.writeFileSync(modifiedPath, "# Stock diff modified\n\nModified text\n", "utf8");
    await vscode.commands.executeCommand(
      "vscode.diff",
      vscode.Uri.file(originalPath),
      vscode.Uri.file(modifiedPath),
      "Stock Markdown rendered-diff owner",
    );
    await waitFor(
      "the native stock text diff",
      () => tabs().some((tab) => tab.input instanceof vscode.TabInputTextDiff),
    );
    assert.equal(
      tabs().some((tab) => tab.input instanceof vscode.TabInputTextDiff),
      true,
      "the native diff workflow was not available",
    );
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);

    await vscode.commands.executeCommand("markdown.reopenAsPreview");
    await waitFor(
      "the live stock Markdown preview",
      () => customEditorTabs("vscode.markdown.preview.editor").length >= 1,
    );
    const stockTabCountBeforeMySt = customEditorTabs("vscode.markdown.preview.editor").length;

    await vscode.window.showTextDocument(document, vscode.ViewColumn.Two);
    await vscode.commands.executeCommand(COMMAND_ID);
    await waitFor(
      "the MyST preview beside the stock preview",
      () => getActivePreviewForTests()?.phase === "ready"
        && customEditorTabs("vscode.markdown.preview.editor").length >= stockTabCountBeforeMySt,
    );
    assert.ok(getActivePreviewForTests());
    assert.ok(customEditorTabs("vscode.markdown.preview.editor").length >= 1);
    assert.equal(snapshotStockSettings(), settingsBefore);
    const sidePreviewPanel = getActivePreviewPanelForTests();
    assert.ok(sidePreviewPanel, "the MyST side preview did not open");
    let sidePreviewDisposed = false;
    sidePreviewPanel.onDidDispose(() => {
      sidePreviewDisposed = true;
    });

    await vscode.commands.executeCommand("vscode.openWith", document.uri, EDITOR_VIEW_TYPE);
    await waitFor("the optional MyST Open With editor", () =>
      customEditorTabs(EDITOR_VIEW_TYPE).length === 1
      && getActivePreviewForTests()?.phase === "ready"
      && getActivePreviewForTests()?.documentUri === document.uri.toString());
    assert.equal(customEditorTabs(EDITOR_VIEW_TYPE)[0].isActive, true);
    assert.equal(
      sidePreviewDisposed,
      false,
      "opening the direct MyST editor disposed the existing side preview",
    );

    const originalMyStTab = customEditorTabs(EDITOR_VIEW_TYPE)[0];
    await vscode.commands.executeCommand("workbench.action.splitEditorRight");
    await waitFor("the split MyST editor to remain open", () => {
      return customEditorTabs(EDITOR_VIEW_TYPE).length >= 1
        && getActivePreviewForTests()?.phase === "ready";
    });
    assert.equal(
      tabs().includes(originalMyStTab),
      true,
      "splitting the MyST editor closed its original liveview tab",
    );
    assert.equal(
      sidePreviewDisposed,
      false,
      "splitting the direct MyST editor disposed the existing side preview",
    );
    assert.equal(getActivePreviewForTests()?.documentUri, document.uri.toString());
    assert.equal(getActivePreviewForTests()?.phase, "ready");

    const otherDocument = await vscode.workspace.openTextDocument(
      vscode.Uri.file(path.join(extensionRoot, "test", "integration", "fixtures", "preview-other.md")),
    );
    await vscode.window.showTextDocument(otherDocument, vscode.ViewColumn.Two);
    assert.equal(getActivePreviewForTests()?.documentUri, document.uri.toString());
    assert.ok(customEditorTabs("vscode.markdown.preview.editor").length >= 1);

    const delayedDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(path.join(
      extensionRoot, "test", "integration", "fixtures", "preview-other.md",
    )));
    setRenderDelayForTests(2_000);
    const opened = vscode.commands.executeCommand("vscode.openWith", delayedDocument.uri, EDITOR_VIEW_TYPE);
    await Promise.race([
      opened,
      new Promise<never>((_, reject) => setTimeout(
        () => reject(new Error("Open With stayed loading while MyST was rendering.")),
        1_000,
      )),
    ]);
    assert.equal(getActivePreviewForTests()?.phase === "ready", false);
    assert.equal(getActivePreviewForTests()?.status, "pending");
    assert.match(getActivePreviewForTests()?.html ?? "", /data-sphinx-preview-status="pending"/u);
    await waitFor("the delayed fixture MyST view", () => {
      const preview = getActivePreviewForTests();
      return preview?.documentUri === delayedDocument.uri.toString()
        && preview.phase === "ready";
    });
    const delayedPreview = getActivePreviewForTests();
    assert.ok(delayedPreview);
    assert.equal(
      customEditorTabs(EDITOR_VIEW_TYPE).find((tab) =>
        (tab.input as vscode.TabInputCustom).uri.toString() === delayedDocument.uri.toString())?.isActive,
      true,
    );
    assert.equal(delayedPreview.status, "success");
    assert.match(delayedPreview.html, /Second Preview Fixture/u);

    console.log(JSON.stringify({
      stockPreview: "pass",
      stockSettingsUnchanged: "pass",
      stockCommands: "pass",
      nativeTextDiff: "pass",
      stockRenderedDiffRegistration: "pass",
      coexistence: "pass",
    }));
  } finally {
    setRenderDelayForTests(0);
    for (const tab of [...customEditorTabs(EDITOR_VIEW_TYPE)]) {
      await vscode.window.tabGroups.close(tab, true);
    }
    for (const tab of [...tabs()]) {
      if (tab.input instanceof vscode.TabInputCustom
        && tab.input.viewType === "vscode.markdown.preview.editor") {
        await vscode.window.tabGroups.close(tab, true);
      }
    }
    disposeActivePreviewForTests();
    for (const filePath of createdDiffFiles) {
      fs.rmSync(filePath, { force: true });
    }
  }
}
