/**
 * The hooks the integration tests use (`test/integration/`, through `bundle/extension`) and the S1
 * host harness (`test/host/`). They read the current activation, the one documented module-level
 * state of the extension: `src/extension.ts` sets it in `activate` and clears it in `deactivate`.
 * The product never calls these functions.
 */

import type * as vscode from "vscode";

import type { BuildQueueState } from "../core/render/buildQueue";
import type { CommentThread } from "../core/comments/commentModel";
import type { PaletteMode } from "../core/configuration/editingConfiguration";
import type { HostDocument } from "../host-api/documentStore";
import type { GroupFocusMove } from "./groupFocus";
import type { PreviewStatus, PreviewWebviewResult } from "../session/webview";
import type { RenderResult } from "../core/render/renderPipeline";
import { targetChoices, type HostListAnswer } from "../session/features/hostRequests";
import type { PreviewSession } from "../session/previewSession";
import type { PreviewThemeMode } from "../core/state/previewTheme";
import type { StudioActivation } from "./activation";
import type { VscodePreviewPanel } from "./previewPanel";

/**
 * The activation the hooks read: set by `activate`, cleared by `deactivate`. It is the only
 * module-level state left; the extension holds one activation at a time.
 */
let current: StudioActivation | undefined;

/** Records the activation the hooks read (`undefined` after `deactivate`). */
export function setCurrentActivation(activation: StudioActivation | undefined): void {
  current = activation;
}

function activePreview(): PreviewSession | undefined {
  return current?.manager.active;
}

function webviewPanelOf(preview: PreviewSession): vscode.WebviewPanel {
  return (preview.panel as VscodePreviewPanel).panel;
}

/** The `(label)=` targets of an open document, as the palette's Reference list shows them. */
export function listDocumentTargetsForTests(documentUri: string): HostListAnswer & { ok: true } {
  const document = current?.host.documents.get(documentUri);
  return targetChoices(document?.getText() ?? "");
}

/** The citation keys of the workspace's `.bib` files (bounded scan), for the palette's Citation list. */
export async function listCitationKeysForTests(documentUri: string): Promise<{
  items: Array<{ key: string; title?: string }>;
}> {
  if (!current) return { items: [] };
  const filePath = documentUri.startsWith("file:") ? current.host.documents.pathOf(documentUri) : undefined;
  const { items } = await current.manager.requests.listCitations(filePath);
  return { items };
}

/** What the integration tests read of the active preview. */
export function getActivePreviewForTests():
  | {
    html: string;
    documentUri: string;
    diagnostics: PreviewWebviewResult["diagnostics"];
    phase: BuildQueueState<RenderResult, HostDocument>["phase"];
    status: PreviewStatus;
    requestId?: number;
    documentVersion?: number;
    outputDirectory?: string;
    lastSourceScrollLine?: number;
    lastRevealedSourceLine?: number;
    sourceLine?: number;
    scrollTop?: number;
    descriptionsCollapsed?: boolean;
    scrollPreviewWithEditor: boolean;
    scrollEditorWithPreview: boolean;
    findWidgetEnabled: boolean;
    localResourceRoots: readonly vscode.Uri[];
    readOnly: boolean;
    restorePreviewStateCalls: number;
    htmlAssignments: number;
    renderedStages: number;
    /** How many watcher events for the active document were seen (a save is one). */
    activePathChanges: number;
    /** How many events the per-target watchers of linked files delivered. */
    linkedTargetEvents: number;
    /**
     * The linked targets the preview watches, with the state of the direct watch and the events
     * each source delivered: what a wait for a watcher event prints when it fails.
     */
    linkedTargets: {
      target: string;
      direct: { status: "watching" | "failed" | "closed"; error?: string; events: number };
      vscodeEvents: number;
    }[];
    /** How many renders and deferred updates were applied as an in-place content patch. */
    contentPatches: number;
    /** The last content patches (at most 10), with the source line ranges they asked to glow. */
    updateGlowPatches: { fromVersion: number; toVersion: number; ranges: { start: number; end: number }[] }[];
    /** The preview.incrementalUpdates setting as the preview currently holds it. */
    incrementalUpdates: boolean;
    /** True once the loaded webview document reported ready for the current stage. */
    webviewReady: boolean;
    /**
     * True while the host still holds a timer that will update the page of the current render (the
     * link check, the properties refresh, an in-place patch waiting for its acknowledgement): a
     * page that opens an editor now can still be patched under it.
     */
    deferredWorkPending: boolean;
    /** Seq of the last properties table posted that the page may not show yet (see PageLoadState). */
    propertiesTableAwaited?: number;
    /** Whether the panel is the active editor of the active group (`WebviewPanel.active`). */
    panelActive: boolean;
    pendingOverlayVisible: boolean;
    pendingOverlayShown: number;
    incomingChanges: { posts: number; last?: { enabled: boolean; ranges: { start: number; end: number }[] } };
    /** Review comment threads posted to the page (T42). */
    comments: { posts: number; last?: Array<CommentThread & { orphaned?: boolean }>; result?: { ok: boolean; reason?: string; kind: string; threadId?: string } };
    /** True while the host holds an open block edit (its final save has not completed). */
    blockEditOpen: boolean;
    /** True while the page has an inline editor open that page updates wait for (STAB-03). */
    pageEditorOpen: boolean;
    /** Navigation history of the panel and the last state posted to the page. */
    history: {
      entries: { uri: string; line: number }[];
      index: number;
      posted?: { canBack: boolean; canForward: boolean };
    };
  }
  | undefined {
  const preview = activePreview();
  if (!current || !preview) {
    return undefined;
  }
  const state = preview.queue.getState();
  const panel = webviewPanelOf(preview);
  const { probe } = preview;
  return {
    html: preview.webview.html,
    documentUri: preview.documentUri,
    diagnostics: preview.webview.diagnostics,
    phase: state.phase,
    status: preview.status,
    requestId: state.request?.requestId,
    documentVersion: state.request?.documentVersion,
    outputDirectory: preview.stage?.outputDirectory,
    lastSourceScrollLine: preview.scroll.lastSourceScrollLine,
    lastRevealedSourceLine: preview.scroll.lastRevealedSourceLine,
    sourceLine: preview.state?.sourceLine,
    scrollTop: preview.state?.scrollTop,
    descriptionsCollapsed: preview.state?.descriptionsCollapsed,
    scrollPreviewWithEditor: preview.configuration.scrollPreviewWithEditor,
    scrollEditorWithPreview: preview.configuration.scrollEditorWithPreview,
    findWidgetEnabled: panel.options.enableFindWidget === true,
    localResourceRoots: panel.webview.options.localResourceRoots ?? [],
    readOnly: preview.readOnly,
    restorePreviewStateCalls: probe.restoreCalls,
    htmlAssignments: probe.htmlAssignments,
    renderedStages: probe.renderedStages,
    activePathChanges: probe.activePathChanges,
    linkedTargetEvents: probe.linkedTargetEvents,
    linkedTargets: [...preview.frontmatter.linkedTargetWatchers ?? []].map(([target, watcher]) => ({
      target,
      direct: watcher.direct.state(),
      vscodeEvents: watcher.vscodeEvents,
    })),
    contentPatches: probe.contentPatches,
    updateGlowPatches: probe.updateGlowPatches.map((patch) => ({ ...patch, ranges: [...patch.ranges] })),
    incrementalUpdates: preview.configuration.incrementalUpdates,
    webviewReady: preview.stage !== undefined
      && preview.page.readyRequestId === preview.stage.requestId,
    deferredWorkPending: preview.frontmatter.linkEnrichmentTimer !== undefined
      || preview.frontmatter.refreshTimer !== undefined
      || preview.page.contentPatchTimer !== undefined
      || preview.overlay.timer !== undefined,
    propertiesTableAwaited: preview.page.propertiesTableAwaited,
    panelActive: preview.panel.active,
    pendingOverlayVisible: preview.overlay.visible,
    pendingOverlayShown: probe.pendingOverlayShown,
    incomingChanges: { posts: probe.incomingPosts, last: probe.lastIncomingChanges },
    comments: { posts: probe.commentPosts, last: probe.lastComments, result: probe.lastCommentResult },
    blockEditOpen: preview.edits.active !== undefined,
    pageEditorOpen: preview.edits.lock.pageEditorOpen,
    history: {
      ...current.manager.history.historyOf(preview).snapshot(),
      posted: probe.lastHistoryState,
    },
  };
}

/** The edit mode the workspace remembers for the next preview (`undefined`: never stored). */
export function storedEditModeForTests(): boolean | undefined {
  const stored = current?.manager.choices.editMode;
  return typeof stored === "boolean" ? stored : undefined;
}

/** Live previews and whether each follows the active editor, oldest first. */
export function getLivePreviewRolesForTests(): { documentUri: string; followsActiveEditor: boolean; title: string }[] {
  return [...current?.manager.sessions() ?? []].filter((preview) => !preview.disposed).map((preview) => ({
    documentUri: preview.documentUri,
    followsActiveEditor: preview.followsActiveEditor,
    title: preview.panel.title,
  }));
}

/** The webview panel of the active preview. */
export function getActivePreviewPanelForTests(): vscode.WebviewPanel | undefined {
  const preview = activePreview();
  return preview ? webviewPanelOf(preview) : undefined;
}

/** Hands a message to the active preview as if its page had posted it. */
export function sendPreviewMessageForTests(message: unknown): PromiseLike<void> | undefined {
  const preview = activePreview();
  if (current && preview) {
    return current.manager.handlePageMessage(preview, message);
  }
  return undefined;
}

/**
 * Holds back the source of every block editor the active preview's page opens from now on, so a
 * test can make it arrive late on purpose. `held()` counts the sources waiting; `release()` posts
 * them in order and stops holding. The extension and a preview must be active.
 */
export function holdEditSourcesForTests(): { held(): number; release(): void } {
  const preview = activePreview();
  if (!preview) throw new Error("holdEditSourcesForTests needs an active preview.");
  const queue: Array<() => void> = [];
  preview.edits.heldSources = queue;
  return {
    held: () => queue.length,
    release() {
      if (preview.edits.heldSources === queue) preview.edits.heldSources = undefined;
      for (const post of queue.splice(0)) post();
    },
  };
}

/** Moves the pages with the active editor, as a scroll of the editor would. */
export function syncActiveEditorForTests(): void {
  if (!current) return;
  const editor = current.host.editors.active();
  current.manager.scroll.syncEditorToPreview(editor);
}

/** Restores a side preview from a saved state, as the window restore does. */
export async function deserializePreviewPanelForTests(
  panel: vscode.WebviewPanel,
  rawState: unknown,
): Promise<void> {
  await current?.deserializePreviewPanel(panel, rawState);
}

/**
 * Resolves once no group unlock of a closed preview is running: from then on nothing of a closed
 * preview moves the workbench focus. Unlocks that start while waiting are waited for too.
 */
export async function previewGroupUnlocksSettledForTests(): Promise<void> {
  await current?.groups.settled();
}

/** The focus commands the group unlock ran since `since` (epoch ms), oldest first. */
export function previewGroupFocusMovesForTests(since = 0): GroupFocusMove[] {
  return current?.groups.moves(since) ?? [];
}

/** Closes every preview with its panel. */
export function disposeActivePreviewForTests(): void {
  current?.manager.disposeAll(true);
}

/**
 * Stores workspace choices as if the user had made them in the page (theme mode, toolbar state,
 * palette mode). Integration suites written before the fresh defaults changed pin the choices
 * they rely on with it; the extension must be active.
 */
export async function storeWorkspaceChoicesForTests(choices: {
  previewThemeMode: PreviewThemeMode;
  toolbarCollapsed: boolean;
  paletteMode: PaletteMode;
}): Promise<void> {
  await current?.manager.choices.storeChoices(choices);
}

/** Forgets the stored palette mode, so the next preview starts from the setting again. */
export async function clearStoredPaletteModeForTests(): Promise<void> {
  await current?.manager.choices.setPaletteMode(undefined);
}

/** Forgets the stored theme mode of the pages. */
export async function resetPreviewThemeModeForTests(): Promise<void> {
  await current?.manager.choices.resetPreviewThemeMode();
}
