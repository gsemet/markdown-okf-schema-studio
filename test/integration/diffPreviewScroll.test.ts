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

/** What the host held when a wait failed (CI rule 12): the editors, the tabs, the layout and the preview's scroll state. */
function windowState(picked: vscode.TextEditor | undefined, before: ReadonlySet<vscode.TextEditor>, maxFirstLine: number): string {
  const describeEditor = (editor: vscode.TextEditor): unknown => ({
    scheme: editor.document.uri.scheme,
    path: editor.document.uri.fsPath,
    query: editor.document.uri.query,
    viewColumn: editor.viewColumn,
    visibleRanges: editor.visibleRanges.map((range) => `${range.start.line}-${range.end.line}`),
    picked: editor === picked,
    existedBeforeTheDiff: before.has(editor),
  });
  const preview = getActivePreviewForTests();
  return JSON.stringify({
    maxFirstVisibleLineSeen: maxFirstLine,
    editors: vscode.window.visibleTextEditors.map(describeEditor),
    activeEditor: vscode.window.activeTextEditor === undefined ? null : describeEditor(vscode.window.activeTextEditor),
    pickedStillVisible: picked !== undefined && vscode.window.visibleTextEditors.includes(picked),
    tabGroups: vscode.window.tabGroups.all.map((group) => ({
      active: group.isActive,
      tabs: group.tabs.map((tab) => ({
        input: tab.input === undefined || tab.input === null ? null : (tab.input as object).constructor.name,
        label: tab.label,
        active: tab.isActive,
      })),
    })),
    layout: { renderSideBySide: vscode.workspace.getConfiguration("diffEditor").get("renderSideBySide") },
    preview: preview === undefined ? null : {
      phase: preview.phase,
      lastSourceScrollLine: preview.lastSourceScrollLine,
      lastRevealedSourceLine: preview.lastRevealedSourceLine,
    },
  });
}

/**
 * Scrolls the active editor with the awaited `revealLine` command (a scroll with no cursor move; a
 * rejection fails the test with its own error) and waits for `editor`'s own visible range to show the
 * line. The wait's failure message carries the window state and the highest first visible line seen,
 * which tells a stale editor (never moved), a host scroll back (moved, then returned) and a reveal
 * ignored by an editor with no viewport yet (never moved, live editor) apart.
 */
async function scrollEditorTo(
  editor: vscode.TextEditor,
  line: number,
  description: string,
  before: ReadonlySet<vscode.TextEditor>,
): Promise<void> {
  await waitFor(`${description}: the editor to be the active one`, () => vscode.window.activeTextEditor === editor);
  await vscode.commands.executeCommand("revealLine", { lineNumber: line, at: "top" });
  let maxFirstLine = firstVisibleLine(editor);
  try {
    await waitFor(description, () => {
      maxFirstLine = Math.max(maxFirstLine, firstVisibleLine(editor));
      return firstVisibleLine(editor) >= line - 5;
    }, 20_000);
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message : String(error)} State: ${windowState(editor, before, maxFirstLine)}`, { cause: error });
  }
}

/** Moves the focus to a side of the open diff (the original side holds the "head" query) and waits for it. */
async function focusSide(side: vscode.TextEditor): Promise<void> {
  await vscode.commands.executeCommand(side.document.uri.query === "head"
    ? "workbench.action.compareEditor.focusSecondarySide"
    : "workbench.action.compareEditor.focusPrimarySide");
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-003
// @tests_req SwRS-MDOKFSTUDIO-LIFE-100
/**
 * CR 460 in the real window, the gaps CR 455 left (owner decisions of CR 455: the real file's side of
 * a diff scrolls the side preview, a diff with no file side opens the working-tree preview and moves
 * no scroll).
 *
 * D1, inline layout: the diff's one editor is the modified (right) side. When it is the real file
 * (the usual "working tree against HEAD" diff), a scroll of that editor, done by the awaited `revealLine`
 * command and not by a cursor move, makes the side preview follow.
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
      // The plain editor of a.md has the diff's modified side's URI: it must never be taken for the diff's own editor.
      const before = new Set(vscode.window.visibleTextEditors);
      await openDiff(virtualOf(file("a.md")), vscode.Uri.file(file("a.md")));
      const isDiffEditor = (editor: vscode.TextEditor): boolean => !before.has(editor)
        && editor.document.uri.scheme === "file" && editor.document.uri.fsPath === file("a.md");
      try {
        await waitFor("a new editor of the inline diff's real file", () => vscode.window.visibleTextEditors.some(isDiffEditor));
      } catch (error) {
        throw new Error(`${error instanceof Error ? error.message : String(error)} State: ${windowState(undefined, before, 0)}`, { cause: error });
      }
      const real = vscode.window.visibleTextEditors.find(isDiffEditor);
      assert.ok(real, "inline: the diff shows the real file's editor");
      await scrollEditorTo(real, 100, "the inline diff's editor to scroll", before);
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
        const editorsBefore = new Set(vscode.window.visibleTextEditors);
        await openDiff(virtualOf(file("c.md"), "head"), virtualOf(file("c.md"), "index"));
        await vscode.commands.executeCommand(COMMAND_ID);
        await waitFor(`the side preview of the working-tree file c.md (${layout})`, () => previewOf(file("c.md")), 30_000);
        assert.equal(textTabs().length, textBefore, `${layout}: the command opened no text editor`);
        const before = getActivePreviewForTests()?.lastSourceScrollLine;

        const sides = editorsOfScheme(SCHEME);
        assert.ok(sides.length >= 1, `${layout}: the staged-like diff shows a virtual editor`);
        for (const side of sides) {
          await focusSide(side);
          await scrollEditorTo(side, 100, `a virtual side of the staged-like diff to scroll (${layout})`, editorsBefore);
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
