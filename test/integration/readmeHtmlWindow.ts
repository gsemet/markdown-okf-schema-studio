/**
 * Real-window check of README-style HTML (CR 141). A REAL VS Code window opens a README with a
 * centred logo, a badge row, a centred title and a theme-aware `<picture>`:
 *
 * - read mode paints the logo at 96x96 centred in its `div`, the title centred, the two badges at
 *   their height, and the picture shows the image of the preview theme (cream: light, dark: dark);
 * - edit mode titles the `div` and `p` blocks with their literal opening tags in code font;
 * - a click on the `p` block opens the raw source of exactly its lines, and committing an edit
 *   changes the source only inside them.
 *
 * `STUDIO_README_HTML_SHOTS=<folder>` also writes `read-cream.png`, `read-dark.png`,
 * `edit-cream.png` and `edit-dark.png` (the screenshots are taken before the assertions, so the
 * same scenario can photograph the previous code). The scenario leaves the window as it found it.
 */
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import type { Page } from "playwright-core";
import * as vscode from "vscode";

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

const svg = (width: number, height: number, fill: string, label: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
  + `<rect width="${width}" height="${height}" rx="${Math.min(width, height) / 5}" fill="${fill}"/>`
  + `<text x="50%" y="55%" font-family="sans-serif" font-size="${Math.round(height / 3)}" fill="white" `
  + `text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`;

const TEXT = [
  "<div align=\"center\">",
  "",
  "<img src=\"app-icon.svg\" alt=\"App\" width=\"96\" height=\"96\">",
  "",
  "# Sample App",
  "",
  "<a href=\"https://example.com/build\"><img src=\"badge-build.svg\" alt=\"build\" height=\"20\"></a>",
  "<a href=\"https://example.com/license\"><img src=\"badge-license.svg\" alt=\"license\" height=\"20\"></a>",
  "",
  "A **centred** tagline.",
  "",
  "</div>",
  "",
  "<p align=\"center\">",
  "  <picture>",
  "    <source media=\"(prefers-color-scheme: dark)\" srcset=\"logo-dark.svg\">",
  "    <img src=\"logo-light.svg\" alt=\"Logo\" width=\"160\">",
  "  </picture>",
  "</p>",
  "",
  "## Usage",
  "",
  "Plain Markdown after the HTML.",
  "",
].join("\n");

const FILES: Record<string, string> = {
  "README.md": TEXT,
  "app-icon.svg": svg(96, 96, "#3b6ea5", "App"),
  "badge-build.svg": svg(70, 20, "#2e8b57", "build"),
  "badge-license.svg": svg(80, 20, "#6b4fa0", "MIT"),
  "logo-light.svg": svg(160, 48, "#c2410c", "light"),
  "logo-dark.svg": svg(160, 48, "#38bdf8", "dark"),
};

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

interface Layout {
  hasDiv: boolean;
  divTextAlign: string;
  logo: { width: number; height: number; centreOffset: number } | undefined;
  titleAlign: string;
  badges: number[];
  visiblePicture: string[];
  loaded: boolean;
}

async function readLayout(page: Page): Promise<Layout> {
  return withCurrentFrame(page, (frame) => frame.evaluate((): Layout => {
    const content = document.querySelector("#sphinx-myst-preview-content")!;
    const div = content.querySelector<HTMLElement>("div[align=center]");
    const logo = div?.querySelector<HTMLImageElement>("img[alt=App]");
    const box = logo?.getBoundingClientRect();
    const divBox = div?.getBoundingClientRect();
    const shown = (image: HTMLImageElement): boolean => getComputedStyle(image).display !== "none";
    return {
      hasDiv: div !== null,
      divTextAlign: div ? getComputedStyle(div).textAlign : "",
      logo: box && divBox ? {
        width: Math.round(box.width),
        height: Math.round(box.height),
        centreOffset: Math.round(Math.abs((box.left + box.width / 2) - (divBox.left + divBox.width / 2))),
      } : undefined,
      titleAlign: div?.querySelector("h1") ? getComputedStyle(div.querySelector("h1")!).textAlign : "",
      badges: Array.from(content.querySelectorAll<HTMLImageElement>("a > img"))
        .map((image) => Math.round(image.getBoundingClientRect().height)),
      visiblePicture: Array.from(content.querySelectorAll<HTMLImageElement>("picture img"))
        .filter(shown).map((image) => image.getAttribute("src")?.split("/").pop()?.split("?")[0] ?? ""),
      loaded: Array.from(content.querySelectorAll<HTMLImageElement>("img"))
        .filter(shown).every((image) => image.complete && image.naturalWidth > 0),
    };
  }));
}

async function editTitles(page: Page): Promise<string[]> {
  return withCurrentFrame(page, (frame) => frame.locator(".okf-html-block").evaluateAll((blocks) =>
    blocks.map((block) => {
      const before = getComputedStyle(block, "::before");
      return `${before.content.replace(/^"|"$/gu, "").replace(/\\"/gu, "\"")}|${before.fontFamily}`;
    })));
}

// @tests_req SwRS-MDOKFSTUDIO-CORE-071
/** rendering-core: README HTML renders centred and theme-aware, is titled in edit mode and edits raw. */
export async function scenarioReadmeHtml(page: Page): Promise<void> {
  const workbench = vscode.workspace.getConfiguration("workbench");
  const originalTheme = workbench.inspect<string>("colorTheme")?.globalValue;
  const shots = process.env.STUDIO_README_HTML_SHOTS;
  const fixture = createFixture("realinput-readme-html", FILES);
  const failures: string[] = [];
  try {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("README.md")));
    try {
      await openSidePreview(document);
      await waitFor("the preview to be ready", () => {
        const preview = getActivePreviewForTests();
        return preview?.documentUri === document.uri.toString() && preview.phase === "ready" && preview.webviewReady;
      });
      // A wide preview, like a README on a page: the side bar goes away and the preview group fills the window.
      await vscode.commands.executeCommand("workbench.action.closeSidebar");
      await vscode.commands.executeCommand("workbench.action.toggleMaximizeEditorGroup");
      await page.setViewportSize({ width: 1400, height: 900 });
      for (const [name, host, mode, pictureImage] of [
        ["cream", "Default Light Modern", "cream", "logo-light.svg"],
        ["dark", "Default Dark Modern", "current", "logo-dark.svg"],
      ] as const) {
        await setHostTheme(page, host);
        await setEditMode(page, false);
        await setPreviewMode(page, mode);
        await waitFor("the images to load", async () => (await readLayout(page)).loaded);
        if (shots !== undefined) await shoot(page, path.join(shots, `read-${name}.png`));
        const layout = await readLayout(page);
        if (!layout.hasDiv) failures.push(`${name}: no div[align=center] in the preview`);
        if (layout.divTextAlign !== "center") failures.push(`${name}: div text-align ${layout.divTextAlign}`);
        if (layout.titleAlign !== "center") failures.push(`${name}: title text-align ${layout.titleAlign}`);
        if (!layout.logo || layout.logo.width !== 96 || layout.logo.height !== 96 || layout.logo.centreOffset > 4) {
          failures.push(`${name}: logo ${JSON.stringify(layout.logo)}`);
        }
        if (JSON.stringify(layout.badges) !== "[20,20]") failures.push(`${name}: badges ${JSON.stringify(layout.badges)}`);
        if (JSON.stringify(layout.visiblePicture) !== JSON.stringify([pictureImage])) {
          failures.push(`${name}: picture shows ${JSON.stringify(layout.visiblePicture)}`);
        }
        await setEditMode(page, true);
        if (shots !== undefined) await shoot(page, path.join(shots, `edit-${name}.png`));
        const titles = await editTitles(page);
        if (JSON.stringify(titles.map((title) => title.split("|")[0]))
          !== JSON.stringify(["<div align=\"center\">", "<p align=\"center\">"])) {
          failures.push(`${name}: edit titles ${JSON.stringify(titles)}`);
        }
        for (const title of titles) {
          if (!/mono|consol|courier/iu.test(title.split("|")[1] ?? "")) failures.push(`${name}: not code font ${title}`);
        }
      }
      assert.deepEqual(failures, [], "README HTML renders like GitHub and shows its tags in edit mode");

      // A click on the p block edits the raw source of its lines only.
      await withCurrentFrame(page, (frame) => frame.locator("p.okf-html-block picture").click());
      await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
      const raw = await withCurrentFrame(page, (frame) =>
        frame.locator("[data-sphinx-preview-block-editor] textarea").inputValue());
      assert.equal(raw, TEXT.split("\n").slice(13, 19).join("\n"), "the editor holds the raw source of the p block");
      await press(page, "Control+End");
      await typeText(page, " X");
      await withCurrentFrame(page, (frame) => frame.locator("h2", { hasText: "Usage" }).click());
      const expected = TEXT.replace("</p>\n", "</p> X\n");
      await waitFor("the edit to reach the buffer, outside the block untouched", () =>
        bufferText(document) === expected);
      assert.equal(bufferText(document), expected);
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
    await scenarioReadmeHtml(page);
  } finally {
    await browser.close();
  }
}
