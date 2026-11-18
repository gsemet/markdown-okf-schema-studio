import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as vscode from "vscode";

import {
  COMMAND_ID,
  sendPreviewMessageForTests,
  disposeActivePreviewForTests,
  EDITOR_VIEW_TYPE,
  getActivePreviewForTests,
} from "./extensionApi";
import { runUntrusted as runBlockMoveUntrusted } from "./blockMove.test";
import { runUntrusted as runBlockClipboardUntrusted } from "./blockClipboard.test";
import { runUntrusted as runCommentWriteUntrusted } from "./commentWrite.test";
import { runUntrusted as runMystDiagnostics } from "./mystDiagnostics.test";
import { closeAllEditors, connectWorkbench, createEvidence, setViewport } from "./realInput/harness";
import { scenarioRestrictedEdit } from "./realWindowGaps";
import { attribute, findElements, parseHtml } from "../core/render/dom";
import { hostStressPlan } from "../shared/stressPlan";
import { ensureTestWindowFocused } from "./windowFocus";
import { withSuiteWatchdog } from "./stepWatchdog";

async function waitForPreview(): Promise<void> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const preview = getActivePreviewForTests();
    if (preview?.phase === "ready" && preview.status === "success") {
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Timed out waiting for the untrusted preview to render.");
}

/**
 * The real-window capture of this window (CR 043): the editable side preview of Restricted Mode,
 * through the window's own loopback CDP port. In stress mode (`just ci-stress`) it runs the rounds
 * of the untrusted stress plan instead, each round with its own evidence folder.
 */
async function runCaptures(): Promise<void> {
  const { browser, page } = await connectWorkbench();
  try {
    await setViewport(page, { width: 1400, height: 900 });
    await vscode.commands.executeCommand("workbench.action.closeSidebar");
    await vscode.commands.executeCommand("workbench.action.closeAuxiliaryBar");
    await closeAllEditors();
    if (process.env.STUDIO_REAL_INPUT_SCENARIO === "stress") {
      const plan = hostStressPlan(process.env, "untrusted", 10);
      if (plan === undefined) {
        console.log("stress: no scenario of the untrusted window was asked for");
        return;
      }
      console.log(`stress: ${plan.repeat} round(s) of ${plan.scenarios.join(", ")}`);
      for (let round = 1; round <= plan.repeat; round += 1) {
        const evidence = createEvidence("untrusted");
        let passed = false;
        try {
          const started = Date.now();
          try {
            await scenarioRestrictedEdit(page, evidence);
          } catch (error) {
            throw new Error(`stress round ${round}/${plan.repeat}, scenario untrusted-read-only: `
              + `${error instanceof Error ? error.message : String(error)}`, { cause: error });
          }
          console.log(`PASS stress ${round}/${plan.repeat} untrusted-read-only (${Date.now() - started} ms)`);
          passed = true;
        } finally {
          evidence.finish(passed, false);
        }
      }
      console.log(`stress: ${plan.repeat} round(s) passed`);
      return;
    }
    const evidence = createEvidence("untrusted");
    let passed = false;
    try {
      await scenarioRestrictedEdit(page, evidence);
      passed = true;
    } finally {
      evidence.finish(passed, passed);
    }
  } finally {
    await browser.close();
  }
}

// @tests_req StRS-MDOKFSTUDIO-TRUST-004
// @tests_req SwRS-MDOKFSTUDIO-TRUST-025
/**
 * Restricted Mode loads a local image only from the allowed folders: an image beside the document
 * is shown from a webview address, and an existing image outside the workspace, named by a relative
 * path that leaves it, is refused (no element points to it, and the refusal is a diagnostic).
 */
async function runRestrictedImages(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders![0].uri.fsPath;
  const fixtures = path.join(workspaceFolder, "test", "integration", "fixtures");
  const documentFolder = fs.mkdtempSync(path.join(fixtures, "restricted-images-"));
  // The outside image lies in no workspace folder: os.tmpdir(), or the home folder when the
  // workspace holds the temporary folder (as in standalone-suite.ts).
  const parent = [os.tmpdir(), os.homedir()].find((candidate) =>
    !vscode.workspace.getWorkspaceFolder(vscode.Uri.file(path.join(candidate, "probe.png")))) ?? os.homedir();
  const outsideFolder = fs.mkdtempSync(path.join(parent, "markdown-okf-schema-outside-"));
  const logo = path.join(fixtures, "markdown-logo.png");
  fs.copyFileSync(logo, path.join(documentFolder, "inside.png"));
  fs.copyFileSync(logo, path.join(outsideFolder, "outside.png"));
  const outsideRequest = path.relative(documentFolder, path.join(outsideFolder, "outside.png")).split(path.sep).join("/");
  const sourcePath = path.join(documentFolder, "images.md");
  fs.writeFileSync(sourcePath, ["# Images", "", "![Inside image](inside.png)", "", `![Outside image](${outsideRequest})`, ""].join("\n"));
  try {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(sourcePath));
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await vscode.commands.executeCommand(COMMAND_ID);
    const deadline = Date.now() + 10_000;
    let preview = getActivePreviewForTests();
    while (!(preview?.documentUri === document.uri.toString() && preview.phase === "ready" && preview.status === "success")
      && Date.now() < deadline) {
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
      preview = getActivePreviewForTests();
    }
    assert.ok(preview?.documentUri === document.uri.toString() && preview.phase === "ready", "the Restricted Mode preview did not render");
    assert.equal(preview.restrictedReads, true);
    const images = findElements(parseHtml(preview.html), (element) => element.tagName === "img");
    const inside = images.find((element) => attribute(element, "alt") === "Inside image");
    assert.ok(inside, "the image beside the document is not in the page");
    const insideSource = attribute(inside, "src") ?? "";
    assert.match(insideSource, /inside\.png/u);
    assert.notEqual(insideSource, "inside.png", "the image beside the document is not loaded from a webview address");
    assert.ok(
      preview.localResourceRoots.some((root) => path.normalize(root.fsPath).toLowerCase() === path.normalize(documentFolder).toLowerCase()),
      "the folder of the document is not an allowed folder of the page",
    );
    assert.ok(
      !images.some((element) => (attribute(element, "src") ?? "").includes("outside.png")),
      "the image outside the workspace is loaded",
    );
    assert.ok(
      !preview.localResourceRoots.some((root) => path.normalize(root.fsPath).toLowerCase() === path.normalize(outsideFolder).toLowerCase()),
      "the folder outside the workspace is an allowed folder of the page",
    );
    assert.ok(
      preview.diagnostics.some((diagnostic) => (diagnostic.value ?? "").includes("outside.png")),
      `the refused image is not reported: ${JSON.stringify(preview.diagnostics)}`,
    );
  } finally {
    disposeActivePreviewForTests();
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    fs.rmSync(documentFolder, { recursive: true, force: true });
    fs.rmSync(outsideFolder, { recursive: true, force: true });
  }
}

// @tests_req StRS-MDOKFSTUDIO-TRUST-001
// @tests_req SwRS-MDOKFSTUDIO-TRUST-005
// @tests_req SwRS-MDOKFSTUDIO-TRUST-001
// @tests_req SwRS-MDOKFSTUDIO-TRUST-005
export async function run(): Promise<void> {
  // Heartbeat and timeout dumps of the hang watchdog (stepWatchdog.ts).
  await withSuiteWatchdog("untrusted-suite", runUntrustedSuite);
}

async function runUntrustedSuite(): Promise<void> {
  assert.equal(vscode.workspace.isTrusted, false);
  // A development extension is not disabled in Restricted Mode, a packaged one is unless its manifest
  // declares the limited support: this window cannot tell, so it checks the declaration VS Code reads.
  const installed = vscode.extensions.getExtension("GaetanSemet.markdown-okf-schema-studio");
  assert.equal(installed?.packageJSON.capabilities?.untrustedWorkspaces?.supported, "limited");
  // CDP input needs a window macOS has activated (windowFocus.ts).
  await ensureTestWindowFocused();
  if (process.env.STUDIO_REAL_INPUT_SCENARIO === "stress") {
    await runCaptures();
    return;
  }
  await runRestrictedImages();
  try {
    const fixturePath = vscode.Uri.file(
      vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, "test/integration/fixtures/preview.md").fsPath,
    );
    const document = await vscode.workspace.openTextDocument(fixturePath);
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await vscode.commands.executeCommand(COMMAND_ID);
    await waitForPreview();
    const commandPreview = getActivePreviewForTests();
    assert.ok(commandPreview);
    assert.equal(commandPreview.restrictedReads, true);
    assert.match(commandPreview.html, /<button[^>]*data-sphinx-preview-edit-toggle/u);
    assert.doesNotMatch(commandPreview.html, /<button[^>]*data-sphinx-preview-edit-toggle[^>]*aria-disabled/u,
      "Restricted Mode keeps the Edit button enabled: trust never makes a document read-only");
    // Restricted Mode stores the palette mode like a trusted workspace.
    await sendPreviewMessageForTests({
      type: "previewPaletteModeChanged",
      documentId: commandPreview.documentUri,
      revision: commandPreview.documentVersion,
      requestId: commandPreview.requestId,
      mode: "strict",
    });
    // Restricted Mode opens the image dialog (the user picks the file; nothing is read before).
    const windowApi = vscode.window as unknown as { showOpenDialog: typeof vscode.window.showOpenDialog };
    const originalDialog = windowApi.showOpenDialog;
    let dialogCalls = 0;
    windowApi.showOpenDialog = (async () => { dialogCalls += 1; return undefined; }) as typeof originalDialog;
    try {
      await sendPreviewMessageForTests({
        type: "previewPickImage",
        documentId: commandPreview.documentUri,
        revision: commandPreview.documentVersion,
        requestId: commandPreview.requestId,
        editId: "untrusted-image",
      });
    } finally {
      windowApi.showOpenDialog = originalDialog;
    }
    assert.equal(dialogCalls, 1, "the Restricted Mode preview opens the image dialog");
    // Restricted Mode writes a pasted image in the folder of the document, as a trusted workspace does.
    const folder = path.dirname(document.uri.fsPath);
    const before = fs.readdirSync(folder);
    await sendPreviewMessageForTests({
      type: "previewPasteImage",
      documentId: commandPreview.documentUri,
      revision: commandPreview.documentVersion,
      requestId: commandPreview.requestId,
      editId: "untrusted-paste",
      mime: "image/png",
      dataBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    });
    const added = fs.readdirSync(folder).filter((name) => !before.includes(name));
    assert.deepEqual(added, ["image.png"], "the Restricted Mode preview writes the pasted image next to the document");
    for (const name of added) fs.rmSync(path.join(folder, name), { force: true });
    await runBlockMoveUntrusted(commandPreview, document);
    await runBlockClipboardUntrusted(commandPreview, document);
    await runCommentWriteUntrusted(commandPreview, document);
    await vscode.commands.executeCommand("vscode.openWith", document.uri, EDITOR_VIEW_TYPE);
    await waitForPreview();
    const editorPreview = getActivePreviewForTests();
    assert.ok(editorPreview);
    assert.equal(editorPreview.restrictedReads, true);
    assert.match(editorPreview.html, /"initialPaletteMode":"strict"/u, "Restricted Mode stored the palette mode the page chose");
    assert.doesNotMatch(editorPreview.html, /<button[^>]*data-sphinx-preview-edit-toggle[^>]*aria-disabled/u);
    disposeActivePreviewForTests();
    await runMystDiagnostics();
  } finally {
    disposeActivePreviewForTests();
  }
  await runCaptures();
}
