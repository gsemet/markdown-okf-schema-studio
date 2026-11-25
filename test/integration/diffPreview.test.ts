import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

import { COMMAND_ID, getActivePreviewForTests } from "./extensionApi";
import { focusOriginalSide, LONG, openDiff, previewOf, SCHEME, textTabs, virtualOf, withLayout } from "./diffHelpers";
import { closeAllEditors, createFixture, waitFor } from "./realInput/harness";

// @tests_req SwRS-MDOKFSTUDIO-LIFE-003#S2
// @tests_req SwRS-MDOKFSTUDIO-LIFE-003#S10
// @tests_req SwRS-MDOKFSTUDIO-LIFE-026#S3
// @tests_req SwRS-MDOKFSTUDIO-LIFE-026#S4
// @tests_req SwRS-MDOKFSTUDIO-LIFE-100#S7
// @tests_req SwRS-MDOKFSTUDIO-LIFE-100#S9
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
