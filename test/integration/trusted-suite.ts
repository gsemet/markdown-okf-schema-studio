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
import { step, withSuiteWatchdog } from "./stepWatchdog";

// @tests_req SwRS-MDOKFSTUDIO-TRUST-012
export async function run(): Promise<void> {
  await withSuiteWatchdog("trusted-suite", runTrustedSuite);
}

/** The shared preview.md checks: trusted command, page security, styles, dirty buffer, no build. */
async function runPreviewSmoke(): Promise<void> {
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
}

/** A real-input scenario selected by STUDIO_REAL_INPUT_SCENARIO, or the whole real-input campaign. */
async function runRealInputScenario(): Promise<void> {
  const scenario = process.env.STUDIO_REAL_INPUT_SCENARIO;
  if (scenario === "comment-contrast") await runCommentContrast();
  else if (scenario === "comment-title") await runCommentTitle();
  else if (scenario === "readme-html") await runReadmeHtml();
  else if (scenario === "toc") await runToc();
  else if (scenario === "myst-blocks") await runMystBlocks();
  else await runRealInput();
}

/**
 * Every step runs under the hang watchdog (stepWatchdog.ts): a budget per step, `STEP start/done`
 * lines in the log, and a dump that names the step and its last progress marker on a timeout.
 */
async function runTrustedSuite(): Promise<void> {
  assert.equal(vscode.workspace.isTrusted, true);
  await step("setup", async () => {
    await pinStoredWorkspaceChoices();
    // CDP input and the undo steps need a window macOS has activated (windowFocus.ts).
    await ensureTestWindowFocused();
  });
  // The block actions scenario needs no fixture document: it runs before the shared preview.md checks.
  if (process.env.STUDIO_REAL_INPUT_SCENARIO === "paste-url") {
    await step("paste-url", runPasteUrl);
    return;
  }
  if (process.env.STUDIO_REAL_INPUT_SCENARIO === "block-actions") {
    await step("block-actions", runBlockActions);
    return;
  }
  await step("preview-smoke", runPreviewSmoke);

  if (process.env.STUDIO_REAL_INPUT_SCENARIO === "window-switch-keys") {
    await step("window-switch-keys", runWindowSwitchKeys);
    return;
  }
  if (process.env.STUDIO_REAL_INPUT_SCENARIO === "empty-column") {
    await step("table-empty-column", runTableEmptyColumn);
    return;
  }
  if (process.env.STUDIO_REAL_INPUT_SCENARIO === "toolbar-cover") {
    await step("edit-toolbar-cover", runEditToolbarCover);
    await step("tall-block-scroll", runTallBlockScroll);
    return;
  }
  if (process.env.STUDIO_REAL_INPUT_SCENARIO === "find-in-preview") {
    await step("find-in-preview", runFindInPreview);
    return;
  }
  if (process.env.STUDIO_REAL_INPUT_SCENARIO === "tall-block-scroll") {
    await step("tall-block-scroll", runTallBlockScroll);
    return;
  }
  const onlyRealInput = process.env.STUDIO_REAL_INPUT_SCENARIO !== undefined;
  if (!onlyRealInput) {
    await step("project-features", runProjectFeatures);
    await step("stock-coexistence", runStockCoexistence);
  }
  try {
    if (!onlyRealInput) await step("checkbox-toggle", runCheckboxToggle);
  } catch (error) {
    console.error("Checkbox toggle integration failed:", error);
    throw error;
  }
  if (!onlyRealInput) {
    await step("table-empty-column", runTableEmptyColumn);
    await step("edit-toolbar-cover", runEditToolbarCover);
    await step("tall-block-scroll", runTallBlockScroll);
    await step("block-actions", runBlockActions);
    await step("find-in-preview", runFindInPreview);
  }
  try {
    await step("real-input", runRealInputScenario);
  } catch (error) {
    console.error("Real-input integration failed:", error);
    throw error;
  }
  if (onlyRealInput) return;
  try {
    await step("preview-editing", runPreviewEditing);
  } catch (error) {
    console.error("Preview editing integration failed:", error);
    throw error;
  }
  const remainingSteps: ReadonlyArray<readonly [string, () => Promise<void>]> = [
    ["edit-keys", runEditKeys],
    ["paste-url", runPasteUrl],
    ["window-switch-keys", runWindowSwitchKeys],
    ["preview-history", runPreviewHistory],
    ["palette-mode", runPaletteMode],
    ["label-rename", runLabelRename],
    ["inline-thread", runInlineThread],
    ["block-move", runBlockMove],
    ["block-clipboard", runBlockClipboard],
    ["myst-pickers", runMystPickers],
    ["image-picker", runImagePicker],
    ["image-paste", runImagePaste],
    ["incoming-changes", runIncomingChanges],
    ["update-glow", runUpdateGlow],
    ["review-comments", runReviewComments],
    ["comment-write", runCommentWrite],
    ["comment-contrast", runCommentContrast],
    ["comment-title", runCommentTitle],
    ["readme-html", runReadmeHtml],
    ["toc", runToc],
    ["myst-blocks", runMystBlocks],
    ["comment-anchors", runCommentAnchors],
    ["generic-markdown", runGenericMarkdown],
    ["dirty-snapshots", runDirtySnapshots],
    ["source-mapping", runSourceMapping],
    ["lifecycle", runLifecycle],
    ["myst-diagnostics", runMystDiagnostics],
    ["serializer", runSerializer],
    ["workspace-disposal", runWorkspaceDisposal],
  ];
  for (const [name, runRemaining] of remainingSteps) await step(name, runRemaining);
}
