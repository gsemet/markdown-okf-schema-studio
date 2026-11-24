/**
 * Studio tabs, host side: finding the Studio tab of a file in any editor group, and handing it a
 * line (a Studio tab that is about to open, or one already live). This is the one place that turns
 * "open this file at this line, in Studio when it opens there" into VS Code calls. No code here
 * closes or replaces a tab: a text tab always stays.
 */

import * as vscode from "vscode";

import { PendingLines } from "../core/navigation/pendingLine";
import type { ShowDocumentOutcome } from "../host-api/navigation";

/** The view type of the custom editor (a fixed preview of one document). */
export const EDITOR_VIEW_TYPE = "markdown-okf-schema-studio.editor";

/**
 * How long, in milliseconds, the host waits for a Studio tab the open created to take its line. A
 * slow window (a cold custom editor, a loaded CI machine) resolves the tab after seconds, so the wait
 * is long, yet shorter than the 5 s window of the pending line; a text editor ends it at once
 * (`textTabIsActive`), so a text open does not wait.
 */
const STUDIO_TAB_WAIT_MS = 4500;
const STUDIO_TAB_POLL_MS = 25;

/** The Studio tab of `uri` in any editor group, or undefined. A custom tab of another view type never counts. */
function findStudioTab(uri: vscode.Uri): { viewColumn: vscode.ViewColumn } | undefined {
  for (const group of vscode.window.tabGroups.all) {
    const found = group.tabs.some((tab) => tab.input instanceof vscode.TabInputCustom
      && tab.input.viewType === EDITOR_VIEW_TYPE
      && tab.input.uri.fsPath === uri.fsPath);
    if (found) return { viewColumn: group.viewColumn };
  }
  return undefined;
}

/** True when a text tab of `uri` is the active tab of the group `viewColumn`. */
function textTabIsActive(uri: vscode.Uri, viewColumn: vscode.ViewColumn): boolean {
  const group = vscode.window.tabGroups.all.find((candidate) => candidate.viewColumn === viewColumn);
  const input = group?.tabs.find((tab) => tab.isActive)?.input;
  return input instanceof vscode.TabInputText && input.uri.fsPath === uri.fsPath;
}

/** The lines handed to Studio tabs: the pending hand-off and the VS Code calls that open a tab for it. */
export class StudioLines {
  public readonly pending: PendingLines;

  public constructor(pending: PendingLines = new PendingLines()) {
    this.pending = pending;
  }

  /**
   * Opens `uri` in a Studio tab at the 1-based `line`. A Studio tab of the file open in any group is
   * revealed in its own group and given the line (no second tab); otherwise a Studio tab opens in
   * `viewColumn` and takes the pending line when VS Code resolves it. Closes no tab. A failed open
   * forgets the pending line and rethrows.
   */
  public async openStudioAt(
    uri: vscode.Uri,
    line: number | undefined,
    viewColumn: vscode.ViewColumn,
  ): Promise<"studio-created" | "studio-existing"> {
    const existing = findStudioTab(uri);
    const id = uri.toString();
    try {
      if (existing) {
        await vscode.commands.executeCommand("vscode.openWith", uri, EDITOR_VIEW_TYPE, {
          viewColumn: existing.viewColumn,
          preview: false,
        });
        if (line !== undefined) this.pending.deliver(id, line, existing.viewColumn);
        return "studio-existing";
      }
      if (line !== undefined) this.pending.record(id, line);
      await vscode.commands.executeCommand("vscode.openWith", uri, EDITOR_VIEW_TYPE, { viewColumn, preview: false });
      return "studio-created";
    } catch (error) {
      this.pending.drop(id);
      throw error;
    }
  }

  /**
   * Opens `uri` as VS Code decides (`openAsVscodeDecides`, a `vscode.open` in `viewColumn`) after
   * recording `line` for a Studio tab, and reports what opened. A Studio tab of the file that is
   * already open is revealed instead (no second tab). A text tab, or a tab that never took the
   * line, drops it.
   */
  public async openFromStudioTab(
    uri: vscode.Uri,
    line: number,
    viewColumn: vscode.ViewColumn,
    openAsVscodeDecides: () => PromiseLike<unknown>,
  ): Promise<ShowDocumentOutcome> {
    const existing = findStudioTab(uri);
    if (existing) return this.openStudioAt(uri, line, existing.viewColumn);
    const id = uri.toString();
    this.pending.record(id, line);
    try {
      await openAsVscodeDecides();
      // The Studio tab VS Code creates takes the line when it resolves, a moment after the open.
      for (let waited = 0; ; waited += STUDIO_TAB_POLL_MS) {
        if (!this.pending.has(id)) return "studio-created";
        if (textTabIsActive(uri, viewColumn) || waited >= STUDIO_TAB_WAIT_MS) break;
        await new Promise((resolve) => setTimeout(resolve, STUDIO_TAB_POLL_MS));
      }
      return "other";
    } finally {
      // A pending line never applies to a text editor, and never outlives a failed open.
      this.pending.drop(id);
    }
  }
}
