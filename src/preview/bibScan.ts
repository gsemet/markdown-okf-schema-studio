/**
 * Bounded scan of the workspace's BibTeX files for the citation picker. It never blocks a large
 * repository: at most `MAX_BIB_FILES` files are listed (the document's own folder first), the
 * search is cancelled after `SCAN_TIMEOUT_MS`, build and dependency folders are excluded, and the
 * files read together stay under `MAX_BIB_BYTES`. Everything is asynchronous.
 */

import * as path from "node:path";

import * as vscode from "vscode";

import { collectBibKeys, type BibKey } from "../mapping/mystTargets";

export const MAX_BIB_FILES = 20;
export const MAX_BIB_BYTES = 2 * 1024 * 1024;
export const SCAN_TIMEOUT_MS = 5000;
export const BIB_EXCLUDE = "{**/node_modules/**,**/.git/**,**/_build/**,**/.venv/**,**/venv/**,**/out/**,**/dist/**}";

export interface BibScanResult {
  items: BibKey[];
  /** More keys, more files or more bytes exist than the caps allow. */
  truncated: boolean;
  files: number;
}

export async function scanBibKeys(documentUri: vscode.Uri): Promise<BibScanResult> {
  const cancellation = new vscode.CancellationTokenSource();
  const timer = setTimeout(() => cancellation.cancel(), SCAN_TIMEOUT_MS);
  try {
    const found = new Map<string, vscode.Uri>();
    let truncated = false;
    const search = async (base: vscode.Uri | vscode.WorkspaceFolder): Promise<void> => {
      if (found.size >= MAX_BIB_FILES || cancellation.token.isCancellationRequested) return;
      const uris = await vscode.workspace.findFiles(
        new vscode.RelativePattern(base, "**/*.bib"), BIB_EXCLUDE, MAX_BIB_FILES, cancellation.token);
      for (const uri of uris) {
        if (found.size >= MAX_BIB_FILES) {
          truncated = true;
          break;
        }
        found.set(uri.toString(), uri);
      }
      if (uris.length >= MAX_BIB_FILES) truncated = true;
    };
    // Nearest first: the document's own folder, then the rest of its workspace folder.
    if (documentUri.scheme === "file") await search(vscode.Uri.file(path.dirname(documentUri.fsPath)));
    const folder = vscode.workspace.getWorkspaceFolder(documentUri);
    if (folder) await search(folder);
    const texts: string[] = [];
    let remaining = MAX_BIB_BYTES;
    for (const uri of [...found.values()]) {
      if (cancellation.token.isCancellationRequested) {
        truncated = true;
        break;
      }
      try {
        const { size } = await vscode.workspace.fs.stat(uri);
        if (size > remaining) {
          truncated = true;
          continue;
        }
        remaining -= size;
        texts.push(new TextDecoder("utf-8").decode(await vscode.workspace.fs.readFile(uri)));
      } catch {
        // An unreadable file is skipped; the others still count.
      }
    }
    const merged = collectBibKeys(texts);
    return { items: merged.items, truncated: truncated || merged.truncated, files: texts.length };
  } finally {
    clearTimeout(timer);
    cancellation.dispose();
  }
}
