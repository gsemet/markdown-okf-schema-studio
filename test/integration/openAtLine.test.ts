import * as assert from "node:assert/strict";
import * as path from "node:path";
import * as vscode from "vscode";

import { EDITOR_VIEW_TYPE } from "./extensionApi";
import {
  closeAllEditors,
  connectWorkbench,
  createFixture,
  findCurrentFrame,
  waitFor,
} from "./realInput/harness";

const FILLER = Array.from({ length: 80 }, (_, index) => `Line ${index + 1}: filler paragraph.\n`).join("\n");
const OPEN_AS_TEXT = "markdown-okf-schema-studio.openAsText";

function tabs(): vscode.Tab[] {
  return vscode.window.tabGroups.all.flatMap((group) => group.tabs);
}
const studioTabs = (): vscode.Tab[] => tabs().filter((tab) => tab.input instanceof vscode.TabInputCustom
  && tab.input.viewType === EDITOR_VIEW_TYPE);
const textTabs = (): vscode.Tab[] => tabs().filter((tab) => tab.input instanceof vscode.TabInputText);
const settle = (milliseconds: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, milliseconds));

/**
 * The editor association a reader would set (`"*.md"` to Studio) for the body, then put back as it was
 * (the user value, so that the next step of the trusted window starts clean).
 */
async function withAssociation<T>(associated: boolean, body: () => Promise<T>): Promise<T> {
  const configuration = vscode.workspace.getConfiguration("workbench");
  const before = configuration.inspect<Record<string, string>>("editorAssociations")?.globalValue;
  await configuration.update("editorAssociations", associated ? { "*.md": EDITOR_VIEW_TYPE } : undefined, vscode.ConfigurationTarget.Global);
  try {
    await closeAllEditors();
    return await body();
  } finally {
    await configuration.update("editorAssociations", before, vscode.ConfigurationTarget.Global);
    await closeAllEditors();
  }
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-177
// @tests_req SwRS-MDOKFSTUDIO-LIFE-195
/**
 * CR 477 in the real window: no watcher moves a tab. Without the association a Markdown file opened
 * plainly or at a line (the selection of `vscode.open`, as a search result does) stays a text tab.
 * With `"*.md"` associated with Studio, a plain opening is the native one (a Studio tab, no marker),
 * `vscode.openWith(uri, "default")` stays a text tab, and Open as Text turns the Studio tab into a
 * text tab. The two rows the specification left open were recorded in the real window (VS Code 1.143):
 * a jump under the association opens Studio at the top with no marker, and a jump with the file
 * already open as text keeps that text tab and opens a Studio tab beside it.
 */
export async function run(): Promise<void> {
  const fixture = createFixture("open-at-line", { "target.md": `# Target\n\n${FILLER}`, "plain.md": `# Plain\n\n${FILLER}` });
  const target = vscode.Uri.file(path.join(fixture.directory, "target.md"));
  const plain = vscode.Uri.file(path.join(fixture.directory, "plain.md"));
  const { browser, page } = await connectWorkbench();
  try {
    await withAssociation(false, async () => {
      await vscode.commands.executeCommand("vscode.open", plain, { preview: false });
      await vscode.commands.executeCommand("vscode.open", target, { selection: new vscode.Range(41, 0, 41, 0), preview: false });
      await waitFor("two text tabs", () => textTabs().length === 2);
      await settle(1500);
      assert.deepEqual([studioTabs().length, textTabs().length], [0, 2], "no association: a plain opening and a jump stay text");
      const editor = vscode.window.activeTextEditor;
      assert.equal(editor?.selection.active.line, 41, "the jump put the cursor on line 42");
    });
    await withAssociation(true, async () => {
      await vscode.commands.executeCommand("vscode.open", plain);
      await waitFor("a Studio tab for a plain opening", () => studioTabs().length === 1 && textTabs().length === 0, 30_000);
      const frame = await findCurrentFrame(page);
      assert.equal(frame === undefined ? 0 : await frame.locator(".sphinx-preview-line-marker").count(), 0, "a plain opening has no marker");
      // Open as Text: the Studio tab goes, a text tab takes its place.
      await vscode.commands.executeCommand(OPEN_AS_TEXT);
      await waitFor("a text tab after Open as Text", () => textTabs().length === 1 && studioTabs().length === 0, 30_000);
      await settle(1500);
      assert.deepEqual([studioTabs().length, textTabs().length], [0, 1], "Open as Text: the text tab stays, no Studio tab comes back");
    });
    await withAssociation(true, async () => {
      await vscode.commands.executeCommand("vscode.openWith", target, "default", { selection: new vscode.Range(41, 0, 41, 0) });
      await waitFor("the text tab of openWith default", () => textTabs().length === 1);
      await settle(1500);
      assert.deepEqual([studioTabs().length, textTabs().length], [0, 1], "openWith default under the association stays text");
      assert.equal(vscode.window.activeTextEditor?.selection.active.line, 41, "openWith default keeps the line");
    });
    await withAssociation(true, async () => {
      await vscode.commands.executeCommand("vscode.open", target, { selection: new vscode.Range(41, 0, 41, 0) });
      await waitFor("a tab for the jump under the association", () => tabs().length >= 1, 30_000);
      await settle(2500);
      const frame = studioTabs().length === 1 ? await findCurrentFrame(page) : undefined;
      const marks = frame === undefined ? 0 : await frame.locator(".sphinx-preview-line-marker").count();
      console.log(`[open-at-line] jump under the association: studio=${studioTabs().length} text=${textTabs().length} marks=${marks}`);
      assert.deepEqual([studioTabs().length, textTabs().length, marks], [1, 0, 0], "a jump under the association opens Studio at the top, with no marker");
    });
    await withAssociation(true, async () => {
      await vscode.commands.executeCommand("vscode.openWith", target, "default");
      await waitFor("the text tab", () => textTabs().length === 1);
      await vscode.commands.executeCommand("vscode.open", target, { selection: new vscode.Range(41, 0, 41, 0) });
      await settle(2500);
      console.log(`[open-at-line] jump with the file already open as text: studio=${studioTabs().length} text=${textTabs().length} line=${vscode.window.activeTextEditor?.selection.active.line}`);
      assert.deepEqual([studioTabs().length, textTabs().length], [1, 1], "a jump with the file open as text keeps the text tab and opens a Studio tab beside it");
    });
  } finally {
    await browser.close();
  }
}
