import * as assert from "node:assert/strict";
import * as path from "node:path";
import * as vscode from "vscode";

import { COMMAND_ID, getActivePreviewForTests } from "./extensionApi";
import { FILLER, pageMarks, settle, studioTabs, tabs, textTabs, withAssociation } from "./openAtLineHelpers";
import { connectWorkbench, createFixture, findCurrentFrame, waitFor } from "./realInput/harness";

const OPEN_AS_TEXT = "markdown-okf-schema-studio.openAsText";

// @tests_req SwRS-MDOKFSTUDIO-LIFE-177#S1
// @tests_req SwRS-MDOKFSTUDIO-LIFE-177#S2
// @tests_req SwRS-MDOKFSTUDIO-LIFE-195#S1
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
      assert.equal(await pageMarks(page), 0, "a plain opening has no marker");
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
      const marks = studioTabs().length === 1 ? await pageMarks(page) : 0;
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
    // Open With default, no association: a text tab that stays.
    await withAssociation(false, async () => {
      await vscode.commands.executeCommand("vscode.openWith", target, "default");
      await waitFor("the text tab of openWith default", () => textTabs().length === 1);
      await settle(1500);
      assert.deepEqual([studioTabs().length, textTabs().length], [0, 1], "openWith default without the association stays text");
    });
    // Reopen Editor With > Text Editor on a file open in Studio: a text editor that stays.
    await withAssociation(true, async () => {
      await vscode.commands.executeCommand("vscode.open", plain);
      await waitFor("a Studio tab", () => studioTabs().length === 1 && textTabs().length === 0, 30_000);
      await vscode.commands.executeCommand("workbench.action.reopenTextEditor");
      await waitFor("a text tab after Reopen With Text Editor", () => textTabs().length === 1 && studioTabs().length === 0, 30_000);
      await settle(1500);
      assert.deepEqual([studioTabs().length, textTabs().length], [0, 1], "Reopen With Text Editor: the text tab stays, no Studio tab comes back");
    });
    // Open as Text from a Studio tab scrolled to a known line: the text editor is at that line, same column.
    await withAssociation(true, async () => {
      await vscode.commands.executeCommand("vscode.open", target);
      await waitFor("a Studio tab for target", () => studioTabs().length === 1 && getActivePreviewForTests()?.phase === "ready", 30_000);
      let frame: Awaited<ReturnType<typeof findCurrentFrame>>;
      await waitFor("the Studio frame", async () => (frame = await findCurrentFrame(page)) !== undefined, 30_000);
      await frame!.locator("[data-sphinx-source-line]", { hasText: "Line 40:" }).first().scrollIntoViewIfNeeded();
      await waitFor("the scrolled source line reaches the host", () => (getActivePreviewForTests()?.sourceLine ?? 0) > 20, 30_000);
      await settle(800);
      const line = getActivePreviewForTests()?.sourceLine;
      assert.ok(line !== undefined && line > 20, "the Studio tab is scrolled to a known line");
      const column = vscode.window.tabGroups.activeTabGroup.viewColumn;
      await vscode.commands.executeCommand(OPEN_AS_TEXT);
      await waitFor("a text tab after Open as Text", () => textTabs().length === 1 && studioTabs().length === 0, 30_000);
      await settle(1500);
      const editor = vscode.window.activeTextEditor;
      console.log(`[open-at-line] Open as Text from a scrolled Studio tab: sourceLine=${line} cursor=${editor?.selection.active.line}`);
      assert.equal(editor?.selection.active.line, line - 1, "Open as Text puts the cursor on the line Studio showed");
      assert.equal(editor?.viewColumn, column, "Open as Text keeps the column");
      assert.deepEqual([studioTabs().length, textTabs().length], [0, 1], "Open as Text: no Studio tab left");
    });
    // A jump with the side preview open on the file, the file not open as text, under the association.
    await withAssociation(true, async () => {
      await vscode.commands.executeCommand("vscode.openWith", target, "default");
      await waitFor("the text tab", () => textTabs().length === 1);
      await vscode.commands.executeCommand(COMMAND_ID);
      await waitFor("the side preview of target", () => getActivePreviewForTests()?.phase === "ready", 30_000);
      for (const tab of textTabs()) await vscode.window.tabGroups.close(tab);
      await waitFor("no text tab left", () => textTabs().length === 0);
      await vscode.commands.executeCommand("vscode.open", target, { selection: new vscode.Range(41, 0, 41, 0) });
      await settle(3000);
      const frames = (await Promise.all(page.frames().map((candidate) => candidate.locator(".sphinx-preview-line-marker").count().catch(() => 0))))
        .reduce((total, count) => total + count, 0);
      console.log(`[open-at-line] jump with the side preview open, file not open as text: studio=${studioTabs().length} text=${textTabs().length} marks=${frames} markedLine=${getActivePreviewForTests()?.markedLine?.line}`);
      assert.equal(studioTabs().length, 1, "a Studio tab opens");
      assert.equal(textTabs().length, 0, "no text tab opens");
      assert.equal(frames, 0, "the side preview marks nothing");
      assert.equal(getActivePreviewForTests()?.markedLine, undefined, "the host holds no marked line");
    });
  } finally {
    await browser.close();
    fixture.dispose();
  }
}
