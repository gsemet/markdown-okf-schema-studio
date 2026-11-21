import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import * as vscode from "vscode";
import type { Page } from "playwright-core";

import { disposeActivePreviewForTests, storeWorkspaceChoicesForTests } from "./extensionApi";
import { E2E_REPORT_ROOT } from "../reportPaths";
import { markProgress } from "../shared/hangWatchdog";
import { withFailureTrace } from "../shared/realWindowTrace";
import { scenarioTraceCollector } from "./scenarioTrace";
import { pinStoredWorkspaceChoices } from "./storedChoices";
import { ensureTestWindowFocused } from "./windowFocus";
import {
  connectWorkbench,
  createFixture,
  currentPreviewFrame,
  openSidePreview,
  setEditMode,
  waitFor,
  waitForRender,
  withCurrentFrame,
  setViewport,
} from "./realInput/harness";

const SOURCE = "First paragraph of the page.\n\nSecond paragraph of the page.\n";
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

/** Drags the files `uris` (as VS Code's Explorer offers them) over and onto the point `(x, y)` of the window. */
async function dragFiles(page: Page, uris: string[], x: number, y: number, drop: boolean): Promise<void> {
  const session = await page.context().newCDPSession(page);
  try {
    const data = {
      items: [
        { mimeType: "text/uri-list", data: uris.join("\r\n") },
        { mimeType: "ResourceURLs", data: JSON.stringify(uris) },
      ],
      dragOperationsMask: 1,
    };
    await session.send("Input.dispatchDragEvent", { type: "dragEnter", x, y, data });
    await session.send("Input.dispatchDragEvent", { type: "dragOver", x, y, data });
    if (drop) await session.send("Input.dispatchDragEvent", { type: "drop", x, y, data });
  } finally {
    await session.detach().catch(() => undefined);
  }
}

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-004
/**
 * CR 146: in a real VS Code window, files dragged from the Explorer onto the preview in edit mode
 * show a drop marker at the nearest insertion point and, dropped, write a relative Markdown link
 * (a Markdown file, with its first heading as text) or an image (a picture) as a paragraph of its
 * own there; the rest of the source never changes. Screenshots go to `STUDIO_DROP_FILES_SHOTS`
 * (default out/reports/e2e/drop-files) as `<tag>-<mode>-*.png`; tag `before` records the behaviour of
 * the unchanged code without failing the run. The theme comes from STUDIO_DROP_FILES_MODE (`cream` or `dark`).
 */
export async function run(): Promise<void> {
  const tag = process.env.STUDIO_DROP_FILES_TAG ?? "after";
  const mode = process.env.STUDIO_DROP_FILES_MODE === "dark" ? "dark" : "cream";
  const shotDirectory = process.env.STUDIO_DROP_FILES_SHOTS ?? path.join(E2E_REPORT_ROOT, "drop-files");
  fs.mkdirSync(shotDirectory, { recursive: true });
  await vscode.extensions.getExtension("GaetanSemet.markdown-okf-schema-studio")?.activate();
  await storeWorkspaceChoicesForTests({ previewThemeMode: mode === "cream" ? "cream" : "current", toolbarCollapsed: false, paletteMode: "myst" });
  await ensureTestWindowFocused();
  const { browser, page } = await connectWorkbench();
  const fixture = createFixture("drop-files", {
    "notes/page.md": SOURCE,
    "notes/The Guide.md": "---\ntitle: ignored\n---\n\n# Getting started\n\nText.\n",
    "notes/plain.md": "No heading here.\n",
  });
  fs.mkdirSync(fixture.path("img"), { recursive: true });
  fs.writeFileSync(fixture.path("img/logo.png"), PNG);
  const workbench = vscode.workspace.getConfiguration("workbench");
  const originalTheme = workbench.inspect<string>("colorTheme")?.workspaceValue;
  const failures: string[] = [];
  let opened: vscode.TextDocument | undefined;
  const expect = (name: string, actual: unknown, wanted: unknown): void => {
    try {
      assert.deepEqual(actual, wanted);
    } catch {
      failures.push(`${name}: got ${JSON.stringify(actual)}, wanted ${JSON.stringify(wanted)}`);
    }
  };
  const shoot = async (name: string): Promise<void> => {
    await page.mouse.move(5, 5);
    await page.screenshot({ path: path.join(shotDirectory, `${tag}-${mode}-${name}.png`) });
  };
  const uri = (relative: string): string => pathToFileURL(fixture.path(relative)).toString();
  try {
    await withFailureTrace("drop-files", scenarioTraceCollector(page, () => opened, failures), async () => {
      await workbench.update("colorTheme", mode === "cream" ? "Default Light Modern" : "Default Dark Modern",
        vscode.ConfigurationTarget.Workspace);
      await setViewport(page, { width: 1200, height: 800 });
      await vscode.commands.executeCommand("workbench.action.closeSidebar");
      await vscode.commands.executeCommand("workbench.action.closeAuxiliaryBar");
      const source = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("notes/page.md")));
      opened = source;
      await openSidePreview(source);
      await waitForRender(source);
      markProgress("drop-files: preview ready");
      await setEditMode(page, true);
      markProgress("drop-files: edit mode on");
      const lowerHalf = async (text: string): Promise<{ x: number; y: number }> => withCurrentFrame(page, async (frame) => {
        const box = await frame.locator("p", { hasText: text }).first().boundingBox({ timeout: 5_000 });
        assert.ok(box, `the paragraph "${text}" has a box`);
        // Just above the bottom edge: the bar after the last block sits one paragraph margin lower than
        // the paragraph, so at 80% of a one-line paragraph the bar before it was equally near.
        return { x: box.x + 40, y: box.y + box.height - 1 };
      });
      // 1. A Markdown file over the lower half of the first paragraph: the marker, then the link.
      const first = await lowerHalf("First paragraph");
      await dragFiles(page, [uri("notes/The Guide.md")], first.x, first.y, false);
      markProgress("drop-files: waiting for the drop marker");
      const markerCount = (): Promise<number> => withCurrentFrame(page, (frame) => frame.locator(".sphinx-preview-insert-point--drop").count());
      try {
        await waitFor("the drop marker", async () => await markerCount() === 1, 5_000);
      } catch {
        // Recorded below with the count it saw (the unchanged code shows no marker).
      }
      const marker = await markerCount();
      expect("drop marker count while dragging", marker, 1);
      await shoot("1-marker");
      markProgress("drop-files: first drop (Markdown file)");
      await dragFiles(page, [uri("notes/The Guide.md")], first.x, first.y, true);
      const afterLink = "First paragraph of the page.\n\n[Getting started](The%20Guide.md)\n\nSecond paragraph of the page.\n";
      try {
        await waitFor("the link", () => source.getText() === afterLink, 8_000);
      } catch {
        // Recorded below (the unchanged code does nothing).
      }
      expect("source after the Markdown drop", source.getText(), afterLink);
      await waitForRender(source).catch(() => undefined);
      await shoot("2-link");
      // 2. An image over the lower half of the last paragraph, and a file without heading.
      const last = await lowerHalf("Second paragraph");
      markProgress("drop-files: second drop (image and file)");
      await dragFiles(page, [uri("img/logo.png"), uri("notes/plain.md")], last.x, last.y, true);
      const afterImage = afterLink + "\n![logo](../img/logo.png) [plain](plain.md)\n";
      try {
        await waitFor("the image", () => source.getText() === afterImage, 8_000);
      } catch {
        // Recorded below.
      }
      expect("source after the image drop", source.getText(), afterImage);
      await waitForRender(source).catch(() => undefined);
      await shoot("3-image");
      await currentPreviewFrame(page);
      if (tag !== "before") assert.deepEqual(failures, [], failures.join("\n"));
      else console.log(`drop-files BEFORE state (not failing): ${JSON.stringify(failures)}`);
      // CR 152: leave this page's edit mode off for the next scenario.
      markProgress("drop-files: edit mode off");
      await setEditMode(page, false);
    });
  } finally {
    try {
      await setEditMode(page, false);
    } catch {
      // Best effort: a failure here must not hide the scenario's own result.
    }
    disposeActivePreviewForTests();
    await pinStoredWorkspaceChoices();
    await workbench.update("colorTheme", originalTheme, vscode.ConfigurationTarget.Workspace);
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    await browser.close();
    fixture.dispose();
  }
}
