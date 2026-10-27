/**
 * Real-window check of the title of an open comment block in edit mode (CR 140). A REAL VS Code
 * window opens a document holding a TODO comment, a lower-case todo comment and a plain comment in
 * edit mode; each chip is opened and the title the webview paints is the literal tag of the
 * comment, in the code font. Read mode keeps the words Comment and TODO.
 *
 * `STUDIO_COMMENT_TITLE_SHOTS=<folder>` also writes `<name>-cream.png` and `<name>-dark.png`.
 * The scenario leaves the window as it found it: no editor, theme restored, files removed.
 */
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import type { Page } from "playwright-core";
import * as vscode from "vscode";

import { getActivePreviewForTests } from "./extensionApi";
import {
  closeAllEditors,
  connectWorkbench,
  createFixture,
  findCurrentFrame,
  openSidePreview,
  setEditMode,
  waitFor,
  withCurrentFrame,
} from "./realInput/harness";

const TEXT = [
  "# Notes",
  "",
  "Some text before.",
  "",
  "<!-- TODO: cite the slop zone bellow -->",
  "",
  "<!-- todo lower case reminder -->",
  "",
  "<!-- a plain note -->",
  "",
  "Some text after.",
  "",
].join("\n");

const EXPECTED = ["<!-- TODO -->", "<!-- TODO -->", "<!-- -->"];

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

/** Opens every comment chip and returns the title painted above each opened body. */
async function openedTitles(page: Page): Promise<string[]> {
  return withCurrentFrame(page, async (frame) => {
    const chips = frame.locator(".okf-comment > .okf-chip");
    const count = await chips.count();
    for (let index = 0; index < count; index += 1) {
      const chip = chips.nth(index);
      if (await chip.getAttribute("aria-expanded") !== "true") await chip.click();
    }
    return frame.locator(".okf-comment > .okf-comment-body:not([hidden])").evaluateAll((bodies) =>
      bodies.map((body) => {
        const before = getComputedStyle(body, "::before");
        return `${before.content.replace(/^"|"$/gu, "")}|${before.fontFamily}`;
      }));
  });
}

async function shoot(page: Page, file: string): Promise<void> {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const box = await withCurrentFrame(page, async (frame) => {
    const comments = frame.locator(".okf-comment");
    const first = await comments.first().boundingBox();
    const last = await comments.last().boundingBox();
    if (!first || !last) throw new Error("no box for the comments");
    return { x: Math.max(0, first.x - 24), y: Math.max(0, first.y - 40),
      width: first.width + 48, height: last.y + last.height - first.y + 80 };
  });
  await page.screenshot({ path: file, clip: box });
}

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-003
/** review-annotations: an open comment in edit mode is titled with its literal tag. */
export async function scenarioCommentTitle(page: Page): Promise<void> {
  const workbench = vscode.workspace.getConfiguration("workbench");
  const originalTheme = workbench.inspect<string>("colorTheme")?.globalValue;
  const shots = process.env.STUDIO_COMMENT_TITLE_SHOTS;
  const fixture = createFixture("realinput-comment-title", { "notes.md": TEXT });
  const failures: string[] = [];
  try {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("notes.md")));
    try {
      await openSidePreview(document);
      await waitFor("the preview to be ready", () => {
        const preview = getActivePreviewForTests();
        return preview?.documentUri === document.uri.toString() && preview.phase === "ready" && preview.webviewReady;
      });
      await setEditMode(page, true);
      for (const [name, host, mode] of [["cream", "Default Light Modern", "cream"],
        ["dark", "Default Dark Modern", "current"]] as const) {
        await setHostTheme(page, host);
        await setPreviewMode(page, mode);
        const titles = await openedTitles(page);
        if (shots !== undefined) await shoot(page, path.join(shots, `${name}.png`));
        const shown = titles.map((title) => title.split("|")[0]);
        if (JSON.stringify(shown) !== JSON.stringify(EXPECTED)) failures.push(`${name}: ${JSON.stringify(titles)}`);
        for (const title of titles) {
          if (!/mono|consol|courier/iu.test(title.split("|")[1] ?? "")) failures.push(`${name}: not code font ${title}`);
        }
      }
      assert.deepEqual(failures, [], "edit mode titles each open comment with its literal tag in the code font");
      await setEditMode(page, false);
      const readTitles = await openedTitles(page);
      assert.deepEqual(readTitles.map((title) => title.split("|")[0]), ["TODO", "TODO", "Comment"]);
    } finally {
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
    await scenarioCommentTitle(page);
  } finally {
    await browser.close();
  }
}
