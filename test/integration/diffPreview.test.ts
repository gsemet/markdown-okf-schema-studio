import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

import { COMMAND_ID, getActivePreviewForTests } from "./extensionApi";
import { closeAllEditors, createFixture, waitFor } from "./realInput/harness";

const SCHEME = "studio-diff-test";
const LONG = Array.from({ length: 140 }, (_, index) => `Line ${index + 1}: filler paragraph.\n`).join("\n");

const textTabs = (): vscode.Tab[] => vscode.window.tabGroups.all.flatMap((group) => group.tabs)
  .filter((tab) => tab.input instanceof vscode.TabInputText);
const diffTabs = (): vscode.Tab[] => vscode.window.tabGroups.all.flatMap((group) => group.tabs)
  .filter((tab) => tab.input instanceof vscode.TabInputTextDiff);
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A virtual document at the path of a file, as a `git:` side or the replace preview's "after
 * replacement" side is: its path is the file's, its scheme is not `file`. The query tells two virtual
 * sides of one path apart (a staged diff).
 */
const virtualOf = (file: string, side = "left"): vscode.Uri => vscode.Uri.file(file).with({ scheme: SCHEME, query: side });

async function openDiff(original: vscode.Uri, modified: vscode.Uri): Promise<void> {
  const before = diffTabs().length;
  await vscode.commands.executeCommand("vscode.diff", original, modified, "Diff under test");
  await waitFor("the diff editor", () => diffTabs().length === before + 1);
  await waitFor("a text editor of the diff to be active", () => vscode.window.activeTextEditor !== undefined);
}

async function withLayout<T>(sideBySide: boolean, body: () => Promise<T>): Promise<T> {
  const configuration = vscode.workspace.getConfiguration("diffEditor");
  const before = configuration.inspect("renderSideBySide")?.globalValue;
  await configuration.update("renderSideBySide", sideBySide, vscode.ConfigurationTarget.Global);
  try {
    return await body();
  } finally {
    await configuration.update("renderSideBySide", before, vscode.ConfigurationTarget.Global);
  }
}

const previewOf = (file: string): boolean => {
  const preview = getActivePreviewForTests();
  return preview?.phase === "ready" && preview.documentUri === vscode.Uri.file(file).toString();
};

// @tests_req SwRS-MDOKFSTUDIO-LIFE-003
// @tests_req SwRS-MDOKFSTUDIO-LIFE-026
// @tests_req SwRS-MDOKFSTUDIO-LIFE-100
/**
 * CR 455 in the real window: the side preview next to a text diff (a diff whose sides are not both
 * the file: a virtual side shares its path). The real file of the diff is previewed, the command
 * opens no text editor, the preview follows a diff that becomes active and scrolls with its real
 * file's side; a staged-like diff (no file side) previews the working-tree file and moves no scroll.
 */
export async function run(): Promise<void> {
  const fixture = createFixture("diff-preview", {
    "a.md": `# A\n\n${LONG}`,
    "b.md": `# B\n\n${LONG}`,
    "c.md": `# C\n\n${LONG}`,
    "notes.txt": "plain text\n",
  });
  const file = (name: string): string => path.join(fixture.directory, name);
  const provider = vscode.workspace.registerTextDocumentContentProvider(SCHEME, {
    provideTextDocumentContent: (uri) => fs.readFileSync(uri.fsPath, "utf8").replace("filler", `${uri.query} filler`),
  });
  try {
    // T4: the title button is offered on a text diff of a Markdown file only (the real menu cannot be read).
    const manifest = vscode.extensions.getExtension("GaetanSemet.markdown-okf-schema-studio")?.packageJSON as {
      contributes: { menus: Record<string, Array<{ command: string; when?: string }>> };
    } | undefined;
    const button = manifest?.contributes.menus["editor/title"]?.find((entry) => entry.command === COMMAND_ID);
    assert.match(button?.when ?? "", /resourceExtname == \.md/u);
    assert.match(button?.when ?? "", /activeEditor == workbench\.editors\.textDiffEditor/u);
    assert.match(button?.when ?? "", /activeEditor == workbench\.editors\.files\.textFileEditor/u);

    for (const sideBySide of [true, false]) {
      await withLayout(sideBySide, async () => {
        const layout = sideBySide ? "side by side" : "inline";
        // T1: a diff of a long file, side preview open: scrolling the real file's side scrolls the preview.
        await closeAllEditors();
        await vscode.window.showTextDocument(vscode.Uri.file(file("a.md")), { viewColumn: vscode.ViewColumn.One });
        await vscode.commands.executeCommand(COMMAND_ID);
        await waitFor("the side preview of a.md", () => previewOf(file("a.md")), 30_000);
        await openDiff(virtualOf(file("a.md")), vscode.Uri.file(file("a.md")));
        assert.equal(vscode.window.activeTextEditor?.document.uri.scheme, "file", `${layout}: the cursor is in the real file's side`);
        await vscode.commands.executeCommand("cursorBottom");
        await waitFor(`the preview to scroll with the diff (${layout})`,
          () => (getActivePreviewForTests()?.lastSourceScrollLine ?? 0) > 60, 20_000);

        // T2: the replace preview's shape (the real file on the left, a virtual side on the right), from the palette.
        await closeAllEditors();
        const tabsBefore = textTabs().length;
        await openDiff(vscode.Uri.file(file("b.md")), virtualOf(file("b.md"), "right"));
        assert.equal(vscode.window.activeTextEditor?.document.uri.scheme, SCHEME, `${layout}: the cursor is in the virtual side`);
        await vscode.commands.executeCommand(COMMAND_ID);
        await waitFor("the side preview of the real file b.md", () => previewOf(file("b.md")), 30_000);
        assert.equal(textTabs().length, tabsBefore, `${layout}: no text editor opened`);
        // Inline, the real original side has no editor of its own to scroll: the scroll is asserted side by side only.
        if (sideBySide) {
          // The command left the focus in the preview: put it back in the diff's real (original, left) side.
          await vscode.commands.executeCommand("workbench.action.compareEditor.focusPrimarySide");
          await waitFor("the cursor in the real original side", () => vscode.window.activeTextEditor?.document.uri.scheme === "file");
          await vscode.commands.executeCommand("cursorBottom");
          await waitFor(`the preview to scroll with the replace-like diff (${layout})`,
            () => (getActivePreviewForTests()?.lastSourceScrollLine ?? 0) > 60, 20_000);
        }
      });
    }

    // T3: the cursor in the original (virtual) side of a diff: the command previews the file, opens no text editor.
    await closeAllEditors();
    await openDiff(virtualOf(file("a.md")), vscode.Uri.file(file("a.md")));
    await vscode.commands.executeCommand("workbench.action.compareEditor.focusPrimarySide");
    await waitFor("the cursor in the original side", () => vscode.window.activeTextEditor?.document.uri.scheme === SCHEME);
    const textBefore = textTabs().length;
    await vscode.commands.executeCommand(COMMAND_ID);
    await waitFor("the side preview of a.md from the original side", () => previewOf(file("a.md")), 30_000);
    assert.equal(textTabs().length, textBefore, "no text editor tab added");

    // T5: a diff of b.md comes to the front: the side preview switches to b.md, whichever side holds the cursor.
    await openDiff(virtualOf(file("b.md")), vscode.Uri.file(file("b.md")));
    await vscode.commands.executeCommand("workbench.action.compareEditor.focusPrimarySide");
    await waitFor("the side preview switched to b.md", () => previewOf(file("b.md")), 30_000);

    // T6: a staged-like diff (no file side): the working-tree file is previewed, and no scroll follows the diff.
    await openDiff(virtualOf(file("c.md"), "head"), virtualOf(file("c.md"), "index"));
    await vscode.commands.executeCommand(COMMAND_ID);
    await waitFor("the side preview of the working-tree file c.md", () => previewOf(file("c.md")), 30_000);
    const line = getActivePreviewForTests()?.lastSourceScrollLine;
    // The command left the focus in the preview: put it back in a diff side, so the scroll below is a real one.
    await vscode.commands.executeCommand("workbench.action.compareEditor.focusPrimarySide");
    await waitFor("the cursor in a virtual diff side", () => vscode.window.activeTextEditor?.document.uri.scheme === SCHEME);
    await vscode.commands.executeCommand("cursorBottom");
    await sleep(1500);
    assert.equal(getActivePreviewForTests()?.lastSourceScrollLine, line, "scrolling a stand-in diff moves no preview");
  } finally {
    provider.dispose();
    await closeAllEditors();
    fixture.dispose();
  }
}
