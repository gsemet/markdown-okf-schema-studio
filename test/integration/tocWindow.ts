/**
 * Real-window check of the table of contents (CR 142). A REAL VS Code window opens a long document
 * that starts with `[TOC]`, `[[_TOC_]]` and a `{contents}` directive with `:depth: 1`:
 *
 * - read mode paints the headings as a nested list of links, and a click on an entry scrolls its
 *   heading into view;
 * - edit mode paints the block as a box titled with the literal marker in code font, without the list, and a
 *   click on it opens the raw marker line only.
 *
 * `STUDIO_TOC_SHOTS=<folder>` also writes `read-cream.png`, `read-dark.png`, `edit-cream.png` and
 * `edit-dark.png` (the screenshots are taken before the assertions, so the same scenario can
 * photograph the previous code, where the marker is a plain link). The scenario leaves the window
 * as it found it.
 */
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import type { Page } from "playwright-core";
import * as vscode from "vscode";

import { injectToggleDelay } from "../shared/tocLoop";
import { getActivePreviewForTests } from "./extensionApi";
import {
  bufferText,
  closeAllEditors,
  connectWorkbench,
  createFixture,
  findCurrentFrame,
  openSidePreview,
  press,
  setEditMode,
  typeText,
  waitFor,
  waitForEditor,
  withCurrentFrame,
} from "./realInput/harness";

const FILLER = Array.from({ length: 6 }, (_, index) =>
  `Paragraph ${index + 1} of filler text that makes the page long enough to scroll.`).join("\n\n");

const TEXT = [
  "# Field Guide",
  "",
  "[TOC]",
  "",
  "[[_TOC_]]",
  "",
  "```{contents}",
  ":depth: 1",
  "```",
  "",
  "## Install",
  "",
  FILLER,
  "",
  "## Usage",
  "",
  FILLER,
  "",
  "### Options",
  "",
  FILLER,
  "",
  "### Flags",
  "",
  FILLER,
  "",
  "## Reference",
  "",
  FILLER,
  "",
].join("\n");

async function setPreviewMode(page: Page, mode: string): Promise<void> {
  await withCurrentFrame(page, async (frame) => {
    const toggle = frame.locator("[data-sphinx-preview-theme-toggle]");
    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (await toggle.getAttribute("data-theme-mode") === mode) break;
      await toggle.click();
    }
    await frame.locator("html:not([data-sphinx-preview-theme-switching])").waitFor();
  });
}

async function setHostTheme(page: Page, theme: string): Promise<void> {
  await vscode.workspace.getConfiguration("workbench")
    .update("colorTheme", theme, vscode.ConfigurationTarget.Global);
  const kind = theme.includes("Dark") ? "dark" : "light";
  await waitFor(`the ${theme} host theme to reach the webview`, async () => {
    const current = await findCurrentFrame(page);
    return current !== undefined
      && await current.locator("body").evaluate((body, wanted) => body.classList.contains(`vscode-${wanted}`), kind);
  });
  // Repro loop only (STUDIO_TOGGLE_DELAY_MS): the theme has landed in the webview; the pause before
  // the next toggle read and click is random, so the click can meet the render the theme change
  // triggers (a render restoring the edit mode is a suspect of the toc flake).
  await injectToggleDelay();
}

async function shoot(page: Page, file: string): Promise<void> {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const box = await withCurrentFrame(page, async (frame) => {
    const content = await frame.locator("#sphinx-myst-preview-content").boundingBox();
    if (!content) throw new Error("no box for the content");
    return { x: content.x, y: Math.max(0, content.y), width: content.width, height: Math.min(content.height, 640) };
  });
  await withCurrentFrame(page, (frame) => frame.evaluate(() => (document.activeElement as HTMLElement | null)?.blur()));
  await page.mouse.move(2, 2);
  await new Promise<void>((resolve) => setTimeout(resolve, 400));
  await page.screenshot({ path: file, clip: box });
}

interface ReadLayout {
  navs: number;
  links: string[];
  nested: boolean;
}

async function readLayout(page: Page): Promise<ReadLayout> {
  return withCurrentFrame(page, (frame) => frame.evaluate((): ReadLayout => {
    const navs = Array.from(document.querySelectorAll<HTMLElement>("nav.okf-toc"));
    const first = navs[0];
    return {
      navs: navs.filter((nav) => nav.getBoundingClientRect().height > 0).length,
      links: Array.from(first?.querySelectorAll("a") ?? []).map((link) => `${link.textContent}|${link.getAttribute("href")}`),
      nested: first?.querySelector("ul ul") !== null,
    };
  }));
}

async function editTitles(page: Page): Promise<string[]> {
  return withCurrentFrame(page, (frame) => frame.locator("nav.okf-toc").evaluateAll((blocks) =>
    blocks.map((block) => {
      const before = getComputedStyle(block, "::before");
      const list = block.querySelector("ul");
      const hidden = list === null || getComputedStyle(list).display === "none";
      return `${before.content.replace(/^"|"$/gu, "")}|${before.fontFamily}|${hidden ? "hidden" : "shown"}`;
    })));
}

// @tests_req SwRS-MDOKFSTUDIO-CORE-072
/** rendering-core: [TOC], [[_TOC_]] and {contents} list the headings with links in read mode and is titled in edit mode. */
export async function scenarioToc(page: Page): Promise<void> {
  const workbench = vscode.workspace.getConfiguration("workbench");
  const originalTheme = workbench.inspect<string>("colorTheme")?.globalValue;
  const shots = process.env.STUDIO_TOC_SHOTS;
  const fixture = createFixture("realinput-toc", { "guide.md": TEXT });
  const failures: string[] = [];
  try {
    const textDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("guide.md")));
    try {
      await openSidePreview(textDocument);
      await waitFor("the preview to be ready", () => {
        const preview = getActivePreviewForTests();
        return preview?.documentUri === textDocument.uri.toString() && preview.phase === "ready" && preview.webviewReady;
      });
      await vscode.commands.executeCommand("workbench.action.closeSidebar");
      await vscode.commands.executeCommand("workbench.action.toggleMaximizeEditorGroup");
      await page.setViewportSize({ width: 1400, height: 900 });
      for (const [name, host, mode] of [
        ["cream", "Default Light Modern", "cream"],
        ["dark", "Default Dark Modern", "current"],
      ] as const) {
        await setHostTheme(page, host);
        await setEditMode(page, false);
        await setPreviewMode(page, mode);
        if (shots !== undefined) await shoot(page, path.join(shots, `read-${name}.png`));
        const layout = await readLayout(page);
        const expected = ["Field Guide|#field-guide", "Install|#install", "Usage|#usage", "Options|#options",
          "Flags|#flags", "Reference|#reference"];
        if (JSON.stringify(layout.links) !== JSON.stringify(expected)) failures.push(`${name}: links ${JSON.stringify(layout.links)}`);
        if (!layout.nested) failures.push(`${name}: the list is not nested`);
        if (layout.navs !== 3) failures.push(`${name}: ${layout.navs} visible tables of contents`);
        await setEditMode(page, true);
        if (shots !== undefined) await shoot(page, path.join(shots, `edit-${name}.png`));
        const titles = await editTitles(page);
        if (JSON.stringify(titles.map((title) => title.split("|")[0])) !== JSON.stringify(["[TOC]", "[[_TOC_]]", "{contents}"])) {
          failures.push(`${name}: edit titles ${JSON.stringify(titles)}`);
        }
        for (const title of titles) {
          const [, family, list] = title.split("|");
          if (!/mono|consol|courier/iu.test(family ?? "")) failures.push(`${name}: not code font ${title}`);
          if (list !== "hidden") failures.push(`${name}: the list shows in edit mode ${title}`);
        }
      }
      assert.deepEqual(failures, [], "[TOC], [[_TOC_]] and {contents} list the headings in read mode and is titled in edit mode");

      // A click on an entry brings its heading into view.
      await setEditMode(page, false);
      await withCurrentFrame(page, (frame) => frame.locator("nav.okf-toc >> a", { hasText: "Reference" }).first().click());
      await waitFor("the Reference heading to scroll into view", () => withCurrentFrame(page, (frame) =>
        frame.evaluate(() => {
          const top = document.querySelector("#reference")?.getBoundingClientRect().top;
          return top !== undefined && top >= 0 && top < window.innerHeight / 2;
        })));

      // In edit mode a click on the block opens the raw marker line, and only that line changes.
      await setEditMode(page, true);
      await withCurrentFrame(page, (frame) => frame.evaluate(() => window.scrollTo(0, 0)));
      await withCurrentFrame(page, (frame) => frame.locator("nav.okf-toc").first().click());
      await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
      const raw = await withCurrentFrame(page, (frame) =>
        frame.locator("[data-sphinx-preview-block-editor] textarea").inputValue());
      assert.equal(raw, "[TOC]", "the editor holds the marker line only");
      await press(page, "Control+End");
      await typeText(page, " ");
      await press(page, "Backspace");
      await typeText(page, "x");
      await press(page, "Backspace");
      await withCurrentFrame(page, (frame) => frame.locator("h2", { hasText: "Usage" }).click());
      await waitFor("the editor to close", async () => (await editTitles(page)).length === 3);
      assert.equal(bufferText(textDocument), TEXT, "nothing outside the marker changed, and no list was written");
    } finally {
      await vscode.commands.executeCommand("workbench.action.toggleMaximizeEditorGroup");
      await vscode.commands.executeCommand("workbench.action.toggleSidebarVisibility");
      await closeAllEditors();
    }
  } finally {
    fixture.dispose();
    await workbench.update("colorTheme", originalTheme, vscode.ConfigurationTarget.Global);
  }
}

/** Suite entry: the scenario in the window the trusted suite runs in. */
export async function run(): Promise<void> {
  const { browser, page } = await connectWorkbench();
  try {
    await page.setViewportSize({ width: 1400, height: 900 });
    await scenarioToc(page);
  } finally {
    await browser.close();
  }
}
