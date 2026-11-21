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

const OPEN = "markdownOkfSchemaStudio.open";
const FILLER = Array.from({ length: 80 }, (_, index) => `Line ${index + 1}: filler paragraph.\n`).join("\n");

function tabs(): vscode.Tab[] {
  return vscode.window.tabGroups.all.flatMap((group) => group.tabs);
}
const studioTabs = (): vscode.Tab[] => tabs().filter((tab) => tab.input instanceof vscode.TabInputCustom
  && tab.input.viewType === EDITOR_VIEW_TYPE);
const textTabs = (): vscode.Tab[] => tabs().filter((tab) => tab.input instanceof vscode.TabInputText);

/** The settings the test changes, put back when it ends. */
async function withOpeningSettings<T>(search: boolean, files: boolean, body: () => Promise<T>): Promise<T> {
  const configuration = vscode.workspace.getConfiguration(OPEN);
  const before = [configuration.inspect("searchResultsInStudio")?.globalValue, configuration.inspect("markdownFilesInStudio")?.globalValue];
  await configuration.update("searchResultsInStudio", search, vscode.ConfigurationTarget.Global);
  await configuration.update("markdownFilesInStudio", files, vscode.ConfigurationTarget.Global);
  try {
    return await body();
  } finally {
    await configuration.update("searchResultsInStudio", before[0], vscode.ConfigurationTarget.Global);
    await configuration.update("markdownFilesInStudio", before[1], vscode.ConfigurationTarget.Global);
    await closeAllEditors();
  }
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-185
// @tests_req SwRS-MDOKFSTUDIO-LIFE-184
/**
 * CR 445 in the real window: a Markdown file opened at a line (the selection of `vscode.open`, as a
 * search result does) ends in a Studio tab with the arrow marker, and no text tab stays; with
 * Open search results in Studio off it stays a text editor; a plain opening with Open Markdown files
 * in Studio on opens Studio with no marker.
 */
export async function run(): Promise<void> {
  const fixture = createFixture("open-at-line", { "target.md": `# Target\n\n${FILLER}`, "plain.md": `# Plain\n\n${FILLER}` });
  const target = vscode.Uri.file(path.join(fixture.directory, "target.md"));
  const plain = vscode.Uri.file(path.join(fixture.directory, "plain.md"));
  const { browser, page } = await connectWorkbench();
  try {
    await withOpeningSettings(true, false, async () => {
      await closeAllEditors();
      await vscode.commands.executeCommand("vscode.open", target, { selection: new vscode.Range(39, 0, 39, 0) });
      await waitFor("a Studio tab for the searched line", () => studioTabs().length === 1 && textTabs().length === 0, 30_000);
      await waitFor("the arrow marker", async () => {
        const frame = await findCurrentFrame(page);
        return frame !== undefined && (await frame.locator(".sphinx-preview-line-marker").count()) > 0;
      }, 30_000);
    });
    await withOpeningSettings(false, false, async () => {
      await vscode.commands.executeCommand("vscode.open", target, { selection: new vscode.Range(39, 0, 39, 0) });
      await waitFor("the text editor", () => textTabs().length === 1);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      assert.equal(studioTabs().length, 0, "search results off: the text editor stays");
    });
    await withOpeningSettings(false, true, async () => {
      await vscode.commands.executeCommand("vscode.open", plain);
      await waitFor("a Studio tab for a plain opening", () => studioTabs().length === 1 && textTabs().length === 0, 30_000);
      const frame = await findCurrentFrame(page);
      assert.equal(frame === undefined ? 0 : await frame.locator(".sphinx-preview-line-marker").count(), 0, "a plain opening has no marker");
    });
  } finally {
    await browser.close();
  }
}
