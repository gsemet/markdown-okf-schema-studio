import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

import {
  COMMAND_ID,
  disposeActivePreviewForTests,
  getActivePreviewForTests,
  sendPreviewMessageForTests,
  syncActiveEditorForTests,
} from "./extensionApi";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

async function waitFor(description: string, predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

// @tests_req StRS-MDOKFSTUDIO-LIFE-010
export async function run(): Promise<void> {
  const extensionRoot = path.resolve(__dirname, "../../..");
  const fixturePath = path.join(extensionRoot, "test", "integration", "fixtures", "preview.md");
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(fixturePath));
  await vscode.window.showTextDocument(document, vscode.ViewColumn.One);

  try {
    await vscode.commands.executeCommand(COMMAND_ID);
    const preview = getActivePreviewForTests();
    assert.ok(preview);
    const documentId = escapeRegex(document.uri.toString());
    const sourceFile = escapeRegex(path.resolve(fixturePath));
    assert.match(preview.html, new RegExp(`data-sphinx-preview-document="${documentId}"`, "u"));
    assert.match(preview.html, new RegExp(`data-sphinx-source-file="${sourceFile}"`, "u"));
    // @tests_req SwRS-MDOKFSTUDIO-LIFE-119
    assert.match(preview.html, /data-sphinx-source-line="[1-9]\d*"/u);
    assert.match(preview.html, /data-sphinx-preview-block="source-block-\d+"/u);
    assert.match(preview.html, /data-sphinx-preview-scroll-sync/iu);
    // The runtime that reports previewReady is the bundled file (PERF-11); its context is inline JSON.
    assert.match(preview.html, /<script[^>]+src="[^"]*\/out\/bundle\/preview\.js"[^>]*data-sphinx-preview-scroll-sync/u);
    assert.match(preview.html, /<script[^>]+type="application\/json"[^>]+data-sphinx-preview-runtime-context/u);
    assert.match(fs.readFileSync(path.join(extensionRoot, "out", "bundle", "preview.js"), "utf8"), /previewReady/u);
    assert.doesNotMatch(preview.html, /data-sphinx-source-line="(?:0|-\d+)"/u);
    assert.match(
      preview.html,
      /<h1\b[^>]*data-sphinx-source-line="1"[^>]*tabindex="0"/u,
      "rendered headings are keyboard-accessible edit targets",
    );
    assert.match(
      preview.html,
      /<p\b[^>]*data-sphinx-source-line="7"[^>]*tabindex="0"/u,
      "rendered paragraphs are keyboard-accessible edit targets",
    );
    const admonition = preview.html.match(/<(aside|details)\b[^>]*class="[^"]*\badmonition\b[^"]*"[^>]*>/u);
    assert.ok(admonition, "the rendered admonition container is present");
    assert.match(admonition[0], /data-sphinx-source-line="\d+"/u);
    assert.match(admonition[0], /data-sphinx-source-end-line="\d+"/u);
    assert.match(admonition[0], /tabindex="0"/u);
    const admonitionEnd = preview.html.indexOf(`</${admonition[1]}>`, admonition.index ?? 0);
    const titleStart = preview.html.indexOf('class="admonition-title"', admonition.index ?? 0);
    assert.ok(
      titleStart >= 0 && titleStart < admonitionEnd,
      "admonition titles inherit their mapped source block",
    );
    assert.match(
      preview.html,
      /<figure\b[^>]*data-sphinx-source-line="13"[^>]*tabindex="0"/u,
      "figure directives are keyboard-accessible edit targets",
    );

    // @tests_req SwRS-MDOKFSTUDIO-LIFE-100
    syncActiveEditorForTests();
    await waitFor(
      "the initial editor-to-preview source mapping context",
      () => getActivePreviewForTests()?.lastSourceScrollLine === 1,
    );
    const editorSync = getActivePreviewForTests();
    assert.ok(editorSync);
    assert.ok(editorSync.documentVersion !== undefined);
    assert.ok(editorSync.requestId !== undefined);
    assert.equal(editorSync?.lastSourceScrollLine, 1);
    const context = {
      documentId: document.uri.toString(),
      revision: editorSync.documentVersion,
      requestId: editorSync.requestId,
    };
    // @tests_req SwRS-MDOKFSTUDIO-LIFE-108
    sendPreviewMessageForTests({ type: "previewScroll", ...context, line: 1 });
    assert.equal(getActivePreviewForTests()?.lastRevealedSourceLine, 1);
    sendPreviewMessageForTests({
      type: "previewReveal",
      activation: "click",
      ...context,
      sourceFile: path.resolve(fixturePath),
      line: 2,
    });
    // @tests_req SwRS-MDOKFSTUDIO-LIFE-097
    assert.equal(getActivePreviewForTests()?.lastRevealedSourceLine, 2);
    sendPreviewMessageForTests({
      type: "previewReveal",
      activation: "double-click",
      ...context,
      sourceFile: path.resolve(fixturePath),
      line: 3,
    });
    assert.equal(getActivePreviewForTests()?.lastRevealedSourceLine, 2);
    sendPreviewMessageForTests({
      type: "previewScroll",
      ...context,
      requestId: context.requestId - 1,
      line: 4,
    });
    assert.equal(getActivePreviewForTests()?.lastRevealedSourceLine, 2);

    const otherPath = path.join(extensionRoot, "test", "integration", "fixtures", "preview-other.md");
    const otherDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(otherPath));
    await vscode.window.showTextDocument(otherDocument, vscode.ViewColumn.One);
    await waitFor(
      "the active preview identity to follow the editor before the new build completes",
      () => getActivePreviewForTests()?.documentUri === otherDocument.uri.toString(),
    );
    sendPreviewMessageForTests({
      type: "previewReveal",
      activation: "click",
      ...context,
      sourceFile: path.resolve(fixturePath),
      line: 4,
    });
    assert.equal(
      getActivePreviewForTests()?.lastRevealedSourceLine,
      2,
      "the old stage must not reveal the previous editor during an active-document switch",
    );
  } finally {
    disposeActivePreviewForTests();
  }
}
