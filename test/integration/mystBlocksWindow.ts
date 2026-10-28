/**
 * Real-window check of MyST cards, tabs and version admonitions (CR 148). A REAL VS Code window
 * opens a document with the three version directives, a standalone `{card}` with `:header:` and
 * `:footer:`, and a `{tab-set}` of three `{tab-item}`s (the second is `:selected:`):
 *
 * - read mode titles the version admonitions "Added in version 0.47" (no colon), paints the card
 *   with its header, body and footer, and shows one tab panel at a time;
 * - ArrowRight, End, Home and ArrowLeft in the focused tab move the selection and the focus, and
 *   a click selects a tab;
 * - edit mode keeps every tab item editable: a click on a panel opens its raw source.
 *
 * `STUDIO_MYST_BLOCKS_SHOTS=<folder>` also writes `read-cream.png`, `read-dark.png`,
 * `edit-cream.png` and `edit-dark.png` (the screenshots are taken before the assertions, so the
 * same scenario can photograph the previous code, where the directives are plain text). The
 * scenario leaves the window as it found it.
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
  waitFor,
  waitForEditor,
  withCurrentFrame,
} from "./realInput/harness";

const TEXT = [
  "# Release notes",
  "",
  ":::{versionadded} 0.47",
  "Added support for `.include` keyword.",
  ":::",
  "",
  ":::{versionchanged} 0.50",
  "The `.include` keyword accepts a glob.",
  ":::",
  "",
  ":::{deprecated} 1.0",
  "Use `{include}` instead.",
  ":::",
  "",
  ":::{card} Claude Code",
  ":header: Since v2.1.154, published 2026-05-28",
  ":footer: Documented in the workflows guide",
  "",
  "- Saved in `.claude/workflows/` or `~/.claude/workflows/`, run as `/<name>`.",
  "- Runs in the CLI, the Desktop app and the IDE extensions.",
  ":::",
  "",
  "::::{tab-set}",
  ":::{tab-item} Python",
  ":sync: python",
  "Install with `pip install studio`.",
  ":::",
  ":::{tab-item} Node",
  ":sync: node",
  ":selected:",
  "Install with `npm install studio`.",
  ":::",
  ":::{tab-item} Shell",
  ":sync: shell",
  "Install with `brew install studio`.",
  ":::",
  "::::",
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
}

async function shoot(page: Page, file: string): Promise<void> {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const box = await withCurrentFrame(page, async (frame) => {
    const content = await frame.locator("#sphinx-myst-preview-content").boundingBox();
    if (!content) throw new Error("no box for the content");
    return { x: content.x, y: Math.max(0, content.y), width: content.width, height: Math.min(content.height, 860) };
  });
  await withCurrentFrame(page, (frame) => frame.evaluate(() => (document.activeElement as HTMLElement | null)?.blur()));
  await page.mouse.move(2, 2);
  await new Promise<void>((resolve) => setTimeout(resolve, 400));
  await page.screenshot({ path: file, clip: box });
}


interface TabState {
  selected: string[];
  shownPanels: string[];
  focused: string;
}

async function tabState(page: Page): Promise<TabState> {
  return withCurrentFrame(page, (frame) => frame.evaluate((): TabState => {
    const set = document.querySelector(".myst-tab-set")!;
    const tabs = Array.from(set.querySelectorAll<HTMLElement>(":scope > .myst-tab-list > .myst-tab"));
    const panels = Array.from(set.querySelectorAll<HTMLElement>(":scope > .myst-tab-panel"));
    return {
      selected: tabs.filter((tab) => tab.getAttribute("aria-selected") === "true").map((tab) => tab.textContent ?? ""),
      shownPanels: panels.filter((panel) => panel.getBoundingClientRect().height > 0)
        .map((panel) => (panel.textContent ?? "").trim()),
      focused: (document.activeElement as HTMLElement | null)?.textContent ?? "",
    };
  }));
}

async function readBlocks(page: Page): Promise<{ titles: string[]; card: string[]; tabs: string[] }> {
  return withCurrentFrame(page, (frame) => frame.evaluate(() => {
    const card = document.querySelector(".myst-card");
    return {
      titles: Array.from(document.querySelectorAll(".admonition.versionadded > .admonition-title, .admonition.versionchanged > .admonition-title, .admonition.deprecated > .admonition-title"))
        .map((title) => (title.textContent ?? "").trim()),
      card: Array.from(card?.children ?? []).map((part) => `${part.className}:${(part.textContent ?? "").trim().slice(0, 40)}`),
      tabs: Array.from(document.querySelectorAll(".myst-tab")).map((tab) => (tab.textContent ?? "").trim()),
    };
  }));
}

// @tests_req SwRS-MDOKFSTUDIO-MYST-001
// @tests_req SwRS-MDOKFSTUDIO-MYST-100
// @tests_req SwRS-MDOKFSTUDIO-MYST-098
// @tests_req SwRS-MDOKFSTUDIO-MYST-099
/** myst-blocks: version titles, the card and the tab set render in read and edit mode. */
export async function scenarioMystBlocks(page: Page): Promise<void> {
  const workbench = vscode.workspace.getConfiguration("workbench");
  const originalTheme = workbench.inspect<string>("colorTheme")?.globalValue;
  const shots = process.env.STUDIO_MYST_BLOCKS_SHOTS;
  const fixture = createFixture("realinput-myst-blocks", { "notes.md": TEXT });
  const failures: string[] = [];
  try {
    const textDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("notes.md")));
    try {
      await openSidePreview(textDocument);
      await waitFor("the preview to be ready", () => {
        const preview = getActivePreviewForTests();
        return preview?.documentUri === textDocument.uri.toString() && preview.phase === "ready" && preview.webviewReady;
      });
      await vscode.commands.executeCommand("workbench.action.closeSidebar");
      await vscode.commands.executeCommand("workbench.action.toggleMaximizeEditorGroup");
      await page.setViewportSize({ width: 1400, height: 1000 });
      for (const [name, host, mode] of [
        ["cream", "Default Light Modern", "cream"],
        ["dark", "Default Dark Modern", "current"],
      ] as const) {
        await setHostTheme(page, host);
        await setEditMode(page, false);
        await setPreviewMode(page, mode);
        if (shots !== undefined) await shoot(page, path.join(shots, `read-${name}.png`));
        const blocks = await readBlocks(page);
        if (JSON.stringify(blocks.titles) !== JSON.stringify(["Added in version 0.47", "Changed in version 0.50", "Deprecated since version 1.0"])) {
          failures.push(`${name}: version titles ${JSON.stringify(blocks.titles)}`);
        }
        const parts = blocks.card.map((part) => part.split(":")[0].replace("myst-grid-card-", ""));
        if (JSON.stringify(parts) !== JSON.stringify(["header", "title", "body", "footer"])) {
          failures.push(`${name}: card parts ${JSON.stringify(blocks.card)}`);
        }
        if (JSON.stringify(blocks.tabs) !== JSON.stringify(["Python", "Node", "Shell"])) {
          failures.push(`${name}: tabs ${JSON.stringify(blocks.tabs)}`);
        }
        const initial = await tabState(page);
        if (JSON.stringify(initial.selected) !== JSON.stringify(["Node"]) || initial.shownPanels.length !== 1
          || !initial.shownPanels[0].includes("npm")) {
          failures.push(`${name}: initial tabs ${JSON.stringify(initial)}`);
        }
        await setEditMode(page, true);
        if (shots !== undefined) await shoot(page, path.join(shots, `edit-${name}.png`));
      }
      assert.deepEqual(failures, [], "version titles, the card and the tab set render in read mode");

      // The keyboard: a click selects a tab, then arrows, Home and End move the selection and the focus.
      await setEditMode(page, false);
      await withCurrentFrame(page, (frame) => frame.locator(".myst-tab", { hasText: "Shell" }).click());
      let state = await tabState(page);
      assert.deepEqual([state.selected, state.shownPanels.length, state.focused], [["Shell"], 1, "Shell"], "a click selects the tab");
      for (const [key, selected] of [["ArrowRight", "Python"], ["ArrowLeft", "Shell"], ["Home", "Python"], ["End", "Shell"]] as const) {
        await press(page, key);
        state = await tabState(page);
        assert.deepEqual([key, state.selected, state.focused, state.shownPanels.length], [key, [selected], selected, 1],
          `${key} selects ${selected} and moves the focus`);
      }

      // Edit mode: a tab item is a block of its own, and only its lines change.
      await setEditMode(page, true);
      await withCurrentFrame(page, (frame) => frame.locator(".myst-tab", { hasText: "Python" }).click());
      await withCurrentFrame(page, (frame) => frame.locator(".myst-tab-panel:not([hidden])").click());
      await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
      const raw = await withCurrentFrame(page, (frame) =>
        frame.locator("[data-sphinx-preview-block-editor] textarea").inputValue());
      assert.equal(raw, TEXT.split("\n").slice(23, 27).join("\n"), "the editor holds the source of the tab item only");
      await press(page, "Escape");
      assert.equal(bufferText(textDocument), TEXT, "opening and closing the editor changed nothing");
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
    await page.setViewportSize({ width: 1400, height: 1000 });
    await scenarioMystBlocks(page);
  } finally {
    await browser.close();
  }
}
