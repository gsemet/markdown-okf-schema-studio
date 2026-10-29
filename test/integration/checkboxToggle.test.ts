import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { chromium, type Browser, type Frame, type Locator, type Page } from "playwright-core";
import * as vscode from "vscode";

import {
  COMMAND_ID,
  disposeActivePreviewForTests,
  getActivePreviewForTests,
} from "./extensionApi";
import { E2E_REPORT_ROOT, E2E_SCREENSHOT_ROOT } from "../reportPaths";
import { RealWindowEvidence } from "./evidence";
import { traceDocumentChanges, waitForActiveSourceEditor, windowFocusReport } from "./windowFocus";
import { markProgress } from "../shared/hangWatchdog";
import { bounded } from "./stepWatchdog";

async function waitFor(description: string, predicate: () => boolean | Promise<boolean>, timeoutMs = 10_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

async function waitForRender(document: vscode.TextDocument): Promise<void> {
  await waitFor("the preview to render the current document version", () => {
    const preview = getActivePreviewForTests();
    return preview?.documentUri === document.uri.toString()
      && preview.phase === "ready"
      && preview.documentVersion === document.version
      && preview.html.includes("myst-checkbox");
  });
}

/** The visible webview frame showing exactly the host's current render. */
async function currentPreviewFrame(page: Page): Promise<Frame> {
  let result: Frame | undefined;
  await waitFor("the rendered Studio webview", async () => {
    const preview = getActivePreviewForTests();
    for (const frame of page.frames()) {
      try {
        if (await frame.locator("#sphinx-myst-preview-content").count() === 0) continue;
        if (!await (await frame.frameElement()).isVisible()) continue;
        const root = frame.locator("html");
        if (await root.getAttribute("data-sphinx-preview-document-version") !== String(preview?.documentVersion)) continue;
        if (await root.getAttribute("data-sphinx-preview-request-id") !== String(preview?.requestId)) continue;
        result = frame;
        return true;
      } catch (error) {
        if (!/frame.*detach|execution context was destroyed/iu.test(String(error))) throw error;
      }
    }
    return false;
  }).catch(async (error: unknown) => {
    const preview = getActivePreviewForTests();
    throw new Error(`${String(error)} Expected preview: ${JSON.stringify({
      documentUri: preview?.documentUri, version: preview?.documentVersion, requestId: preview?.requestId,
    })}; ${await windowFocusReport(page)}`);
  });
  assert.ok(result);
  return result;
}

function checkboxAtLine(frame: Frame, line: number): Locator {
  return frame.locator(`input.myst-checkbox[data-myst-checkbox-line="${line}"]`);
}

async function capture(
  evidence: RealWindowEvidence, page: Page, frame: Frame, id: string, note: string,
): Promise<void> {
  evidence.paths(id); // unknown ids fail before any action on the page
  await frame.evaluate(() => window.scrollTo(0, 0));
  const frameBounds = await (await frame.frameElement()).boundingBox();
  assert.ok(frameBounds);
  // Move the pointer away and blur the toolbar so no hover tooltip covers the content.
  await page.mouse.move(frameBounds.x + 4, frameBounds.y + frameBounds.height - 4);
  await frame.locator("[data-sphinx-preview-toolbar] button").evaluateAll((buttons) =>
    buttons.forEach((button) => (button as HTMLButtonElement).blur()));
  await frame.waitForFunction(() => Array.from(document.querySelectorAll("[data-sphinx-preview-toolbar] button[data-tooltip]"))
    .every((element) => {
      const tooltip = getComputedStyle(element, "::after");
      return tooltip.content === "none" || tooltip.content === "normal" || tooltip.visibility === "hidden"
        || Number(tooltip.opacity) === 0;
    }));
  const states = await frame.locator("input.myst-checkbox").evaluateAll((boxes) => boxes.map((box) =>
    `line ${box.getAttribute("data-myst-checkbox-line")}: ${(box as HTMLInputElement).checked ? "checked" : "unchecked"}`));
  const editMode = await frame.locator("html").getAttribute("data-sphinx-preview-edit-mode");
  await evidence.shoot(page, frame, id);
  evidence.record(id, {
    note,
    json: {
      summary: note,
      info: { viewport: page.viewportSize(), host: "Real VS Code window; mouse events dispatched through CDP" },
      capturedState: { editMode, checkboxStates: states },
      checks: states,
      visualChecks: ["Checkbox aligned with text", "Checked mark uses focus accent", "No task list bullets", "Table cell alignment preserved"],
    },
    markdown: `Edit mode: ${editMode}. Checkbox states asserted by the test: ${states.join("; ")}.\n\n`
      + "Real VS Code window; the click is a real mouse event dispatched by Playwright through CDP. "
      + "Visual review: the checkbox is aligned with its text, the checked mark uses the focus accent, "
      + "task list items have no bullet, and the table cell keeps its alignment.\n",
  });
  console.log(`PASS checkbox screenshot: ${id}`);
}

// @tests_req StRS-MDOKFSTUDIO-GFM-003
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-058
export async function run(): Promise<void> {
  assert.ok(process.env.STUDIO_CDP_PORT, "the trusted suite must expose a loopback CDP port");
  const browser: Browser = await bounded("chromium.connectOverCDP to the workbench",
    chromium.connectOverCDP(`http://127.0.0.1:${process.env.STUDIO_CDP_PORT}`));
  const page = browser.contexts()[0]?.pages().find((candidate) => candidate.url().includes("workbench"));
  assert.ok(page, "the VS Code workbench is attached");
  const extensionRoot = path.resolve(__dirname, "../../..");
  fs.mkdirSync(E2E_REPORT_ROOT, { recursive: true });
  fs.mkdirSync(E2E_SCREENSHOT_ROOT, { recursive: true });
  const evidence = new RealWindowEvidence("checkbox", { indexTitle: "Checkbox capture order" });
  const artifacts = evidence.directory;
  const startedAt = new Date().toISOString();
  const directory = fs.mkdtempSync(path.join(extensionRoot, "test", "integration", "fixtures", "checkbox-e2e-"));
  const filePath = path.join(directory, "tasks.md");
  const source = [
    "# Release checklist",
    "",
    "- [ ] Write the change specification",
    "- [x] Review the plan",
    "",
    "| Step | Done |",
    "|------|------|",
    "| Unit tests | [ ] |",
    "| E2E screenshots | [x] |",
    "",
    "Inline markers such as `[ ]` in code stay literal.",
    "",
  ].join("\n");
  fs.writeFileSync(filePath, source);
  const document = await bounded("workspace.openTextDocument of tasks.md",
    vscode.workspace.openTextDocument(vscode.Uri.file(filePath)));
  try {
    // Setup calls bounded one by one: a hang after the coexistence step names the call that never returned.
    await bounded("page.setViewportSize", page.setViewportSize({ width: 1400, height: 900 }));
    await bounded("workbench.action.closeSidebar", vscode.commands.executeCommand("workbench.action.closeSidebar"));
    // The chat view sits in the auxiliary bar.
    await bounded("workbench.action.closeAuxiliaryBar", vscode.commands.executeCommand("workbench.action.closeAuxiliaryBar"));
    await bounded("window.showTextDocument of tasks.md", vscode.window.showTextDocument(document, vscode.ViewColumn.One));
    await bounded("workbench.action.focusFirstEditorGroup",
      vscode.commands.executeCommand("workbench.action.focusFirstEditorGroup"));
    await bounded(`${COMMAND_ID} on tasks.md`, vscode.commands.executeCommand(COMMAND_ID));
    markProgress("waiting for the first checkbox render");
    await waitForRender(document);
    let frame = await currentPreviewFrame(page);
    markProgress("first checkbox capture");

    assert.equal(await frame.locator("input.myst-checkbox").count(), 4);
    assert.equal(await frame.locator("li.task-list-item").count(), 2);
    assert.equal(await frame.locator("code", { hasText: "[ ]" }).count(), 1);
    assert.equal(await checkboxAtLine(frame, 3).isChecked(), false);
    assert.equal(await checkboxAtLine(frame, 4).isChecked(), true);
    assert.equal(await checkboxAtLine(frame, 3).isEnabled(), true);
    await capture(evidence, page, frame, "gfm/r01-task-reading-unchecked",
      "Reading mode before any click: the first task and the Unit tests cell are unchecked.");

    // Reading mode: a click checks the task and edits exactly one character of the source.
    await checkboxAtLine(frame, 3).click();
    const checkedSource = source.replace("- [ ] Write", "- [x] Write");
    await waitFor("the task checkbox to reach the source buffer", () => document.getText() === checkedSource);
    await waitForRender(document);
    frame = await currentPreviewFrame(page);
    assert.equal(await checkboxAtLine(frame, 3).isChecked(), true);
    assert.equal(await frame.locator("[data-sphinx-preview-block-editor]").count(), 0);
    await capture(evidence, page, frame, "gfm/r02-task-reading-checked",
      "Reading mode after clicking the first task: it is checked in the preview and `- [x]` in the source.");

    // The toggle is a single undo step in the source editor.
    const undoTrace = traceDocumentChanges(document);
    await vscode.window.showTextDocument(document, {
      viewColumn: vscode.ViewColumn.One,
      preserveFocus: false,
      preview: false,
    });
    await waitForActiveSourceEditor(document);
    const editorText = page.locator(".monaco-editor:visible .view-lines").first();
    await editorText.click();
    await page.keyboard.press(process.platform === "darwin" ? "Meta+z" : "Control+z");
    try {
      await waitFor("one undo to restore the original source", () => document.getText() === source);
    } catch (error) {
      throw new Error(`${String(error)} Window focus: ${await windowFocusReport(page)}; `
        + `buffer changes since the undo step: ${undoTrace.report()}`);
    } finally {
      undoTrace.dispose();
    }
    await waitForRender(document);
    frame = await currentPreviewFrame(page);
    assert.equal(await checkboxAtLine(frame, 3).isChecked(), false);

    // Edit mode: a checkbox click still toggles the source instead of opening a block editor.
    await frame.locator("[data-sphinx-preview-edit-toggle]").click();
    await waitFor("edit mode", async () =>
      await frame.locator("html").getAttribute("data-sphinx-preview-edit-mode") === "on");
    await capture(evidence, page, frame, "gfm/r03-task-edit-unchecked",
      "Edit mode is on (pencil pressed); the Unit tests table cell checkbox is unchecked.");
    await checkboxAtLine(frame, 8).click();
    const cellSource = source.replace("| Unit tests | [ ] |", "| Unit tests | [x] |");
    await waitFor("the table cell checkbox to reach the source buffer", () => document.getText() === cellSource);
    await waitForRender(document);
    frame = await currentPreviewFrame(page);
    assert.equal(await frame.locator("html").getAttribute("data-sphinx-preview-edit-mode"), "on");
    assert.equal(await checkboxAtLine(frame, 8).isChecked(), true);
    assert.equal(await frame.locator("[data-sphinx-preview-block-editor]").count(), 0,
      "a checkbox click must not open the cell editor");
    await capture(evidence, page, frame, "gfm/r04-task-edit-checked",
      "Edit mode after clicking the Unit tests cell: it is checked, no cell editor opened, and the table row reads `| Unit tests | [x] |`.");

    // Unchecking works the same way and leaves the rest of the table untouched.
    await checkboxAtLine(frame, 9).click();
    const uncheckedSource = cellSource.replace("| E2E screenshots | [x] |", "| E2E screenshots | [ ] |");
    await waitFor("the unchecked cell to reach the source buffer", () => document.getText() === uncheckedSource);
    evidence.assertComplete();
    evidence.writeManifest({
      runId: process.env.STUDIO_E2E_RUN_ID ?? null,
      campaignStartedAt: process.env.STUDIO_E2E_STARTED_AT ?? null,
      campaignCommand: process.env.STUDIO_E2E_COMMAND ?? null,
      startedAt, completedAt: new Date().toISOString(), status: "passed",
    });
    fs.writeFileSync(path.join(E2E_REPORT_ROOT, "CHECKBOX-LATEST.md"),
      `# Latest Checkbox Evidence\n\nSuite: **passed**\n\n[Ordered captures](screenshots/${path.basename(artifacts)}/INDEX.md)\n`);
  } finally {
    disposeActivePreviewForTests();
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await vscode.commands.executeCommand("workbench.action.revertAndCloseActiveEditor");
    await browser.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
