/**
 * The real file of a text diff: the file Studio previews when a VS Code diff editor is the active
 * tab (SwRS-MDOKFSTUDIO-LIFE-003). A diff shows two sides, and one of them is not always a file on
 * disk: a git diff compares a `git:` document with the working-tree file, and the search and
 * replace preview compares the working-tree file with a virtual "after replacement" document. The
 * only place that reads a diff tab for this feature; the jump marker of a diff reuses it.
 */

import * as path from "node:path";

import * as vscode from "vscode";

/** True for a saved `file:` document with the `.md` extension. */
export function isEligibleUri(uri: vscode.Uri): boolean {
  return uri.scheme === "file" && path.extname(uri.fsPath).toLowerCase() === ".md";
}

/** The real file of a diff: a side that is a file (`file`), or the working-tree file at the path of a side (`stand-in`). */
export interface DiffRealFile {
  readonly uri: vscode.Uri;
  readonly kind: "file" | "stand-in";
}

/** The text diff the active tab of the active group shows, when it is one. */
export function activeDiffInput(): vscode.TabInputTextDiff | undefined {
  const input = vscode.window.tabGroups.activeTabGroup?.activeTab?.input;
  return input instanceof vscode.TabInputTextDiff ? input : undefined;
}

/** True when `uri` is one of the two sides of the diff. */
export function isDiffSide(input: vscode.TabInputTextDiff, uri: vscode.Uri): boolean {
  const key = uri.toString();
  return input.original.toString() === key || input.modified.toString() === key;
}

/**
 * The side of the diff that is the real file (rules 1 and 2): the active side when both are
 * eligible files (a two-file compare; the modified side when none is active), the only eligible
 * side otherwise. Undefined when no side is an eligible file.
 */
export function realSideOfDiff(input: vscode.TabInputTextDiff, activeUri: vscode.Uri | undefined): vscode.Uri | undefined {
  const originalIsFile = isEligibleUri(input.original);
  const modifiedIsFile = isEligibleUri(input.modified);
  if (originalIsFile && modifiedIsFile) {
    return activeUri !== undefined && activeUri.toString() === input.original.toString()
      ? input.original
      : input.modified;
  }
  if (modifiedIsFile) return input.modified;
  if (originalIsFile) return input.original;
  return undefined;
}

/**
 * The real file of the diff (rules 1 to 3): a side that is an eligible file, else, when no side is
 * a `file:` URI, the working-tree file at the modified side's path when it exists and is Markdown
 * (a stand-in: its lines may differ from the diff's).
 */
export async function realFileOfDiff(
  input: vscode.TabInputTextDiff,
  activeUri: vscode.Uri | undefined,
): Promise<DiffRealFile | undefined> {
  const side = realSideOfDiff(input, activeUri);
  if (side) return { uri: side, kind: "file" };
  if (input.original.scheme === "file" || input.modified.scheme === "file") return undefined;
  if (path.extname(input.modified.fsPath).toLowerCase() !== ".md") return undefined;
  const standIn = vscode.Uri.file(input.modified.fsPath);
  try {
    await vscode.workspace.fs.stat(standIn);
  } catch {
    return undefined;
  }
  return { uri: standIn, kind: "stand-in" };
}
