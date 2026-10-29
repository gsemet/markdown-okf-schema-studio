import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { chromium, type Browser, type Frame, type Page } from "playwright-core";
import * as vscode from "vscode";

import {
  COMMAND_ID,
  disposeActivePreviewForTests,
  getActivePreviewForTests,
  storedEditModeForTests,
  storeWorkspaceChoicesForTests,
} from "./extensionApi";
import { E2E_REPORT_ROOT } from "../reportPaths";
import { pinStoredWorkspaceChoices } from "./storedChoices";
import { ensureTestWindowFocused, waitForActiveSourceEditor } from "./windowFocus";

async function waitFor(
  description: string,
  predicate: () => boolean | Promise<boolean>,
  timeoutMs = 15_000,
  explain?: () => Promise<string>,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out waiting for ${description}.${explain ? ` State: ${await explain()}` : ""}`);
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
  "# Studio field notes", "",
  "The Studio preview shows the rendered page, and the studio keeps the source untouched.", "",
  ":::{note}",
  "Admonitions are searched too: the note mentions the Studio once more.",
  ":::", "",
  "| Item | Remark |",
  "| --- | --- |",
  "| One | the studio table cell |",
  "| Two | nothing here |", "",
  "## Details", "",
  "A hidden gem lives in this section, next to a [studio link](https://example.com/studio).", "",
  "Inline math $studio + 1$ is not replaceable from the preview.", "",
  "## Closing", "",
  "Last words about the Studio.", "",
].join("\n");

const DARK_THEME = "Default Dark Modern";
const LIGHT_THEME = "Default Light Modern";

/**
 * CR 144: find and replace in the preview, in a real VS Code window. `STUDIO_FIND_PHASE=before`
 * only takes the screenshots (on the code that has no find bar), anything else runs the checks and
 * takes the "after" screenshots into `STUDIO_FIND_SHOTS` (default: the e2e report folder).
 */
// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-009
// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-010
// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-011
// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-012
// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-014
export async function run(): Promise<void> {
  assert.ok(process.env.STUDIO_CDP_PORT, "the trusted suite must expose a loopback CDP port");
  await vscode.extensions.getExtension("GaetanSemet.markdown-okf-schema-studio")?.activate();
  await ensureTestWindowFocused();
  const browser: Browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.STUDIO_CDP_PORT}`);
  try {
    const page = browser.contexts()[0]?.pages().find((candidate) => candidate.url().includes("workbench"));
    assert.ok(page, "the VS Code workbench is attached");
    await scenarioFindInPreview(page, {
      before: process.env.STUDIO_FIND_PHASE === "before",
      shotDirectory: process.env.STUDIO_FIND_SHOTS ?? path.join(E2E_REPORT_ROOT, "find-in-preview"),
    });
  } finally {
    await browser.close();
  }
}

export interface FindScenarioOptions {
  /** Only the screenshots, on the code that has no find bar (no check). */
  before?: boolean;
  /** Where the screenshots go; none when undefined (the stress rounds). */
  shotDirectory?: string;
}

/**
 * The find scenario on the workbench `page`: cream then dark, with find, match case, a folded
 * section and replace all. The stress plan repeats it (`find-in-preview`, CI rule 12), so it leaves
 * the window as it found it: viewport, colour theme, stored choices and stored edit mode restored,
 * no open editor, the temporary folder removed. Every wait is on a reported state.
 */
export async function scenarioFindInPreview(page: Page, options: FindScenarioOptions = {}): Promise<void> {
  const before = options.before === true;
  const shotDirectory = options.shotDirectory;
  const extensionRoot = path.resolve(__dirname, "../../..");
  if (shotDirectory !== undefined) fs.mkdirSync(shotDirectory, { recursive: true });
  const viewport = page.viewportSize();
  const editModeBefore = storedEditModeForTests();
  const directory = fs.mkdtempSync(path.join(extensionRoot, "test", "integration", "fixtures", "find-e2e-"));
  const filePath = path.join(directory, "field-notes.md");
  fs.writeFileSync(filePath, SOURCE);
  const workbench = vscode.workspace.getConfiguration("workbench");
  const originalTheme = workbench.inspect<string>("colorTheme")?.workspaceValue;
  const notes = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
  const find = process.platform === "darwin" ? "Meta+F" : "Control+F";
  const shoot = async (name: string): Promise<void> => {
    if (shotDirectory === undefined) return;
    await page.mouse.move(5, 5);
    await page.screenshot({ path: path.join(shotDirectory, `${before ? "before" : "after"}-${name}.png`) });
  };
  const openPreview = async (mode: "cream" | "dark", hostTheme: string): Promise<Frame> => {
    await storeWorkspaceChoicesForTests({ previewThemeMode: mode, toolbarCollapsed: false, paletteMode: "myst" });
    await workbench.update("colorTheme", hostTheme, vscode.ConfigurationTarget.Workspace);
    await page.setViewportSize({ width: 1100, height: 760 });
    await vscode.commands.executeCommand("workbench.action.closeSidebar");
    await vscode.commands.executeCommand("workbench.action.closeAuxiliaryBar");
    await vscode.window.showTextDocument(notes, vscode.ViewColumn.One);
    await waitForActiveSourceEditor(notes);
    await vscode.commands.executeCommand(COMMAND_ID);
    await settle("the rendered preview", async () => {
      const preview = getActivePreviewForTests();
      if (preview?.documentUri !== notes.uri.toString() || preview.phase !== "ready") return false;
      const frame = await liveFrame(page).catch(() => undefined);
      return frame !== undefined && await frame.locator("html").getAttribute("data-sphinx-preview-theme-mode") === mode;
    }, 30_000);
    return liveFrame(page);
  };
  const closePreview = async (): Promise<void> => {
    disposeActivePreviewForTests();
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  };
  // CR 169: what the host and the page hold when a step times out, so a heavy run explains itself:
  // the edit mode, an open (or loading) editor, the focused element, the element under the title's
  // centre (the test's click target), the find field and replace toggle, the table menu's box if
  // one exists, and the tail of the page's editor trace. The host's `pageEditorOpen` stays true after
  // an editor closed unchanged (Escape posts nothing) until the host next asks the page about it, so
  // it alone does not mean an editor is open: the page fields say that.
  const pageState = async (): Promise<string> => {
    const preview = getActivePreviewForTests();
    const host = { storedEditMode: storedEditModeForTests(), blockEditOpen: preview?.blockEditOpen, pageEditorOpen: preview?.pageEditorOpen };
    const view = await liveFrame(page).then((live) => live.evaluate(() => {
      const name = (element: Element | null | undefined): string => {
        if (!element) return "none";
        const data = Array.from(element.attributes).filter((attribute) => attribute.name.startsWith("data-"))
          .slice(0, 3).map((attribute) => `[${attribute.name}]`).join("");
        return `${element.tagName.toLowerCase()}${data}:${(element.textContent ?? "").trim().slice(0, 24)}`;
      };
      const root = document.documentElement;
      const title = document.querySelector("#sphinx-myst-preview-content h1")?.getBoundingClientRect();
      const menu = document.querySelector(".sphinx-preview-table-menu")?.getBoundingClientRect();
      const toggle = document.querySelector("[data-find-toggle-replace]");
      const diagnostics = (window as unknown as { __studioDiagnostics?: { trace(): unknown[] } }).__studioDiagnostics;
      return {
        editMode: root.getAttribute("data-sphinx-preview-edit-mode"),
        blockEditing: root.hasAttribute("data-sphinx-preview-block-editing"),
        editors: document.querySelectorAll("[data-sphinx-preview-block-editor]").length,
        editing: name(document.querySelector("[data-sphinx-preview-editing], [data-sphinx-preview-table-cell-selected]")),
        active: name(document.activeElement),
        pageFocus: document.hasFocus(),
        titleHit: title ? name(document.elementFromPoint(title.x + title.width / 2, title.y + title.height / 2)) : "no title",
        findInput: document.querySelector<HTMLInputElement>("[data-find-input]")?.value,
        findCount: document.querySelector("[data-find-count]")?.textContent,
        replaceToggle: toggle ? `${toggle.getAttribute("aria-disabled") ?? "enabled"} ${toggle.getAttribute("title")}` : "none",
        tableMenu: menu ? { x: menu.x, y: menu.y, width: menu.width, height: menu.height } : null,
        trace: diagnostics?.trace().slice(-12),
      };
    })).catch((error: unknown) => `unreadable: ${String(error)}`);
    return JSON.stringify({ host, page: view });
  };
  const settle = (description: string, predicate: () => boolean | Promise<boolean>, timeoutMs?: number): Promise<void> =>
    waitFor(description, predicate, timeoutMs, pageState);
  // CR 169: the suite runs this test in edit mode (an earlier test turned it on and the workspace
  // remembers it), where a click on the title opens its block editor. That editor gets its source
  // after a round trip to the host and takes the focus when it does: a Cmd/Ctrl+F pressed before then
  // opened the find bar, the late editor took the focus back (the search text went into the
  // Markdown source) and stayed open (replace refused "Save or cancel the open edit"). The click
  // now waits for the editor to hold the focus and closes it with Escape (nothing changed, nothing
  // saved): the frame keeps the keyboard focus and no editor is open or on its way.
  const focusPageWithoutEdit = async (live: Frame): Promise<void> => {
    if (await live.locator("html").getAttribute("data-sphinx-preview-edit-mode") !== "on") {
      await live.locator("[data-sphinx-preview-edit-toggle]").click();
      await settle("edit mode", async () =>
        await (await liveFrame(page)).locator("html").getAttribute("data-sphinx-preview-edit-mode") === "on");
    }
    await live.locator("h1").first().click();
    await settle("the title's block editor to hold the focus", async () => await (await liveFrame(page)).evaluate(() =>
      document.hasFocus() && document.activeElement?.tagName === "TEXTAREA"
      && document.activeElement.closest("[data-sphinx-preview-block-editor]") !== null));
    await page.keyboard.press("Escape");
    await settle("the block editor to close, the frame keeping the focus", async () => await (await liveFrame(page)).evaluate(() =>
      document.hasFocus() && !document.documentElement.hasAttribute("data-sphinx-preview-block-editing")
      && document.querySelector("[data-sphinx-preview-block-editor]") === null));
  };
  // CR 196: Cmd/Ctrl+F with the focus in a block editor's text box, the query typed at once. The
  // page takes the key and opens the bar without waiting for the host: every typed key ends in the
  // query, none in the text box, and the Markdown is unchanged (the unchanged editor closes when
  // its text box loses the focus to the find field).
  const findFromBlockEditor = async (live: Frame): Promise<void> => {
    if (await live.locator("html").getAttribute("data-sphinx-preview-edit-mode") !== "on") {
      await live.locator("[data-sphinx-preview-edit-toggle]").click();
      await settle("edit mode", async () =>
        await (await liveFrame(page)).locator("html").getAttribute("data-sphinx-preview-edit-mode") === "on");
    }
    await live.locator("h1").first().click();
    await settle("the title's block editor to hold the focus", async () => await (await liveFrame(page)).evaluate(() =>
      document.hasFocus() && document.activeElement?.tagName === "TEXTAREA"
      && document.activeElement.closest("[data-sphinx-preview-block-editor]") !== null));
    await page.keyboard.press(find);
    await page.keyboard.type("studio");
    await settle("the typed query in the find field", async () => await (await liveFrame(page)).evaluate(() =>
      document.activeElement?.hasAttribute("data-find-input") === true
      && (document.activeElement as HTMLInputElement).value === "studio"));
    await settle("the unchanged block editor to close", async () => await (await liveFrame(page)).evaluate(() =>
      document.querySelector("[data-sphinx-preview-block-editor]") === null));
    // A late host find command for the same key changes nothing: the query is kept.
    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    const after = await (await liveFrame(page)).evaluate(() => ({
      query: document.querySelector<HTMLInputElement>("[data-find-input]")?.value,
      focused: document.activeElement?.hasAttribute("data-find-input") === true,
      bars: document.querySelectorAll("[data-sphinx-preview-find]").length,
    }));
    assert.deepEqual(after, { query: "studio", focused: true, bars: 1 }, `find bar after the key; state: ${await pageState()}`);
    assert.equal(notes.getText(), SOURCE, "the Markdown is unchanged: no typed key reached it");
    await page.keyboard.press("Escape");
    await settle("the bar to close", async () =>
      !(await (await liveFrame(page)).locator("[data-sphinx-preview-find]").isVisible()));
  };
  const assertReplaceAllowed = async (): Promise<void> => {
    const toggle = (await liveFrame(page)).locator("[data-find-toggle-replace]");
    assert.equal(await toggle.getAttribute("aria-disabled"), null, `the replace toggle is enabled; state: ${await pageState()}`);
  };
  try {
    // Cream: the find bar over the page.
    let frame = await openPreview("cream", LIGHT_THEME);
    if (before) await frame.locator("h1").first().click();
    else await focusPageWithoutEdit(frame);
    await settle("the preview frame to hold the keyboard focus", async () =>
      await (await liveFrame(page)).evaluate(() => document.hasFocus()));
    await page.keyboard.press(find);
    if (before) {
      await new Promise<void>((resolve) => setTimeout(resolve, 600));
      await page.keyboard.type("studio");
      await new Promise<void>((resolve) => setTimeout(resolve, 600));
      await shoot("cream-find");
      await closePreview();
      frame = await openPreview("dark", DARK_THEME);
      await frame.locator("h1").first().click();
      await page.keyboard.press(find);
      await page.keyboard.type("studio");
      await new Promise<void>((resolve) => setTimeout(resolve, 600));
      await shoot("dark-find");
      return;
    }

    const bar = (live: Frame) => live.locator("[data-sphinx-preview-find]");
    const findFieldFocused = async (): Promise<boolean> =>
      await (await liveFrame(page)).evaluate(() => document.activeElement?.hasAttribute("data-find-input") === true);
    await settle("the find bar", async () => await bar(await liveFrame(page)).isVisible());
    await settle("the find field to hold the focus", findFieldFocused);
    await page.keyboard.type("studio");
    const count = async (): Promise<string> => (await (await liveFrame(page)).locator("[data-find-count]").textContent()) ?? "";
    // Headline, paragraph x2, admonition, table, link, math, last words: "studio" in any case.
    await settle("the match count", async () => /^1 of \d+$/u.test(await count()));
    const total = Number((await count()).split(" of ")[1]);
    assert.ok(total >= 7, `matches in rendered text (tables, admonitions, links): ${total}`);
    assert.equal(await (await liveFrame(page)).evaluate(() => CSS.highlights.get("studio-find")?.size ?? 0), total);
    await page.keyboard.press("Enter");
    assert.equal(await count(), `2 of ${total}`);
    await page.keyboard.press("Shift+Enter");
    assert.equal(await count(), `1 of ${total}`);
    await shoot("cream-find");

    // The native find of VS Code did not open; the source is unchanged.
    assert.equal(await page.locator(".webview-find-widget:visible").count(), 0, "the native webview find stayed closed");
    assert.equal(notes.getText(), SOURCE);

    // Match case narrows the matches; Escape closes the bar.
    await (await liveFrame(page)).locator("[data-find-case]").click();
    await settle("a narrower count", async () => Number((await count()).split(" of ")[1]) < total);
    await (await liveFrame(page)).locator("[data-find-case]").click();
    await page.keyboard.press("Escape");
    await settle("the bar to close", async () => !(await bar(await liveFrame(page)).isVisible()));

    // A match inside a folded section unfolds it.
    frame = await liveFrame(page);
    await frame.locator("h2", { hasText: "Details" }).locator("[data-okf-fold-toggle]").click();
    await settle("the section to fold", async () =>
      await (await liveFrame(page)).locator("h2", { hasText: "Details" }).getAttribute("data-okf-fold") === "closed");
    await page.keyboard.press(find);
    await page.keyboard.type("hidden gem");
    await settle("the section to unfold", async () =>
      await (await liveFrame(page)).locator("h2", { hasText: "Details" }).getAttribute("data-okf-fold") === "open");
    assert.equal(await count(), "1 of 1");

    // Replace all: the matched spans only, one undo step; math, link target and the like are skipped.
    await (await liveFrame(page)).locator("[data-find-input]").fill("studio");
    await (await liveFrame(page)).locator("[data-find-case]").click();
    await assertReplaceAllowed();
    await (await liveFrame(page)).locator("[data-find-toggle-replace]").click();
    await (await liveFrame(page)).locator("[data-find-replace-input]").fill("atelier");
    await shoot("cream-replace");
    await (await liveFrame(page)).locator("[data-find-replace-all]").click();
    await settle("the document to change", () => notes.getText() !== SOURCE);
    const replaced = SOURCE
      .replace("and the studio keeps", "and the atelier keeps")
      .replace("the studio table cell", "the atelier table cell");
    assert.equal(notes.getText(), replaced);
    // The host answers after it applied the edit, so the note holds "Replacing..." until then.
    const readNote = async (): Promise<string> =>
      await (await liveFrame(page)).locator("[data-find-note]").textContent() ?? "";
    let note = "";
    await settle("the host's final replace answer in the find note", async () => {
      note = await readNote();
      return note !== "" && !/^Replacing/u.test(note);
    }).catch((error: unknown) => {
      throw new Error(`${String(error)} (note: ${JSON.stringify(note)}, document: ${JSON.stringify(notes.getText())})`);
    });
    assert.match(note, /cannot be replaced from the preview/u);
    await vscode.window.showTextDocument(notes, vscode.ViewColumn.One);
    await waitForActiveSourceEditor(notes);
    await vscode.commands.executeCommand("undo");
    await settle("one undo step to restore the source", () => notes.getText() === SOURCE);
    await closePreview();

    // Dark.
    frame = await openPreview("dark", DARK_THEME);
    await findFromBlockEditor(frame);
    await focusPageWithoutEdit(await liveFrame(page));
    await page.keyboard.press(find);
    await settle("the find bar", async () => await bar(await liveFrame(page)).isVisible());
    await settle("the find field to hold the focus", findFieldFocused);
    await page.keyboard.type("studio");
    await settle("the match count", async () => /^1 of \d+$/u.test(await count()));
    await assertReplaceAllowed();
    await (await liveFrame(page)).locator("[data-find-toggle-replace]").click();
    await (await liveFrame(page)).locator("[data-find-replace-input]").fill("atelier");
    await shoot("dark-find");

    // Leave the window as found: the bar closed (nothing replaced), and edit mode off again when it
    // was not on before, the host remembering it, so the next stress scenario starts as usual.
    await page.keyboard.press("Escape");
    await settle("the bar to close", async () => !(await bar(await liveFrame(page)).isVisible()));
    assert.equal(notes.getText(), SOURCE, "the replace typed in the dark preview was not applied");
    if (editModeBefore !== true) {
      await (await liveFrame(page)).locator("[data-sphinx-preview-edit-toggle]").click();
      await settle("edit mode off", async () =>
        await (await liveFrame(page)).locator("html").getAttribute("data-sphinx-preview-edit-mode") === "off");
      await settle("the workspace to remember edit mode off", () => storedEditModeForTests() !== true);
    }
  } finally {
    disposeActivePreviewForTests();
    await pinStoredWorkspaceChoices();
    await workbench.update("colorTheme", originalTheme, vscode.ConfigurationTarget.Workspace);
    await vscode.window.showTextDocument(notes, vscode.ViewColumn.One);
    await vscode.commands.executeCommand("workbench.action.revertAndCloseActiveEditor");
    if (viewport !== null) await page.setViewportSize(viewport);
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
