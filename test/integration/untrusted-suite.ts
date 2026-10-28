import * as assert from "node:assert/strict";
import * as fs from "node:fs";
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
import { closeAllEditors, connectWorkbench, createEvidence } from "./realInput/harness";
import { scenarioUntrustedReadOnly } from "./realWindowGaps";
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
 * The real-window capture of this window (CR 043): the read-only side preview of Restricted Mode,
 * through the window's own loopback CDP port. In stress mode (`just ci-stress`) it runs the rounds
 * of the untrusted stress plan instead, each round with its own evidence folder.
 */
async function runCaptures(): Promise<void> {
  const { browser, page } = await connectWorkbench();
  try {
    await page.setViewportSize({ width: 1400, height: 900 });
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
            await scenarioUntrustedReadOnly(page, evidence);
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
      await scenarioUntrustedReadOnly(page, evidence);
      passed = true;
    } finally {
      evidence.finish(passed, passed);
    }
  } finally {
    await browser.close();
  }
}

// @tests_req StRS-MDOKFSTUDIO-TRUST-001
// @tests_req SwRS-MDOKFSTUDIO-TRUST-005
// @tests_req SwRS-MDOKFSTUDIO-TRUST-001
// @tests_req SwRS-MDOKFSTUDIO-TRUST-006
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
    assert.equal(commandPreview.readOnly, true);
    assert.match(commandPreview.html, /<button[^>]*data-sphinx-preview-edit-toggle[^>]*aria-disabled="true"[^>]*title="Editing is unavailable: this file is not in a trusted workspace"/u);
    // A read-only preview does not store a palette mode (the page cannot post it; the host refuses).
    await sendPreviewMessageForTests({
      type: "previewPaletteModeChanged",
      documentId: commandPreview.documentUri,
      revision: commandPreview.documentVersion,
      requestId: commandPreview.requestId,
      mode: "strict",
    });
    // A read-only preview never opens the image dialog.
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
    assert.equal(dialogCalls, 0, "the untrusted preview must not open the image dialog");
    // A read-only preview never writes a pasted image.
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
    assert.deepEqual(fs.readdirSync(folder), before, "the untrusted preview must not write a pasted image");
    await runBlockMoveUntrusted(commandPreview, document);
    await runBlockClipboardUntrusted(commandPreview, document);
    await runCommentWriteUntrusted(commandPreview, document);
    await vscode.commands.executeCommand("vscode.openWith", document.uri, EDITOR_VIEW_TYPE);
    await waitForPreview();
    const editorPreview = getActivePreviewForTests();
    assert.ok(editorPreview);
    assert.equal(editorPreview.readOnly, true);
    assert.match(editorPreview.html, /"initialPaletteMode":"gfm"/u, "the refused message stored nothing: the default GFM mode");
    assert.match(editorPreview.html, /<button[^>]*data-sphinx-preview-edit-toggle[^>]*aria-disabled="true"/u);
    disposeActivePreviewForTests();
    await runMystDiagnostics();
  } finally {
    disposeActivePreviewForTests();
  }
  await runCaptures();
}
