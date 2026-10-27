import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { chromium, type Browser, type Frame, type Page } from "playwright-core";
import * as vscode from "vscode";

import {
  COMMAND_ID,
  disposeActivePreviewForTests,
  getActivePreviewForTests,
  storeWorkspaceChoicesForTests,
} from "./extensionApi";
import { E2E_REPORT_ROOT } from "../reportPaths";
import { pinStoredWorkspaceChoices } from "./storedChoices";
import { ensureTestWindowFocused } from "./windowFocus";

async function waitFor(
  description: string,
  predicate: () => boolean | Promise<boolean>,
  timeoutMs = 15_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

/** The first Studio webview frame that is showing now (the page may re-render between steps). */
async function liveFrame(page: Page): Promise<Frame> {
  for (const frame of page.frames()) {
    try {
      if (await frame.locator("#sphinx-myst-preview-content").count() === 0) continue;
      if (await (await frame.frameElement()).isVisible()) return frame;
    } catch {
      // a frame that detaches while it is probed is not the live one
    }
  }
  throw new Error("no visible Studio webview frame");
}

const SOURCE = [
  "# Studio field notes", "",
  "The Studio preview shows the rendered page, and the studio keeps the source untouched.", "",
  ":::{note}",
  "Admonitions are searched too: the note mentions the Studio once more.",
  ":::", "",
  "| Item | Remark |",
  "| --- | --- |",
  "| One | the studio table cell |",
  "| Two | nothing here |", "",
  "## Details", "",
  "A hidden gem lives in this section, next to a [studio link](https://example.com/studio).", "",
  "Inline math $studio + 1$ is not replaceable from the preview.", "",
  "## Closing", "",
  "Last words about the Studio.", "",
].join("\n");

const DARK_THEME = "Default Dark Modern";
const LIGHT_THEME = "Default Light Modern";

/**
 * CR 144: find and replace in the preview, in a real VS Code window. `STUDIO_FIND_PHASE=before`
 * only takes the screenshots (on the code that has no find bar), anything else runs the checks and
 * takes the "after" screenshots into `STUDIO_FIND_SHOTS` (default: the e2e report folder).
 */
// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-009
// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-010
// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-011
// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-012
// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-014
export async function run(): Promise<void> {
  assert.ok(process.env.STUDIO_CDP_PORT, "the trusted suite must expose a loopback CDP port");
  const before = process.env.STUDIO_FIND_PHASE === "before";
  await vscode.extensions.getExtension("GaetanSemet.markdown-okf-schema-studio")?.activate();
  await ensureTestWindowFocused();
  const browser: Browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.STUDIO_CDP_PORT}`);
  const page = browser.contexts()[0]?.pages().find((candidate) => candidate.url().includes("workbench"));
  assert.ok(page, "the VS Code workbench is attached");
  const extensionRoot = path.resolve(__dirname, "../../..");
  const shotDirectory = process.env.STUDIO_FIND_SHOTS ?? path.join(E2E_REPORT_ROOT, "find-in-preview");
  fs.mkdirSync(shotDirectory, { recursive: true });
  const directory = fs.mkdtempSync(path.join(extensionRoot, "test", "integration", "fixtures", "find-e2e-"));
  const filePath = path.join(directory, "field-notes.md");
  fs.writeFileSync(filePath, SOURCE);
  const workbench = vscode.workspace.getConfiguration("workbench");
  const originalTheme = workbench.inspect<string>("colorTheme")?.workspaceValue;
  const notes = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
  const find = process.platform === "darwin" ? "Meta+F" : "Control+F";
  const shoot = async (name: string): Promise<void> => {
    await page.mouse.move(5, 5);
    await page.screenshot({ path: path.join(shotDirectory, `${before ? "before" : "after"}-${name}.png`) });
  };
  const openPreview = async (mode: "cream" | "dark", hostTheme: string): Promise<Frame> => {
    await storeWorkspaceChoicesForTests({ previewThemeMode: mode, toolbarCollapsed: false, paletteMode: "myst" });
    await workbench.update("colorTheme", hostTheme, vscode.ConfigurationTarget.Workspace);
    await page.setViewportSize({ width: 1100, height: 760 });
    await vscode.commands.executeCommand("workbench.action.closeSidebar");
    await vscode.commands.executeCommand("workbench.action.closeAuxiliaryBar");
    await vscode.window.showTextDocument(notes, vscode.ViewColumn.One);
    await vscode.commands.executeCommand("workbench.action.focusFirstEditorGroup");
    await vscode.commands.executeCommand(COMMAND_ID);
    await waitFor("the rendered preview", async () => {
      const preview = getActivePreviewForTests();
      if (preview?.documentUri !== notes.uri.toString() || preview.phase !== "ready") return false;
      const frame = await liveFrame(page).catch(() => undefined);
      return frame !== undefined && await frame.locator("html").getAttribute("data-sphinx-preview-theme-mode") === mode;
    }, 30_000);
    return liveFrame(page);
  };
  const closePreview = async (): Promise<void> => {
    disposeActivePreviewForTests();
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  };
  try {
    // Cream: the find bar over the page.
    let frame = await openPreview("cream", LIGHT_THEME);
    await frame.locator("h1").first().click();
    await waitFor("the preview frame to hold the keyboard focus", async () =>
      await (await liveFrame(page)).evaluate(() => document.hasFocus()));
    await page.keyboard.press(find);
    if (before) {
      await new Promise<void>((resolve) => setTimeout(resolve, 600));
      await page.keyboard.type("studio");
      await new Promise<void>((resolve) => setTimeout(resolve, 600));
      await shoot("cream-find");
      await closePreview();
      frame = await openPreview("dark", DARK_THEME);
      await frame.locator("h1").first().click();
      await page.keyboard.press(find);
      await page.keyboard.type("studio");
      await new Promise<void>((resolve) => setTimeout(resolve, 600));
      await shoot("dark-find");
      return;
    }

    const bar = (live: Frame) => live.locator("[data-sphinx-preview-find]");
    await waitFor("the find bar", async () => await bar(await liveFrame(page)).isVisible());
    await waitFor("the find field to hold the focus", async () =>
      await (await liveFrame(page)).evaluate(() => document.activeElement?.hasAttribute("data-find-input") === true));
    await page.keyboard.type("studio");
    const count = async (): Promise<string> => (await (await liveFrame(page)).locator("[data-find-count]").textContent()) ?? "";
    // Headline, paragraph x2, admonition, table, link, math, last words: "studio" in any case.
    await waitFor("the match count", async () => /^1 of \d+$/u.test(await count()));
    const total = Number((await count()).split(" of ")[1]);
    assert.ok(total >= 7, `matches in rendered text (tables, admonitions, links): ${total}`);
    assert.equal(await (await liveFrame(page)).evaluate(() => CSS.highlights.get("studio-find")?.size ?? 0), total);
    await page.keyboard.press("Enter");
    assert.equal(await count(), `2 of ${total}`);
    await page.keyboard.press("Shift+Enter");
    assert.equal(await count(), `1 of ${total}`);
    await shoot("cream-find");

    // The native find of VS Code did not open; the source is unchanged.
    assert.equal(await page.locator(".webview-find-widget:visible").count(), 0, "the native webview find stayed closed");
    assert.equal(notes.getText(), SOURCE);

    // Match case narrows the matches; Escape closes the bar.
    await (await liveFrame(page)).locator("[data-find-case]").click();
    await waitFor("a narrower count", async () => Number((await count()).split(" of ")[1]) < total);
    await (await liveFrame(page)).locator("[data-find-case]").click();
    await page.keyboard.press("Escape");
    await waitFor("the bar to close", async () => !(await bar(await liveFrame(page)).isVisible()));

    // A match inside a folded section unfolds it.
    frame = await liveFrame(page);
    await frame.locator("h2", { hasText: "Details" }).locator("[data-okf-fold-toggle]").click();
    await waitFor("the section to fold", async () =>
      await (await liveFrame(page)).locator("h2", { hasText: "Details" }).getAttribute("data-okf-fold") === "closed");
    await page.keyboard.press(find);
    await page.keyboard.type("hidden gem");
    await waitFor("the section to unfold", async () =>
      await (await liveFrame(page)).locator("h2", { hasText: "Details" }).getAttribute("data-okf-fold") === "open");
    assert.equal(await count(), "1 of 1");

    // Replace all: the matched spans only, one undo step; math, link target and the like are skipped.
    await (await liveFrame(page)).locator("[data-find-input]").fill("studio");
    await (await liveFrame(page)).locator("[data-find-case]").click();
    await (await liveFrame(page)).locator("[data-find-toggle-replace]").click();
    await (await liveFrame(page)).locator("[data-find-replace-input]").fill("atelier");
    await shoot("cream-replace");
    await (await liveFrame(page)).locator("[data-find-replace-all]").click();
    await waitFor("the document to change", () => notes.getText() !== SOURCE);
    const replaced = SOURCE
      .replace("and the studio keeps", "and the atelier keeps")
      .replace("the studio table cell", "the atelier table cell");
    assert.equal(notes.getText(), replaced);
    assert.match(await (await liveFrame(page)).locator("[data-find-note]").textContent() ?? "",
      /cannot be replaced from the preview/u);
    await vscode.commands.executeCommand("workbench.action.focusFirstEditorGroup");
    await vscode.window.showTextDocument(notes, vscode.ViewColumn.One);
    await vscode.commands.executeCommand("undo");
    await waitFor("one undo step to restore the source", () => notes.getText() === SOURCE);
    await closePreview();

    // Dark.
    frame = await openPreview("dark", DARK_THEME);
    await frame.locator("h1").first().click();
    await page.keyboard.press(find);
    await waitFor("the find bar", async () => await bar(await liveFrame(page)).isVisible());
    await page.keyboard.type("studio");
    await waitFor("the match count", async () => /^1 of \d+$/u.test(await count()));
    await (await liveFrame(page)).locator("[data-find-toggle-replace]").click();
    await (await liveFrame(page)).locator("[data-find-replace-input]").fill("atelier");
    await shoot("dark-find");
  } finally {
    disposeActivePreviewForTests();
    await pinStoredWorkspaceChoices();
    await workbench.update("colorTheme", originalTheme, vscode.ConfigurationTarget.Workspace);
    await vscode.window.showTextDocument(notes, vscode.ViewColumn.One);
    await vscode.commands.executeCommand("workbench.action.revertAndCloseActiveEditor");
    await browser.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
