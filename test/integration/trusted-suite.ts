import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

import {
  COMMAND_ID,
  disposeActivePreviewForTests,
  getActivePreviewForTests,
} from "./extensionApi";
import { run as runCheckboxToggle } from "./checkboxToggle.test";
import { run as runDirtySnapshots } from "./dirtySnapshots.test";
import { run as runGenericMarkdown } from "./genericMarkdown.test";
import { run as runTableEmptyColumn } from "./tableEmptyColumn.test";
import { run as runEditToolbarCover } from "./editToolbarCover.test";
import { run as runFindInPreview } from "./findInPreview.test";
import { run as runTallBlockScroll } from "./tallBlockScroll.test";
import { run as runBlockActions } from "./blockActionsFollowSelection.test";
import { run as runPreviewEditing } from "./previewEditing.test";
import { run as runImagePicker } from "./imagePicker.test";
import { run as runImagePaste } from "./imagePaste.test";
import { run as runIncomingChanges } from "./incomingChanges.test";
import { run as runUpdateGlow } from "./updateGlow.test";
import { run as runCommentAnchors } from "./commentAnchors.test";
import { run as runCommentContrast } from "./commentContrastWindow";
import { run as runCommentTitle } from "./commentTitleWindow";
import { run as runReadmeHtml } from "./readmeHtmlWindow";
import { run as runToc } from "./tocWindow";
import { run as runMystBlocks } from "./mystBlocksWindow";
import { run as runCommentWrite } from "./commentWrite.test";
import { run as runReviewComments } from "./reviewComments.test";
import { run as runBlockMove } from "./blockMove.test";
import { run as runBlockClipboard } from "./blockClipboard.test";
import { run as runInlineThread } from "./inlineThread.test";
import { run as runLabelRename } from "./labelRename.test";
import { run as runMystPickers } from "./mystPickers.test";
import { run as runPaletteMode } from "./paletteMode.test";
import { run as runPreviewHistory } from "./previewHistory.test";
import { run as runEditKeys } from "./editKeys.test";
import { run as runPasteUrl } from "./pasteUrl.test";
import { run as runWindowSwitchKeys } from "./windowSwitchKeys.test";
import { run as runRealInput } from "./realInput/run";
import { run as runLifecycle } from "./lifecycle.test";
import { run as runMystDiagnostics } from "./mystDiagnostics.test";
import { run as runProjectFeatures } from "./projectFeatures.test";
import { run as runSerializer } from "./serializer.test";
import { run as runSourceMapping } from "./sourceMapping.test";
import { run as runStockCoexistence } from "./stockCoexistence.test";
import { run as runWorkspaceDisposal } from "./workspaceDisposal.test";
import { attribute, findElements, parseHtml } from "../core/render/dom";
import { pinStoredWorkspaceChoices } from "./storedChoices";
import { ensureTestWindowFocused } from "./windowFocus";

// @tests_req SwRS-MDOKFSTUDIO-TRUST-012
export async function run(): Promise<void> {
  assert.equal(vscode.workspace.isTrusted, true);
  await pinStoredWorkspaceChoices();
  // CDP input and the undo steps need a window macOS has activated (windowFocus.ts).
  await ensureTestWindowFocused();
  // The block actions scenario needs no fixture document: it runs before the shared preview.md checks.
  if (process.env.STUDIO_REAL_INPUT_SCENARIO === "paste-url") {
    await runPasteUrl();
    return;
  }
  if (process.env.STUDIO_REAL_INPUT_SCENARIO === "block-actions") {
    await runBlockActions();
    return;
  }
  const extensionRoot = path.resolve(__dirname, "../../..");
  const workspaceRoot = extensionRoot;
  const fixturePath = path.join(extensionRoot, "test", "integration", "fixtures", "preview.md");
  const productionBuild = path.join(workspaceRoot, "_build");
  const beforeBuild = fs.existsSync(productionBuild) ? fs.readdirSync(productionBuild).sort() : [];
  const originalSource = fs.readFileSync(fixturePath, "utf8");
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(fixturePath));
  await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
  assert.equal(vscode.window.activeTextEditor?.document.uri.toString(), document.uri.toString());
  assert.equal(document.languageId, "markdown");
  assert.ok(vscode.workspace.getWorkspaceFolder(document.uri));
  const studioExtension = vscode.extensions.getExtension("GaetanSemet.markdown-okf-schema-studio");
  assert.ok(studioExtension, "Markdown OKF-Schema Studio is not registered in the extension host");
  const dirtyMarker = "Dirty buffer only marker";
  const dirtyEdit = new vscode.WorkspaceEdit();
  dirtyEdit.insert(document.uri, document.positionAt(document.getText().length), `\n\n${dirtyMarker}\n`);
  assert.equal(await vscode.workspace.applyEdit(dirtyEdit), true);

  try {
    await vscode.commands.executeCommand(COMMAND_ID);
    assert.equal(studioExtension.isActive, true, "Markdown OKF-Schema Studio did not activate");
    const preview = getActivePreviewForTests();
    assert.ok(preview, "the trusted command did not create a preview panel");
    assert.match(preview.html, /admonition/iu);
    assert.match(preview.html, /math/iu);
    assert.match(preview.html, /Local preview image/u);
    assert.match(preview.html, /Content-Security-Policy/u);
    assert.match(preview.html, /nonce=/u);
    assert.match(preview.html, /data-sphinx-preview-accessibility/u);
    const stylesheets = findElements(parseHtml(preview.html), (element) =>
      element.tagName === "link" && attribute(element, "rel") === "stylesheet");
    assert.equal(stylesheets.length, 1);
    assert.ok(attribute(stylesheets[0], "data-studio-math-stylesheet") !== undefined);
    assert.match(attribute(stylesheets[0], "href") ?? "", /out\/bundle\/katex\/katex\.min\.css/u);
    assert.match(preview.html, /<style\b[^>]*data-sphinx-preview-accessibility/u);
    assert.match(preview.html, /data-sphinx-preview-toolbar/u);
    assert.match(preview.html, new RegExp(dirtyMarker, "u"));
    assert.doesNotMatch(preview.html, /unsafe-inline|default-src \*/iu);
    assert.equal(fs.readFileSync(fixturePath, "utf8"), originalSource);
    const afterBuild = fs.existsSync(productionBuild) ? fs.readdirSync(productionBuild).sort() : [];
    assert.deepEqual(afterBuild, beforeBuild, "preview changed the production _build directory");
  } finally {
    disposeActivePreviewForTests();
    const restoreEdit = new vscode.WorkspaceEdit();
    restoreEdit.replace(
      document.uri,
      new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)),
      originalSource,
    );
    await vscode.workspace.applyEdit(restoreEdit);
  }

  if (process.env.STUDIO_REAL_INPUT_SCENARIO === "window-switch-keys") {
    await runWindowSwitchKeys();
    return;
  }
  if (process.env.STUDIO_REAL_INPUT_SCENARIO === "empty-column") {
    await runTableEmptyColumn();
    return;
  }
  if (process.env.STUDIO_REAL_INPUT_SCENARIO === "toolbar-cover") {
    await runEditToolbarCover();
    await runTallBlockScroll();
    return;
  }
  if (process.env.STUDIO_REAL_INPUT_SCENARIO === "find-in-preview") {
    await runFindInPreview();
    return;
  }
  if (process.env.STUDIO_REAL_INPUT_SCENARIO === "tall-block-scroll") {
    await runTallBlockScroll();
    return;
  }
  const onlyRealInput = process.env.STUDIO_REAL_INPUT_SCENARIO !== undefined;
  if (!onlyRealInput) {
    await runProjectFeatures();
    await runStockCoexistence();
  }
  try {
    if (!onlyRealInput) await runCheckboxToggle();
  } catch (error) {
    console.error("Checkbox toggle integration failed:", error);
    throw error;
  }
  if (!onlyRealInput) await runTableEmptyColumn();
  if (!onlyRealInput) await runEditToolbarCover();
  if (!onlyRealInput) await runTallBlockScroll();
  if (!onlyRealInput) await runBlockActions();
  if (!onlyRealInput) await runFindInPreview();
  try {
    if (process.env.STUDIO_REAL_INPUT_SCENARIO === "comment-contrast") await runCommentContrast();
    else if (process.env.STUDIO_REAL_INPUT_SCENARIO === "comment-title") await runCommentTitle();
    else if (process.env.STUDIO_REAL_INPUT_SCENARIO === "readme-html") await runReadmeHtml();
    else if (process.env.STUDIO_REAL_INPUT_SCENARIO === "toc") await runToc();
    else if (process.env.STUDIO_REAL_INPUT_SCENARIO === "myst-blocks") await runMystBlocks();
    else await runRealInput();
  } catch (error) {
    console.error("Real-input integration failed:", error);
    throw error;
  }
  if (onlyRealInput) return;
  try {
    await runPreviewEditing();
  } catch (error) {
    console.error("Preview editing integration failed:", error);
    throw error;
  }
  await runEditKeys();
  await runPasteUrl();
  await runWindowSwitchKeys();
  await runPreviewHistory();
  await runPaletteMode();
  await runLabelRename();
  await runInlineThread();
  await runBlockMove();
  await runBlockClipboard();
  await runMystPickers();
  await runImagePicker();
  await runImagePaste();
  await runIncomingChanges();
  await runUpdateGlow();
  await runReviewComments();
  await runCommentWrite();
  await runCommentContrast();
  await runCommentTitle();
  await runReadmeHtml();
  await runToc();
  await runMystBlocks();
  await runCommentAnchors();
  await runGenericMarkdown();
  await runDirtySnapshots();
  await runSourceMapping();
  await runLifecycle();
  await runMystDiagnostics();
  await runSerializer();
  await runWorkspaceDisposal();
}
