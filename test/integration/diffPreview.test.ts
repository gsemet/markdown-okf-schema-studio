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

/**
 * A virtual document at the path of a file, as a `git:` side or the replace preview's "after
 * replacement" side is: its path is the file's, its scheme is not `file`. The query tells two virtual
 * sides of one path apart (a staged diff).
 */
const virtualOf = (file: string, side = "left"): vscode.Uri => vscode.Uri.file(file).with({ scheme: SCHEME, query: side });

async function openDiff(original: vscode.Uri, modified: vscode.Uri): Promise<void> {
  await vscode.commands.executeCommand("vscode.diff", original, modified, "Diff under test");
  // A new diff may replace the open one in its group (a preview tab): wait for it to be the active tab, not for a count.
  await waitFor("the requested diff to be the active tab", () => vscode.window.tabGroups.all.some((group) => {
    const input = group.activeTab?.input;
    return input instanceof vscode.TabInputTextDiff
      && input.original.toString() === original.toString()
      && input.modified.toString() === modified.toString();
  }));
  await waitFor("a text editor of the diff to be active", () => vscode.window.activeTextEditor !== undefined);
}

/**
 * Moves the cursor to a side of the open diff. In VS Code the "primary" side is the MODIFIED (right)
 * editor and the "secondary" side is the ORIGINAL (left) one; the command acts even while the preview
 * holds the focus.
 */
const focusOriginalSide = (): Thenable<unknown> => vscode.commands.executeCommand("workbench.action.compareEditor.focusSecondarySide");

async function withLayout<T>(sideBySide: boolean, body: () => Promise<T>): Promise<T> {
  const configuration = vscode.workspace.getConfiguration("diffEditor");
  const before = configuration.inspect("renderSideBySide")?.globalValue;
  const inlineBefore = configuration.inspect("useInlineViewWhenSpaceIsLimited")?.globalValue;
  await configuration.update("renderSideBySide", sideBySide, vscode.ConfigurationTarget.Global);
  if (sideBySide) {
    // A small window would turn the side-by-side diff inline, with no original editor of its own.
    await configuration.update("useInlineViewWhenSpaceIsLimited", false, vscode.ConfigurationTarget.Global);
  }
  try {
    return await body();
  } finally {
    await configuration.update("renderSideBySide", before, vscode.ConfigurationTarget.Global);
    if (sideBySide) {
      await configuration.update("useInlineViewWhenSpaceIsLimited", inlineBefore, vscode.ConfigurationTarget.Global);
    }
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
 * file's side. A staged-like diff (no file side) is covered by the host unit tests only
 * (test/host/diffPreview.requirements.test.ts): two virtual sides of one path never show as a text diff
 * tab in the real window.
 */
export async function run(): Promise<void> {
  const fixture = createFixture("diff-preview", {
    "a.md": `# A\n\n${LONG}`,
    "b.md": `# B\n\n${LONG}`,
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
          // The real file is the diff's original (left) side: put the cursor there.
          await focusOriginalSide();
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
    await focusOriginalSide();
    await waitFor("the cursor in the original side", () => vscode.window.activeTextEditor?.document.uri.scheme === SCHEME);
    const textBefore = textTabs().length;
    await vscode.commands.executeCommand(COMMAND_ID);
    await waitFor("the side preview of a.md from the original side", () => previewOf(file("a.md")), 30_000);
    assert.equal(textTabs().length, textBefore, "no text editor tab added");

    // T5: a diff of b.md comes to the front: the side preview switches to b.md, whichever side holds the cursor.
    await openDiff(virtualOf(file("b.md")), vscode.Uri.file(file("b.md")));
    await focusOriginalSide();
    await waitFor("the side preview switched to b.md", () => previewOf(file("b.md")), 30_000);
  } finally {
    provider.dispose();
    await closeAllEditors();
    fixture.dispose();
  }
}
