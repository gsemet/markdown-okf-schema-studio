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
import { escapeUntilClosed } from "./escapeClose";
import { E2E_REPORT_ROOT } from "../reportPaths";
import { pinStoredWorkspaceChoices } from "./storedChoices";
import { ensureTestWindowFocused } from "./windowFocus";

let lastButtonState = "not sampled";

async function waitFor(
  description: string,
  predicate: () => boolean | Promise<boolean>,
  diagnostics?: () => string,
  timeoutMs = 15_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out waiting for ${description}.${diagnostics ? ` Page held: ${diagnostics()}` : ""}`);
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

const IMAGE = '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="120"><rect width="240" height="120" fill="#789"/></svg>\n';

const filler = (name: string, count: number): string[] => Array.from({ length: count }, (_, index) =>
  `${name} paragraph ${index + 1} gives the page room to scroll, so a block can sit near the top of the pane `
  + "when its editor opens, as in a long document.");

/** A heading, filler, a figure, and the long paragraph of the user's report, with room to scroll. */
const SOURCE = [
  "# Wrapped editing", "",
  ...filler("Filler", 6).flatMap((line) => [line, ""]),
  ":::{figure} images/chip.svg",
  ":alt: chip",
  ":width: 60%", "",
  "The chip.",
  ":::", "",
  "An earlier paragraph that sits above the long one.", "",
  "Wrapped paragraphs keep their caret inside the editor when Up and Down move between the visual lines of a "
  + "single long logical line, because the field only hands over to the neighbouring block from its first or "
  + "its last wrapped line, and a selected word is wrapped in emphasis markers instead of being replaced.", "",
  ...filler("Closing", 12).flatMap((line) => [line, ""]),
].join("\n");

interface Measure {
  palette: { top: number; bottom: number; height: number } | null;
  frame: { top: number; bottom: number } | null;
  textarea: { top: number } | null;
  dialog: { top: number } | null;
  toolbar: { top: number; bottom: number; left: number } | null;
  scrollY: number;
  viewport: { width: number; height: number };
}

/**
 * CR 123: the edition palette (the block edit toolbar) takes its real height above the block editor:
 * in a narrow preview it wraps onto two rows and the text box, and the figure form inside the frame,
 * start below it. Real VS Code window, cream preview theme on a dark VS Code theme (or the theme
 * named by STUDIO_TOOLBAR_COVER_THEME); the evidence shots are written before the assertions.
 */
// @tests_req SwRS-MDOKFSTUDIO-PALETTE-021
export async function run(): Promise<void> {
  assert.ok(process.env.STUDIO_CDP_PORT, "the trusted suite must expose a loopback CDP port");
  await vscode.extensions.getExtension("GaetanSemet.markdown-okf-schema-studio")?.activate();
  await storeWorkspaceChoicesForTests({ previewThemeMode: "cream", toolbarCollapsed: false, paletteMode: "myst" });
  await ensureTestWindowFocused();
  const browser: Browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.STUDIO_CDP_PORT}`);
  const page = browser.contexts()[0]?.pages().find((candidate) => candidate.url().includes("workbench"));
  assert.ok(page, "the VS Code workbench is attached");
  const extensionRoot = path.resolve(__dirname, "../../..");
  const tag = process.env.STUDIO_TOOLBAR_COVER_TAG ?? "latest";
  const hostTheme = process.env.STUDIO_TOOLBAR_COVER_THEME ?? "Default Dark Modern";
  const width = Number(process.env.STUDIO_TOOLBAR_COVER_WIDTH ?? 900);
  const shotDirectory = path.join(E2E_REPORT_ROOT, "toolbar-cover");
  fs.mkdirSync(shotDirectory, { recursive: true });
  const directory = fs.mkdtempSync(path.join(extensionRoot, "test", "integration", "fixtures", "toolbar-cover-e2e-"));
  fs.mkdirSync(path.join(directory, "images"));
  fs.writeFileSync(path.join(directory, "images", "chip.svg"), IMAGE);
  const filePath = path.join(directory, "wrapped.md");
  fs.writeFileSync(filePath, SOURCE);
  const workbench = vscode.workspace.getConfiguration("workbench");
  const originalTheme = workbench.inspect<string>("colorTheme")?.workspaceValue;
  const wrapped = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
  const failures: string[] = [];
  try {
    await workbench.update("colorTheme", hostTheme, vscode.ConfigurationTarget.Workspace);
    await page.setViewportSize({ width, height: 900 });
    await vscode.commands.executeCommand("workbench.action.closeSidebar");
    await vscode.commands.executeCommand("workbench.action.closeAuxiliaryBar");
    await vscode.window.showTextDocument(wrapped, vscode.ViewColumn.One);
    await vscode.commands.executeCommand("workbench.action.focusFirstEditorGroup");
    await vscode.commands.executeCommand(COMMAND_ID);
    await waitFor("the rendered preview", async () => {
      const preview = getActivePreviewForTests();
      if (preview?.documentUri !== wrapped.uri.toString() || preview.phase !== "ready") return false;
      const frame = await liveFrame(page).catch(() => undefined);
      return frame !== undefined && await frame.locator("html").getAttribute("data-sphinx-preview-theme-mode") === "cream";
    }, undefined, 30_000);
    await waitFor("edit mode", async () => {
      const live = await liveFrame(page);
      if (await live.locator("html").getAttribute("data-sphinx-preview-edit-mode") === "on") return true;
      await live.locator("[data-sphinx-preview-edit-toggle]").click({ timeout: 2_000 }).catch(() => undefined);
      return await live.locator("html").getAttribute("data-sphinx-preview-edit-mode") === "on";
    }, undefined, 30_000);

    const measure = async (): Promise<Measure> => (await liveFrame(page)).evaluate(() => {
      const box = (selector: string): DOMRect | null => globalThis.document.querySelector(selector)?.getBoundingClientRect() ?? null;
      const palette = box(".sphinx-preview-edit-palette");
      const frame = box("[data-sphinx-preview-block-editor]");
      const textarea = box("[data-sphinx-preview-block-editor] textarea");
      const dialog = box("[data-sphinx-preview-block-editor] [role='dialog']");
      const toolbar = box("[data-sphinx-preview-toolbar]");
      return {
        palette: palette && { top: palette.top, bottom: palette.bottom, height: palette.height },
        frame: frame && { top: frame.top, bottom: frame.bottom },
        textarea: textarea && { top: textarea.top },
        dialog: dialog && { top: dialog.top },
        toolbar: toolbar && { top: toolbar.top, bottom: toolbar.bottom, left: toolbar.left },
        scrollY: globalThis.scrollY,
        viewport: { width: globalThis.innerWidth, height: globalThis.innerHeight },
      };
    });
    const shoot = async (name: string): Promise<void> => {
      await page.mouse.move(5, 5);
      await page.screenshot({ path: path.join(shotDirectory, `${tag}-${name}.png`) });
    };
    const closeEditor = async (): Promise<void> => {
      const isOpen = async (): Promise<boolean> =>
        await (await liveFrame(page)).locator("[data-sphinx-preview-block-editor]").count() > 0;
      // Escape unwinds one level: in the figure form it only returns to the text box, the next one cancels.
      await escapeUntilClosed(
        () => page.keyboard.press("Escape"),
        isOpen,
        () => new Promise<void>((resolve) => setTimeout(resolve, 400)),
      );
      await waitFor("the block editor to close", async () => !(await isOpen()));
    };
    const check = (name: string, measured: Measure, firstLineTop: number | undefined, frameTop: number | undefined): void => {
      console.log(`toolbar-cover ${name}: ${JSON.stringify(measured)}`);
      if (!measured.palette || firstLineTop === undefined) {
        failures.push(`${name}: no palette or no first line was measured`);
        return;
      }
      if (measured.palette.height < 50) failures.push(`${name}: the palette did not wrap (${measured.palette.height} px); narrow the preview`);
      if (frameTop !== undefined && measured.palette.bottom > frameTop + 0.5) {
        failures.push(`${name}: the palette's bottom edge (${measured.palette.bottom}) is below the frame's top (${frameTop})`);
      }
      if (measured.palette.bottom > firstLineTop + 0.5) {
        failures.push(`${name}: the palette's bottom edge (${measured.palette.bottom}) is below the first line's top (${firstLineTop})`);
      }
    };

    // The block sits 60 and 140 px under the top of the pane: the palette's own place is above the line
    // under the preview controls, so it rides down over the frame unless the frame reserves the distance.
    const bringToTop = async (selector: string, offset: number): Promise<void> => {
      const live = await liveFrame(page);
      await live.locator(selector).first().evaluate((element, wanted) =>
        globalThis.scrollBy(0, element.getBoundingClientRect().top - wanted), offset);
      await new Promise<void>((resolve) => setTimeout(resolve, 300));
    };
    for (const offset of [60, 140]) {
      // (a) The text area: the long paragraph.
      await bringToTop("#sphinx-myst-preview-content p:has-text('Wrapped paragraphs keep their caret')", offset);
      await (await liveFrame(page)).locator("#sphinx-myst-preview-content p", { hasText: "Wrapped paragraphs keep their caret" }).click();
      await waitFor("the text box", async () => (await (await liveFrame(page)).locator("[data-sphinx-preview-block-editor] textarea").count()) === 1);
      await waitFor("the palette", async () => (await (await liveFrame(page)).locator(".sphinx-preview-edit-palette").count()) === 1);
      await new Promise<void>((resolve) => setTimeout(resolve, 600));
      let measured = await measure();
      if (offset === 60) await shoot("text");
      check(`text area (block at ${offset})`, measured, measured.textarea?.top, measured.frame?.top);
      await closeEditor();

      // (b) The figure form: hover the figure, Edit figure.
      await bringToTop("figure", offset);
      const live = await liveFrame(page);
      // Leave the page first so the hover below always raises a fresh mouseover on the figure
      // (the pointer may still rest where the figure now is, which raises no event).
      await page.mouse.move(0, 0);
      await live.locator("figure").first().hover();
      const editButton = live.locator("[data-sphinx-figure-edit]");
      await waitFor("the Edit figure button to be shown", async () => {
        const state = await (await liveFrame(page)).evaluate(() => {
          const button = document.querySelector("[data-sphinx-figure-edit]");
          return {
            present: button !== null,
            hidden: button?.hasAttribute("hidden") ?? true,
            hovered: document.querySelector("[data-sphinx-preview-edit-hover]")?.tagName ?? "none",
            editMode: document.documentElement.getAttribute("data-sphinx-preview-edit-mode"),
          };
        });
        lastButtonState = JSON.stringify(state);
        return state.present && !state.hidden;
      }, () => lastButtonState);
      await editButton.click();
      await waitFor("the figure form", async () =>
        await (await liveFrame(page)).locator("[data-sphinx-preview-block-editor] [role='dialog']").count() === 1);
      await new Promise<void>((resolve) => setTimeout(resolve, 600));
      measured = await measure();
      if (offset === 60) await shoot("figure");
      check(`figure form (block at ${offset})`, measured, measured.dialog?.top, measured.frame?.top);
      await closeEditor();
    }
    assert.deepEqual(failures, [], failures.join("\n"));
  } finally {
    disposeActivePreviewForTests();
    await pinStoredWorkspaceChoices();
    await workbench.update("colorTheme", originalTheme, vscode.ConfigurationTarget.Workspace);
    await vscode.window.showTextDocument(wrapped, vscode.ViewColumn.One);
    await vscode.commands.executeCommand("workbench.action.revertAndCloseActiveEditor");
    await browser.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
