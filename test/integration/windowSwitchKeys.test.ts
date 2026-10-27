import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import type { Page } from "playwright-core";
import * as vscode from "vscode";

import {
  bufferText,
  closeAllEditors,
  connectWorkbench,
  createFixture,
  openSidePreview,
  press,
  setEditMode,
  waitFor,
  waitForRender,
  withCurrentFrame,
} from "./realInput/harness";

const DOCUMENT = "---\nname: Visite guid\u00e9e du stack P1\ndescription: Document de d\u00e9monstration des correctifs de la nuit\nmetadata: un champ au nom un peu long pour tester la colonne des cl\u00e9s\n---\n\n# Visite guid\u00e9e\n\n## 1. Citation\n\n> toto\n>\n> tata avec du `code inline`\n\n## 2. Dropdown\n\n:::{note} Cliquer pour ouvrir\n:class: dropdown\n\nContenu cach\u00e9.\n:::\n\n## 3. Directive non ferm\u00e9e\n\n\nLa preview doit afficher la ligne brute ci-dessus, sans planter, et ce paragraphe doit rester rendu.\n\n## 4. Tableau\n\n| Colonne 1 | Colonne 2 | Colonne 3 |\n| --- | --- | --- |\n| a1 | a2 | a3 |\n| b1 | b2 | b3 |\n| c1 | c2 | c3 |\n\n## 5. Bloc \u00e0 d\u00e9placer\n\nPremier paragraphe.\n\nDeuxi\u00e8me paragraphe, \u00e0 remonter avec la fl\u00e8che.\n\n## 6. R\u00e8gle horizontale\n\n---\n\n## 7. Fin\n\nDernier paragraphe pour tester la navigation au clavier.\n";

/** Where the optional screenshots go (`STUDIO_SHOT_DIR`); nothing is written when it is unset. */
async function shoot(page: Page, name: string): Promise<void> {
  const directory = process.env.STUDIO_SHOT_DIR;
  if (!directory) return;
  fs.mkdirSync(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, `${name}.png`) });
}

/** The blocks marked selected in the preview, by text. */
async function selected(page: Page): Promise<string[]> {
  return withCurrentFrame(page, (frame) => frame.evaluate(() =>
    Array.from(window.document.querySelectorAll("[data-sphinx-preview-block-selected]"))
      .map((element) => (element.textContent ?? "").trim())));
}

/** What holds the focus in the preview, and whether the page paints a focus ring around itself. */
async function focusState(page: Page): Promise<{ active: string; pageRing: boolean }> {
  return withCurrentFrame(page, (frame) => frame.evaluate(() => {
    const active = document.activeElement;
    const root = document.getElementById("sphinx-myst-preview-content");
    const outline = root ? getComputedStyle(root) : undefined;
    return {
      active: active ? `${active.tagName.toLowerCase()}${active.id ? "#" + active.id : ""}` : "(none)",
      pageRing: active === root && outline !== undefined
        && outline.outlineStyle !== "none" && outline.outlineWidth !== "0px",
    };
  }));
}

/** Clicks the theme button until the preview shows `mode` (for the screenshots; `STUDIO_PREVIEW_THEME`). */
async function showPreviewTheme(page: Page, mode: string): Promise<void> {
  for (let click = 0; click < 4; click += 1) {
    const current = await withCurrentFrame(page, (frame) =>
      frame.locator("html").getAttribute("data-sphinx-preview-theme-mode"));
    if (current === mode) {
      // The button keeps its own arrow keys: hand the focus back to the page.
      await withCurrentFrame(page, (frame) => frame.evaluate(() => (window.document.activeElement as HTMLElement | null)?.blur()));
      return;
    }
    await withCurrentFrame(page, (frame) => frame.locator("[data-sphinx-preview-theme-toggle]").click());
    await new Promise<void>((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`The preview never showed the ${mode} theme.`);
}

/** A real click on the empty margin of the page: it lands on the content root, which takes the focus. */
async function clickPageMargin(page: Page): Promise<void> {
  await withCurrentFrame(page, async (current) => {
    const box = await (await current.frameElement()).boundingBox();
    assert.ok(box, "the preview frame has a box");
    await page.mouse.click(box.x + box.width - 60, box.y + box.height / 2);
  });
  await waitFor("the content root to hold the focus", async () => (await focusState(page)).active === "main#sphinx-myst-preview-content");
}

/** Leaves the preview for another editor tab of the same VS Code window and comes back to it. */
async function leaveTabAndReturn(
  page: Page, other: vscode.TextDocument, document: vscode.TextDocument,
): Promise<void> {
  await vscode.window.showTextDocument(other, { viewColumn: vscode.ViewColumn.One, preview: false });
  await new Promise<void>((resolve) => setTimeout(resolve, 300));
  await vscode.window.showTextDocument(document, { viewColumn: vscode.ViewColumn.One, preview: false });
  await vscode.commands.executeCommand("workbench.action.focusNextGroup");
  await waitFor("the preview to hold the keyboard focus again", () => withCurrentFrame(page, (frame) =>
    frame.evaluate(() => window.document.hasFocus())), 5_000);
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-004
/**
 * CR 129: in edit mode the page itself can hold the focus (a click on its margin, a window that comes
 * back); plain ArrowDown then still moves the block selection and the page never shows a focus ring.
 * Routes: the page focused right away ("margin"), and after leaving for another editor tab and coming
 * back ("tab"). A real switch to another application cannot be driven from the test window.
 */
export async function run(): Promise<void> {
  const { browser, page } = await connectWorkbench();
  const fixture = createFixture("window-switch-keys", { "doc.md": DOCUMENT, "other.md": "# Other\n\nText.\n" });
  try {
    await page.setViewportSize({ width: 1400, height: 900 });
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("doc.md")));
    const other = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("other.md")));
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    if (process.env.STUDIO_PREVIEW_THEME) await showPreviewTheme(page, process.env.STUDIO_PREVIEW_THEME);
    for (const route of ["margin", "tab"] as const) {
      // The writer moves the selection with the keyboard, then the page itself takes the focus (a click
      // on its margin), then the window or the tab is left and comes back.
      await press(page, "ArrowDown");
      await press(page, "ArrowDown");
      await waitFor(`${route}: the keyboard to select a block`, async () => (await selected(page)).length === 1);
      const before = await selected(page);
      await clickPageMargin(page);

      if (route === "tab") await leaveTabAndReturn(page, other, document);

      const state = await focusState(page);
      console.log(`CR129 ${route}: focus after return ${JSON.stringify(state)}; selection ${JSON.stringify(await selected(page))}; trace ${JSON.stringify(await withCurrentFrame(page, (f) => f.evaluate(() => (window as unknown as { __studioDiagnostics?: { trace(): unknown } }).__studioDiagnostics?.trace())))} hasFocus ${await withCurrentFrame(page, (f) => f.evaluate(() => window.document.hasFocus()))}`);
      await shoot(page, `after-return-${route}-${process.env.STUDIO_SHOT_TAG ?? "run"}`);
      await press(page, "ArrowDown");
      await shoot(page, `after-arrow-${route}-${process.env.STUDIO_SHOT_TAG ?? "run"}`);
      await waitFor(`${route}: ArrowDown after coming back to select a block`, async () => (await selected(page)).length === 1);
      const after = await selected(page);
      assert.equal((await focusState(page)).pageRing, false, `${route}: the page itself shows no focus ring`);
      assert.notEqual(await withCurrentFrame(page, (f) => f.evaluate(() => window.document.activeElement?.id)),
        "sphinx-myst-preview-content", `${route}: the focus is on a block, not on the page`);
      assert.notDeepEqual(after, [], `${route}: a block is selected`);
      assert.notDeepEqual(after, before, `${route}: ArrowDown moved the selection on from ${JSON.stringify(before)}`);
      assert.equal(bufferText(document), DOCUMENT, "moving the selection edits nothing");
    }
  } finally {
    try {
      await setEditMode(page, false);
    } catch {
      // Best effort: a failure here must not hide the scenario's own result.
    }
    await closeAllEditors();
    fixture.dispose();
    await browser.close();
  }
}
