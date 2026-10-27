import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { chromium, type Browser, type Frame, type Page } from "playwright-core";
import * as vscode from "vscode";

import { COMMAND_ID, disposeActivePreviewForTests, getActivePreviewForTests, storeWorkspaceChoicesForTests } from "./extensionApi";
import { E2E_REPORT_ROOT } from "../reportPaths";
import { pinStoredWorkspaceChoices } from "./storedChoices";
import { ensureTestWindowFocused } from "./windowFocus";

async function waitFor(description: string, predicate: () => boolean | Promise<boolean>, timeoutMs = 15_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if (await predicate()) return;
    } catch (error) {
      if (!/frame.*detach|execution context was destroyed|cannot find context/iu.test(String(error))) throw error;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

/** The first Studio webview frame that is showing now (the page may re-render between steps). */
async function liveFrame(page: Page): Promise<Frame> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    for (const frame of page.frames()) {
      try {
        if (await frame.locator("#sphinx-myst-preview-content").count() === 0) continue;
        if (await (await frame.frameElement()).isVisible()) return frame;
      } catch {
        // a frame that detaches while it is probed is not the live one
      }
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("no visible Studio webview frame");
}

const SOURCE = [
  "# Actions", "",
  "## 3. Directive non fermee", "",
  "La preview doit afficher la ligne brute ci-dessus, sans planter, et ce paragraphe doit rester rendu.", "",
  "## 4. Tableau", "",
  "| Colonne 1 | Colonne 2 | Colonne 3 |", "| --- | --- | --- |", "| a1 | a2 | a3 |", "| b1 | b2 | b3 |", "",
  "## 5. Bloc a deplacer", "",
  "Premier paragraphe.", "",
  "Deuxieme paragraphe.", "",
].join("\n");

const THEMES = [
  { name: "cream", host: "Default Light Modern", preview: "cream" },
  { name: "dark", host: "Default Dark Modern", preview: "dark" },
] as const;

/**
 * CR 130: in a real window the block actions (+, up, down) follow whichever moved last. After the
 * keyboard moves the selection off the hovered block, the actions are on the selected block only;
 * a pointer move hands them back to the hovered block and the selection ring goes away.
 */
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-109
export async function run(): Promise<void> {
  assert.ok(process.env.STUDIO_CDP_PORT, "the trusted suite must expose a loopback CDP port");
  await vscode.extensions.getExtension("GaetanSemet.markdown-okf-schema-studio")?.activate();
  await ensureTestWindowFocused();
  const browser: Browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.STUDIO_CDP_PORT}`);
  const page = browser.contexts()[0]?.pages().find((candidate) => candidate.url().includes("workbench"));
  assert.ok(page, "the VS Code workbench is attached");
  const extensionRoot = path.resolve(__dirname, "../../..");
  const tag = process.env.STUDIO_BLOCK_ACTIONS_TAG ?? "latest";
  const shotDirectory = process.env.STUDIO_BLOCK_ACTIONS_SHOTS ?? path.join(E2E_REPORT_ROOT, "block-actions");
  fs.mkdirSync(shotDirectory, { recursive: true });
  const directory = fs.mkdtempSync(path.join(extensionRoot, "test", "integration", "fixtures", "block-actions-e2e-"));
  const filePath = path.join(directory, "actions.md");
  fs.writeFileSync(filePath, SOURCE);
  const workbench = vscode.workspace.getConfiguration("workbench");
  const originalTheme = workbench.inspect<string>("colorTheme")?.workspaceValue;
  const source = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
  const failures: string[] = [];
  try {
    for (const theme of THEMES) {
      await storeWorkspaceChoicesForTests({ previewThemeMode: theme.preview, toolbarCollapsed: false, paletteMode: "myst" });
      await workbench.update("colorTheme", theme.host, vscode.ConfigurationTarget.Workspace);
      await page.setViewportSize({ width: 1200, height: 900 });
      await vscode.commands.executeCommand("workbench.action.closeSidebar");
      await vscode.commands.executeCommand("workbench.action.closeAuxiliaryBar");
      await vscode.window.showTextDocument(source, vscode.ViewColumn.One);
      await vscode.commands.executeCommand("workbench.action.focusFirstEditorGroup");
      await vscode.commands.executeCommand(COMMAND_ID);
      await waitFor("the preview to be ready", () => {
        const preview = getActivePreviewForTests();
        return preview?.documentUri === source.uri.toString() && preview.phase === "ready"
          && preview.documentVersion === source.version;
      });
      await waitFor("edit mode", async () => {
        const live = await liveFrame(page);
        if (await live.locator("html").getAttribute("data-sphinx-preview-edit-mode") === "on") return true;
        await live.locator("[data-sphinx-preview-edit-toggle]").click({ timeout: 2_000 }).catch(() => undefined);
        return await live.locator("html").getAttribute("data-sphinx-preview-edit-mode") === "on";
      }, 30_000);

      const paragraph = async (text: string) => (await liveFrame(page)).locator("p", { hasText: text });
      // The opacity of the "+" of the bar that follows the paragraph with this text.
      const actionsOpacity = async (text: string): Promise<number> => (await liveFrame(page)).evaluate((needle) => {
        const block = Array.from(document.querySelectorAll("#sphinx-myst-preview-content p, #sphinx-myst-preview-content h2"))
          .find((element) => element.textContent?.includes(needle));
        const bar = block?.nextElementSibling;
        const button = bar?.querySelector("button");
        return button ? Number(getComputedStyle(button).opacity) : -1;
      }, text);
      const ringOn = async (text: string): Promise<boolean> => (await liveFrame(page)).evaluate((needle) => {
        const block = Array.from(document.querySelectorAll("#sphinx-myst-preview-content p, #sphinx-myst-preview-content h2"))
          .find((element) => element.textContent?.includes(needle));
        return block !== undefined && getComputedStyle(block).outlineStyle === "solid";
      }, text);
      const center = async (text: string): Promise<{ x: number; y: number }> => {
        const box = await (await paragraph(text)).boundingBox();
        assert.ok(box, `the paragraph "${text}" is visible`);
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      };
      const shoot = async (name: string): Promise<void> => {
        const frameBox = await (await (await liveFrame(page)).frameElement()).boundingBox();
        await page.screenshot({
          path: path.join(shotDirectory, `${tag}-${name}-${theme.name}.png`),
          ...(frameBox ? { clip: frameBox } : {}),
        });
      };

      // Select "Premier paragraphe." with the keyboard (open its editor, Escape), then hover the
      // last block and move the selection down with the keyboard: the hovered block is not the selected one.
      await (await paragraph("Premier paragraphe.")).click();
      await waitFor("the block editor", async () =>
        await (await liveFrame(page)).locator("[data-sphinx-preview-block-editor] textarea").count() === 1);
      await page.keyboard.press("Escape");
      await waitFor("the first paragraph selected", async () =>
        await ringOn("Premier paragraphe."));
      const hovered = await center("Deuxieme paragraphe.");
      await page.mouse.move(hovered.x - 40, hovered.y);
      await page.mouse.move(hovered.x, hovered.y);
      await waitFor("the hovered block to show its actions", async () => await actionsOpacity("Deuxieme paragraphe.") === 1);
      await page.keyboard.press("ArrowUp");
      await waitFor("the selection to move up", async () => !(await ringOn("Premier paragraphe.")));
      // Each state is read once it has settled, not after a fixed delay: on a loaded CI runner the
      // pointer input reaches the webview frame later than on a desktop. The expected values stay
      // the assertion below; a state that never settles is reported as read at the deadline.
      const state = async () => ({
        selectedBar: await actionsOpacity("Bloc a deplacer"),
        hoveredBar: await actionsOpacity("Deuxieme paragraphe."),
        ring: await ringOn("Bloc a deplacer"),
      });
      const settled = async (expected: { selectedBar: number; hoveredBar: number; ring: boolean },
        nudge?: (attempt: number) => Promise<void>) => {
        const deadline = Date.now() + 5_000;
        let current = await state();
        for (let attempt = 1; JSON.stringify(current) !== JSON.stringify(expected) && Date.now() < deadline; attempt += 1) {
          await new Promise<void>((resolve) => setTimeout(resolve, 100));
          if (nudge) await nudge(attempt);
          current = await state();
        }
        return current;
      };
      // What the page saw, for a failure report: the actions owner and the innermost hovered element.
      const pointerView = async (): Promise<string> => (await liveFrame(page)).evaluate(() => {
        const hoveredElements = Array.from(document.querySelectorAll(":hover"));
        const inner = hoveredElements[hoveredElements.length - 1];
        return `owner=${document.documentElement.getAttribute("data-sphinx-preview-actions-owner")}`
          + ` hover=${inner ? `${inner.tagName}:${(inner.textContent ?? "").trim().slice(0, 24)}` : "none"}`;
      });
      // States are read before their screenshot: a capture can reset the frame's hover (seen on
      // the Linux CI runner) and a pointer event sent right after one can be dropped.
      const afterKeys = await settled({ selectedBar: 1, hoveredBar: 0, ring: true });
      const afterKeysView = await pointerView();
      await shoot("keyboard-moved-last");
      // The pointer moves last, inside the hovered block: it gets the actions back, the ring goes
      // away. A pointer keeps moving, so a move the input pipeline dropped is sent again.
      await page.mouse.move(hovered.x + 30, hovered.y + 2);
      const afterMouse = await settled({ selectedBar: 0, hoveredBar: 1, ring: false },
        (attempt) => page.mouse.move(hovered.x + 30 + (attempt % 2 === 0 ? 0 : 4), hovered.y + 2));
      const afterMouseView = await pointerView();
      await shoot("pointer-moved-last");
      const afterShotView = await pointerView();
      console.log(`block-actions ${theme.name}: ${JSON.stringify({ afterKeys, afterMouse })} keys: ${afterKeysView}; mouse: ${afterMouseView}; after shot: ${afterShotView}`);
      if (afterKeys.selectedBar !== 1 || afterKeys.hoveredBar !== 0 || !afterKeys.ring) {
        failures.push(`${theme.name}: after the keyboard moved last ${JSON.stringify(afterKeys)} (${afterKeysView})`);
      }
      if (afterMouse.selectedBar !== 0 || afterMouse.hoveredBar !== 1 || afterMouse.ring) {
        failures.push(`${theme.name}: after the pointer moved last ${JSON.stringify(afterMouse)} (${afterMouseView})`);
      }
      disposeActivePreviewForTests();
    }
    assert.deepEqual(failures, []);
  } finally {
    disposeActivePreviewForTests();
    await pinStoredWorkspaceChoices();
    await workbench.update("colorTheme", originalTheme, vscode.ConfigurationTarget.Workspace);
    await vscode.window.showTextDocument(source, vscode.ViewColumn.One);
    await vscode.commands.executeCommand("workbench.action.revertAndCloseActiveEditor");
    await browser.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
