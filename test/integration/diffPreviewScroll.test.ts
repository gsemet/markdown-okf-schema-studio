import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

import { COMMAND_ID, getActivePreviewForTests } from "./extensionApi";
import { LONG, openDiff, previewOf, SCHEME, textTabs, virtualOf, withLayout } from "./diffHelpers";
import { closeAllEditors, createFixture, waitFor } from "./realInput/harness";

/** The visible editors of a diff, by the scheme of their document. */
const editorsOfScheme = (scheme: string): vscode.TextEditor[] =>
  vscode.window.visibleTextEditors.filter((editor) => editor.document.uri.scheme === scheme);

const firstVisibleLine = (editor: vscode.TextEditor): number => editor.visibleRanges[0]?.start.line ?? 0;

/** Scrolls an editor with `revealRange` (a scroll with no cursor move) and waits for it to show the line. */
async function scrollEditorTo(editor: vscode.TextEditor, line: number, description: string): Promise<void> {
  const target = new vscode.Range(line, 0, line, 0);
  editor.revealRange(target, vscode.TextEditorRevealType.AtTop);
  await waitFor(description, () => firstVisibleLine(editor) >= line - 5, 20_000);
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-003
// @tests_req SwRS-MDOKFSTUDIO-LIFE-100
/**
 * CR 460 in the real window, the gaps CR 455 left (owner decisions of CR 455: the real file's side of
 * a diff scrolls the side preview, a diff with no file side opens the working-tree preview and moves
 * no scroll).
 *
 * D1, inline layout: the diff's one editor is the modified (right) side. When it is the real file
 * (the usual "working tree against HEAD" diff), a scroll of that editor, done by `revealRange` and
 * not by a cursor move, makes the side preview follow.
 *
 * D2, staged-like diff (two virtual sides, no `file:` side, as the Git extension shows a staged
 * change or the timeline shows an older version): the command previews the working-tree file and
 * opens no text editor, and scrolling either virtual side moves no preview. CR 455 dropped this
 * step because it timed out opening its own diff: it waited for a new tab, which a diff that
 * replaces a preview tab never adds. Here the diff is awaited as the active tab (`openDiff`), the
 * scroll is awaited on the editor's own visible range, and the absence of a follow is read right
 * after, with no sleep: the host handles a visible-range event synchronously, so a follow would
 * already be recorded once the range is seen to have moved.
 *
 * Known limitation, VS Code itself: in the inline layout the original side has no editor of its
 * own, so a diff whose REAL file is the original side (the replace preview's shape) cannot scroll
 * the preview there; `diffPreview.test.ts` asserts that shape side by side only. The logic that
 * picks the real side is proven below the window in `test/host/diffPreview.requirements.test.ts`.
 */
export async function run(): Promise<void> {
  const fixture = createFixture("diff-preview-scroll", {
    "a.md": `# A\n\n${LONG}`,
    "c.md": `# C\n\n${LONG}`,
  });
  const file = (name: string): string => path.join(fixture.directory, name);
  const provider = vscode.workspace.registerTextDocumentContentProvider(SCHEME, {
    provideTextDocumentContent: (uri) => fs.readFileSync(uri.fsPath, "utf8").replace("filler", `${uri.query} filler`),
  });
  try {
    // D1: inline layout, the real file is the modified side.
    await withLayout(false, async () => {
      await closeAllEditors();
      await vscode.window.showTextDocument(vscode.Uri.file(file("a.md")), { viewColumn: vscode.ViewColumn.One });
      await vscode.commands.executeCommand(COMMAND_ID);
      await waitFor("the side preview of a.md (inline)", () => previewOf(file("a.md")), 30_000);
      await openDiff(virtualOf(file("a.md")), vscode.Uri.file(file("a.md")));
      await waitFor("the real file's editor of the inline diff", () => editorsOfScheme("file")
        .some((editor) => editor.document.uri.fsPath === file("a.md")));
      const real = editorsOfScheme("file").find((editor) => editor.document.uri.fsPath === file("a.md"));
      assert.ok(real, "inline: the diff shows the real file's editor");
      await scrollEditorTo(real, 100, "the inline diff's editor to scroll");
      await waitFor("the preview to follow the inline diff's scroll",
        () => (getActivePreviewForTests()?.lastSourceScrollLine ?? 0) > 60, 20_000);
    });

    // D2: a staged-like diff, in both layouts.
    for (const sideBySide of [true, false]) {
      await withLayout(sideBySide, async () => {
        const layout = sideBySide ? "side by side" : "inline";
        // Start clean: an earlier diff tab and side preview must not take the new diff's slot.
        await closeAllEditors();
        const textBefore = textTabs().length;
        await openDiff(virtualOf(file("c.md"), "head"), virtualOf(file("c.md"), "index"));
        await vscode.commands.executeCommand(COMMAND_ID);
        await waitFor(`the side preview of the working-tree file c.md (${layout})`, () => previewOf(file("c.md")), 30_000);
        assert.equal(textTabs().length, textBefore, `${layout}: the command opened no text editor`);
        const before = getActivePreviewForTests()?.lastSourceScrollLine;

        const sides = editorsOfScheme(SCHEME);
        assert.ok(sides.length >= 1, `${layout}: the staged-like diff shows a virtual editor`);
        for (const side of sides) {
          await scrollEditorTo(side, 100, `a virtual side of the staged-like diff to scroll (${layout})`);
        }
        assert.equal(getActivePreviewForTests()?.lastSourceScrollLine, before,
          `${layout}: scrolling a diff with no file side moves no preview`);
        assert.ok(previewOf(file("c.md")), `${layout}: the preview still shows the working-tree file`);
      });
    }
  } finally {
    provider.dispose();
    await closeAllEditors();
    fixture.dispose();
  }
}
