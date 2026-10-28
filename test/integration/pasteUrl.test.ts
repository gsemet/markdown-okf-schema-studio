import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

import { disposeActivePreviewForTests, storedEditModeForTests, storeWorkspaceChoicesForTests } from "./extensionApi";
import { E2E_REPORT_ROOT } from "../reportPaths";
import { pinStoredWorkspaceChoices } from "./storedChoices";
import { ensureTestWindowFocused } from "./windowFocus";
import {
  blockEditor,
  connectWorkbench,
  createFixture,
  currentPreviewFrame,
  MOD,
  openSidePreview,
  press,
  setEditMode,
  waitFor,
  waitForEditor,
  waitForRender,
  withCurrentFrame,
} from "./realInput/harness";

const SOURCE = "Read the guide for details.\nLogo:  then text.\nHome:  then text.\n\nSecond paragraph.\n";
const DOCS = "https://example.com/docs";
const LOGO = "https://example.com/logo.png";
const HOME = "https://example.com/";

/** The value and selection of the text box of the open block editor. */
async function readBox(page: Parameters<typeof withCurrentFrame>[0]): Promise<string | undefined> {
  return withCurrentFrame(page, async (frame) => (await blockEditor(frame)).inputValue());
}

/** Waits (at most 3 s) for the text box to hold `wanted`; returns what it holds then. */
async function settled(page: Parameters<typeof withCurrentFrame>[0], wanted: string): Promise<string | undefined> {
  try {
    await waitFor("the text box to show the pasted text", async () => (await readBox(page)) === wanted, 3_000);
  } catch {
    // The caller compares and records the difference.
  }
  return readBox(page);
}

/** Selects `[from, to)` of the text box with the DOM selection, then pastes with a real key chord. */
async function pasteAt(
  page: Parameters<typeof withCurrentFrame>[0], from: number, to: number, clipboard: string, chord: string,
): Promise<void> {
  await vscode.env.clipboard.writeText(clipboard);
  await withCurrentFrame(page, async (frame) => {
    const box = await blockEditor(frame);
    await box.focus();
    await box.evaluate((element, [start, end]) => (element as HTMLTextAreaElement).setSelectionRange(start, end), [from, to]);
  });
  await press(page, chord);
}

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-264
/**
 * CR 145: in a real VS Code window a URL on the real clipboard pasted into the block text box makes
 * a link over a selection, an autolink alone and an image for a picture address; the autosave writes only the
 * pasted spans, the rest of the source never changes. Cmd/Ctrl+Shift+V (paste as
 * plain text) cannot be driven through CDP key events (no native paste command is raised), so it is
 * covered by test/page/runtimePaletteActions.test.ts. Screenshots go to out/reports/e2e/paste-url/<tag>-<mode>-*.png (tag
 * `before` records the behaviour of the unchanged code without failing the run). The preview theme
 * mode comes from STUDIO_PASTE_URL_MODE (`cream` or `dark`).
 */
export async function run(): Promise<void> {
  const tag = process.env.STUDIO_PASTE_URL_TAG ?? "after";
  const mode = process.env.STUDIO_PASTE_URL_MODE === "dark" ? "dark" : "cream";
  const shotDirectory = process.env.STUDIO_PASTE_URL_SHOTS ?? path.join(E2E_REPORT_ROOT, "paste-url");
  fs.mkdirSync(shotDirectory, { recursive: true });
  await vscode.extensions.getExtension("GaetanSemet.markdown-okf-schema-studio")?.activate();
  await storeWorkspaceChoicesForTests({ previewThemeMode: mode === "cream" ? "cream" : "current", toolbarCollapsed: false, paletteMode: "myst" });
  await ensureTestWindowFocused();
  const { browser, page } = await connectWorkbench();
  const fixture = createFixture("paste-url", { "paste.md": SOURCE });
  const workbench = vscode.workspace.getConfiguration("workbench");
  const originalTheme = workbench.inspect<string>("colorTheme")?.workspaceValue;
  const failures: string[] = [];
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
  try {
    await workbench.update("colorTheme", mode === "cream" ? "Default Light Modern" : "Default Dark Modern",
      vscode.ConfigurationTarget.Workspace);
    await page.setViewportSize({ width: 1200, height: 800 });
    await vscode.commands.executeCommand("workbench.action.closeSidebar");
    await vscode.commands.executeCommand("workbench.action.closeAuxiliaryBar");
    const source = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("paste.md")));
    await openSidePreview(source);
    await waitForRender(source);
    await setEditMode(page, true);
    // The preview may redraw once after the toggle and drop the first click: click until the box stays.
    await waitFor("the block text box to open", async () => {
      const open = await withCurrentFrame(page, async (frame) => {
        if (await frame.locator("[data-sphinx-preview-block-editor] textarea").count() === 1) return true;
        await frame.locator("p", { hasText: "Read the guide" }).click({ timeout: 2_000 });
        return false;
      }).catch(() => false);
      if (!open) return false;
      await new Promise<void>((resolve) => setTimeout(resolve, 700));
      return withCurrentFrame(page, async (frame) => await frame.locator("[data-sphinx-preview-block-editor] textarea").count() === 1)
        .catch(() => false);
    }, 30_000);
    await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
    assert.equal(await readBox(page), "Read the guide for details.\nLogo:  then text.\nHome:  then text.", "the paragraph opens in the text box");

    const base = (await readBox(page))!;
    const guide = base.indexOf("guide");
    // 1. A URL over the selected word makes a link.
    await pasteAt(page, guide, guide + 5, DOCS, MOD + "+v");
    const linked = base.replace("guide", `[guide](${DOCS})`);
    expect("link over the selection", await settled(page, linked), linked);
    await shoot("1-link");
    // 2. A picture address alone makes an image, where the caret stands (after "Logo: ").
    const afterLink = linked;
    const logo = afterLink.indexOf("Logo: ") + 6;
    await pasteAt(page, logo, logo, LOGO, MOD + "+v");
    const imaged = afterLink.slice(0, logo) + `![](${LOGO})` + afterLink.slice(logo);
    expect("image address", await settled(page, imaged), imaged);
    await shoot("2-image");
    // 3. A page address alone makes an autolink.
    const afterImage = imaged;
    const home = afterImage.indexOf("Home: ") + 6;
    await pasteAt(page, home, home, HOME, MOD + "+v");
    const linkedHome = afterImage.slice(0, home) + `<${HOME}>` + afterImage.slice(home);
    const afterAutolink = (await settled(page, linkedHome))!;
    expect("autolink", afterAutolink, linkedHome);
    await shoot("3-autolink");
    // The autosave wrote the edited span only: the second paragraph and the line breaks are intact.
    const tail = "\n\nSecond paragraph.\n";
    try {
      await waitFor("the autosave", () => source.getText() === afterAutolink + tail, 10_000);
    } catch (error) {
      if (tag !== "before") throw new Error(`${String(error)} The buffer holds ${JSON.stringify(source.getText())}.`);
    }
    expect("source", source.getText(), afterAutolink + tail);
    await currentPreviewFrame(page);
    if (tag !== "before") assert.deepEqual(failures, [], failures.join("\n"));
    else console.log(`paste-url BEFORE state (not failing): ${JSON.stringify(failures)}`);
    // CR 152: the workspace remembers the edit mode for the next preview. Leave it off, as the next
    // scenarios expect: one that starts in edit mode never clicks the toggle and its page never
    // takes the keyboard focus (windowSwitchKeys.test.ts timed out on its first ArrowDown).
    await setEditMode(page, false);
    await waitFor("the workspace to remember edit mode off", () => storedEditModeForTests() !== true);
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
