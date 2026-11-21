/**
 * The helpers of the real-window diff suites (CR 455, CR 456): a virtual side at the path of a file, a
 * diff opened and awaited, a side focused, the layout of the diff editor, the side preview of a file.
 */
import * as vscode from "vscode";

import { getActivePreviewForTests } from "./extensionApi";
import { waitFor } from "./realInput/harness";

export const SCHEME = "studio-diff-test";
export const LONG = Array.from({ length: 140 }, (_, index) => `Line ${index + 1}: filler paragraph.\n`).join("\n");

export const textTabs = (): vscode.Tab[] => vscode.window.tabGroups.all.flatMap((group) => group.tabs)
  .filter((tab) => tab.input instanceof vscode.TabInputText);

/**
 * A virtual document at the path of a file, as a `git:` side or the replace preview's "after
 * replacement" side is: its path is the file's, its scheme is not `file`. The query tells two virtual
 * sides of one path apart (a staged diff).
 */
export const virtualOf = (file: string, side = "left"): vscode.Uri => vscode.Uri.file(file).with({ scheme: SCHEME, query: side });

export async function openDiff(original: vscode.Uri, modified: vscode.Uri, options?: { readonly selection?: vscode.Range }): Promise<void> {
  await vscode.commands.executeCommand("vscode.diff", original, modified, "Diff under test", options);
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
export const focusOriginalSide = (): Thenable<unknown> => vscode.commands.executeCommand("workbench.action.compareEditor.focusSecondarySide");

export async function withLayout<T>(sideBySide: boolean, body: () => Promise<T>): Promise<T> {
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

export const previewOf = (file: string): boolean => {
  const preview = getActivePreviewForTests();
  return preview?.phase === "ready" && preview.documentUri === vscode.Uri.file(file).toString();
};
