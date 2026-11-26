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
import { run as runRadioChoice } from "./radioChoice.test";
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
import { run as runBlankLines } from "./blankLines.test";
import { run as runEmptyBlocks } from "./emptyBlocks.test";
import { run as runInlineThread } from "./inlineThread.test";
import { run as runLabelRename } from "./labelRename.test";
import { run as runMystPickers } from "./mystPickers.test";
import { run as runPaletteMode } from "./paletteMode.test";
import { run as runPreviewHistory } from "./previewHistory.test";
import { run as runExportHtml } from "./exportHtml.test";
import { run as runEditKeys } from "./editKeys.test";
import { run as runSaveKey } from "./saveKey.test";
import { run as runGridCardEditorBlur } from "./gridCardEditorBlur.test";
import { run as runPasteUrl } from "./pasteUrl.test";
import { run as runDropFiles } from "./dropFiles.test";
import { run as runWindowSwitchKeys } from "./windowSwitchKeys.test";
import { run as runRealInput } from "./realInput/run";
import { run as runDiffPreview } from "./diffPreview.test";
import { run as runDiffPreviewScroll } from "./diffPreviewScroll.test";
import { run as runSidePreviewJump } from "./sidePreviewJump.test";
import { run as runLifecycle } from "./lifecycle.test";
import { run as runMystDiagnostics } from "./mystDiagnostics.test";
import { run as runOpenAtLine } from "./openAtLine.test";
import { run as runOpenAtLineProbe } from "./openAtLineProbe.test";
import { run as runOpenAtLineStudio } from "./openAtLineStudio.test";
import { run as runProjectFeatures } from "./projectFeatures.test";
import { run as runSerializer } from "./serializer.test";
import { run as runSourceMapping } from "./sourceMapping.test";
import { run as runStockCoexistence } from "./stockCoexistence.test";
import { run as runWorkspaceDisposal } from "./workspaceDisposal.test";
import { attribute, findElements, parseHtml } from "../core/render/dom";
import { pinStoredWorkspaceChoices } from "./storedChoices";
import { ensureTestWindowFocused } from "./windowFocus";
import { step, withSuiteWatchdog } from "./stepWatchdog";
import { TRUSTED_PART_STEPS, trustedLaunch, trustedPartFromEnvironment, type TrustedPart, type TrustedStepName } from "../shared/trustedParts";

// @tests_req SwRS-MDOKFSTUDIO-TRUST-012#S1
export async function run(): Promise<void> {
  const launch = trustedLaunch(trustedPartFromEnvironment(process.env));
  // Printed from the part the host received: the log of a green run names each trusted launch.
  console.log(`TRUSTED LAUNCH: ${launch.name}`);
  await withSuiteWatchdog(launch.suite, () => runTrustedSuite(launch.part));
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

// @tests_req SwRS-MDOKFSTUDIO-TRUST-011#S1
// @tests_req SwRS-MDOKFSTUDIO-TRUST-036#S1
// @tests_req SwRS-MDOKFSTUDIO-TRUST-036#S4
/**
 * A reader opens a document with hostile HTML (an inline script, `on*` attributes, an iframe, an
 * object and a `javascript:` link) in the unsaved buffer of preview.md: the page shows the document,
 * runs only the scripts of the Studio (each with a source and the page nonce), keeps no event
 * handler, frame or object, and carries the deny-by-default content security policy with that nonce.
 */
async function runHostilePreview(): Promise<void> {
  const extensionRoot = path.resolve(__dirname, "../../..");
  const fixturePath = path.join(extensionRoot, "test", "integration", "fixtures", "preview.md");
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(fixturePath));
  const originalSource = document.getText();
  const marker = "Hostile document marker";
  const hostile = [
    "# Hostile document", "", `${marker}.`, "",
    "<script>window.hostileRan = true;</script>", "",
    "<img src=\"local-missing.png\" onerror=\"window.hostileRan = true\" alt=\"Hostile image\">", "",
    "<iframe src=\"https://example.invalid/frame\"></iframe>", "",
    "<object data=\"https://example.invalid/object\"></object>", "",
    "<a href=\"javascript:alert(1)\" onclick=\"window.hostileRan = true\">Hostile link</a>", "",
  ].join("\n");
  await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
  const edit = new vscode.WorkspaceEdit();
  edit.replace(document.uri, new vscode.Range(document.positionAt(0), document.positionAt(originalSource.length)), hostile);
  assert.equal(await vscode.workspace.applyEdit(edit), true);
  try {
    await vscode.commands.executeCommand(COMMAND_ID);
    const deadline = Date.now() + 20_000;
    let preview = getActivePreviewForTests();
    while (!(preview?.phase === "ready" && preview.html.includes(marker)) && Date.now() < deadline) {
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
      preview = getActivePreviewForTests();
    }
    assert.ok(preview?.phase === "ready" && preview.html.includes(marker), "the hostile document was not shown");
    const page = parseHtml(preview.html);
    // The deny-by-default policy and its one-time nonce.
    const policyMeta = findElements(page, (element) =>
      element.tagName === "meta" && attribute(element, "http-equiv") === "Content-Security-Policy");
    assert.equal(policyMeta.length, 1, "the page carries one content security policy");
    const policy = attribute(policyMeta[0], "content") ?? "";
    for (const directive of ["default-src 'none'", "connect-src 'none'", "frame-src 'none'", "object-src 'none'"]) {
      assert.ok(policy.includes(directive), `the policy lacks ${directive}`);
    }
    assert.doesNotMatch(policy, /unsafe-inline|unsafe-eval|(?:^|\s)\*(?:\s|;|$)/u);
    const nonce = /'nonce-([^']+)'/u.exec(policy)?.[1];
    assert.ok(nonce, "the policy carries a nonce");
    // The page runs only the scripts of the Studio: each loads a file and carries the nonce.
    const scripts = findElements(page, (element) => element.tagName === "script");
    assert.ok(scripts.length > 0);
    for (const script of scripts) {
      if (attribute(script, "type") === "application/json") continue;
      assert.equal(attribute(script, "nonce"), nonce, "a script runs without the page nonce");
      assert.ok(attribute(script, "src"), "an inline script reached the page");
    }
    // No event handler, frame, object or javascript: link is left.
    const handlers = findElements(page, (element) => element.attrs.some((entry) => /^on/iu.test(entry.name)));
    assert.deepEqual(handlers.map((element) => element.tagName), [], "an on* attribute reached the page");
    assert.deepEqual(
      findElements(page, (element) => ["iframe", "object", "embed", "frame"].includes(element.tagName)).map((element) => element.tagName),
      [],
      "a frame or an object reached the page",
    );
    assert.ok(
      !findElements(page, (element) => element.tagName === "a").some((element) => /^\s*javascript:/iu.test(attribute(element, "href") ?? "")),
      "a javascript: link reached the page",
    );
    const networkReferences = findElements(page, (element) => element.attrs.some((entry) =>
      ["src", "data", "href", "srcset", "poster"].includes(entry.name) && entry.value.includes("example.invalid")));
    assert.deepEqual(networkReferences.map((element) => element.tagName), [], "the page loads from a network address");
  } finally {
    disposeActivePreviewForTests();
    const restore = new vscode.WorkspaceEdit();
    restore.replace(document.uri, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), originalSource);
    await vscode.workspace.applyEdit(restore);
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

async function runSetup(): Promise<void> {
  await pinStoredWorkspaceChoices();
  // CDP input and the undo steps need a window macOS has activated (windowFocus.ts).
  await ensureTestWindowFocused();
}

/** What each step of the trusted window runs. trustedParts.ts says which part runs it, and in which order. */
const STEP_RUNNERS: Readonly<Record<TrustedStepName, () => Promise<unknown>>> = {
  "setup": runSetup,
  "preview-smoke": runPreviewSmoke,
  "project-features": runProjectFeatures,
  "hostile-html": runHostilePreview,
  "stock-coexistence": runStockCoexistence,
  "open-at-line": runOpenAtLine,
  "open-at-line-probe": runOpenAtLineProbe,
  "open-at-line-studio": runOpenAtLineStudio,
  "checkbox-toggle": runCheckboxToggle,
  "radio-choice": runRadioChoice,
  "table-empty-column": runTableEmptyColumn,
  "edit-toolbar-cover": runEditToolbarCover,
  "tall-block-scroll": runTallBlockScroll,
  "block-actions": runBlockActions,
  "find-in-preview": runFindInPreview,
  "real-input": runRealInputScenario,
  "preview-editing": runPreviewEditing,
  "edit-keys": runEditKeys,
  "save-key": runSaveKey,
  "grid-card-editor-blur": runGridCardEditorBlur,
  "paste-url": runPasteUrl,
  "drop-files": runDropFiles,
  "window-switch-keys": runWindowSwitchKeys,
  "preview-history": runPreviewHistory,
  "export-html": runExportHtml,
  "palette-mode": runPaletteMode,
  "label-rename": runLabelRename,
  "inline-thread": runInlineThread,
  "block-move": runBlockMove,
  "block-clipboard": runBlockClipboard,
  "empty-blocks": runEmptyBlocks,
  "blank-lines": runBlankLines,
  "myst-pickers": runMystPickers,
  "image-picker": runImagePicker,
  "image-paste": runImagePaste,
  "incoming-changes": runIncomingChanges,
  "update-glow": runUpdateGlow,
  "review-comments": runReviewComments,
  "comment-write": runCommentWrite,
  "comment-contrast": runCommentContrast,
  "comment-title": runCommentTitle,
  "readme-html": runReadmeHtml,
  "toc": runToc,
  "myst-blocks": runMystBlocks,
  "comment-anchors": runCommentAnchors,
  "generic-markdown": runGenericMarkdown,
  "dirty-snapshots": runDirtySnapshots,
  "source-mapping": runSourceMapping,
  "diff-preview": runDiffPreview,
  "diff-preview-scroll": runDiffPreviewScroll,
  "side-preview-jump": runSidePreviewJump,
  "lifecycle": runLifecycle,
  "myst-diagnostics": runMystDiagnostics,
  "serializer": runSerializer,
  "workspace-disposal": runWorkspaceDisposal,
};

/** The line these steps add to the log in front of their error. */
const FAILURE_LINES: Partial<Record<TrustedStepName, string>> = {
  "checkbox-toggle": "Checkbox toggle integration failed:",
  "real-input": "Real-input integration failed:",
  "preview-editing": "Preview editing integration failed:",
};

async function runNamedStep(name: TrustedStepName): Promise<void> {
  try {
    await step(name, STEP_RUNNERS[name]);
  } catch (error) {
    const failureLine = FAILURE_LINES[name];
    if (failureLine !== undefined) console.error(failureLine, error);
    throw error;
  }
}

/** The steps of the one launch a STUDIO_REAL_INPUT_SCENARIO run makes. */
function scenarioSteps(scenario: string | undefined): readonly TrustedStepName[] {
  // These scenarios need no fixture document: they run without the shared preview.md checks.
  if (scenario === "drop-files" || scenario === "paste-url" || scenario === "block-actions") return ["setup", scenario];
  const opening = ["setup", "preview-smoke"] as const;
  if (scenario === "window-switch-keys") return [...opening, "window-switch-keys"];
  if (scenario === "empty-column") return [...opening, "table-empty-column"];
  if (scenario === "toolbar-cover") return [...opening, "edit-toolbar-cover", "tall-block-scroll"];
  if (scenario === "find-in-preview") return [...opening, "find-in-preview"];
  if (scenario === "tall-block-scroll") return [...opening, "tall-block-scroll"];
  return [...opening, "real-input"];
}

/**
 * Runs one part of the trusted window, or without a part the scenario of STUDIO_REAL_INPUT_SCENARIO.
 * Every step runs under the hang watchdog (stepWatchdog.ts): a budget per step, `STEP start/done`
 * lines in the log, and a dump that names the step and its last progress marker on a timeout.
 */
async function runTrustedSuite(part: TrustedPart | undefined): Promise<void> {
  assert.equal(vscode.workspace.isTrusted, true);
  const steps: readonly TrustedStepName[] = part === undefined
    ? scenarioSteps(process.env.STUDIO_REAL_INPUT_SCENARIO)
    : TRUSTED_PART_STEPS[part];
  for (const name of steps) await runNamedStep(name);
}
