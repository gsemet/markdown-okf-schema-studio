import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

import {
  COMMAND_ID,
  disposeActivePreviewForTests,
  getActivePreviewForTests,
  getActivePreviewPanelForTests,
  REFRESH_COMMAND_ID,
  resetRenderHooksForTests,
  resetPreviewThemeModeForTests,
  sendPreviewMessageForTests,
  setRenderOverrideForTests,
} from "./extensionApi";

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

function replaceDocument(document: vscode.TextDocument, text: string): vscode.WorkspaceEdit {
  const edit = new vscode.WorkspaceEdit();
  edit.replace(
    document.uri,
    new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)),
    text,
  );
  return edit;
}

// @tests_req StRS-MDOKFSTUDIO-LIFE-001
// @tests_req StRS-MDOKFSTUDIO-LIFE-003
// @tests_req StRS-MDOKFSTUDIO-LIFE-007
// @tests_req SwRS-MDOKFSTUDIO-LIFE-170
// @tests_req SwRS-MDOKFSTUDIO-LIFE-169
// @tests_req SwRS-MDOKFSTUDIO-THEME-016
export async function run(): Promise<void> {
  assert.equal(vscode.workspace.isTrusted, true);
  const extensionRoot = path.resolve(__dirname, "../../..");
  const fixtureDirectory = path.join(extensionRoot, "test", "integration", "fixtures");
  const firstPath = path.join(fixtureDirectory, "preview.md");
  const secondPath = path.join(fixtureDirectory, "preview-other.md");
  const firstSource = fs.readFileSync(firstPath, "utf8");
  const secondSource = fs.readFileSync(secondPath, "utf8");
  const originalTheme = vscode.workspace.getConfiguration("workbench").get<string>("colorTheme");
  const firstDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(firstPath));
  const secondDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(secondPath));

  try {
    await vscode.window.showTextDocument(firstDocument, vscode.ViewColumn.One);
    // @tests_req SwRS-MDOKFSTUDIO-LIFE-003
    await vscode.commands.executeCommand(COMMAND_ID);
    await waitFor("the first lifecycle render", () => {
      const preview = getActivePreviewForTests();
      return preview?.phase === "ready" && preview.status === "success";
    });

    const firstPreview = getActivePreviewForTests();
    assert.ok(firstPreview);
    assert.equal(firstPreview.outputDirectory, fixtureDirectory);
    assert.match(firstPreview.html, /Markdown OKF-Schema Studio Fixture/u);
    assert.equal(firstPreview.documentUri, firstDocument.uri.toString());
    // @tests_req SwRS-MDOKFSTUDIO-LIFE-024
    assert.equal(getActivePreviewPanelForTests()?.title, "Studio · preview.md");

    sendPreviewMessageForTests({
      type: "previewThemeModeChanged",
      documentId: firstPreview.documentUri,
      revision: firstPreview.documentVersion ?? 0,
      requestId: firstPreview.requestId ?? 0,
      previewThemeMode: "dark",
    });

    const alternateTheme = originalTheme === "Default Light Modern"
      ? "Default Dark Modern"
      : "Default Light Modern";
    const themeRequestId = firstPreview.requestId ?? 0;
    await vscode.workspace.getConfiguration("workbench").update(
      "colorTheme",
      alternateTheme,
      vscode.ConfigurationTarget.Global,
    );
    await waitFor("the theme-triggered bounded render", () => {
      const preview = getActivePreviewForTests();
      return preview?.phase === "ready"
        && preview.requestId !== undefined
        && preview.requestId > themeRequestId;
    });
    const themedPreview = getActivePreviewForTests();
    assert.ok(themedPreview);
    const themedRequestId = themedPreview.requestId;
    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    assert.equal(getActivePreviewForTests()?.requestId, themedRequestId);
    await vscode.workspace.getConfiguration("workbench").update(
      "colorTheme",
      originalTheme,
      vscode.ConfigurationTarget.Global,
    );

    sendPreviewMessageForTests({
      type: "previewState",
      documentId: themedPreview.documentUri,
      revision: themedPreview.documentVersion,
      requestId: themedPreview.requestId,
      sourceLine: 4,
      scrollTop: 88,
    });
    const persisted = getActivePreviewForTests();
    // @tests_req SwRS-MDOKFSTUDIO-LIFE-125
    assert.equal(persisted?.sourceLine, 4);
    assert.equal(persisted?.scrollTop, 88);

    sendPreviewMessageForTests({
      type: "previewReveal",
      documentId: "file:///outside-workspace.md",
      revision: firstPreview.documentVersion,
      requestId: firstPreview.requestId,
      line: 3,
    });
    assert.equal(getActivePreviewForTests()?.lastRevealedSourceLine, undefined);

    await vscode.window.showTextDocument(secondDocument, vscode.ViewColumn.One);
    // @tests_req SwRS-MDOKFSTUDIO-LIFE-026
    await waitFor("the second lifecycle render", () => {
      const preview = getActivePreviewForTests();
      return preview?.phase === "ready"
        && preview.documentUri === secondDocument.uri.toString()
        && preview.html.includes("Second fixture marker");
    });
    const secondPreview = getActivePreviewForTests();
    assert.ok(secondPreview);
    assert.doesNotMatch(secondPreview.html, /Markdown OKF-Schema Studio Fixture/u);
    assert.match(secondPreview.html, /"previewThemeMode":"dark"/u);
    assert.equal(secondPreview.lastRevealedSourceLine, undefined);

    sendPreviewMessageForTests({
      type: "previewReveal",
      documentId: firstPreview.documentUri,
      revision: firstPreview.documentVersion,
      requestId: firstPreview.requestId,
      line: 3,
    });
    assert.equal(getActivePreviewForTests()?.lastRevealedSourceLine, undefined);

    const editedText = `${secondSource}\n\nLifecycle edit marker\n`;
    assert.equal(
      await vscode.workspace.applyEdit(replaceDocument(secondDocument, editedText)),
      true,
    );
    const requestBeforeRefresh = getActivePreviewForTests()?.requestId ?? 0;
    // @tests_req SwRS-MDOKFSTUDIO-LIFE-032
    await vscode.commands.executeCommand(REFRESH_COMMAND_ID);
    await waitFor("the explicitly refreshed dirty render", () => {
      const preview = getActivePreviewForTests();
      return preview?.phase === "ready"
        && preview.html.includes("Lifecycle edit marker")
        && (preview.requestId ?? 0) > requestBeforeRefresh;
    });

    setRenderOverrideForTests(() => {
      throw new Error("simulated lifecycle render failure");
    });
    assert.equal(
      await vscode.workspace.applyEdit(replaceDocument(
        secondDocument,
        `${editedText}\n\nLifecycle render failure marker\n`,
      )),
      true,
    );
    await waitFor("the stale lifecycle render", () => {
      const preview = getActivePreviewForTests();
      return preview?.phase === "failed"
        && preview.status === "stale"
        && preview.html.includes("Lifecycle edit marker");
    });
    assert.match(getActivePreviewForTests()?.html ?? "", /simulated lifecycle render failure/u);

    setRenderOverrideForTests(undefined);
    assert.equal(
      await vscode.workspace.applyEdit(replaceDocument(secondDocument, editedText)),
      true,
    );
    // @tests_req SwRS-MDOKFSTUDIO-LIFE-049
    await waitFor("lifecycle recovery", () => {
      const preview = getActivePreviewForTests();
      return preview?.phase === "ready"
        && preview.status === "recovery"
        && preview.html.includes("Lifecycle edit marker");
    });

    const before = getActivePreviewForTests();
    assert.ok(before);
    const nonMarkdownDocument = await vscode.workspace.openTextDocument(
      vscode.Uri.file(path.join(extensionRoot, "package.json")),
    );
    await vscode.window.showTextDocument(nonMarkdownDocument, vscode.ViewColumn.One);
    // Bounded sleep: we assert that nothing happens.
    await new Promise((resolve) => setTimeout(resolve, 750));
    const keptPreview = getActivePreviewForTests();
    assert.ok(keptPreview);
    assert.equal(keptPreview.documentUri, before.documentUri);
    assert.equal(keptPreview.documentUri, secondDocument.uri.toString());
    assert.ok(keptPreview.status === "recovery" || keptPreview.status === "success", `status ${keptPreview.status}`);
    assert.match(keptPreview.html, /Lifecycle edit marker/u);
    assert.notEqual(keptPreview.outputDirectory, undefined);
    assert.equal(keptPreview.requestId, before.requestId);

    await vscode.window.showTextDocument(secondDocument, vscode.ViewColumn.One);
    await waitFor("returning to a Markdown editor", () => {
      const preview = getActivePreviewForTests();
      return preview?.phase === "ready"
        && preview.documentUri === secondDocument.uri.toString()
        && preview.html.includes("Lifecycle edit marker");
    });
    assert.equal(getActivePreviewForTests()?.requestId, before.requestId, "no new render was needed");

    // T36: menus pass the resource URI. A Uri that is not the active editor's file is opened first.
    await vscode.window.showTextDocument(firstDocument, vscode.ViewColumn.One);
    await waitFor("the preview following the first document", () =>
      getActivePreviewForTests()?.documentUri === firstDocument.uri.toString());
    // @tests_req SwRS-MDOKFSTUDIO-LIFE-010
    await vscode.commands.executeCommand(COMMAND_ID, secondDocument.uri);
    await waitFor("the preview showing the Uri passed to the command", () => {
      const preview = getActivePreviewForTests();
      return preview?.phase === "ready" && preview.documentUri === secondDocument.uri.toString();
    });
    assert.equal(
      vscode.window.activeTextEditor?.document.uri.toString(),
      secondDocument.uri.toString(),
      "the passed Uri is the active text editor",
    );
    // A non-Uri argument is ignored.
    await vscode.commands.executeCommand(COMMAND_ID, { not: "a uri" });
    assert.equal(getActivePreviewForTests()?.documentUri, secondDocument.uri.toString());
  } finally {
    resetRenderHooksForTests();
    disposeActivePreviewForTests();
    await vscode.workspace.getConfiguration("workbench").update(
      "colorTheme",
      originalTheme,
      vscode.ConfigurationTarget.Global,
    );
    if (firstDocument.getText() !== firstSource) {
      await vscode.workspace.applyEdit(replaceDocument(firstDocument, firstSource));
    }
    if (secondDocument.getText() !== secondSource) {
      await vscode.workspace.applyEdit(replaceDocument(secondDocument, secondSource));
    }
    await resetPreviewThemeModeForTests();
  }

  // @tests_req SwRS-MDOKFSTUDIO-LIFE-143
  assert.equal(getActivePreviewForTests(), undefined);
  assert.equal(fs.existsSync(fixtureDirectory), true, "preview disposal removed the source directory");
}
