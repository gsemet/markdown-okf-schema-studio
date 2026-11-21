/**
 * Putting Studio in place, host side: shows a file in a Studio tab at a line, either replacing a
 * text tab (the opening watcher) or on its own (Studio's own navigation). The choice of the tab
 * is the pure `studioTargetFor`; this module only reads the tabs and runs the VS Code commands.
 */

import * as vscode from "vscode";

import { STUDIO_EDITOR_VIEW_TYPE } from "../core/configuration/editorAssociationMigration";
import { studioTargetFor, type StudioTabGroup } from "../core/navigation/openingPolicy";
import type { StudioLineRequests } from "./openInStudio";

/** The text tab a Studio tab replaces, with the group it sits in. */
export interface TextTabToReplace {
  readonly tab: vscode.Tab;
  readonly group: vscode.TabGroup;
}

/** What to show in Studio. */
export interface StudioPlacementRequest {
  readonly uri: vscode.Uri;
  /** The 1-based line to reveal and mark, when the reader asked for one. */
  readonly line?: number;
  /** The text tab the Studio tab takes the place of; none when Studio navigates on its own. */
  readonly textTab?: TextTabToReplace;
  /** Where a new Studio tab opens when there is no text tab (the group already showing the file, else the first). */
  readonly column?: vscode.ViewColumn;
  /** A jump reveals a Studio tab of another group; a plain opening opens a new tab in the text tab's group. */
  readonly action: "studio" | "studio-at-line";
}

/** Tabs of the groups seen active, by file and group, numbered in the order they became active. */
const activationOrder = new Map<string, number>();
let activationCounter = 0;

const activationKey = (uri: vscode.Uri, viewColumn: number): string => `${viewColumn}|${uri.toString()}`;

/**
 * Follows the Studio tabs as they become active, so "the most recently active" is a real order: the
 * tab API names no activity time. Returns what stops the tracking.
 */
export function trackStudioActivation(): vscode.Disposable {
  const note = (tab: vscode.Tab, viewColumn: number): void => {
    if (tab.isActive && tab.input instanceof vscode.TabInputCustom && tab.input.viewType === STUDIO_EDITOR_VIEW_TYPE) {
      activationOrder.set(activationKey(tab.input.uri, viewColumn), ++activationCounter);
    }
  };
  const noteAll = (): void => {
    for (const group of vscode.window.tabGroups.all) for (const tab of group.tabs) note(tab, group.viewColumn);
  };
  noteAll();
  return vscode.window.tabGroups.onDidChangeTabs((event) => {
    for (const tab of [...event.opened, ...event.changed]) {
      const group = vscode.window.tabGroups.all.find((candidate) => candidate.tabs.includes(tab));
      if (group) note(tab, group.viewColumn);
    }
  });
}

/** The groups holding a Studio tab of `uri`, with `lastActive` ranking how recently each was active. */
function studioTabGroupsOf(uri: vscode.Uri): StudioTabGroup[] {
  const key = uri.toString();
  const groups: StudioTabGroup[] = [];
  for (const group of vscode.window.tabGroups.all) {
    const tabs = group.tabs.filter((tab) => tab.input instanceof vscode.TabInputCustom
      && tab.input.viewType === STUDIO_EDITOR_VIEW_TYPE && tab.input.uri.toString() === key);
    if (tabs.length === 0) continue;
    // The followed activation order first; the active group, then the active tab, break a tie.
    groups.push({
      viewColumn: group.viewColumn,
      lastActive: (activationOrder.get(activationKey(uri, group.viewColumn)) ?? 0) * 4
        + (group.isActive ? 2 : 0) + (tabs.some((tab) => tab.isActive) ? 1 : 0),
    });
  }
  return groups;
}

// @implements_req SwRS-MDOKFSTUDIO-LIFE-183
/**
 * Shows `request.uri` in Studio: reveals the Studio tab the policy picks (giving it the line), or
 * opens a new one (recording the line for it), then closes the text tab it replaces.
 */
export async function putStudioInPlace(requests: StudioLineRequests, request: StudioPlacementRequest): Promise<void> {
  const { uri, line, textTab } = request;
  const key = uri.toString();
  const textColumn = textTab?.group.viewColumn ?? request.column ?? vscode.ViewColumn.One;
  const target = studioTargetFor(request.action, textColumn, studioTabGroupsOf(uri));
  if (target.kind === "reveal") {
    await vscode.commands.executeCommand("vscode.openWith", uri, STUDIO_EDITOR_VIEW_TYPE, {
      viewColumn: target.viewColumn,
      preview: false,
    });
    if (line !== undefined) requests.deliver(key, line);
  } else {
    if (line !== undefined) requests.recordPending(key, line);
    await vscode.commands.executeCommand("vscode.openWith", uri, STUDIO_EDITOR_VIEW_TYPE, {
      viewColumn: target.viewColumn,
      preview: textTab?.tab.isPreview ?? false,
      preserveFocus: textTab ? !textTab.tab.isActive : false,
    });
  }
  if (textTab) await vscode.window.tabGroups.close(textTab.tab, true);
}
