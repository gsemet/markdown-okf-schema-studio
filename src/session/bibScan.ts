/**
 * Bounded scan of the workspace's BibTeX files for the citation picker. It never blocks a large
 * repository: at most `MAX_BIB_FILES` files are listed (the document's own folder first), the
 * search is cancelled after `SCAN_TIMEOUT_MS`, build and dependency folders are excluded, and the
 * files read together stay under `MAX_BIB_BYTES`. Everything is asynchronous.
 */

import * as path from "node:path";

import type { FileSystem } from "../host-api/fileSystem";
import type { WorkspaceInfo } from "../host-api/workspaceInfo";
import { collectBibKeys, type BibKey } from "../core/mapping/mystTargets";

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

/** The ports a scan reads through: the search of the workspace folders and the files. */
export interface BibScanServices {
  files: FileSystem;
  workspace: Pick<WorkspaceInfo, "folderOf" | "findFiles">;
}

/**
 * Scans the `.bib` files near a document: its own folder first, then the rest of its workspace
 * folder. `documentPath` is the document's file system path (undefined for a document that is not
 * a file: only its workspace folder, if any, would be searched, and it has none).
 */
export async function scanBibKeys(documentPath: string | undefined, services: BibScanServices): Promise<BibScanResult> {
  const cancellation = new AbortController();
  const timer = setTimeout(() => cancellation.abort(), SCAN_TIMEOUT_MS);
  try {
    const found = new Set<string>();
    let truncated = false;
    const search = async (base: string): Promise<void> => {
      if (found.size >= MAX_BIB_FILES || cancellation.signal.aborted) return;
      const files = await services.workspace.findFiles({
        base,
        pattern: "**/*.bib",
        exclude: BIB_EXCLUDE,
        maxResults: MAX_BIB_FILES,
        signal: cancellation.signal,
      });
      for (const file of files) {
        if (found.size >= MAX_BIB_FILES) {
          truncated = true;
          break;
        }
        found.add(file);
      }
      if (files.length >= MAX_BIB_FILES) truncated = true;
    };
    // Nearest first: the document's own folder, then the rest of its workspace folder.
    if (documentPath !== undefined) await search(path.dirname(documentPath));
    const folder = documentPath !== undefined ? services.workspace.folderOf(documentPath) : undefined;
    if (folder) await search(folder.path);
    const texts: string[] = [];
    let remaining = MAX_BIB_BYTES;
    for (const file of [...found]) {
      if (cancellation.signal.aborted) {
        truncated = true;
        break;
      }
      try {
        const { size } = await services.files.stat(file);
        if (size > remaining) {
          truncated = true;
          continue;
        }
        remaining -= size;
        texts.push(new TextDecoder("utf-8").decode(await services.files.readFile(file)));
      } catch {
        // An unreadable file is skipped; the others still count.
      }
    }
    const merged = collectBibKeys(texts);
    return { items: merged.items, truncated: truncated || merged.truncated, files: texts.length };
  } finally {
    clearTimeout(timer);
  }
}
