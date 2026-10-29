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
import { ensureTestWindowFocused, waitForActiveSourceEditor } from "./windowFocus";

async function waitFor(description: string, predicate: () => boolean | Promise<boolean>, timeoutMs = 15_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

const pause = (ms: number): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, ms));

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

const tallLines = (count: number): string[] => Array.from({ length: count }, (_, index) =>
  `Tall line ${String(index + 1).padStart(2, "0")} of a block taller than the pane, opened while the page is scrolled into it.`);

const filler = (name: string, count: number): string[] => Array.from({ length: count }, (_, index) =>
  `${name} paragraph ${index + 1} gives the page room to scroll, as in a long document.`);

/** The CR 123 tall-block page: a heading, filler, a code block far taller than the pane, filler. */
const SOURCE = [
  "# Wrapped editing", "",
  ...filler("Filler", 6).flatMap((line) => [line, ""]),
  "```text", ...tallLines(80), "```", "",
  ...filler("Closing", 12).flatMap((line) => [line, ""]),
].join("\n");

/** The palette, the reading area, the controls, the frame and the page scroll, read in the webview. */
interface Sample {
  scrollY: number;
  paletteTop: number;
  paletteBottom: number;
  /** Where a stuck palette sits: its computed sticky `top`. */
  stuckAt: number;
  /** The top of the reading area: the sticky heading band's bottom (0 when hidden). */
  readingTop: number;
  /** The preview controls' bottom when a palette button shares their columns, else null. */
  controlsBottomOverButtons: number | null;
  /** The top of the highest palette button. */
  buttonsTop: number;
  frameTop: number;
  frameBottom: number;
  /** The caret line of the text box, viewport coordinates. */
  caret: { top: number; bottom: number } | null;
  viewportHeight: number;
}

const SAMPLE = (): Sample | null => {
  const palette = document.querySelector(".sphinx-preview-edit-palette");
  const frame = document.querySelector("[data-sphinx-preview-block-editor]");
  if (!palette || !frame) return null;
  const bar = palette.getBoundingClientRect();
  const box = frame.getBoundingClientRect();
  const band = document.querySelector<HTMLElement>("[data-sphinx-preview-sticky-headings]");
  const controls = document.querySelector("[data-sphinx-preview-toolbar]")?.getBoundingClientRect();
  const buttons = Array.from(palette.querySelectorAll("button, select"))
    .map((item) => item.getBoundingClientRect())
    .filter((item) => item.width > 0 && item.height > 0);
  const underControls = controls
    ? buttons.filter((item) => item.left < controls.right && item.right > controls.left)
    : [];
  // The caret line: a mirror of the text box up to the caret gives its offset.
  const textarea = frame.querySelector("textarea");
  let caret: { top: number; bottom: number } | null = null;
  if (textarea) {
    const style = getComputedStyle(textarea);
    const lineHeight = Number.parseFloat(style.lineHeight) || 20;
    const mirror = document.createElement("div");
    for (const property of ["width", "font", "letterSpacing", "wordWrap", "overflowWrap", "padding", "border", "boxSizing", "tabSize"] as const) {
      mirror.style[property] = style[property];
    }
    mirror.style.position = "absolute";
    mirror.style.visibility = "hidden";
    mirror.style.whiteSpace = "pre-wrap";
    mirror.textContent = textarea.value.slice(0, textarea.selectionEnd) + "​";
    document.body.appendChild(mirror);
    const height = mirror.getBoundingClientRect().height - Number.parseFloat(style.paddingBottom)
      - Number.parseFloat(style.borderBottomWidth);
    mirror.remove();
    const top = textarea.getBoundingClientRect().top + height - lineHeight - textarea.scrollTop;
    caret = { top, bottom: top + lineHeight };
  }
  return {
    scrollY: window.scrollY,
    paletteTop: bar.top,
    paletteBottom: bar.bottom,
    stuckAt: Number.parseFloat(getComputedStyle(palette).top),
    readingTop: band && !band.hidden ? Math.max(0, band.getBoundingClientRect().bottom) : 0,
    controlsBottomOverButtons: controls && underControls.length > 0 ? controls.bottom : null,
    buttonsTop: Math.min(...buttons.map((item) => item.top)),
    frameTop: box.top,
    frameBottom: box.bottom,
    caret,
    viewportHeight: window.innerHeight,
  };
};

/**
 * CR 123, the user's rule for a block taller than the pane: the edition palette sticks at the top of
 * the pane (under the sticky band, or just under the preview controls when its buttons share their
 * columns) and the text scrolls under it; scrolling down with the wheel never brings the page back
 * up. Two real-window cases: (a) the tall block of a page opened while scrolled into it (the user's
 * "toolbar too low" image), (b) an empty document, Start writing, a very large text pasted (the
 * user's "scroll jumps to the top" report): the page follows the caret to the end of the paste.
 * Each case then scrolls down step by step with the mouse wheel over the text box.
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
  const width = Number(process.env.STUDIO_TALL_BLOCK_WIDTH ?? 1600);
  const shotDirectory = path.join(E2E_REPORT_ROOT, "tall-block-scroll");
  fs.mkdirSync(shotDirectory, { recursive: true });
  const directory = fs.mkdtempSync(path.join(extensionRoot, "test", "integration", "fixtures", "tall-block-scroll-e2e-"));
  const tallPath = (name: string): string => path.join(directory, `${name}.md`);
  const emptyPath = (mode: string): string => path.join(directory, `empty-${mode}.md`);
  for (const name of ["tall", "tall-paste-cream", "tall-paste-dark"]) fs.writeFileSync(tallPath(name), SOURCE);
  for (const mode of ["cream", "dark"]) fs.writeFileSync(emptyPath(mode), "");
  const workbench = vscode.workspace.getConfiguration("workbench");
  const originalTheme = workbench.inspect<string>("colorTheme")?.workspaceValue;
  const failures: string[] = [];
  const opened: vscode.TextDocument[] = [];
  let themeMode: "cream" | "dark" = "cream";

  const openPreview = async (filePath: string): Promise<void> => {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
    opened.push(document);
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await waitForActiveSourceEditor(document);
    await vscode.commands.executeCommand(COMMAND_ID);
    await waitFor("the rendered preview", async () => {
      const preview = getActivePreviewForTests();
      if (preview?.documentUri !== document.uri.toString() || preview.phase !== "ready") return false;
      const frame = await liveFrame(page).catch(() => undefined);
      return frame !== undefined && await frame.locator("html").getAttribute("data-sphinx-preview-theme-mode") === themeMode;
    }, 30_000);
    await waitFor("edit mode", async () => {
      const live = await liveFrame(page);
      if (await live.locator("html").getAttribute("data-sphinx-preview-edit-mode") === "on") return true;
      await live.locator("[data-sphinx-preview-edit-toggle]").click({ timeout: 2_000 }).catch(() => undefined);
      return await live.locator("html").getAttribute("data-sphinx-preview-edit-mode") === "on";
    }, 30_000);
  };
  const sample = async (): Promise<Sample | null> => (await liveFrame(page)).evaluate(SAMPLE);
  const shoot = async (name: string): Promise<void> => {
    await page.screenshot({ path: path.join(shotDirectory, `${tag}-${name}.png`) });
  };
  const closeEditor = async (): Promise<void> => {
    const isOpen = async (): Promise<boolean> =>
      await (await liveFrame(page)).locator("[data-sphinx-preview-block-editor]").count() > 0;
    await escapeUntilClosed(() => page.keyboard.press("Escape"), isOpen, () => pause(400));
    await waitFor("the block editor to close", async () => !(await isOpen()));
  };

  // The toolbar is at the top of the pane while the frame runs past it: 4 px under the reading
  // area's top, or, when one of its buttons shares columns with the preview controls, just under them.
  const checkAtTop = (name: string, at: Sample): void => {
    if (!(at.frameTop < at.paletteTop && at.frameBottom > at.paletteBottom + 100)) return;
    if (at.controlsBottomOverButtons === null) {
      if (Math.abs(at.paletteTop - (at.readingTop + 4)) > 2) {
        failures.push(`${name}: the toolbar is at ${at.paletteTop.toFixed(1)}, not at the top of the pane `
          + `(${(at.readingTop + 4).toFixed(1)}, under the sticky band; no button is under the preview controls): `
          + JSON.stringify({ ...at, caret: undefined }));
      }
    } else if (at.buttonsTop < at.controlsBottomOverButtons || at.buttonsTop > at.controlsBottomOverButtons + 24) {
      failures.push(`${name}: the toolbar's buttons start at ${at.buttonsTop.toFixed(1)}, not just under the preview `
        + `controls (${at.controlsBottomOverButtons.toFixed(1)}): ${JSON.stringify({ ...at, caret: undefined })}`);
    }
  };

  // Wheel down over the text box, one notch at a time: the page only goes down, the toolbar stays at
  // the top. An editor that closes (a re-render) fails the case (CR 134).
  const wheelDown = async (name: string, steps: number): Promise<void> => {
    const live = await liveFrame(page);
    const viewport = await (await live.frameElement()).boundingBox();
    assert.ok(viewport, `${name}: the webview frame has a box`);
    const textBox = await live.locator("[data-sphinx-preview-block-editor] textarea").boundingBox();
    const x = textBox ? textBox.x + Math.min(200, textBox.width / 2) : viewport.x + viewport.width / 2;
    await page.mouse.move(x, viewport.y + viewport.height * 0.6);
    let previous = await sample();
    assert.ok(previous, `${name}: an open editor before scrolling`);
    const start = previous.scrollY;
    for (let step = 1; step <= steps; step += 1) {
      await page.mouse.wheel(0, 120);
      await pause(250);
      const now = await sample();
      if (!now) {
        // CR 134: a re-render that closes the editor is the bug, not a way to end the steps.
        failures.push(`${name}: the editor closed at wheel step ${step} (a re-render closed it)`);
        return;
      }
      console.log(`tall-block-scroll ${name} step ${step}: ${JSON.stringify({ ...now, caret: undefined })}`);
      if (now.scrollY < previous.scrollY - 1) {
        failures.push(`${name}: wheel step ${step} moved the page back up from ${previous.scrollY} to ${now.scrollY}`);
        return;
      }
      checkAtTop(`${name} step ${step}`, now);
      previous = now;
    }
    if (!(previous.scrollY > start + 200)) {
      failures.push(`${name}: ${steps} wheel steps scrolled the page from ${start} to ${previous.scrollY} only`);
    }
  };

  /** Opens the tall page and the tall block's editor with the page scrolled into it (CR 123). */
  const openTallBlockEditor = async (name: string) => {
    await openPreview(tallPath(name));
    const live = await liveFrame(page);
    const tall = live.locator("#sphinx-myst-preview-content pre", { hasText: "Tall line 01" }).first();
    await tall.evaluate((element) => globalThis.scrollBy(0, element.getBoundingClientRect().top + 150));
    await pause(400);
    const firstSeen = await tall.evaluate((pre) => {
      const band = document.querySelector<HTMLElement>("[data-sphinx-preview-sticky-headings]");
      const readingTop = band && !band.hidden ? Math.max(0, band.getBoundingClientRect().bottom) : 0;
      const code = pre.querySelector("code") ?? pre;
      const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const pattern = /Tall line \d\d/g;
        for (let match = pattern.exec(node.textContent ?? ""); match; match = pattern.exec(node.textContent ?? "")) {
          const range = document.createRange();
          range.setStart(node, match.index);
          range.setEnd(node, match.index + 1);
          const box = range.getBoundingClientRect();
          if (box.top >= readingTop) return { x: box.left + 60, y: (box.top + box.bottom) / 2 };
        }
      }
      return null;
    });
    assert.ok(firstSeen, "a tall line is visible in the reading area");
    const frameBox = await (await live.frameElement()).boundingBox();
    assert.ok(frameBox);
    await page.mouse.click(frameBox.x + firstSeen.x, frameBox.y + firstSeen.y);
    await waitFor("the text box", async () => (await (await liveFrame(page)).locator("[data-sphinx-preview-block-editor] textarea").count()) === 1);
    await pause(700);
    const openedAt = await sample();
    assert.ok(openedAt, "the tall block's editor is open");
    console.log(`tall-block-scroll opened: ${JSON.stringify({ ...openedAt, caret: undefined })}`);
    checkAtTop("tall block opened", openedAt);
    return { live, frameBox, firstSeen };
  };

  /**
   * CR 134: a paste into the open editor of a tall block. The host renders the pasted text after the
   * autosave; the editor stays open with the caret where the paste ended and the page does not move.
   */
  const pasteIntoTallBlockCase = async (mode: string): Promise<void> => {
    await openTallBlockEditor(`tall-paste-${mode}`);
    const before = await sample();
    assert.ok(before, `${mode} tall paste: an open editor before the paste`);
    await vscode.env.clipboard.writeText(tallLines(40).map((line) => `Pasted ${line}`).join("\n"));
    await page.keyboard.press(process.platform === "darwin" ? "Meta+V" : "Control+V");
    await pause(300);
    const pasted = await sample();
    assert.ok(pasted, `${mode} tall paste: the editor is open right after the paste`);
    await pause(2_000);
    const settled = await sample();
    if (!settled) {
      failures.push(`${mode} tall paste: the editor closed after the paste (the page re-rendered), `
        + `scrollY was ${pasted.scrollY}`);
      await shoot(`window-tall-closed-after-paste-${mode}`);
    } else {
      if (Math.abs(settled.scrollY - pasted.scrollY) > 2) {
        failures.push(`${mode} tall paste: the page moved from ${pasted.scrollY} to ${settled.scrollY} after the render`);
      }
      if (!settled.caret || settled.caret.bottom > settled.viewportHeight || settled.caret.top < settled.paletteBottom - 0.5) {
        failures.push(`${mode} tall paste: the caret is out of view after the render (${JSON.stringify(settled.caret)})`);
      }
      await shoot(`window-tall-pasted-${mode}`);
      await closeEditor();
    }
    disposeActivePreviewForTests();
  };

  const pastedTextCase = async (mode: string): Promise<void> => {
    await openPreview(emptyPath(mode));
    const emptyFrame = await liveFrame(page);
    await emptyFrame.getByRole("button", { name: "Start writing" }).click();
    await waitFor("the Start writing text box", async () => (await (await liveFrame(page)).locator("[data-sphinx-preview-block-editor] textarea").count()) === 1);
    await (await liveFrame(page)).locator("[data-sphinx-preview-block-editor] textarea").focus();
    await vscode.env.clipboard.writeText(tallLines(90).join("\n\n"));
    await page.keyboard.press(process.platform === "darwin" ? "Meta+V" : "Control+V");
    await pause(300);
    const pasted = await sample();
    assert.ok(pasted, "the Start writing editor is open after the paste");
    console.log(`tall-block-scroll after paste: ${JSON.stringify(pasted)}`);
    // The page follows the caret to the end of the paste; left at the top, a re-render of the pasted
    // text (its pin taken there) brings a reader who scrolled down back to the top.
    if (!pasted.caret || pasted.caret.bottom > pasted.viewportHeight || pasted.caret.top < pasted.paletteBottom - 0.5) {
      failures.push(`pasted text: the caret at the end of the paste is out of view (caret ${JSON.stringify(pasted.caret)}, `
        + `palette bottom ${pasted.paletteBottom}, viewport ${pasted.viewportHeight}, scrollY ${pasted.scrollY})`);
    }
    // CR 134: the host renders the pasted text after the autosave; the editor stays open with the
    // caret where the paste ended and the page does not move.
    await pause(2_000);
    const settled = await sample();
    if (!settled) {
      failures.push(`${mode} paste: the editor closed after the paste (the page re-rendered)`);
      await shoot(`window-closed-after-paste-${mode}`);
    } else {
      if (Math.abs(settled.scrollY - pasted.scrollY) > 2) {
        failures.push(`${mode} paste: the page moved from ${pasted.scrollY} to ${settled.scrollY} after the render`);
      }
      await shoot(`window-pasted-${mode}`);
    }
    // Back to the top of the page with the wheel, then down again step by step.
    const box = await (await (await liveFrame(page)).frameElement()).boundingBox();
    assert.ok(box);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.6);
    for (let step = 0; step < 60 && ((await sample())?.scrollY ?? 0) > 0; step += 1) {
      await page.mouse.wheel(0, -1200);
      await pause(60);
    }
    await pause(400);
    if (await sample()) await wheelDown("pasted text", 16);
    if (await (await liveFrame(page)).locator("[data-sphinx-preview-block-editor]").count() > 0) await closeEditor();
    disposeActivePreviewForTests();
  };

  try {
    await workbench.update("colorTheme", "Default Dark Modern", vscode.ConfigurationTarget.Workspace);
    await page.setViewportSize({ width, height: 800 });
    await vscode.commands.executeCommand("workbench.action.closeSidebar");
    await vscode.commands.executeCommand("workbench.action.closeAuxiliaryBar");

    // (a) The tall block, opened while its top is 150 px above the pane, on the first line seen.
    const { frameBox, firstSeen } = await openTallBlockEditor("tall");
    // The user's layout: a pane wide enough for the preview controls to overlap only the empty end of
    // the bar (none of its buttons). The bar wraps with the width, so look for such a width.
    let layoutWidth: number | undefined;
    for (let candidate = width; candidate <= 2600 && layoutWidth === undefined; candidate += 40) {
      await page.setViewportSize({ width: candidate, height: 800 });
      await pause(350);
      const at = await sample();
      if (at && at.controlsBottomOverButtons === null && at.frameTop < at.paletteTop) layoutWidth = candidate;
    }
    console.log(`tall-block-scroll layout width: ${layoutWidth}`);
    if (layoutWidth === undefined) failures.push("tall block: no window width up to 2600 px leaves the bar's buttons clear of the preview controls");
    const resized = await sample();
    assert.ok(resized, "the tall block's editor is still open after the resize");
    checkAtTop("tall block, controls over the bar's empty end", resized);
    await page.mouse.move(frameBox.x + firstSeen.x, frameBox.y + frameBox.height * 0.6);
    await page.mouse.wheel(0, 120);
    await pause(400);
    await shoot("window-tall-cream");
    await wheelDown("tall block", 12);
    await closeEditor();
    disposeActivePreviewForTests();
    await page.setViewportSize({ width, height: 800 });

    // (b) An empty document, Start writing, a very large text pasted in the text box; then the same
    // in the dark preview theme (CR 134: the editor stays open and the page does not move).
    for (const mode of ["cream", "dark"] as const) {
      themeMode = mode;
      await storeWorkspaceChoicesForTests({ previewThemeMode: mode, toolbarCollapsed: false, paletteMode: "myst" });
      await pastedTextCase(mode);
      await pasteIntoTallBlockCase(mode);
    }

    assert.deepEqual(failures, [], failures.join("\n"));
  } finally {
    disposeActivePreviewForTests();
    await pinStoredWorkspaceChoices();
    await workbench.update("colorTheme", originalTheme, vscode.ConfigurationTarget.Workspace);
    for (const document of opened) {
      await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
      await vscode.commands.executeCommand("workbench.action.revertAndCloseActiveEditor");
    }
    await browser.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
