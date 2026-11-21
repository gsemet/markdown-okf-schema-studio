/**
 * The opening watcher: when a Markdown file opens in a new text editor tab, it gathers the facts of
 * the opening, asks the pure policy (`core/navigation/openingPolicy.ts`) what to do, and, when the
 * answer is Studio, puts Studio in the place of the text tab (`studioPlacement.ts`). The only place
 * that reads VS Code's tabs for this feature.
 *
 * A custom editor receives no selection, so the line of a jump is read here, from the text editor
 * the tab opens, before Studio takes its place. VS Code shows the editor with its cursor at 1:1 and
 * applies the selection a few milliseconds later (trial T2): a jump (Quick Open `file:42`,
 * `vscode.open` with a selection, a search result) is the selection change of kind `Command` that
 * follows, while a plain reopening restores the stored view state with a change of no kind. The tabs
 * open when the watcher starts are recorded at once (synchronously): the tabs VS Code restores with
 * the window are never replaced. The settings are read only after the editor association migration
 * ran, since it writes them.
 */

import * as path from "node:path";

import * as vscode from "vscode";

import { DEFAULT_SEARCH_RESULTS_IN_STUDIO, settingSection } from "../core/configuration/settingsRegistry";
import { STUDIO_EDITOR_VIEW_TYPE } from "../core/configuration/editorAssociationMigration";
import { openingDecision, type OpenedTabKind } from "../core/navigation/openingPolicy";
import type { Logger } from "../host-api/logger";
import type { Settings } from "../host-api/settings";
import type { StudioClosedTabs, StudioLineRequests, StudioOpenedTextEditors } from "./openInStudio";
import { putStudioInPlace } from "./studioPlacement";

/** How long the watcher waits for the editor of an opening to show before giving the tab up. */
const EDITOR_SHOWS_TIMEOUT_MS = 3000;
/** How long, once the editor shows, the watcher waits for the selection change that makes the opening a jump. */
const JUMP_SETTLE_MS = 200;

/** What the watcher needs from the activation. */
export interface OpeningWatcherDeps {
  readonly settings: Pick<Settings, "section">;
  readonly logger: Pick<Logger, "error">;
  readonly openedByStudio: StudioOpenedTextEditors;
  readonly closedStudioTabs: StudioClosedTabs;
  readonly lineRequests: StudioLineRequests;
  /** True while a side preview that follows the active editor is open. */
  readonly sidePreviewFollowsActiveEditor: () => boolean;
  /** Settles when the editor association migration is done: the settings are read after it. */
  readonly ready: PromiseLike<unknown>;
}

/** The kind of a tab, from its input (the merge editor has no input class in the API: it is `other`, and kept). */
function tabKindOf(input: unknown): OpenedTabKind {
  if (input instanceof vscode.TabInputText) return "text";
  if (input instanceof vscode.TabInputTextDiff) return "diff";
  if (input instanceof vscode.TabInputCustom) return "custom";
  return "other";
}

/** True for a saved `file:` document with the `.md` extension. */
function isEligibleUri(uri: vscode.Uri): boolean {
  return uri.scheme === "file" && path.extname(uri.fsPath).toLowerCase() === ".md";
}

// @implements_req SwRS-MDOKFSTUDIO-LIFE-185
/** Starts watching the tabs; the disposable stops it. */
export function startOpeningWatcher(deps: OpeningWatcherDeps): vscode.Disposable {
  // The tabs present now, never replaced (decision 26).
  const presentAtStart = new WeakSet<vscode.Tab>();
  for (const group of vscode.window.tabGroups.all) for (const tab of group.tabs) presentAtStart.add(tab);
  const handled = new WeakSet<vscode.Tab>();

  const groupOf = (tab: vscode.Tab): vscode.TabGroup | undefined =>
    vscode.window.tabGroups.all.find((group) => group.tabs.includes(tab));

  // The text editor an opening shows: visible in its group (the active one when the group is not told).
  const editorOf = (uri: vscode.Uri, viewColumn: number): vscode.TextEditor | undefined => {
    const key = uri.toString();
    return vscode.window.visibleTextEditors.find((candidate) =>
      candidate.document.uri.toString() === key && candidate.viewColumn === viewColumn);
  };

  // The selection changes of kind `Command` of the documents whose tab just opened, by document: a jump.
  const jumps = new Map<string, { line: number; at: number }>();
  const jumpWaiters = new Set<() => void>();
  const watchJumps = vscode.window.onDidChangeTextEditorSelection((event) => {
    if (event.kind !== vscode.TextEditorSelectionChangeKind.Command) return;
    const first = event.selections[0];
    if (!first) return;
    jumps.set(event.textEditor.document.uri.toString(), { line: first.start.line + 1, at: Date.now() });
    [...jumpWaiters].forEach((wake) => wake());
  });

  // The 1-based line of a jump into `uri`, read once its editor shows (the selection comes a tick later); none for a plain opening.
  const jumpLineOf = (uri: vscode.Uri, since: number): Promise<number | undefined> =>
    new Promise((resolve) => {
      const key = uri.toString();
      const settle = (): void => {
        clearTimeout(timer);
        jumpWaiters.delete(wake);
        waiting.delete(settle);
        const jump = jumps.get(key);
        jumps.delete(key);
        resolve(jump !== undefined && jump.at >= since ? jump.line : undefined);
      };
      const wake = (): void => { if ((jumps.get(key)?.at ?? -1) >= since) settle(); };
      const timer = setTimeout(settle, JUMP_SETTLE_MS);
      jumpWaiters.add(wake);
      waiting.add(settle);
      wake();
    });

  // Waits for the editor of an opening to show (it may not be visible when its tab opens); gives up when the tab closes or after a timeout.
  const waiting = new Set<() => void>();
  const whenEditorShows = (tab: vscode.Tab, uri: vscode.Uri, viewColumn: number): Promise<vscode.TextEditor | undefined> =>
    new Promise((resolve) => {
      const found = editorOf(uri, viewColumn);
      if (found) {
        resolve(found);
        return;
      }
      const listeners: vscode.Disposable[] = [];
      const done = (editor: vscode.TextEditor | undefined): void => {
        clearTimeout(timer);
        waiting.delete(stop);
        listeners.forEach((listener) => listener.dispose());
        resolve(editor);
      };
      const finish = (): void => {
        const editor = editorOf(uri, viewColumn);
        if (editor) done(editor);
      };
      const stop = (): void => done(undefined);
      const timer = setTimeout(stop, EDITOR_SHOWS_TIMEOUT_MS);
      waiting.add(stop);
      listeners.push(
        vscode.window.onDidChangeVisibleTextEditors(finish),
        vscode.window.onDidChangeActiveTextEditor(finish),
        vscode.window.tabGroups.onDidChangeTabs(() => { if (!groupOf(tab)) stop(); }),
      );
    });

  // The group each Studio tab was last seen in: a closed tab is in no group any more.
  const studioColumns = new WeakMap<vscode.Tab, number>();
  const noteStudioTab = (tab: vscode.Tab): void => {
    if (tab.input instanceof vscode.TabInputCustom && tab.input.viewType === STUDIO_EDITOR_VIEW_TYPE) {
      const group = groupOf(tab);
      if (group) studioColumns.set(tab, group.viewColumn);
    }
  };
  for (const group of vscode.window.tabGroups.all) group.tabs.forEach(noteStudioTab);

  async function consider(tab: vscode.Tab): Promise<void> {
    const kind = tabKindOf(tab.input);
    if (kind !== "text" || handled.has(tab)) return;
    const opened = Date.now();
    const uri = (tab.input as vscode.TabInputText).uri;
    const group = groupOf(tab);
    if (!group) return;
    const facts = {
      kind,
      eligible: isEligibleUri(uri),
      // A jump into a text tab that is already open opens no tab: every tab of an `opened` event is new.
      isNew: true,
      presentAtStart: presentAtStart.has(tab),
      // No proved signal tells the opening that triggered the activation from a restored tab (trial T11).
      triggeredActivation: false,
      reopenedAsText: deps.closedStudioTabs.has(uri.toString(), group.viewColumn),
      openedByStudio: deps.openedByStudio.has(uri.toString()),
      sidePreviewFollowsActiveEditor: deps.sidePreviewFollowsActiveEditor(),
    };
    // The policy decides, rule by rule: a tab it keeps whatever the settings, as a jump or not, is not waited for.
    const keptAs = (line: number | undefined): boolean =>
      openingDecision({ ...facts, line, searchResultsInStudio: true, markdownFilesInStudio: true }).kind === "keep";
    if (keptAs(undefined) && keptAs(1)) return;
    handled.add(tab);
    await deps.ready;
    // The tab may have closed or moved while the migration ran.
    const current = groupOf(tab);
    if (!current) return;
    const editor = await whenEditorShows(tab, uri, current.viewColumn);
    if (!editor || !groupOf(tab)) return;
    const line = await jumpLineOf(uri, opened);
    if (!groupOf(tab)) return;
    const open = deps.settings.section(settingSection("open"));
    const decision = openingDecision({
      ...facts,
      line,
      searchResultsInStudio: open.get<boolean>("searchResultsInStudio", DEFAULT_SEARCH_RESULTS_IN_STUDIO),
      markdownFilesInStudio: open.get<boolean>("markdownFilesInStudio", false),
    });
    if (decision.kind === "keep") return;
    await putStudioInPlace(deps.lineRequests, {
      uri,
      ...(decision.kind === "studio-at-line" ? { line: decision.line } : {}),
      textTab: { tab, group: current },
      action: decision.kind,
    });
  }

  const run = (work: Promise<void>): void => {
    work.catch((error: unknown) => deps.logger.error("Opening a Markdown file in Studio failed.", error));
  };

  return vscode.Disposable.from(
    vscode.window.tabGroups.onDidChangeTabs((event) => {
      for (const tab of event.closed) {
        const column = studioColumns.get(tab);
        if (column !== undefined && tab.input instanceof vscode.TabInputCustom) {
          deps.closedStudioTabs.record(tab.input.uri.toString(), column);
        }
      }
      for (const tab of [...event.opened, ...event.changed]) noteStudioTab(tab);
      for (const tab of event.opened) run(consider(tab));
    }),
    watchJumps,
    new vscode.Disposable(() => [...waiting].forEach((stop) => stop())),
  );
}
