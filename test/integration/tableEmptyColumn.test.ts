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

async function waitFor(description: string, predicate: () => boolean | Promise<boolean>, timeoutMs = 15_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

/** The visible webview frame that shows exactly the host's current render. */
async function currentPreviewFrame(page: Page, document: vscode.TextDocument): Promise<Frame> {
  let result: Frame | undefined;
  await waitFor("the rendered Studio webview", async () => {
    const preview = getActivePreviewForTests();
    if (preview?.documentUri !== document.uri.toString() || preview.phase !== "ready"
      || preview.documentVersion !== document.version) return false;
    for (const frame of page.frames()) {
      try {
        if (await frame.locator("#sphinx-myst-preview-content").count() === 0) continue;
        if (!await (await frame.frameElement()).isVisible()) continue;
        const root = frame.locator("html");
        if (await root.getAttribute("data-sphinx-preview-request-id") !== String(preview.requestId)) continue;
        result = frame;
        return true;
      } catch (error) {
        if (!/frame.*detach|execution context was destroyed/iu.test(String(error))) throw error;
      }
    }
    return false;
  });
  assert.ok(result);
  return result;
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
  "# Roles", "",
  "| Role | Count | Model | Never |",
  "| --- | --- | --- | --- |",
  "| User | 1 | — | — |",
  "| Main session | 1 | Opus | starts drivers, lands CRs, edits a CR worktree |",
  "| Orchestrator | 1 | Sonnet | runs long commands, codes, reviews, commits, merges PRs |",
  "| CR driver | 1 per CR | Sonnet | codes, reviews, touches another CR |",
  "| Coder | 1 per round | Sonnet | commits, pushes, lives past its round |",
  "| Reviewer | 1 per round | Sonnet | edits files, lives past its round |",
  "",
].join("\n");

/**
 * CR 113: in a real window, with the cream preview theme on a dark VS Code theme, the toolbar "Col right"
 * adds a column with an empty header; in edit mode that column and the selected cell stay usable
 * (empty column at least 8em, the edited cell at least 300 px, the editor not clipped).
 */
// @tests_req SwRS-MDOKFSTUDIO-TABLE-006
export async function run(): Promise<void> {
  assert.ok(process.env.STUDIO_CDP_PORT, "the trusted suite must expose a loopback CDP port");
  await vscode.extensions.getExtension("GaetanSemet.markdown-okf-schema-studio")?.activate();
  await storeWorkspaceChoicesForTests({ previewThemeMode: "cream", toolbarCollapsed: false, paletteMode: "myst" });
  await ensureTestWindowFocused();
  const browser: Browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.STUDIO_CDP_PORT}`);
  const page = browser.contexts()[0]?.pages().find((candidate) => candidate.url().includes("workbench"));
  assert.ok(page, "the VS Code workbench is attached");
  const extensionRoot = path.resolve(__dirname, "../../..");
  const tag = process.env.STUDIO_EMPTY_COLUMN_TAG ?? "latest";
  const shotDirectory = path.join(E2E_REPORT_ROOT, "table-empty-column");
  fs.mkdirSync(shotDirectory, { recursive: true });
  const directory = fs.mkdtempSync(path.join(extensionRoot, "test", "integration", "fixtures", "empty-column-e2e-"));
  const filePath = path.join(directory, "roles.md");
  fs.writeFileSync(filePath, SOURCE);
  const workbench = vscode.workspace.getConfiguration("workbench");
  const originalTheme = workbench.inspect<string>("colorTheme")?.workspaceValue;
  const roles = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
  try {
    await workbench.update("colorTheme", "Default Dark Modern", vscode.ConfigurationTarget.Workspace);
    await page.setViewportSize({ width: 1400, height: 900 });
    await vscode.commands.executeCommand("workbench.action.closeSidebar");
    await vscode.commands.executeCommand("workbench.action.closeAuxiliaryBar");
    await vscode.window.showTextDocument(roles, vscode.ViewColumn.One);
    await vscode.commands.executeCommand("workbench.action.focusFirstEditorGroup");
    await vscode.commands.executeCommand(COMMAND_ID);
    let frame = await currentPreviewFrame(page, roles);
    await waitFor("the cream preview theme on the dark host", async () => {
      frame = await liveFrame(page);
      return await frame.locator("html").getAttribute("data-sphinx-preview-theme-mode") === "cream"
        && await frame.locator("body").evaluate((body) => body.classList.contains("vscode-dark"));
    });
    // The webview can re-render (theme, layout) right after it first shows, dropping a click that
    // landed on the old document; so the toggle is re-pressed on the live frame until edit mode is on.
    // The click only happens while edit mode is off, so it can never switch edit mode back off.
    await waitFor("edit mode", async () => {
      const live = await liveFrame(page);
      if (await live.locator("html").getAttribute("data-sphinx-preview-edit-mode") === "on") return true;
      await live.locator("[data-sphinx-preview-edit-toggle]").click({ timeout: 2_000 }).catch(() => undefined);
      return await live.locator("html").getAttribute("data-sphinx-preview-edit-mode") === "on";
    }, 30_000);
    frame = await liveFrame(page);

    // Open the "Model" header cell, then add a column after it with the toolbar "Col right".
    await frame.locator("table thead th:nth-child(3)").click();
    await waitFor("the table toolbar", async () =>
      await (await liveFrame(page)).locator("[data-sphinx-table-menu]").count() === 1);
    frame = await liveFrame(page);
    await frame.locator('[data-sphinx-table-operation="Insert column after selected column"]').click();
    await waitFor("the new column to be selected", async () =>
      /column 4 of 5/u.test(await (await liveFrame(page)).locator("[data-sphinx-preview-edit-status]").first().innerText()));
    // Done saves the new column into the source and the page re-renders the
    // table with five columns; then the empty header of column 4 is opened like a user would.
    await frame.locator("[data-sphinx-preview-table-cell-editor] button", { hasText: "Done" }).click();
    await waitFor("the new column to reach the source and the page", async () => {
      const live = await liveFrame(page);
      return /\|\s*Model\s*\|\s*\|\s*Never\s*\|/u.test(roles.getText())
        && await live.locator("#sphinx-myst-preview-content table thead th").count() === 5;
    }, 20_000).catch(async (error: unknown) => {
      const live = await liveFrame(page);
      throw new Error(`${String(error)} source=${JSON.stringify(roles.getText().split("\n").slice(2, 5))} columns=`
        + `${await live.locator("#sphinx-myst-preview-content table thead th").count()} state=`
        + JSON.stringify(await live.evaluate(() => ({
          html: document.querySelector("#sphinx-myst-preview-content table thead")?.outerHTML.slice(0, 1500),
          status: document.querySelector("[data-sphinx-preview-edit-status]")?.textContent,
          editing: document.documentElement.getAttribute("data-sphinx-preview-block-editing"),
        }))));
    });
    frame = await liveFrame(page);
    await frame.locator("table thead th:nth-child(4)").click();
    await waitFor("the empty header to be selected", async () =>
      /column 4 of 5/u.test(await (await liveFrame(page)).locator("[data-sphinx-preview-edit-status]").first().innerText()));
    frame = await liveFrame(page);

    const measure = async (): Promise<{
      header: number; headerCell: number; bodyCells: number[]; fontSize: number;
      editor: { left: number; right: number } | null; cell: { left: number; right: number };
      overflow: string;
    }> => await frame.evaluate(() => {
      const table = document.querySelector("#sphinx-myst-preview-content table")!;
      const cell = table.querySelector<HTMLElement>('[data-sphinx-preview-table-cell-selected="true"]')
        ?? table.querySelector<HTMLElement>("thead th:nth-child(4)")!;
      const rect = cell.getBoundingClientRect();
      const editor = cell.querySelector<HTMLElement>("[data-sphinx-preview-table-cell-editor]");
      const editorRect = editor?.getBoundingClientRect();
      const column = Array.from(cell.parentElement!.children).indexOf(cell) + 1;
      const bodyCells = Array.from(table.querySelectorAll<HTMLElement>(`tbody tr td:nth-child(${column})`))
        .map((element: HTMLElement) => element.getBoundingClientRect().width);
      return {
        header: rect.width, headerCell: rect.width, bodyCells, fontSize: parseFloat(getComputedStyle(cell).fontSize),
        editor: editorRect ? { left: editorRect.left, right: editorRect.right } : null,
        cell: { left: rect.left, right: rect.right },
        overflow: getComputedStyle(cell).overflow,
      };
    });
    const shoot = async (name: string): Promise<void> => {
      await page.mouse.move(5, 5);
      await page.screenshot({ path: path.join(shotDirectory, `${tag}-${name}.png`) });
    };

    await waitFor("the selected cell to hold its editor", async () => (await measure()).editor !== null);
    const open = await measure();
    await shoot("empty-column-cream-open");
    console.log(`empty-column measure: ${JSON.stringify(open)}`);
    // Leave the cell: the empty column keeps its 8em minimum and no cell is a sliver.
    await frame.locator("table tbody tr:first-child td:nth-child(1)").click();
    await waitFor("another cell to be selected", async () =>
      /column 1 of 5/u.test(await (await liveFrame(page)).locator("[data-sphinx-preview-edit-status]").first().innerText()));
    frame = await liveFrame(page);
    const closed = await frame.evaluate(() => {
      const emptyHeader = document.querySelector<HTMLElement>("#sphinx-myst-preview-content table thead th:nth-child(4)")!;
      return { width: emptyHeader.getBoundingClientRect().width, fontSize: parseFloat(getComputedStyle(emptyHeader).fontSize) };
    });
    await shoot("empty-column-cream");
    assert.ok(open.header >= 299, `the edited (empty) header cell is ${open.header} px, expected >= 300`);
    assert.ok(open.bodyCells.every((width) => width >= 8 * open.fontSize - 1),
      `the empty column body cells are ${JSON.stringify(open.bodyCells)} px, expected >= 8em (${8 * open.fontSize} px)`);
    assert.ok(open.editor !== null && open.editor.left >= open.cell.left - 1 && open.editor.right <= open.cell.right + 1,
      `the cell editor ${JSON.stringify(open.editor)} is clipped by its cell ${JSON.stringify(open.cell)}`);

    assert.ok(closed.width >= 8 * closed.fontSize - 1, `the empty column is ${closed.width} px wide, expected >= 8em`);
  } finally {
    disposeActivePreviewForTests();
    await pinStoredWorkspaceChoices();
    await workbench.update("colorTheme", originalTheme, vscode.ConfigurationTarget.Workspace);
    await vscode.window.showTextDocument(roles, vscode.ViewColumn.One);
    await vscode.commands.executeCommand("workbench.action.revertAndCloseActiveEditor");
    await browser.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
