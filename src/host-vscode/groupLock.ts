/**
 * The editor-group lock of side previews ({@link PanelGroups} on VS Code). A new side preview locks
 * the group it opened in, so files opened while it has focus land in another group; when its panel
 * goes away, the lock of the group it leaves empty is released. VS Code has no API for group locks:
 * the workbench lock and focus commands are run, and the moves of the focus are recorded for the
 * tests (`previewGroupFocusMovesForTests`).
 */

import * as vscode from "vscode";

import type { PanelGroups, PreviewPanel } from "../host-api/previewPanel";
import { createFocusWorkTracker, focusGroupCommand, type GroupFocusMove } from "./groupFocus";
import type { VscodePreviewPanel } from "./previewPanel";

/** The group lock of the VS Code host, with what the tests wait for. */
export interface VscodePanelGroups extends PanelGroups {
  /** Resolves once no group unlock is running (unlocks that start while waiting are waited for too). */
  settled(): Promise<void>;
  /** The focus commands the group unlock ran since `since` (epoch ms), oldest first. */
  moves(since?: number): GroupFocusMove[];
}

/** Resolves once none of `groups` is open any more, or after a bounded wait when one stays open. */
function waitForGroupsToClose(groups: readonly vscode.TabGroup[]): Promise<void> {
  const allClosed = (): boolean => groups.every((group) => !vscode.window.tabGroups.all.includes(group));
  if (allClosed()) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const finish = (): void => {
      clearTimeout(timer);
      subscription.dispose();
      resolve();
    };
    const subscription = vscode.window.tabGroups.onDidChangeTabGroups(() => {
      if (allClosed()) finish();
    });
    const timer = setTimeout(finish, 1000);
  });
}

/**
 * The group lock of side previews. `panelViewType` names the preview tabs; `hasLivePanelIn` tells
 * whether a live preview occupies the group at a column (such a group is never unlocked).
 */
export function createVscodePanelGroups(
  panelViewType: string,
  hasLivePanelIn: (column: number) => boolean,
): VscodePanelGroups {
  /**
   * Group unlocks still running. Each one can move the workbench focus (a group focus command, then
   * the restore) for up to about 1.7 s after its preview closed, so a preview opened meanwhile can
   * lose the focus. Tests wait for them (previewGroupUnlocksSettledForTests) before they open the
   * next preview; the product does not read this.
   */
  const groupFocusWork = createFocusWorkTracker(20, () => Date.now());

  /**
   * Releases the lock this extension put on a preview group that outlived its preview. Only empty
   * groups are ever unlocked: that is the shape of the leak (VS Code keeps an empty locked group),
   * and a non-empty group may carry a lock the user set.
   */
  async function unlockPreviewGroup(column: vscode.ViewColumn): Promise<void> {
    try {
      const groupAt = (target: number) => vscode.window.tabGroups.all.find((group) => group.viewColumn === target);
      const holdsPreviewTab = (group: vscode.TabGroup | undefined): boolean => group?.tabs.some((tab) =>
        tab.input instanceof vscode.TabInputWebview && tab.input.viewType.includes(panelViewType)) ?? false;
      // The closed panel's own tab can linger in the group for a moment; give it a short time to go.
      for (let attempt = 0; attempt < 10 && holdsPreviewTab(groupAt(column)); attempt += 1) {
        await new Promise<void>((resolve) => setTimeout(resolve, 50));
      }
      // An unlocked empty group closes by itself; one that is still there after a moment is locked.
      // Waiting also keeps the focus command below from landing on a group that shifted into place.
      await new Promise<void>((resolve) => setTimeout(resolve, 150));
      // The recorded column can be stale when a group on its left closed in the meantime. Then the
      // locked group is an empty group that no live preview occupies.
      const direct = groupAt(column);
      const targets = direct !== undefined && direct.tabs.length === 0
        ? [column]
        : vscode.window.tabGroups.all
          .filter((group) => group.tabs.length === 0 && group.viewColumn !== undefined && !hasLivePanelIn(group.viewColumn))
          .map((group) => group.viewColumn);
      // The groups themselves are remembered, not their columns: a column goes stale when a group on
      // its left closes, and a focus command for a position past the last group creates a new group.
      // This relies on the extension host keeping one TabGroup object per group and updating it in
      // place (its viewColumn follows the shift); if that ever changed, the restore below would be
      // skipped and the wait would time out after its bound.
      const remembered = vscode.window.tabGroups.activeTabGroup;
      const unlocked = targets.map(groupAt).filter((group): group is vscode.TabGroup => group !== undefined);
      for (const group of unlocked) {
        const command = focusGroupCommand(group.viewColumn, vscode.window.tabGroups.all.length);
        if (command === undefined) continue;
        groupFocusWork.record(command);
        await vscode.commands.executeCommand(command);
        await vscode.commands.executeCommand("workbench.action.unlockEditorGroup");
      }
      // An unlocked empty group closes and the groups on its right shift left. Focus may only be
      // restored once that is visible here, or the remembered group would still be read at its old column.
      await waitForGroupsToClose(unlocked);
      // Focus held outside the editor area (terminal, sidebar) cannot be restored through the API.
      if (unlocked.length > 0 && !unlocked.includes(remembered) && !remembered.isActive
        && vscode.window.tabGroups.all.includes(remembered)) {
        const restore = focusGroupCommand(remembered.viewColumn, vscode.window.tabGroups.all.length);
        if (restore !== undefined) {
          groupFocusWork.record(restore + " (restore)");
          await vscode.commands.executeCommand(restore);
        }
      }
    } catch {
      // Never throw from dispose.
    }
  }

  return {
    /**
     * Locks the editor group a new side preview created, so files opened while the preview has focus
     * land in another group. Only a group that holds just this panel is locked. Never blocks the preview.
     */
    async lockNewPanelGroup(preview: PreviewPanel): Promise<boolean> {
      const panel = (preview as VscodePreviewPanel).panel;
      try {
        const groupOf = () => vscode.window.tabGroups.all.find((group) => group.viewColumn === panel.viewColumn);
        for (let attempt = 0; attempt < 10 && groupOf() === undefined; attempt += 1) {
          await new Promise<void>((resolve) => setTimeout(resolve, 25));
        }
        if (panel.active && groupOf()?.tabs.length === 1) {
          await vscode.commands.executeCommand("workbench.action.lockEditorGroup");
          return true;
        }
      } catch {
        // A failed lock must never block the preview.
      }
      return false;
    },
    /** Called when a preview's panel goes away: unlock its group one tick later. */
    release(column: number): void {
      const unlock = new Promise<void>((resolve) => {
        setTimeout(() => void unlockPreviewGroup(column).finally(resolve), 0);
      });
      groupFocusWork.track(unlock);
    },
    settled: () => groupFocusWork.settled(),
    moves: (since = 0) => groupFocusWork.moves(since),
  };
}
