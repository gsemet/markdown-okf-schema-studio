import * as fs from "node:fs";
import * as path from "node:path";

import * as vscode from "vscode";

import { BuildQueue, BuildQueueState } from "./build/buildQueue";
import {
  FRONTMATTER_CONFIGURATION_SECTION,
  FrontmatterConfiguration,
  readFrontmatterConfiguration,
} from "./configuration/frontmatterConfiguration";
import {
  analyzeFrontmatter,
  createFrontmatterFieldPatch,
  createFrontmatterFieldRemovePatch,
  createFrontmatterFieldRenamePatch,
  extractFrontmatter,
  frontmatterAddPlacement,
  frontmatterLinkIdentity,
  findSchemaDirectory,
  parseYamlValue,
  type FrontmatterResult,
} from "./frontmatter/okfFrontmatter";
import {
  invalidateStemIndex,
  resolveFrontmatterLinkRoots,
} from "./frontmatter/fileLinks";
import { renderPropertiesTable, replacePropertiesTableHtml } from "./frontmatter/propertiesTable";
import { checkboxToggleEdit } from "./render/checkboxMarkers";
import { sourceRangeForLines, type SourceMappingOptions } from "./mapping/sourceMapping";
import { insertionText, planInsertion, type InsertionPlan } from "./mapping/insertion";
import { minimalReplacement } from "./mapping/textDiff";
import {
  DEFAULT_PREVIEW_CONFIGURATION,
  PREVIEW_CONFIGURATION_SECTION,
  PreviewConfiguration,
  readPreviewConfiguration,
} from "./configuration/previewConfiguration";
import {
  PLANTUML_CONFIGURATION_SECTION,
  PlantUmlConfiguration,
  readPlantUmlConfiguration,
} from "./configuration/plantUmlConfiguration";
import {
  markdownFragmentRange,
  markdownMarkerLine,
  resolvePreviewNavigation,
  validateResolvedPreviewNavigation,
} from "./navigation/previewNavigation";
import {
  buildPreviewWebviewHtml,
  buildStatusWebviewHtml,
  formatStatusDiagnostic,
  PreviewStatus,
  PreviewWebviewResult,
  setPreviewStatus,
  PREVIEW_STATUS_LABELS,
} from "./preview/webview";
import {
  diagnosticsFitPatch,
  planContentPatch,
  reportsReloadedDocument,
  reuseNonce,
  runtimeContextKey,
  type RuntimeContextSettings,
} from "./preview/contentPatch";
import { isRegisteredPreviewMessage, type RegisteredPreviewMessage } from "./preview/previewMessages";
import {
  PreviewDiagnostic,
  PreviewDocument,
  RenderError,
  RenderResult,
  RenderStage,
  renderPreviewDocument,
  resetRenderHooksForTests,
  setRenderDelayForTests,
  setRenderOverrideForTests,
} from "./render/renderPipeline";
import { injectPlantUmlDiagrams } from "./render/plantUmlRenderer";
import {
  BoundedMap,
  loadCollapsedMap,
  MAX_DOCUMENT_STATES,
  migrateLegacyCollapsedKeys,
  saveCollapsedMap,
} from "./state/boundedState";
import { EditLock, isUnchangedSave, needsRefresh } from "./state/editLock";
import { preloadMystEngine } from "./render/mystRenderer";
import { createNonce } from "./security/csp";
import { parsePreviewPanelState, PreviewPanelState } from "./state/previewState";
import {
  clearPreviewThemeMode,
  isPreviewThemeMode,
  isPreviewThemeModeChangedMessage,
  readPreviewThemeMode,
  type PreviewThemeMode,
  type PreviewThemeModeStorage,
  writePreviewThemeMode,
} from "./state/previewTheme";
import type { PreviewRuntimeContext } from "./webview/scrollSync";
import {
  EditorEchoGuard,
  shiftLineForEdits,
  type ScrollAnchor,
} from "./webview/anchorPolicy";

export const COMMAND_ID = "markdown-okf-schema-studio.openPreview";
export const REFRESH_COMMAND_ID = "markdown-okf-schema-studio.refreshPreview";
export const PANEL_VIEW_TYPE = "markdown-okf-schema-studio.preview";
export const EDITOR_VIEW_TYPE = "markdown-okf-schema-studio.editor";

interface PreviewSyncMessage {
  type: "previewReady" | "previewScroll" | "previewReveal" | "previewState" | "previewLink" | "previewLinkDiscover" | "previewThemeModeChanged" | "previewRefresh" | "previewAnchorModeChanged" | "previewEditOpen" | "previewEditSave" | "previewEditCancel" | "previewFrontmatterSave" | "previewCheckboxToggle" | "previewEditModeChanged";
  documentId: string;
  documentVersion: number;
  requestId: number;
  previewThemeMode?: PreviewThemeMode;
  anchorToEditor?: boolean;
  editMode?: boolean;
  line?: number;
  endLine?: number;
  /** Zero-based column of a checkbox marker's opening bracket. */
  column?: number;
  /** Requested checkbox state. */
  checked?: boolean;
  editId?: string;
  /** Block insertion: the source line after which a new block goes (0 = start of the body). */
  insertAfterLine?: number;
  originalText?: string;
  editedText?: string;
  final?: boolean;
  frontmatterAction?: "add" | "remove";
  fieldName?: string;
  /** For an add: the existing top-level field after which the new field is inserted. */
  afterField?: string;
  newFieldName?: string;
  fieldValue?: unknown;
  fieldValueFormat?: "yaml";
  /** For a value edit: "plain" writes a safe string as a plain YAML scalar (a new custom key). */
  fieldValueStyle?: "plain";
  sourceLine?: number;
  anchorLine?: number;
  /** Final saves: source line and viewport top of the edited element (anchoring rule R7). */
  pinLine?: number;
  pinViewportTop?: number;
  sourceFile?: string;
  scrollTop?: number;
  focusedBlockId?: string;
  selectedText?: string;
  openDisclosures?: number[];
  descriptionsCollapsed?: boolean;
  /** previewReady only: true while the page has an inline block editor open. */
  blockEditOpen?: boolean;
  request?: string;
  requests?: string[];
  selectionLine?: number;
  activation?: "click" | "double-click" | "keyboard";
}

interface ActiveBlockEdit {
  editId: string;
  documentId: string;
  documentVersion: number;
  requestId: number;
  line: number;
  endLine: number;
  sourceStartOffset: number;
  originalText: string;
  lastSavedText: string;
  pendingText?: string;
  /** Set for block insertions: where and how the new block is written. */
  insertion?: InsertionPlan;
  insertAfterLine?: number;
  finalRequested: boolean;
  cancelRequested: boolean;
  applying: boolean;
  hasAppliedEdit: boolean;
  lastMessage: PreviewSyncMessage;
}

interface ActivePreview {
  panel: vscode.WebviewPanel;
  followsActiveEditor: boolean;
  /** Column of the editor group this extension locked for the preview; undefined if none. */
  lockedColumn?: vscode.ViewColumn;
  queue: BuildQueue<vscode.TextDocument, RenderResult>;
  document?: vscode.TextDocument;
  documentUri: string;
  workspaceRoot: string;
  sessionRoots: string[];
  navigationRoots: string[];
  workspaceFolder?: vscode.WorkspaceFolder;
  readOnly: boolean;
  dependencyWatcher: vscode.FileSystemWatcher;
  dependencyWatcherSubscriptions: vscode.Disposable[];
  panelSubscriptions: vscode.Disposable[];
  stage?: RenderStage;
  webview: PreviewWebviewResult;
  /** Drops editor visible-range events caused by the host's own reveals. */
  echoGuard: EditorEchoGuard;
  /** The single scroll anchor of this preview (see docs/scroll-anchoring.md). */
  anchor?: ScrollAnchor & { documentId: string };
  states: BoundedMap<PreviewPanelState>;
  state?: PreviewPanelState;
  status: PreviewStatus;
  configuration: PreviewConfiguration;
  plantUmlConfiguration: PlantUmlConfiguration;
  frontmatterConfiguration: FrontmatterConfiguration;
  frontmatter?: FrontmatterResult;
  frontmatterRefreshTimer?: NodeJS.Timeout;
  linkEnrichmentTimer?: NodeJS.Timeout;
  linkedTargetWatchers?: Map<string, vscode.Disposable>;
  frontmatterDocumentUri?: string;
  frontmatterDocumentVersion?: number;
  frontmatterLinkResultsVersion?: number;
  enrichmentGeneration: number;
  /** Test hook: how many watcher events for the active document refreshReferencedPath saw. */
  activePathChanges: number;
  /** Test hook: how many times restorePreviewState ran for this preview. */
  restoreCalls: number;
  hadFailure: boolean;
  disposed: boolean;
  activeBlockEdit?: ActiveBlockEdit;
  /** Release and deferral decisions of the inline block-edit lock (STAB-02, STAB-03). */
  editLock: EditLock;
  /** Edited element position carried across the render that follows a final save (R7). */
  pendingPin?: {
    documentId: string;
    line: number;
    viewportTop: number;
    expiresAt: number;
    /** Renders of an older document version (an in-flight autosave build) must not consume the pin. */
    minVersion: number;
  };
  lastSourceScrollLine?: number;
  lastRevealedSourceLine?: number;
  linkDiscoveries?: Map<string, Promise<readonly string[]>>;
  /** Number of webview document replacements, i.e. assignments of a changed string (test hook and render-churn budget). */
  htmlAssignments: number;
  /** Test hook: how many finished renders updatePreview applied (the render-churn budget counts against it). */
  renderedStages: number;
  /** requestId of the stage whose rendered document reported ready in the current webview document. */
  readyRequestId?: number;
  /** requestId of the stage the html of the last document assignment was built for. */
  assignedRequestId?: number;
  /** Settings the loaded runtime read at startup; a content patch needs the same ones (T34). */
  loadedContext?: RuntimeContextSettings;
  /** Armed after a content patch: loads the full document when the page never reports ready. */
  contentPatchTimer?: NodeJS.Timeout;
  /** Test hook: how many renders (and deferred updates) were applied as a content patch. */
  contentPatches: number;
  /**
   * requestId the page has once it has handled every message sent so far: set when a content patch
   * is posted, cleared when a new document is assigned. The webview handles messages in order, and a
   * patch changes its identifiers synchronously, so a further patch can be addressed to it before
   * the page acknowledged the previous one.
   */
  patchedRequestId?: number;
  /** The record carries the nonce of the loaded document, not one of its own (see freshNonceRecord). */
  recordKeepsLoadedNonce: boolean;
  /** Status the loaded page shows while `status` is "pending" over a rendered page (D-22). */
  shownStatus?: PreviewStatus;
  /** Armed while a render is pending over a rendered page; shows the overlay after the delay. */
  pendingOverlayTimer?: NodeJS.Timeout;
  /** The delay elapsed while the page was still loading; post the overlay on the next ready report. */
  pendingOverlayDue: boolean;
  /** The loaded page shows the floating pending overlay. */
  pendingOverlayVisible: boolean;
  /** Message the overlay shows (the latest pending queue message). */
  pendingOverlayMessage: string;
  /** Test hook: how many times the overlay was shown for this preview. */
  pendingOverlayShown: number;
}

const activePreviews = new Set<ActivePreview>();
let activePreview: ActivePreview | undefined;
let extensionRootUri: vscode.Uri | undefined;
let sessionPreviewThemeMode: PreviewThemeMode | undefined;
let previewThemeModeStorage: PreviewThemeModeStorage | undefined;
let previewDescriptionStorage: vscode.Memento | undefined;
/** Bounded per-document `descriptionsCollapsed` memory, persisted under one workspaceState key. */
let collapsedDescriptions = new BoundedMap<boolean>();
let editModeStorage: vscode.Memento | undefined;
const EDIT_MODE_STORAGE_KEY = "markdownOkfSchemaStudio.editMode";
interface StemRootWatcher {
  watcher: vscode.FileSystemWatcher;
  subscriptions: vscode.Disposable[];
}

const stemRootWatchers = new Map<string, StemRootWatcher>();

function canonicalWatchRoot(root: string): string {
  try {
    return fs.realpathSync(root);
  } catch {
    return path.resolve(root);
  }
}

function watchStemRoot(root: string): void {
  const canonicalRoot = canonicalWatchRoot(root);
  if (stemRootWatchers.has(canonicalRoot)) return;
  const watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(vscode.Uri.file(canonicalRoot), "**/*.md"),
  );
  const invalidate = (): void => invalidateStemIndex(canonicalRoot);
  const subscriptions = [
    watcher.onDidCreate(invalidate),
    watcher.onDidChange(invalidate),
    watcher.onDidDelete(invalidate),
  ];
  stemRootWatchers.set(canonicalRoot, { watcher, subscriptions });
}

function unwatchStemRoot(root: string): void {
  const canonicalRoot = canonicalWatchRoot(root);
  const entry = stemRootWatchers.get(canonicalRoot);
  if (!entry) return;
  for (const subscription of entry.subscriptions) {
    subscription.dispose();
  }
  entry.watcher.dispose();
  stemRootWatchers.delete(canonicalRoot);
}

function disposeStemRootWatchers(): void {
  for (const root of stemRootWatchers.keys()) {
    unwatchStemRoot(root);
  }
}

function latestPreview(
  matches: (preview: ActivePreview) => boolean = () => true,
): ActivePreview | undefined {
  return [...activePreviews].reverse().find((preview) => !preview.disposed && matches(preview));
}

function setSessionPreviewThemeMode(mode: PreviewThemeMode): void {
  sessionPreviewThemeMode = mode;
  const storage = previewThemeModeStorage;
  if (!storage) {
    return;
  }
  void writePreviewThemeMode(storage, mode).then(undefined, (error: unknown) => {
    console.error("Failed to persist the Markdown preview theme mode.", error);
  });
}

function isPathWithin(root: string | undefined, candidate: string): boolean {
  if (!root) {
    return false;
  }
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function isWorkspaceUriEligible(uri: vscode.Uri): boolean {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  return uri.scheme === "file"
    && workspaceFolder !== undefined
    && isPathWithin(workspaceFolder.uri.fsPath, uri.fsPath);
}

function isDocumentEligible(document: vscode.TextDocument): boolean {
  return path.extname(document.uri.fsPath).toLowerCase() === ".md"
    && document.uri.scheme === "file";
}

function documentKey(document: { uri: vscode.Uri }): string {
  return document.uri.toString();
}

function openDocumentAt(filePath: string): PreviewDocument | undefined {
  return vscode.workspace.textDocuments.find(
    (document) => path.resolve(document.uri.fsPath) === path.resolve(filePath),
  );
}

function canonicalPath(filePath: string): string {
  try {
    return fs.realpathSync(filePath);
  } catch {
    return path.resolve(filePath);
  }
}

function sourceExists(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function sessionWorkspaceRoots(): string[] {
  return (vscode.workspace.workspaceFolders ?? []).map((folder) => folder.uri.fsPath);
}

function sourceAvailable(preview: ActivePreview): boolean {
  const sourceUri = vscode.Uri.parse(preview.documentUri);
  const sourcePath = preview.document?.uri.fsPath ?? sourceUri.fsPath;
  return (!preview.document || isDocumentEligible(preview.document))
    && isPathWithin(canonicalPath(preview.workspaceRoot), canonicalPath(sourcePath))
    && sourceExists(sourcePath);
}

function isPreviewSyncMessage(value: unknown): value is PreviewSyncMessage {
  if (!value || typeof value !== "object" || isRegisteredPreviewMessage(value)) {
    return false;
  }
  const message = value as Partial<PreviewSyncMessage>;
  const themeModeChange = isPreviewThemeModeChangedMessage(value);
  const validType = message.type === "previewReady"
    || message.type === "previewScroll"
    || message.type === "previewReveal"
    || message.type === "previewState"
    || message.type === "previewLink"
    || message.type === "previewLinkDiscover"
    || message.type === "previewRefresh"
    || message.type === "previewAnchorModeChanged"
    || message.type === "previewEditOpen"
    || message.type === "previewEditSave"
    || message.type === "previewEditCancel"
    || message.type === "previewFrontmatterSave"
    || message.type === "previewCheckboxToggle"
    || message.type === "previewEditModeChanged"
    || themeModeChange;
  const validLine = message.line === undefined
    || (Number.isSafeInteger(message.line) && message.line >= 1);
  const validEndLine = message.endLine === undefined
    || (Number.isSafeInteger(message.endLine) && message.endLine >= 1);
  const validSourceLine = message.sourceLine === undefined
    || (Number.isSafeInteger(message.sourceLine) && message.sourceLine >= 1);
  const validAnchorLine = message.anchorLine === undefined
    || (typeof message.anchorLine === "number" && Number.isFinite(message.anchorLine) && message.anchorLine >= 1);
  const validPin = (message.pinLine === undefined && message.pinViewportTop === undefined)
    || ((message.type === "previewFrontmatterSave"
      || (message.type === "previewEditSave" && message.final === true))
      && Number.isSafeInteger(message.pinLine)
      && (message.pinLine as number) >= 1
      && typeof message.pinViewportTop === "number"
      && Number.isFinite(message.pinViewportTop)
      && Math.abs(message.pinViewportTop) <= 100000);
  const validSelectionLine = message.selectionLine === undefined
    || (Number.isSafeInteger(message.selectionLine) && message.selectionLine >= 1);
  const validScrollTop = message.scrollTop === undefined
    || (typeof message.scrollTop === "number" && Number.isFinite(message.scrollTop) && message.scrollTop >= 0);
  const validThemeMode = message.previewThemeMode === undefined
    || isPreviewThemeMode(message.previewThemeMode);
  const validAnchorMode = message.anchorToEditor === undefined
    || typeof message.anchorToEditor === "boolean";
  // Every previewState carries the boolean editMode, so only the type-specific message requires it.
  const validEditMode = message.type === "previewEditModeChanged"
    ? typeof message.editMode === "boolean"
    : (message.editMode === undefined || typeof message.editMode === "boolean");
  const editRequest = message.type === "previewEditOpen"
    || message.type === "previewEditSave"
    || message.type === "previewEditCancel"
    || message.type === "previewFrontmatterSave"
    || message.type === "previewCheckboxToggle";
  const validEditRequest = !editRequest || (
    typeof message.editId === "string"
    && message.editId.length > 0
    && (message.type !== "previewFrontmatterSave"
      || (typeof message.fieldName === "string" && message.fieldName.length > 0))
    && (message.type === "previewFrontmatterSave"
      || (message.line !== undefined
        && message.endLine !== undefined
        && message.endLine >= message.line))
  );
  const validInsertAfterLine = message.insertAfterLine === undefined
    || ((message.type === "previewEditOpen"
      || message.type === "previewEditSave"
      || message.type === "previewEditCancel")
      && Number.isSafeInteger(message.insertAfterLine)
      && (message.insertAfterLine as number) >= 0);
  const validBlockEditOpen = message.blockEditOpen === undefined
    || (message.type === "previewReady" && typeof message.blockEditOpen === "boolean");
  const validEditPayload = message.type !== "previewEditSave"
    || (typeof message.originalText === "string" && typeof message.editedText === "string");
  const validEditFinal = message.final === undefined
    || (message.type === "previewEditSave" && typeof message.final === "boolean");
  const validFrontmatterPayload = message.type !== "previewFrontmatterSave"
    || message.frontmatterAction === "remove"
    || Object.prototype.hasOwnProperty.call(message, "fieldValue");
  const validFrontmatterFormat = message.fieldValueFormat === undefined
    || (message.type === "previewFrontmatterSave" && message.fieldValueFormat === "yaml");
  const validFrontmatterStyle = message.fieldValueStyle === undefined
    || (message.type === "previewFrontmatterSave"
      && message.fieldValueStyle === "plain"
      && message.frontmatterAction === undefined
      && message.fieldValueFormat === undefined);
  const validFrontmatterKey = message.newFieldName === undefined
    || (message.type === "previewFrontmatterSave" && typeof message.newFieldName === "string");
  const validCheckbox = message.type !== "previewCheckboxToggle"
    ? message.column === undefined && message.checked === undefined
    : Number.isSafeInteger(message.column) && (message.column as number) >= 0
      && typeof message.checked === "boolean"
      && message.line === message.endLine;
  const validAfterField = message.afterField === undefined
    || (message.type === "previewFrontmatterSave"
      && message.frontmatterAction === "add"
      && typeof message.afterField === "string"
      && message.afterField.length >= 1
      && message.afterField.length <= 1024
      && !/[\r\n]/u.test(message.afterField));
  const validFrontmatterAction = message.frontmatterAction === undefined
    || (message.type === "previewFrontmatterSave"
      && (message.frontmatterAction === "add" || message.frontmatterAction === "remove"));
  return validType
    && typeof message.documentId === "string"
    && Number.isSafeInteger(message.documentVersion)
    && Number.isSafeInteger(message.requestId)
    && validLine
    && validEndLine
    && validSourceLine
    && validAnchorLine
    && validPin
    && validSelectionLine
    && validScrollTop
    && validThemeMode
    && validAnchorMode
    && validEditMode
    && validEditRequest
    && validInsertAfterLine
    && validBlockEditOpen
    && validEditPayload
    && validEditFinal
    && validFrontmatterPayload
    && validFrontmatterFormat
    && validFrontmatterKey
    && validFrontmatterStyle
    && validFrontmatterAction
    && validAfterField
    && validCheckbox
    && (message.type !== "previewThemeModeChanged" || themeModeChange)
    && (message.type !== "previewAnchorModeChanged" || typeof message.anchorToEditor === "boolean")
    && (message.type !== "previewLinkDiscover" || (Array.isArray(message.requests)
      && message.requests.length <= 64
      && message.requests.every((request) => typeof request === "string" && request.length <= 4096)))
    && (message.request === undefined || typeof message.request === "string");
}

function scrollContext(
  stage: RenderStage,
  state?: PreviewPanelState,
  configuration: PreviewConfiguration = DEFAULT_PREVIEW_CONFIGURATION,
  initialAnchor?: number,
  initialPin?: { line: number; viewportTop: number },
  toolbarState?: { pairedTextEditor: boolean; initialEditMode: boolean },
): PreviewRuntimeContext {
  return {
    documentId: stage.activeDocumentIdentity,
    documentVersion: stage.activeDocumentVersion,
    requestId: stage.requestId,
    activeSourceFile: stage.activeDocumentPath,
    ...(initialAnchor !== undefined ? { initialAnchor } : {}),
    ...(initialPin ? { initialPin } : {}),
    scrollPreviewWithEditor: configuration.scrollPreviewWithEditor,
    scrollEditorWithPreview: configuration.scrollEditorWithPreview,
    markEditorSelection: configuration.markEditorSelection,
    doubleClickToSwitchToEditor: configuration.doubleClickToSwitchToEditor,
    stickyHeadingDepth: configuration.stickyHeadingDepth,
    themeKind: vscode.window.activeColorTheme.kind,
    ...(toolbarState ?? {}),
    ...(sessionPreviewThemeMode ? { previewThemeMode: sessionPreviewThemeMode } : {}),
    ...(state && state.documentId === stage.activeDocumentIdentity
      ? {
        initialState: {
          sourceLine: state.sourceLine,
          scrollTop: state.scrollTop,
          focusedBlockId: state.focusedBlockId,
          selectedText: state.selectedText,
          openDisclosures: state.openDisclosures,
          descriptionsCollapsed: state.descriptionsCollapsed,
        },
      }
      : {}),
  };
}

function matchesCurrentPreview(
  preview: ActivePreview,
  message: {
    type: string;
    documentId: string;
    documentVersion: number;
    requestId: number;
    editId?: string;
  },
): boolean {
  const stage = preview.stage;
  const activeBlockEdit = preview.activeBlockEdit;
  const matchesActiveBlockEdit = activeBlockEdit !== undefined
    && (message.type === "previewEditSave" || message.type === "previewEditCancel")
    && message.editId === activeBlockEdit.editId
    && message.documentId === activeBlockEdit.documentId
    && message.documentVersion === activeBlockEdit.documentVersion
    && message.requestId === activeBlockEdit.requestId;
  return !preview.disposed
    && activePreviews.has(preview)
    && stage !== undefined
    && preview.documentUri === stage.activeDocumentIdentity
    && message.documentId === stage.activeDocumentIdentity
    && (message.documentVersion === stage.activeDocumentVersion || matchesActiveBlockEdit)
    && message.requestId === stage.requestId;
}

function diagnosticDetails(error: unknown): PreviewDiagnostic[] {
  return error instanceof RenderError ? error.diagnostics : [];
}

/** How long a render may stay pending over a rendered page before the overlay appears (D-22). */
const PENDING_OVERLAY_DELAY_MS = 1_500;

function clearPendingOverlay(preview: ActivePreview): void {
  if (preview.pendingOverlayTimer !== undefined) {
    clearTimeout(preview.pendingOverlayTimer);
    preview.pendingOverlayTimer = undefined;
  }
  preview.pendingOverlayDue = false;
  preview.pendingOverlayVisible = false;
}

/**
 * The only place that assigns a webview document; a new document must report ready again and the
 * overlay of the replaced document is gone with it.
 */
function assignWebviewHtml(target: ActivePreview | vscode.WebviewPanel, html: string): void {
  if (!("panel" in target)) {
    target.webview.html = html;
    return;
  }
  // VS Code ignores an assignment of the identical string, so no new document is loaded and no
  // new ready report will come; only a changed string replaces the document (and is counted).
  const changed = target.panel.webview.html !== html;
  // Work that waited for the edit runs once the page is assigned, so it sees the new document.
  let queuedAfterAssign: Array<() => void> | undefined;
  if (changed) {
    target.htmlAssignments += 1;
    target.readyRequestId = undefined;
    target.assignedRequestId = target.stage?.requestId;
    target.recordKeepsLoadedNonce = false;
    target.patchedRequestId = undefined;
    // A full page replacement always destroys the inline editor, whatever the stage.
    if (target.activeBlockEdit) {
      target.activeBlockEdit = undefined;
      queuedAfterAssign = target.editLock.release();
    }
    // A new document supersedes a patch that was waiting for its acknowledgement.
    clearContentPatchTimer(target);
    // The replaced document takes its overlay with it; the new one is not pending until told so.
    clearPendingOverlay(target);
  }
  target.panel.webview.html = html;
  if (queuedAfterAssign && !target.disposed) {
    queuedAfterAssign.forEach((work) => work());
  }
}

function postPendingOverlay(preview: ActivePreview, visible: boolean): void {
  const stage = preview.stage;
  if (!stage || preview.disposed) {
    return;
  }
  void preview.panel.webview.postMessage({
    type: "previewPendingOverlay",
    documentId: stage.activeDocumentIdentity,
    documentVersion: stage.activeDocumentVersion,
    requestId: stage.requestId,
    visible,
    label: PREVIEW_STATUS_LABELS.pending,
    message: preview.pendingOverlayMessage,
  });
}

/** A render finished or failed: stop the timer and hide an overlay that stays in the loaded page. */
function endPendingOverlay(preview: ActivePreview): void {
  const wasVisible = preview.pendingOverlayVisible;
  clearPendingOverlay(preview);
  if (wasVisible) {
    postPendingOverlay(preview, false);
  }
}

function setPanelHtml(
  preview: ActivePreview,
  html: string,
  diagnostics: PreviewWebviewResult["diagnostics"] = preview.webview.diagnostics,
): void {
  if (preview.disposed) {
    return;
  }
  // A document loaded from a record that went through a patch gets a nonce of its own.
  const previousNonce = preview.webview.nonce;
  const freshNonce = freshNonceRecord(preview);
  preview.webview = {
    ...preview.webview,
    html: freshNonce === undefined ? html : reuseNonce(html, previousNonce, freshNonce),
    diagnostics,
  };
  assignWebviewHtml(preview, preview.webview.html);
}

/**
 * A patch keeps the nonce of the loaded document, and the record of the page carries it. A new
 * document must not reuse a nonce that an earlier document already had: before the record is loaded
 * as a new document, its nonce is replaced by a fresh one (same generator as a render). Returns the
 * fresh nonce, or undefined when the record has its own nonce already.
 */
function freshNonceRecord(preview: ActivePreview): string | undefined {
  if (!preview.recordKeepsLoadedNonce || preview.webview.nonce === "") {
    return undefined;
  }
  const nonce = createNonce();
  preview.webview = {
    ...preview.webview,
    html: reuseNonce(preview.webview.html, preview.webview.nonce, nonce),
    nonce,
  };
  preview.recordKeepsLoadedNonce = false;
  return nonce;
}

/**
 * Applies a fresh frontmatter result to the properties section (T30). The host's record of the page
 * is always updated; a page that is ready for the current stage is patched in place with the same
 * markup, without reloading it. Nothing happens when the markup did not change. A page that is not
 * ready yet loads the new document instead.
 */
function patchPropertiesTable(
  preview: ActivePreview,
  result: FrontmatterResult,
  sourceMapping: SourceMappingOptions | undefined,
): void {
  if (preview.disposed) {
    return;
  }
  const markup = renderPropertiesTable(
    result,
    preview.frontmatterConfiguration.propertiesTable,
    sourceMapping,
    !preview.readOnly,
  );
  const html = replacePropertiesTableHtml(preview.webview.html, markup);
  if (html === preview.webview.html) {
    return;
  }
  const stage = preview.stage;
  if (stage && preview.readyRequestId === stage.requestId) {
    // preview.webview is the host's record of the page; the loaded document is patched by the
    // message, so panel.webview.html is deliberately not assigned (no reload).
    preview.webview = { ...preview.webview, html };
    void preview.panel.webview.postMessage({
      type: "previewPropertiesTable",
      documentId: stage.activeDocumentIdentity,
      documentVersion: stage.activeDocumentVersion,
      requestId: stage.requestId,
      markup,
    });
    return;
  }
  setPanelHtml(preview, html);
}

function setStatus(
  preview: ActivePreview,
  status: PreviewStatus,
  message?: string,
  diagnostics: Readonly<PreviewDiagnostic[]> = [],
): void {
  if (preview.disposed) {
    return;
  }
  preview.status = status;
  preview.shownStatus = undefined;
  const securityDiagnostics = preview.webview.diagnostics.filter(
    (diagnostic) => !("file" in diagnostic),
  );
  setPanelHtml(
    preview,
    setPreviewStatus(preview.webview.html, status, message, diagnostics),
    [...securityDiagnostics, ...diagnostics],
  );
}

function showPending(
  preview: ActivePreview,
  clearContent: boolean,
  message = "Rendering the active Markdown buffer.",
): void {
  if (clearContent) {
    preview.stage = undefined;
    preview.state = undefined;
    preview.webview = {
      html: buildStatusWebviewHtml("pending", preview.panel.webview.cspSource, message),
      diagnostics: [],
      nonce: "",
    };
    preview.panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [],
    };
    preview.shownStatus = undefined;
    assignWebviewHtml(preview, preview.webview.html);
    preview.status = "pending";
    return;
  }
  setStatus(preview, "pending", message);
}

/**
 * True when the loaded page shows `stage`, or will once it has handled the messages already sent
 * (a chain of content patches whose acknowledgements are still on their way).
 */
function pageHasStage(preview: ActivePreview, stage: RenderStage): boolean {
  return preview.readyRequestId === stage.requestId || preview.patchedRequestId === stage.requestId;
}

/** How long a patched page may take to report ready before the full document is loaded instead. */
const CONTENT_PATCH_ACK_TIMEOUT_MS = 2_000;

function clearContentPatchTimer(preview: ActivePreview): void {
  if (preview.contentPatchTimer !== undefined) {
    clearTimeout(preview.contentPatchTimer);
    preview.contentPatchTimer = undefined;
  }
}

function sameResourceRoots(previous: readonly vscode.Uri[], next: readonly vscode.Uri[]): boolean {
  return previous.length === next.length
    && previous.every((root, index) => root.fsPath === next[index]?.fsPath);
}

function runtimeContextSettings(context: PreviewRuntimeContext): RuntimeContextSettings {
  return {
    documentId: context.documentId,
    activeSourceFile: context.activeSourceFile,
    scrollPreviewWithEditor: context.scrollPreviewWithEditor,
    scrollEditorWithPreview: context.scrollEditorWithPreview,
    markEditorSelection: context.markEditorSelection,
    doubleClickToSwitchToEditor: context.doubleClickToSwitchToEditor,
    stickyHeadingDepth: context.stickyHeadingDepth,
  };
}

/**
 * Sends the new content of the page to the loaded webview (T34). The message is addressed to the
 * identifiers the page currently has; `next` carries the ones it moves to. The caller has already
 * checked that the page is ready and that its shell is unchanged, and has updated the record of the
 * page (`preview.webview`); the webview document itself is not assigned.
 */
function postContentPatch(
  preview: ActivePreview,
  previous: RenderStage,
  next: RenderStage,
  patch: {
    contentHtml: string;
    status: PreviewStatus;
    diagnostics: readonly { severity: string; text: string }[];
    initialAnchor?: number;
    initialPin?: { line: number; viewportTop: number };
  },
): void {
  preview.contentPatches += 1;
  preview.recordKeepsLoadedNonce = true;
  preview.patchedRequestId = next.requestId;
  void preview.panel.webview.postMessage({
    type: "previewContentPatch",
    // The runtime matches this against its own document identity; the page can only be patched
    // when the previous and the next stage show the same document, so previous is also the target.
    documentId: previous.activeDocumentIdentity,
    documentVersion: previous.activeDocumentVersion,
    requestId: previous.requestId,
    next: {
      documentVersion: next.activeDocumentVersion,
      requestId: next.requestId,
      ...(patch.initialAnchor !== undefined ? { initialAnchor: patch.initialAnchor } : {}),
      ...(patch.initialPin ? { initialPin: patch.initialPin } : {}),
    },
    contentHtml: patch.contentHtml,
    status: patch.status,
    label: PREVIEW_STATUS_LABELS[patch.status],
    diagnostics: patch.diagnostics,
  });
}

/** Loads the full document when a patched page does not report ready for its stage in time. */
function armContentPatchFallback(preview: ActivePreview, stage: RenderStage): void {
  clearContentPatchTimer(preview);
  preview.contentPatchTimer = setTimeout(() => {
    preview.contentPatchTimer = undefined;
    if (preview.disposed || preview.stage !== stage || preview.readyRequestId === stage.requestId) {
      return;
    }
    freshNonceRecord(preview);
    assignWebviewHtml(preview, preview.webview.html);
  }, CONTENT_PATCH_ACK_TIMEOUT_MS);
}

function updatePreview(preview: ActivePreview, result: RenderResult): void {
  // Deliberately renders results that the buffer has already moved past: a newer build is
  // queued behind it, and dropping them here would freeze the preview while the user types.
  if (
    preview.disposed
    || !activePreviews.has(preview)
    || preview.documentUri !== result.stage.activeDocumentIdentity
  ) {
    result.stage.dispose();
    return;
  }
  const previousStage = preview.stage;
  const previousHtml = preview.webview.html;
  const previousNonce = preview.webview.nonce;
  const previousRoots = preview.panel.webview.options.localResourceRoots ?? [];
  const context = scrollContext(
    result.stage,
    preview.state,
    preview.configuration,
    result.stage.activeDocumentIdentity === preview.documentUri ? initialAnchorLine(preview) : undefined,
    takePendingPin(preview, result.stage.activeDocumentIdentity, result.stage.activeDocumentVersion),
    {
      pairedTextEditor: visibleEditorFor(preview) !== undefined,
      initialEditMode: !preview.readOnly && editModeStorage?.get(EDIT_MODE_STORAGE_KEY) === true,
    },
  );
  const localResourceRoots = [vscode.Uri.file(preview.workspaceRoot)];
  const hasMermaidDiagram = result.html.includes('class="myst-mermaid-figure"');
  if (hasMermaidDiagram && extensionRootUri) {
    localResourceRoots.push(vscode.Uri.joinPath(extensionRootUri, "out", "bundle"));
  }
  const frontmatter = analyzeFrontmatter({
    filePath: result.stage.activeDocumentPath,
    sourceText: result.stage.sourceText,
    stopDir: preview.workspaceRoot,
    allowSchemaResolution: !preview.readOnly,
    inspectLinks: false,
    strictAdditionalProperties: preview.frontmatterConfiguration.strictAdditionalProperties,
    bundleRoot: preview.frontmatterConfiguration.bundleRoot,
    projectRoot: preview.frontmatterConfiguration.projectRoot,
    allowOutsideWorkspaceLinks: preview.frontmatterConfiguration.allowOutsideWorkspaceLinks,
    workspaceRoots: preview.sessionRoots,
  });
  setFrontmatterState(
    preview,
    frontmatter,
    result.stage.activeDocumentIdentity,
    result.stage.activeDocumentVersion,
    false,
  );
  preview.panel.webview.options = {
    enableScripts: true,
    // The live preview renders in-process and only references workspace files
    // (the document itself and assets like figures), so the workspace folder
    // is the single localResourceRoot.
    localResourceRoots,
  };
  const webview = buildPreviewWebviewHtml(
    result.html,
    result.stage.outputDirectory,
    preview.panel.webview,
    context,
    preview.workspaceRoot,
    preview.frontmatter
      ? {
        result: preview.frontmatter,
        tableEnabled: preview.frontmatterConfiguration.propertiesTable,
      }
      : undefined,
    preview.configuration.maxContentWidth,
    extensionRootUri,
    !preview.readOnly,
    !preview.readOnly,
    [],
  );
  const status: PreviewStatus = preview.hadFailure ? "recovery" : "success";
  const html = setPreviewStatus(webview.html, status, undefined, result.diagnostics);
  // A page that is ready for the previous stage gets the new content in place when everything
  // else about it is unchanged; any other case loads the full document (T34).
  const nextContext = runtimeContextSettings(context);
  const statusLines = result.diagnostics.map(formatStatusDiagnostic);
  const contentPatch = preview.configuration.incrementalUpdates
    && previousStage !== undefined
    && pageHasStage(preview, previousStage)
    && previousStage.activeDocumentIdentity === result.stage.activeDocumentIdentity
    && previousStage.activeDocumentPath === result.stage.activeDocumentPath
    && previousNonce !== ""
    && preview.loadedContext !== undefined
    && runtimeContextKey(preview.loadedContext) === runtimeContextKey(nextContext)
    && sameResourceRoots(previousRoots, localResourceRoots)
    && diagnosticsFitPatch(statusLines)
    ? planContentPatch(previousHtml, html)
    : undefined;
  preview.stage = result.stage;
  preview.renderedStages += 1;
  preview.webview = {
    ...webview,
    // The record describes the page the webview shows. A patched page keeps the nonce it was
    // loaded with, so the record carries that nonce instead of the one of this render.
    ...(contentPatch
      ? { html: reuseNonce(html, webview.nonce, previousNonce), nonce: previousNonce }
      : { html }),
    diagnostics: [...webview.diagnostics, ...result.diagnostics],
  };
  preview.status = status;
  preview.shownStatus = undefined;
  preview.hadFailure = false;
  preview.panel.title = previewTitle(preview, result.stage.activeDocumentPath);
  if (contentPatch && previousStage) {
    // The page removes its pending overlay itself when it applies the patch.
    clearPendingOverlay(preview);
    postContentPatch(preview, previousStage, result.stage, {
      contentHtml: contentPatch.contentHtml,
      status,
      diagnostics: statusLines,
      ...(context.initialAnchor !== undefined ? { initialAnchor: context.initialAnchor } : {}),
      ...(context.initialPin ? { initialPin: context.initialPin } : {}),
    });
    armContentPatchFallback(preview, result.stage);
  } else {
    assignWebviewHtml(preview, html);
    preview.loadedContext = nextContext;
  }
  scheduleDeferredPreviewWork(preview, result);
}

function isCurrentRender(
  preview: ActivePreview,
  result: RenderResult,
  generation?: number,
): boolean {
  return !preview.disposed
    && activePreviews.has(preview)
    && preview.documentUri === result.stage.activeDocumentIdentity
    && preview.stage === result.stage
    && (generation === undefined || preview.enrichmentGeneration === generation);
}

function setFrontmatterState(
  preview: ActivePreview,
  frontmatter: FrontmatterResult,
  documentUri: string,
  documentVersion: number,
  linksResolved: boolean,
): void {
  preview.frontmatter = frontmatter.present ? frontmatter : undefined;
  preview.frontmatterDocumentUri = documentUri;
  preview.frontmatterDocumentVersion = documentVersion;
  preview.frontmatterLinkResultsVersion = linksResolved ? documentVersion : undefined;
  if (linksResolved) {
    const targets = new Set(frontmatter.linkResults?.filter((link) =>
      link.resolvedPath && (link.tooltipFields !== undefined || link.previewFields !== undefined),
    ).map((link) => link.resolvedPath as string));
    preview.linkedTargetWatchers ??= new Map();
    for (const [target, watcher] of preview.linkedTargetWatchers) {
      if (!targets.has(target)) {
        watcher.dispose();
        preview.linkedTargetWatchers.delete(target);
      }
    }
    for (const target of targets) {
      if (preview.linkedTargetWatchers.has(target)) continue;
      const filename = path.basename(target).replace(/[\[\]{}*?]/gu, (character) => `[${character}]`);
      const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(vscode.Uri.file(path.dirname(target)), filename),
      );
      const refresh = (): void => {
        const document = preview.document;
        if (document && !preview.disposed) {
          scheduleLinkEnrichment(preview, preview.documentUri, document.version);
        }
      };
      preview.linkedTargetWatchers.set(target, vscode.Disposable.from(
        watcher, watcher.onDidChange(refresh), watcher.onDidCreate(refresh), watcher.onDidDelete(refresh),
      ));
    }
  }
}

function scheduleDeferredPreviewWork(preview: ActivePreview, result: RenderResult): void {
  const generation = ++preview.enrichmentGeneration;
  scheduleDeferredFrontmatterLinks(preview, result, generation);
  setTimeout(() => {
    if (!isCurrentRender(preview, result, generation)) {
      return;
    }
    void result.resolvePlantUml().then((plantUml) => {
      deferWhileEditing(preview, "plantuml", () => applyPlantUml(preview, result, generation, plantUml));
    });
  }, 0);
}

function applyPlantUml(
  preview: ActivePreview,
  result: RenderResult,
  generation: number,
  plantUml: Awaited<ReturnType<RenderResult["resolvePlantUml"]>>,
): void {
  if (!isCurrentRender(preview, result, generation)) {
    return;
  }
  const diagnostics = plantUml.diagnostics.map((diagnostic) => ({
    ...diagnostic,
    code: "plantuml-render",
    file: result.stage.activeDocumentPath,
  }));
  const injected = injectPlantUmlDiagrams(preview.webview.html, plantUml.diagrams);
  if (injected === preview.webview.html && diagnostics.length === 0) {
    return;
  }
  // While a render is pending over this page, the page still shows the status it had.
  const shownStatus = preview.shownStatus ?? preview.status;
  const statusDiagnostics = [...result.diagnostics, ...diagnostics];
  const html = setPreviewStatus(injected, shownStatus, undefined, statusDiagnostics);
  const nextDiagnostics = [...preview.webview.diagnostics, ...diagnostics];
  // A page that is ready for this stage takes the diagrams in place; the stage does not change.
  const statusLines = statusDiagnostics.map(formatStatusDiagnostic);
  const contentPatch = preview.configuration.incrementalUpdates
    && preview.readyRequestId === result.stage.requestId
    && diagnosticsFitPatch(statusLines)
    ? planContentPatch(preview.webview.html, html)
    : undefined;
  if (contentPatch) {
    preview.webview = { ...preview.webview, html, diagnostics: nextDiagnostics };
    // The page removes its pending overlay when it applies a patch, as a reload would; the next
    // ready report shows it again while a render is still pending.
    clearPendingOverlay(preview);
    postContentPatch(preview, result.stage, result.stage, {
      contentHtml: contentPatch.contentHtml,
      status: shownStatus,
      diagnostics: statusLines,
    });
    return;
  }
  setPanelHtml(preview, html, nextDiagnostics);
}

function scheduleDeferredFrontmatterLinks(
  preview: ActivePreview,
  result: RenderResult,
  generation: number,
): void {
  scheduleLinkEnrichment(
    preview,
    result.stage.activeDocumentIdentity,
    result.stage.activeDocumentVersion,
    result,
    generation,
  );
}

function scheduleLinkEnrichment(
  preview: ActivePreview,
  documentUri: string,
  documentVersion: number,
  result?: RenderResult,
  generation?: number,
): void {
  if (preview.linkEnrichmentTimer) {
    clearTimeout(preview.linkEnrichmentTimer);
  }
  preview.linkEnrichmentTimer = setTimeout(() => {
    preview.linkEnrichmentTimer = undefined;
    const current = preview.document;
    if (preview.disposed
      || !activePreviews.has(preview)
      || preview.documentUri !== documentUri
      || !current
      || documentKey(current) !== documentUri
      || current.version !== documentVersion
      || (result !== undefined && !isCurrentRender(preview, result, generation))) {
      return;
    }
    const frontmatter = analyzeFrontmatter({
      filePath: current.uri.fsPath,
      sourceText: current.getText(),
      stopDir: preview.workspaceRoot,
      allowSchemaResolution: !preview.readOnly,
      inspectLinks: true,
      strictAdditionalProperties: preview.frontmatterConfiguration.strictAdditionalProperties,
      bundleRoot: preview.frontmatterConfiguration.bundleRoot,
      projectRoot: preview.frontmatterConfiguration.projectRoot,
      allowOutsideWorkspaceLinks: preview.frontmatterConfiguration.allowOutsideWorkspaceLinks,
      workspaceRoots: preview.sessionRoots,
    });
    if (preview.disposed
      || !activePreviews.has(preview)
      || preview.documentUri !== documentUri
      || preview.document !== current
      || current.version !== documentVersion
      || (result !== undefined && !isCurrentRender(preview, result, generation))) {
      return;
    }
    setFrontmatterState(preview, frontmatter, documentUri, documentVersion, true);
    const stage = preview.stage;
    const sourceMapping = stage && stage.activeDocumentIdentity === documentUri ? {
      documentId: stage.activeDocumentIdentity,
      activeSourceFile: stage.activeDocumentPath,
    } : undefined;
    deferWhileEditing(preview, "links", () => {
      if (!preview.disposed
        && preview.document === current
        && current.version === documentVersion
        && preview.stage === stage) {
        patchPropertiesTable(preview, frontmatter, sourceMapping);
      }
    });
  }, LINK_ENRICHMENT_DEBOUNCE_MS);
}

function armPendingOverlay(preview: ActivePreview): void {
  if (preview.pendingOverlayTimer !== undefined || preview.pendingOverlayVisible) {
    return;
  }
  const stage = preview.stage;
  preview.pendingOverlayTimer = setTimeout(() => {
    preview.pendingOverlayTimer = undefined;
    const phase = preview.queue.getState().phase;
    if (
      preview.disposed
      || preview.status !== "pending"
      || preview.stage !== stage
      || (phase !== "debouncing" && phase !== "building")
    ) {
      return;
    }
    if (!stage || !pageHasStage(preview, stage)) {
      // The page is still loading and cannot show it; post it with the next ready report.
      preview.pendingOverlayDue = true;
      return;
    }
    showPendingOverlay(preview);
  }, PENDING_OVERLAY_DELAY_MS);
}

function showPendingOverlay(preview: ActivePreview): void {
  preview.pendingOverlayDue = false;
  preview.pendingOverlayVisible = true;
  preview.pendingOverlayShown += 1;
  postPendingOverlay(preview, true);
}

function handleQueueState(
  preview: ActivePreview,
  state: BuildQueueState<RenderResult, vscode.TextDocument>,
): void {
  if (preview.disposed || !activePreviews.has(preview) || !state.request) {
    return;
  }
  if (documentKey(state.request.document) !== preview.documentUri) {
    return;
  }
  if (state.phase === "debouncing" || state.phase === "building") {
    const pendingMessage = state.phase === "building"
      ? "Rendering the active buffer."
      : "Waiting for the latest edit.";
    if (preview.stage) {
      // A rendered page exists: leave it untouched (no reload, nothing moves). A floating overlay
      // appears only when the render stays pending (D-22).
      if (preview.status !== "pending") {
        preview.shownStatus = preview.status;
      }
      preview.status = "pending";
      preview.pendingOverlayMessage = pendingMessage;
      armPendingOverlay(preview);
      return;
    }
    setStatus(preview, "pending", pendingMessage);
    return;
  }
  if (state.phase === "ready" && state.result) {
    endPendingOverlay(preview);
    updatePreview(preview, state.result);
    return;
  }
  if (state.phase !== "failed") {
    return;
  }
  endPendingOverlay(preview);

  const diagnostics = diagnosticDetails(state.error);
  preview.hadFailure = true;
  if (preview.stage?.activeDocumentIdentity === preview.documentUri) {
    setStatus(
    preview,
    "stale",
    state.error instanceof Error ? state.error.message : "The latest render failed.",
    diagnostics,
  );
    return;
  }
  setStatus(
    preview,
    "error",
    state.error instanceof Error ? state.error.message : "The render failed.",
    diagnostics,
  );
}

function recordPreviewState(preview: ActivePreview, message: PreviewSyncMessage): void {
  const stage = preview.stage;
  if (!stage) {
    return;
  }
  const state = parsePreviewPanelState({
    documentId: message.documentId,
    sourceFile: stage.activeDocumentPath,
    sourceLine: message.sourceLine ?? message.line,
    scrollTop: message.scrollTop,
    focusedBlockId: message.focusedBlockId,
    selectedText: message.selectedText,
    openDisclosures: message.openDisclosures,
    descriptionsCollapsed: message.descriptionsCollapsed ?? preview.state?.descriptionsCollapsed,
  });
  if (!state || state.documentId !== preview.documentUri) {
    return;
  }
  preview.state = state;
  preview.states.set(preview.documentUri, state);
  if (typeof state.descriptionsCollapsed === "boolean" && previewDescriptionStorage) {
    if (collapsedDescriptions.peek(preview.documentUri) !== state.descriptionsCollapsed) {
      collapsedDescriptions.set(preview.documentUri, state.descriptionsCollapsed);
      void saveCollapsedMap(previewDescriptionStorage, collapsedDescriptions);
    }
  }
}

function currentPreviewDocument(
  preview: ActivePreview,
  message: PreviewSyncMessage,
): vscode.TextDocument | undefined {
  const document = preview.document;
  const stage = preview.stage;
  if (
    !document
    || !stage
    || documentKey(document) !== preview.documentUri
    || document.version !== message.documentVersion
    || stage.activeDocumentVersion !== document.version
    || !isDocumentEligible(document)
  ) {
    return undefined;
  }
  return document;
}

function currentSourceEdit(
  preview: ActivePreview,
  message: PreviewSyncMessage,
): { document: vscode.TextDocument; range: vscode.Range } | undefined {
  const document = currentPreviewDocument(preview, message);
  if (!document || message.line === undefined || message.endLine === undefined) {
    return undefined;
  }
  const offsets = sourceRangeForLines(document.getText(), message.line, message.endLine);
  return offsets
    ? {
      document,
      range: new vscode.Range(document.positionAt(offsets.start), document.positionAt(offsets.end)),
    }
    : undefined;
}

function postFrontmatterEditError(
  preview: ActivePreview,
  message: PreviewSyncMessage,
  error: string,
): void {
  void preview.panel.webview.postMessage({
    type: "previewFrontmatterResult",
    documentId: message.documentId,
    documentVersion: message.documentVersion,
    requestId: message.requestId,
    editId: message.editId,
    error,
  });
}

function postFrontmatterEditSaved(
  preview: ActivePreview,
  message: PreviewSyncMessage,
): void {
  void preview.panel.webview.postMessage({
    type: "previewFrontmatterResult",
    documentId: message.documentId,
    documentVersion: message.documentVersion,
    requestId: message.requestId,
    editId: message.editId,
    saved: true,
  });
}

function frontmatterValueMatchesField(
  field: FrontmatterResult["fields"][number],
  value: unknown,
  schemaFound: boolean,
): boolean {
  if (!schemaFound || field.fieldType === "unknown") return true;
  if (value === null) return field.nullable;
  switch (field.fieldType) {
    case "text":
    case "date":
    case "time":
    case "datetime":
      return typeof value === "string";
    case "checkbox":
      return typeof value === "boolean";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "list":
      return Array.isArray(value);
    case "enum":
      return typeof value === "string" && Boolean(field.enums?.includes(value));
    default:
      return false;
  }
}

function handleFrontmatterSave(preview: ActivePreview, message: PreviewSyncMessage): Thenable<void> | undefined {
  const document = currentPreviewDocument(preview, message);
  const fieldName = message.fieldName ?? "";
  const action = message.frontmatterAction;
  const isAdd = action === "add";
  const isRemove = action === "remove";
  const field = preview.frontmatter?.fields.find((candidate) => candidate.name === fieldName);
  if (!document || (isAdd ? field !== undefined : !field)) {
    postFrontmatterEditError(preview, message, "The frontmatter field is stale or its value does not match the schema.");
    return;
  }
  const currentField = field as FrontmatterResult["fields"][number];
  const newFieldName = !isAdd && !isRemove ? message.newFieldName : undefined;
  if ((isAdd && (!fieldName.trim() || fieldName !== fieldName.trim() || /[\r\n]/u.test(fieldName)))
    || (newFieldName !== undefined && (!newFieldName.trim() || newFieldName !== newFieldName.trim()))) {
    postFrontmatterEditError(preview, message, "Enter a non-empty frontmatter key without leading or trailing spaces.");
    return;
  }
  let fieldValue = message.fieldValue;
  if (!isRemove && message.fieldValueFormat === "yaml") {
    if (typeof fieldValue !== "string") {
      postFrontmatterEditError(preview, message, "The YAML field value must be text.");
      return;
    }
    const parsed = parseYamlValue(fieldValue);
    if (!parsed.valid) {
      postFrontmatterEditError(preview, message, `Invalid YAML value: ${parsed.error}`);
      return;
    }
    fieldValue = parsed.value;
  }
  const schemaFound = preview.frontmatter?.schemaFound === true;
  if (!isAdd && !isRemove && newFieldName === undefined
    && !frontmatterValueMatchesField(currentField, fieldValue, schemaFound)) {
    postFrontmatterEditError(preview, message, "The frontmatter field is stale or its value does not match the schema.");
    return;
  }
  const sourceText = document.getText();
  // With a schema the table lists the fields in schema order, so the new key goes where its row
  // will be shown. Without one, the table follows the source and the clicked row decides.
  const clickedAfterField = message.afterField !== undefined
    && preview.frontmatter?.fields.some((candidate) => candidate.name === message.afterField)
    ? { afterField: message.afterField }
    : undefined;
  const addPlacement = isAdd
    ? schemaFound && preview.frontmatter?.availableKeys
      ? frontmatterAddPlacement(
        Object.keys(extractFrontmatter(sourceText).frontmatter ?? {}),
        preview.frontmatter.availableKeys,
        fieldName,
      )
      : clickedAfterField
    : undefined;
  // Only the empty string a just-added custom key holds may be rewritten as a plain scalar.
  const plainScalar = !isAdd && !isRemove && newFieldName === undefined
    && message.fieldValueStyle === "plain"
    && currentField.value === ""
    && typeof fieldValue === "string";
  const patch = isRemove
    ? createFrontmatterFieldRemovePatch(sourceText, fieldName)
    : isAdd
      ? createFrontmatterFieldPatch(sourceText, fieldName, fieldValue, addPlacement)
      : newFieldName === undefined
        ? createFrontmatterFieldPatch(
          sourceText,
          currentField.name,
          fieldValue,
          plainScalar ? { plainScalar: true } : undefined,
        )
        : createFrontmatterFieldRenamePatch(sourceText, currentField.name, newFieldName);
  if (!patch) {
    const duplicateName = isAdd ? fieldName : newFieldName;
    const duplicate = duplicateName !== undefined
      && preview.frontmatter?.fields.some((candidate) => candidate.name === duplicateName);
    postFrontmatterEditError(
      preview,
      message,
      duplicate
        ? `A frontmatter field named "${duplicateName}" already exists.`
        : "The frontmatter YAML could not be updated.",
    );
    return;
  }
  const targetFieldName = isAdd ? fieldName : newFieldName ?? currentField.name;
  if (schemaFound) {
    const candidateSource = sourceText.slice(0, patch.start)
      + patch.text
      + sourceText.slice(patch.end);
    const candidate = analyzeFrontmatter({
      filePath: document.uri.fsPath,
      sourceText: candidateSource,
      stopDir: preview.workspaceRoot,
      allowSchemaResolution: !preview.readOnly,
      inspectLinks: false,
      strictAdditionalProperties: preview.frontmatterConfiguration.strictAdditionalProperties,
      bundleRoot: preview.frontmatterConfiguration.bundleRoot,
      projectRoot: preview.frontmatterConfiguration.projectRoot,
      allowOutsideWorkspaceLinks: preview.frontmatterConfiguration.allowOutsideWorkspaceLinks,
      workspaceRoots: preview.sessionRoots,
    });
    if (isRemove) {
      const existingMissing = new Set(preview.frontmatter?.missingRequiredFields ?? []);
      const newlyMissing = candidate.missingRequiredFields.find((name) => !existingMissing.has(name));
      if (newlyMissing) {
        postFrontmatterEditError(
          preview,
          message,
          `Cannot remove required frontmatter field "${newlyMissing}".`,
        );
        return;
      }
    }
    if (!isRemove) {
      const candidateField = candidate.fields.find((entry) => entry.name === targetFieldName);
      if (!candidateField) {
        postFrontmatterEditError(preview, message, "The renamed frontmatter field could not be validated.");
        return;
      }
      const validationError = candidateField.issues.find((issue) =>
        issue.severity === "error" && issue.origin !== "link");
      if (validationError) {
        postFrontmatterEditError(
          preview,
          message,
          `Schema validation failed: ${validationError.message}`,
        );
        return;
      }
      if (!frontmatterValueMatchesField(candidateField, fieldValue, candidate.schemaFound)) {
        postFrontmatterEditError(preview, message, "The frontmatter field is stale or its value does not match the schema.");
        return;
      }
    }
  }
  const range = new vscode.Range(document.positionAt(patch.start), document.positionAt(patch.end));
  const edit = new vscode.WorkspaceEdit();
  edit.replace(document.uri, range, patch.text);
  return vscode.workspace.applyEdit(edit).then((applied) => {
    if (applied) {
      storePendingPin(preview, message, document.version);
      postFrontmatterEditSaved(preview, message);
    } else {
      postFrontmatterEditError(preview, message, "VS Code could not apply the frontmatter edit.");
    }
  }, (error: unknown) => {
    postFrontmatterEditError(
      preview,
      message,
      error instanceof Error ? error.message : String(error),
    );
  });
}

function postEditSourceError(
  preview: ActivePreview,
  message: PreviewSyncMessage,
  error: string,
): void {
  void preview.panel.webview.postMessage({
    type: "previewEditSource",
    documentId: message.documentId,
    documentVersion: message.documentVersion,
    requestId: message.requestId,
    editId: message.editId,
    error,
  });
}

function postCheckboxResult(
  preview: ActivePreview,
  message: PreviewSyncMessage,
  result: { saved: true } | { error: string },
): void {
  void preview.panel.webview.postMessage({
    type: "previewCheckboxResult",
    documentId: message.documentId,
    documentVersion: message.documentVersion,
    requestId: message.requestId,
    editId: message.editId,
    ...result,
  });
}

/** Toggles one `[ ]`/`[x]` marker with a single-character edit (one undo step). */
function handleCheckboxToggle(preview: ActivePreview, message: PreviewSyncMessage): Thenable<void> | undefined {
  const document = currentPreviewDocument(preview, message);
  if (!document || message.line === undefined || message.column === undefined || message.checked === undefined) {
    postCheckboxResult(preview, message, { error: "The preview is out of date. Try again once it has refreshed." });
    return undefined;
  }
  if (preview.activeBlockEdit) {
    postCheckboxResult(preview, message, { error: "Save or cancel the open Markdown edit before toggling a checkbox." });
    return undefined;
  }
  const toggle = message.line <= document.lineCount
    ? checkboxToggleEdit(document.lineAt(message.line - 1).text, message.column, message.checked)
    : undefined;
  if (!toggle) {
    postCheckboxResult(preview, message, { error: "The checkbox is no longer in the source. Refresh the preview." });
    return undefined;
  }
  if (!toggle.changed) {
    postCheckboxResult(preview, message, { saved: true });
    return undefined;
  }
  const start = new vscode.Position(message.line - 1, toggle.column);
  const range = new vscode.Range(start, start.translate(0, 1));
  const sourceEditor = vscode.window.visibleTextEditors.find((candidate) =>
    documentKey(candidate.document) === documentKey(document));
  const applyEdit = sourceEditor
    ? sourceEditor.edit((builder) => builder.replace(range, toggle.replacement), {
      undoStopBefore: true,
      undoStopAfter: true,
    })
    : (() => {
      const edit = new vscode.WorkspaceEdit();
      edit.replace(document.uri, range, toggle.replacement);
      return vscode.workspace.applyEdit(edit);
    })();
  return applyEdit.then((applied) => {
    postCheckboxResult(preview, message, applied
      ? { saved: true }
      : { error: "VS Code could not apply the checkbox edit." });
  }, (error: unknown) => {
    postCheckboxResult(preview, message, { error: error instanceof Error ? error.message : String(error) });
  });
}

function handlePreviewEditOpen(preview: ActivePreview, message: PreviewSyncMessage): void {
  if (preview.activeBlockEdit) {
    postEditSourceError(preview, message, "Another Markdown block is already being edited.");
    return;
  }
  if (message.insertAfterLine !== undefined) {
    const document = currentPreviewDocument(preview, message);
    if (!document
      || message.line === undefined
      || message.endLine === undefined
      || !planInsertion(document.getText(), message.insertAfterLine)) {
      postEditSourceError(preview, message, "The preview is stale. Refresh it before editing this block.");
      return;
    }
    void preview.panel.webview.postMessage({
      type: "previewEditSource",
      documentId: message.documentId,
      documentVersion: message.documentVersion,
      requestId: message.requestId,
      editId: message.editId,
      line: message.line,
      endLine: message.endLine,
      originalText: "",
      insertAfterLine: message.insertAfterLine,
    });
    return;
  }
  const source = currentSourceEdit(preview, message);
  if (!source || message.line === undefined || message.endLine === undefined) {
    postEditSourceError(preview, message, "The preview is stale. Refresh it before editing this block.");
    return;
  }
  const originalText = source.document.getText(source.range);
  void preview.panel.webview.postMessage({
    type: "previewEditSource",
    documentId: message.documentId,
    documentVersion: message.documentVersion,
    requestId: message.requestId,
    editId: message.editId,
    line: message.line,
    endLine: message.endLine,
    originalText,
  });
}

function activeBlockEditSource(
  preview: ActivePreview,
  edit: ActiveBlockEdit,
): { document: vscode.TextDocument; range: vscode.Range } | undefined {
  const document = preview.document;
  const endOffset = edit.sourceStartOffset + edit.lastSavedText.length;
  if (!document
    || documentKey(document) !== preview.documentUri
    || endOffset > document.getText().length
    || !isDocumentEligible(document)) {
    return undefined;
  }
  return {
    document,
    range: new vscode.Range(
      document.positionAt(edit.sourceStartOffset),
      document.positionAt(endOffset),
    ),
  };
}

function beginActiveBlockEdit(preview: ActivePreview, edit: ActiveBlockEdit): void {
  preview.activeBlockEdit = edit;
  preview.editLock.acquire(edit.requestId);
}

/**
 * Ends the lock and runs the PlantUML, link-enrichment and render work that waited for it.
 * `renderFollows`: the caller refreshes the document itself, so a queued render is dropped.
 */
function releaseActiveBlockEdit(
  preview: ActivePreview,
  renderFollows = false,
  alreadyReleased?: Array<() => void>,
): void {
  preview.activeBlockEdit = undefined;
  if (renderFollows) {
    preview.editLock.drop("render");
  }
  const queued = alreadyReleased ?? preview.editLock.release();
  if (!preview.disposed) {
    queued.forEach((work) => work());
  }
}

function completeActiveBlockEdit(preview: ActivePreview, edit: ActiveBlockEdit): void {
  if (preview.activeBlockEdit !== edit) {
    return;
  }
  const refreshes = edit.hasAppliedEdit
    && preview.document !== undefined
    && sourceAvailable(preview)
    && preview.document.version !== preview.stage?.activeDocumentVersion;
  if (preview.pendingPin && preview.document) {
    // Every apply of this edit has resolved: only a render of this version or later shows it.
    preview.pendingPin.minVersion = Math.max(preview.pendingPin.minVersion, preview.document.version);
  }
  releaseActiveBlockEdit(preview, refreshes);
  if (refreshes && preview.document) {
    void refreshPreviewDocument(preview, preview.document);
  }
}

function drainActiveBlockEdit(preview: ActivePreview, edit: ActiveBlockEdit): void {
  if (preview.activeBlockEdit !== edit || edit.applying) {
    return;
  }
  const editedText = edit.pendingText;
  if (editedText === undefined || editedText === edit.lastSavedText) {
    edit.pendingText = undefined;
    if (edit.finalRequested) {
      completeActiveBlockEdit(preview, edit);
    }
    return;
  }
  edit.pendingText = undefined;
  const source = activeBlockEditSource(preview, edit);
  if (!source || source.document.getText(source.range) !== edit.lastSavedText) {
    postEditSourceError(preview, edit.lastMessage, "The source block changed while it was being edited.");
    releaseActiveBlockEdit(preview);
    return;
  }
  const replacement = minimalReplacement(edit.lastSavedText, editedText);
  if (replacement.start === replacement.end && replacement.text === "") {
    drainActiveBlockEdit(preview, edit);
    return;
  }
  const workspaceEdit = new vscode.WorkspaceEdit();
  workspaceEdit.replace(
    source.document.uri,
    new vscode.Range(
      source.document.positionAt(edit.sourceStartOffset + replacement.start),
      source.document.positionAt(edit.sourceStartOffset + replacement.end),
    ),
    replacement.text,
  );
  edit.applying = true;
  void vscode.workspace.applyEdit(workspaceEdit).then((applied) => {
    if (preview.activeBlockEdit !== edit) {
      return;
    }
    edit.applying = false;
    if (!applied) {
      postEditSourceError(preview, edit.lastMessage, "VS Code could not apply the Markdown edit.");
      edit.finalRequested = false;
      return;
    }
    edit.lastSavedText = editedText;
    edit.hasAppliedEdit = true;
    drainActiveBlockEdit(preview, edit);
  }, (error: unknown) => {
    if (preview.activeBlockEdit !== edit) {
      return;
    }
    edit.applying = false;
    edit.finalRequested = false;
    postEditSourceError(
      preview,
      edit.lastMessage,
      error instanceof Error ? error.message : String(error),
    );
  });
}

function handlePreviewEditSave(preview: ActivePreview, message: PreviewSyncMessage): void {
  let edit = preview.activeBlockEdit;
  if (!edit && message.insertAfterLine !== undefined) {
    const document = currentPreviewDocument(preview, message);
    const plan = document ? planInsertion(document.getText(), message.insertAfterLine) : undefined;
    if (!document || !plan || message.originalText === undefined || message.editedText === undefined) {
      postEditSourceError(preview, message, "The preview is stale. Reopen the block before saving.");
      return;
    }
    if (message.originalText !== "") {
      postEditSourceError(preview, message, "The source block changed while it was being edited.");
      return;
    }
    edit = {
      editId: message.editId as string,
      documentId: message.documentId,
      documentVersion: message.documentVersion,
      requestId: message.requestId,
      line: message.line as number,
      endLine: message.endLine as number,
      sourceStartOffset: plan.offset,
      originalText: "",
      lastSavedText: "",
      insertion: plan,
      insertAfterLine: message.insertAfterLine,
      finalRequested: false,
      cancelRequested: false,
      applying: false,
      hasAppliedEdit: false,
      lastMessage: message,
    };
    beginActiveBlockEdit(preview, edit);
  } else if (!edit) {
    const source = currentSourceEdit(preview, message);
    if (!source || message.originalText === undefined || message.editedText === undefined) {
      postEditSourceError(preview, message, "The preview is stale. Reopen the block before saving.");
      return;
    }
    const originalText = source.document.getText(source.range);
    if (originalText !== message.originalText) {
      postEditSourceError(preview, message, "The source block changed while it was being edited.");
      return;
    }
    edit = {
      editId: message.editId as string,
      documentId: message.documentId,
      documentVersion: message.documentVersion,
      requestId: message.requestId,
      line: message.line as number,
      endLine: message.endLine as number,
      sourceStartOffset: source.document.offsetAt(source.range.start),
      originalText,
      lastSavedText: originalText,
      finalRequested: false,
      cancelRequested: false,
      applying: false,
      hasAppliedEdit: false,
      lastMessage: message,
    };
    beginActiveBlockEdit(preview, edit);
  }
  if (edit.cancelRequested
    || message.editId !== edit.editId
    || message.documentId !== edit.documentId
    || message.documentVersion !== edit.documentVersion
    || message.requestId !== edit.requestId
    || message.line !== edit.line
    || message.endLine !== edit.endLine
    || message.originalText !== edit.originalText
    || message.insertAfterLine !== edit.insertAfterLine
    || message.editedText === undefined) {
    postEditSourceError(preview, message, "The preview block edit is stale. Reopen the block before saving.");
    return;
  }
  edit.lastMessage = message;
  edit.pendingText = edit.insertion
    ? insertionText(edit.insertion, message.editedText)
    : message.editedText;
  edit.finalRequested = message.final !== false;
  if (message.final === true) {
    storePendingPin(preview, message, preview.document?.version ?? 0);
  }
  drainActiveBlockEdit(preview, edit);
}

function handlePreviewEditCancel(preview: ActivePreview, message: PreviewSyncMessage): void {
  const edit = preview.activeBlockEdit;
  if (!edit
    || message.editId !== edit.editId
    || message.documentId !== edit.documentId
    || message.documentVersion !== edit.documentVersion
    || message.requestId !== edit.requestId
    || message.line !== edit.line
    || message.endLine !== edit.endLine) {
    postEditSourceError(preview, message, "The preview block edit is stale. Reopen the block before cancelling.");
    return;
  }
  edit.lastMessage = message;
  edit.cancelRequested = true;
  edit.finalRequested = true;
  edit.pendingText = edit.originalText;
  drainActiveBlockEdit(preview, edit);
}

function revealEditorLine(
  preview: ActivePreview,
  line: number,
  revealType: vscode.TextEditorRevealType,
): void {
  if (!preview.configuration.scrollEditorWithPreview) {
    return;
  }
  const stage = preview.stage;
  if (!stage) {
    return;
  }
  const documentPath = path.resolve(stage.activeDocumentPath);
  const editor = vscode.window.visibleTextEditors.find(
    (candidate) => path.resolve(candidate.document.uri.fsPath) === documentPath,
  );
  if (!editor) {
    return;
  }
  const zeroBasedLine = Math.max(0, Math.min(editor.document.lineCount - 1, line - 1));
  preview.echoGuard.expect(
    preview.documentUri,
    (editor.visibleRanges[0]?.start.line ?? zeroBasedLine) + 1,
    zeroBasedLine + 1,
  );
  preview.lastRevealedSourceLine = zeroBasedLine + 1;
  const position = new vscode.Position(zeroBasedLine, 0);
  editor.revealRange(
    new vscode.Range(position, position),
    revealType,
  );
}

function syncPreviewToEditor(preview: ActivePreview, line: number): void {
  if (!preview.configuration.scrollEditorWithPreview) {
    return;
  }
  const stage = preview.stage;
  if (!stage || stage.activeDocumentIdentity !== preview.documentUri) {
    return;
  }
  preview.lastSourceScrollLine = line;
  void preview.panel.webview.postMessage({
    type: "sourceScroll",
    documentId: stage.activeDocumentIdentity,
    documentVersion: stage.activeDocumentVersion,
    requestId: stage.requestId,
    line,
  });
}

function syncEditorToPreview(editor: vscode.TextEditor | undefined): void {
  const sourceEditors = editor ? [editor] : vscode.window.visibleTextEditors;
  for (const sourceEditor of sourceEditors) {
    const documentIdentity = documentKey(sourceEditor.document);
    const visibleRange = sourceEditor.visibleRanges[0];
    if (!visibleRange) {
      continue;
    }
    for (const preview of activePreviews) {
      const stage = preview.stage;
      if (preview.disposed || !stage || preview.documentUri !== documentIdentity) {
        continue;
      }
      const sourceLine = visibleRange.start.line + 1;
      const revealedLineIsVisible = preview.lastRevealedSourceLine !== undefined
        && visibleRange.contains(new vscode.Position(preview.lastRevealedSourceLine - 1, 0));
      if (preview.configuration.scrollPreviewWithEditor
        && preview.echoGuard.isEcho(documentIdentity, sourceLine, Date.now(), revealedLineIsVisible)) {
        continue;
      }
      if (!preview.configuration.scrollPreviewWithEditor && !preview.configuration.markEditorSelection) {
        continue;
      }
      if (preview.configuration.scrollPreviewWithEditor) {
        // The editor leads: its first visible line becomes the anchor.
        preview.anchor = { line: sourceLine, owner: "editor", documentId: documentIdentity };
      }
      preview.lastSourceScrollLine = sourceLine;
      void preview.panel.webview.postMessage({
        type: "sourceScroll",
        documentId: stage.activeDocumentIdentity,
        documentVersion: stage.activeDocumentVersion,
        requestId: stage.requestId,
        line: sourceLine,
        selectionLine: sourceEditor.selection.active.line + 1,
      });
    }
  }
}

function visibleEditorFor(preview: ActivePreview): vscode.TextEditor | undefined {
  return vscode.window.visibleTextEditors.find(
    (candidate) => documentKey(candidate.document) === preview.documentUri,
  );
}

/** Remembers the pin of an accepted final save for the render that shows the saved text (R7). */
function storePendingPin(
  preview: ActivePreview,
  message: PreviewSyncMessage,
  minVersion: number,
): void {
  if (
    message.pinLine === undefined
    || message.pinViewportTop === undefined
    || message.documentId !== preview.documentUri
  ) {
    return;
  }
  preview.pendingPin = {
    documentId: message.documentId,
    line: message.pinLine,
    viewportTop: message.pinViewportTop,
    expiresAt: Date.now() + 5000,
    minVersion,
  };
}

/**
 * Returns the pin of the last final save. A render of an older document version (for example an
 * in-flight autosave build) does not get the pin and does not consume it; the first render at or
 * after the saved version uses it once. An expired pin is dropped.
 */
function takePendingPin(
  preview: ActivePreview,
  documentId: string,
  renderedVersion: number,
  now: number = Date.now(),
): { line: number; viewportTop: number } | undefined {
  const pin = preview.pendingPin;
  if (!pin) {
    return undefined;
  }
  if (pin.expiresAt < now || pin.documentId !== documentId) {
    preview.pendingPin = undefined;
    return undefined;
  }
  if (renderedVersion < pin.minVersion) {
    return undefined;
  }
  preview.pendingPin = undefined;
  return { line: pin.line, viewportTop: pin.viewportTop };
}

/** Source line the next render shows at the preview reading line (anchoring rule R6). */
function initialAnchorLine(preview: ActivePreview): number | undefined {
  if (preview.anchor?.documentId === preview.documentUri) {
    return preview.anchor.line;
  }
  if (!preview.configuration.scrollPreviewWithEditor) {
    return undefined;
  }
  const visibleRange = visibleEditorFor(preview)?.visibleRanges[0];
  return visibleRange ? visibleRange.start.line + 1 : undefined;
}

function markEditorSelectionInPreview(preview: ActivePreview): void {
  const stage = preview.stage;
  const editor = visibleEditorFor(preview);
  if (!preview.configuration.markEditorSelection || !stage || !editor) {
    return;
  }
  void preview.panel.webview.postMessage({
    type: "sourceScroll",
    documentId: stage.activeDocumentIdentity,
    documentVersion: stage.activeDocumentVersion,
    requestId: stage.requestId,
    selectionLine: editor.selection.active.line + 1,
  });
}

function cachedFrontmatterLinkCandidate(
  link: NonNullable<FrontmatterResult["linkResults"]>[number],
  filePath: string,
  roots: ReturnType<typeof resolveFrontmatterLinkRoots>,
): string | undefined {
  if (!link.normalizedTarget || !link.resolution || link.resolution === "filename-stem") {
    return undefined;
  }
  const root = link.resolution === "document-relative"
    ? path.dirname(path.resolve(filePath))
    : link.resolution.startsWith("bundle-relative")
      ? roots.bundleRoot
      : roots.projectRoot;
  return root ? path.resolve(root, link.normalizedTarget) : undefined;
}

async function resolvePreviewLink(preview: ActivePreview, request: string) {
  const stage = preview.stage!;
  const navigationRoots = preview.navigationRoots;
  const analysisRoots = preview.readOnly ? navigationRoots : preview.sessionRoots;
  if (request.startsWith("okf-link:")) {
    try {
      const identity = JSON.parse(decodeURIComponent(request.slice("okf-link:".length))) as {
        fieldPath?: unknown;
        arrayIndex?: unknown;
      };
      const currentDocument = preview.document && documentKey(preview.document) === preview.documentUri
        ? preview.document
        : await vscode.workspace.openTextDocument(vscode.Uri.file(stage.activeDocumentPath));
      const canReuseResolvedLinks = preview.frontmatter !== undefined
        && preview.frontmatterDocumentUri === currentDocument.uri.toString()
        && preview.frontmatterDocumentVersion === currentDocument.version
        && preview.frontmatterLinkResultsVersion === currentDocument.version;
      const cachedFrontmatter = canReuseResolvedLinks ? preview.frontmatter : undefined;
      const cachedLink = cachedFrontmatter?.linkResults?.find((candidate) =>
        candidate.fieldPath === identity.fieldPath
        && candidate.arrayIndex === (typeof identity.arrayIndex === "number" ? identity.arrayIndex : undefined));
      const freshFrontmatter = cachedFrontmatter && cachedLink?.resolution !== "filename-stem"
        ? cachedFrontmatter
        : analyzeFrontmatter({
          filePath: currentDocument.uri.fsPath,
          sourceText: currentDocument.getText(),
          stopDir: preview.workspaceRoot,
          allowSchemaResolution: !preview.readOnly,
          inspectLinks: true,
          strictAdditionalProperties: preview.frontmatterConfiguration.strictAdditionalProperties,
          bundleRoot: preview.frontmatterConfiguration.bundleRoot,
          projectRoot: preview.frontmatterConfiguration.projectRoot,
          allowOutsideWorkspaceLinks: preview.frontmatterConfiguration.allowOutsideWorkspaceLinks,
          workspaceRoots: analysisRoots,
        });
      if (!canReuseResolvedLinks && preview.documentUri === currentDocument.uri.toString()) {
        setFrontmatterState(
          preview,
          freshFrontmatter,
          currentDocument.uri.toString(),
          currentDocument.version,
          true,
        );
      }
      const link = freshFrontmatter.linkResults?.find((candidate) =>
        candidate.fieldPath === identity.fieldPath
        && candidate.arrayIndex === (typeof identity.arrayIndex === "number" ? identity.arrayIndex : undefined));
      if (!link || link.status !== "valid" || !link.resolvedPath) {
        return {
          kind: "blocked" as const,
          reason: link?.message || "The frontmatter link is unavailable.",
        };
      }
      const suffix = `${link.query ? `?${link.query}` : ""}${link.fragment !== undefined ? `#${link.fragment}` : ""}`;
      const resolvedRoots = resolveFrontmatterLinkRoots({
        filePath: currentDocument.uri.fsPath,
        bundleRoot: preview.frontmatterConfiguration.bundleRoot,
        projectRoot: preview.frontmatterConfiguration.projectRoot,
        workspaceRoots: analysisRoots,
        schemaDirectory: findSchemaDirectory(currentDocument.uri.fsPath, preview.workspaceRoot),
      });
      const candidatePath = cachedFrontmatterLinkCandidate(link, currentDocument.uri.fsPath, resolvedRoots);
      const navigation = validateResolvedPreviewNavigation(
        candidatePath ?? link.resolvedPath,
        suffix,
        [
          path.dirname(stage.activeDocumentPath),
          ...navigationRoots,
          resolvedRoots.bundleRoot,
          resolvedRoots.projectRoot,
          ...resolvedRoots.filenameRoots,
        ].filter((root): root is string => root !== undefined),
        preview.readOnly ? "the standalone document directory" : "the workspace",
        preview.frontmatterConfiguration.allowOutsideWorkspaceLinks
          && link.resolution === "document-relative",
      );
      if (navigation.kind !== "local" || !link.basenameMarker) return navigation;
      const markerIdentity = frontmatterLinkIdentity(
        currentDocument.getText(),
        currentDocument.uri.fsPath,
        link.idMarker,
      );
      if (!markerIdentity) return navigation;
      let targetSource: string;
      try {
        targetSource = Buffer.from(
          await vscode.workspace.fs.readFile(vscode.Uri.file(navigation.path)),
        ).toString("utf8");
      } catch {
        return navigation;
      }
      const markerLine = markdownMarkerLine(targetSource, link.basenameMarker, markerIdentity);
      return markerLine === undefined ? navigation : { ...navigation, markerLine };
    } catch {
      return { kind: "blocked" as const, reason: "The frontmatter link request is invalid." };
    }
  }
  return resolvePreviewNavigation(request, stage.activeDocumentPath, preview.workspaceRoot, async (name) => {
    preview.linkDiscoveries ??= new Map();
    const existing = preview.linkDiscoveries.get(name);
    if (existing) return existing;
    const literal = name.replace(/[\[\]{}*?]/gu, (character) => `[${character}]`);
    const discovery = Promise.all(navigationRoots.map((root) =>
      vscode.workspace.findFiles(new vscode.RelativePattern(root, `**/${literal}`)),
    )).then((uriGroups) => [...new Set(uriGroups.flat().map((uri) => uri.fsPath))]);
    preview.linkDiscoveries.set(name, discovery);
    try {
      return await discovery;
    } finally {
      preview.linkDiscoveries.delete(name);
    }
  }, preview.readOnly ? "the standalone document directory" : "the workspace", navigationRoots);
}

async function handlePreviewLinkDiscovery(preview: ActivePreview, message: PreviewSyncMessage): Promise<void> {
  try {
    const targets = await Promise.all((message.requests ?? []).map(async (request) => ({
      request, ...await resolvePreviewLink(preview, request),
    })));
    if (!matchesCurrentPreview(preview, message)) return;
    await preview.panel.webview.postMessage({ type: "previewLinkTargets", ...scrollContext(preview.stage!), targets });
  } catch (error) {
    if (!preview.disposed) void vscode.window.showWarningMessage(`Preview link discovery failed: ${String(error)}`);
  }
}

async function handlePreviewLink(preview: ActivePreview, request: string): Promise<void> {
  const stage = preview.stage;
  if (!stage || !matchesCurrentPreview(preview, {
    type: "previewLink",
    documentId: stage.activeDocumentIdentity,
    documentVersion: stage.activeDocumentVersion,
    requestId: stage.requestId,
  })) {
    return;
  }
  let navigation;
  try {
    navigation = await resolvePreviewLink(preview, request);
  } catch (error) {
    void vscode.window.showWarningMessage(`Preview link resolution failed: ${String(error)}`);
    return;
  }
  if (preview.disposed || preview.stage !== stage) return;
  if (navigation.kind === "blocked") {
    void vscode.window.showWarningMessage(`Markdown OKF-Schema Studio could not follow the link: ${navigation.reason}`);
    return;
  }
  if (navigation.kind === "anchor") {
    const activeDocument = preview.document && documentKey(preview.document) === preview.documentUri
      ? preview.document
      : undefined;
    const fragmentRange = activeDocument
      ? markdownFragmentRange(activeDocument.getText(), navigation.value)
      : undefined;
    void preview.panel.webview.postMessage({
      type: "navigateAnchor",
      value: navigation.value,
      ...(fragmentRange ? {
        sourceLine: fragmentRange.startLine,
        sourceEndLine: fragmentRange.endLine,
      } : {}),
      documentId: stage.activeDocumentIdentity,
      documentVersion: stage.activeDocumentVersion,
      requestId: stage.requestId,
    });
    return;
  }
  if (navigation.kind === "external") {
    await vscode.env.openExternal(vscode.Uri.parse(navigation.value));
    return;
  }
  try {
    let selection: vscode.Range | undefined;
    if (navigation.markerLine !== undefined) {
      const document = await vscode.workspace.openTextDocument(vscode.Uri.file(navigation.path));
      const lineIndex = navigation.markerLine - 1;
      if (lineIndex >= 0 && lineIndex < document.lineCount) {
        selection = new vscode.Range(
          lineIndex,
          0,
          lineIndex,
          document.lineAt(lineIndex).text.length,
        );
      }
    } else if (navigation.suffix.includes("#") && /\.md$/iu.test(navigation.path)) {
      const document = await vscode.workspace.openTextDocument(vscode.Uri.file(navigation.path));
      const range = markdownFragmentRange(document.getText(), navigation.suffix);
      if (range !== undefined) {
        const endLine = range.endLine - 1;
        selection = new vscode.Range(
          range.startLine - 1,
          0,
          endLine,
          document.lineAt(endLine).text.length,
        );
      }
    }
    if (preview.disposed || preview.stage !== stage) return;
    const targetUri = vscode.Uri.file(navigation.path);
    const existingGroup = vscode.window.tabGroups.all.find((group) => group.tabs.some((tab) =>
      tab.input instanceof vscode.TabInputText && tab.input.uri.fsPath === targetUri.fsPath));
    await vscode.commands.executeCommand("vscode.open", targetUri, {
      viewColumn: existingGroup?.viewColumn ?? vscode.ViewColumn.One,
      preview: false,
      ...(selection ? { selection } : {}),
    });
  } catch (error) {
    void vscode.window.showWarningMessage(
      `Markdown OKF-Schema Studio could not open ${navigation.path}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

const registeredMessageHandlers = new Map<
  string,
  (preview: ActivePreview, message: RegisteredPreviewMessage) => Thenable<void> | void
>();

// Copies the raw code of a code block. It does not edit anything, so a read-only preview allows it.
registeredMessageHandlers.set("previewCopyText", (_preview, message) =>
  vscode.env.clipboard.writeText(message.text as string));

function handlePreviewSyncMessage(preview: ActivePreview, value: unknown): Thenable<void> | undefined {
  if (isRegisteredPreviewMessage(value)) {
    const handler = registeredMessageHandlers.get(value.type);
    if (!handler || !matchesCurrentPreview(preview, value)) {
      return;
    }
    return Promise.resolve(handler(preview, value));
  }
  if (!isPreviewSyncMessage(value)) {
    return;
  }
  if (value.type === "previewReady" && !preview.disposed && reportsReloadedDocument(value, {
    documentId: preview.stage?.activeDocumentIdentity,
    stageRequestId: preview.stage?.requestId,
    assignedRequestId: preview.assignedRequestId,
    reportedReady: preview.readyRequestId !== undefined,
  })) {
    // The webview was created again and loaded the html of the last assignment, which predates the
    // content patches it received before: load the current document.
    freshNonceRecord(preview);
    assignWebviewHtml(preview, preview.webview.html);
    return;
  }
  if (
    value.type === "previewReady"
    && preview.contentPatchTimer !== undefined
    && preview.stage !== undefined
    && value.documentId === preview.stage.activeDocumentIdentity
    && value.requestId < preview.stage.requestId
  ) {
    // The page handled an earlier patch of a chain: it is alive and works through the rest. Wait
    // again for the newest stage instead of loading the document while the page is catching up.
    armContentPatchFallback(preview, preview.stage);
    return;
  }
  if (!matchesCurrentPreview(preview, value)) {
    return;
  }
  if (value.type === "previewLinkDiscover") {
    void handlePreviewLinkDiscovery(preview, value);
    return;
  }
  if (value.anchorLine !== undefined && value.documentId === preview.documentUri) {
    // The preview reports its anchor with every scroll, refresh and inline edit save.
    preview.anchor = { line: value.anchorLine, owner: "preview", documentId: value.documentId };
  }
  if (value.type === "previewThemeModeChanged") {
    if (isPreviewThemeMode(value.previewThemeMode)) {
      setSessionPreviewThemeMode(value.previewThemeMode);
    }
    return;
  }
  if (value.type === "previewEditModeChanged") {
    if (!preview.readOnly && typeof value.editMode === "boolean") {
      void editModeStorage?.update(EDIT_MODE_STORAGE_KEY, value.editMode);
    }
    return;
  }
  if (preview.readOnly && (
    value.type === "previewEditOpen"
    || value.type === "previewEditSave"
    || value.type === "previewEditCancel"
    || value.type === "previewFrontmatterSave"
    || value.type === "previewCheckboxToggle"
  )) {
    if (value.type === "previewFrontmatterSave") {
      postFrontmatterEditError(preview, value, "Editing requires a trusted workspace.");
    } else if (value.type === "previewCheckboxToggle") {
      postCheckboxResult(preview, value, { error: "Editing requires a trusted workspace." });
    } else {
      postEditSourceError(preview, value, "Editing requires a trusted workspace.");
    }
    return;
  }
  if (value.type === "previewEditOpen") {
    handlePreviewEditOpen(preview, value);
    return;
  }
  if (value.type === "previewEditSave") {
    handlePreviewEditSave(preview, value);
    return;
  }
  if (value.type === "previewEditCancel") {
    handlePreviewEditCancel(preview, value);
    return;
  }
  if (value.type === "previewFrontmatterSave") {
    return handleFrontmatterSave(preview, value);
  }
  if (value.type === "previewCheckboxToggle") {
    return handleCheckboxToggle(preview, value);
  }
  recordPreviewState(preview, value);
  if (value.type === "previewRefresh") {
    if (preview.document) {
      void refreshPreviewDocument(preview, preview.document);
    }
    return;
  }
  if (value.type === "previewAnchorModeChanged") {
    if (typeof value.anchorToEditor === "boolean") {
      preview.configuration = {
        ...preview.configuration,
        scrollPreviewWithEditor: value.anchorToEditor,
      };
      // The page changed its own setting; it is not a difference that needs a new document.
      if (preview.loadedContext) {
        preview.loadedContext = { ...preview.loadedContext, scrollPreviewWithEditor: value.anchorToEditor };
      }
      if (value.anchorToEditor) {
        syncEditorToPreview(undefined);
      }
    }
    return;
  }
  if (value.type === "previewReady") {
    preview.readyRequestId = value.requestId;
    if (preview.activeBlockEdit) {
      // A page of another render, or one that reports no open editor, has no inline editor: the
      // lock would block every later edit (STAB-02).
      const outcome = preview.editLock.onPreviewReady(value.requestId, value.blockEditOpen);
      if (outcome.released) {
        releaseActiveBlockEdit(preview, false, outcome.flush);
      }
    }
    if (preview.status === "pending" && preview.shownStatus !== undefined && !preview.pendingOverlayVisible) {
      if (preview.pendingOverlayDue) {
        showPendingOverlay(preview);
      } else {
        // A deferred update replaced the page while a render was pending: wait again.
        armPendingOverlay(preview);
      }
    }
    // The webview already applied the anchor passed at render time; only refresh the
    // selection marker so a re-render never triggers a second scroll.
    markEditorSelectionInPreview(preview);
    return;
  }
  if (value.type === "previewLink" && value.request) {
    return handlePreviewLink(preview, value.request);
  }
  if (value.type === "previewScroll" || value.type === "previewReveal") {
    if (value.type === "previewScroll" && !preview.configuration.scrollPreviewWithEditor) {
      return;
    }
    if (!preview.configuration.scrollEditorWithPreview) {
      return;
    }
    if (value.activation === "double-click" && !preview.configuration.doubleClickToSwitchToEditor) {
      return;
    }
    const revealType = value.type === "previewScroll"
      ? vscode.TextEditorRevealType.AtTop
      : vscode.TextEditorRevealType.InCenterIfOutsideViewport;
    if (value.line !== undefined && value.sourceFile === undefined) {
      revealEditorLine(preview, value.line, revealType);
      return;
    }
    if (
      value.line !== undefined
      && value.sourceFile !== undefined
      && path.resolve(value.sourceFile) === path.resolve(preview.stage?.activeDocumentPath ?? "")
    ) {
      revealEditorLine(preview, value.line, revealType);
    }
  }
}

function setMissingSource(
  preview: ActivePreview,
  message = "The active Markdown source is unavailable.",
): void {
  if (preview.disposed) {
    return;
  }
  preview.queue.cancel();
  preview.queue.clearLastGood();
  preview.stage = undefined;
  preview.state = undefined;
  preview.status = "missing-source";
  preview.shownStatus = undefined;
  preview.panel.webview.options = {
    enableScripts: true,
    localResourceRoots: [],
  };
  preview.webview = {
    html: buildStatusWebviewHtml("missing-source", preview.panel.webview.cspSource, message),
    diagnostics: [],
    nonce: "",
  };
  assignWebviewHtml(preview, preview.webview.html);
}

function refreshPreviewDocument(
  preview: ActivePreview,
  document: vscode.TextDocument,
): Promise<unknown> {
  if (!isDocumentEligible(document) || !sourceAvailable(preview)) {
    setMissingSource(preview);
    return Promise.resolve({ status: "canceled" });
  }
  preview.document = document;
  return preview.queue.refresh(document);
}

function switchPreviewDocument(preview: ActivePreview, document: vscode.TextDocument): void {
  if (!isDocumentEligible(document) || documentKey(document) === preview.documentUri) {
    return;
  }
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
  const readOnly = workspaceFolder === undefined || !vscode.workspace.isTrusted;
  const resourceRoot = readOnly
    ? path.dirname(path.resolve(document.uri.fsPath))
    : workspaceFolder.uri.fsPath;
  if (resourceRoot !== preview.workspaceRoot || readOnly !== preview.readOnly) {
    const panel = preview.panel;
    const followsActiveEditor = preview.followsActiveEditor;
    const lockedColumn = preview.lockedColumn;
    disposePreview(preview, false);
    const replacement = createPreview(panel, document, workspaceFolder, undefined, followsActiveEditor);
    // The panel, and so the locked group, lives on with the replacement.
    replacement.lockedColumn = lockedColumn;
    void requestPreviewDocument(replacement, document).catch((error: unknown) => {
      if (activePreviews.has(replacement) && !replacement.disposed) {
        setStatus(replacement, "error", error instanceof Error ? error.message : String(error));
      }
    });
    return;
  }
  if (preview.state) {
    preview.states.set(preview.documentUri, preview.state);
  }
  preview.queue.cancel();
  preview.queue.clearLastGood();
  preview.documentUri = documentKey(document);
  preview.document = document;
  preview.state = preview.states.get(preview.documentUri);
  preview.panel.title = previewTitle(preview, document.uri.fsPath);
  showPending(preview, true, "Following the active Markdown editor.");
  void refreshPreviewDocument(preview, document);
}

// Directories that churn constantly during builds; watching them would cost far more
// than the preview could ever gain from them.
const IGNORED_WATCH_SEGMENTS = new Set([
  ".git",
  ".venv",
  ".vscode-test",
  "_build",
  "dist",
  "htmlcov",
  "node_modules",
  "out",
  "output",
  "public",
  "tmp",
]);

function isIgnoredWatchPath(filePath: string): boolean {
  return filePath.split(path.sep).some((segment) => IGNORED_WATCH_SEGMENTS.has(segment));
}

/** Runs `work` now, or after the open inline block edit ends: the work would replace its page. */
function deferWhileEditing(preview: ActivePreview, key: string, work: () => void): void {
  if (preview.editLock.shouldDeferReload()) {
    preview.editLock.defer(key, work);
    return;
  }
  work();
}

function refreshOpenDocument(preview: ActivePreview, isDependencyChange = false): void {
  const shown = preview.status === "pending" ? preview.shownStatus : preview.status;
  if (!preview.disposed && preview.document && sourceAvailable(preview)
    && needsRefresh({
      isDependencyChange,
      shownStatus: shown,
      documentVersion: preview.document.version,
      stageVersion: preview.stage?.activeDocumentVersion,
    })) {
    void refreshPreviewDocument(preview, preview.document);
  }
}

function refreshReferencedPath(preview: ActivePreview, filePath: string): void {
  if (!preview || preview.disposed || isIgnoredWatchPath(filePath)) {
    return;
  }
  const activePath = preview.document?.uri.fsPath ?? vscode.Uri.parse(preview.documentUri).fsPath;
  const candidate = canonicalPath(filePath);
  if (candidate === canonicalPath(activePath)) {
    preview.activePathChanges += 1;
    if (preview.document
      && preview.status !== "missing-source"
      && sourceAvailable(preview)
      && ["success", "recovery"].includes(
        (preview.status === "pending" ? preview.shownStatus : preview.status) ?? "")
      && isUnchangedSave({
        isActiveDocument: true,
        documentVersion: preview.document.version,
        stageVersion: preview.stage?.activeDocumentIdentity === preview.documentUri
          ? preview.stage.activeDocumentVersion
          : undefined,
      })) {
      // A save of the buffer that is already rendered changes nothing on screen (PERF-06).
      return;
    }
    if (sourceAvailable(preview) && preview.document) {
      deferWhileEditing(preview, "render", () => refreshOpenDocument(preview));
    } else {
      setMissingSource(preview);
    }
    return;
  }
  if (preview.document && [...preview.linkedTargetWatchers?.keys() ?? []]
    .some((target) => canonicalPath(target) === candidate)) {
    // Per-target watchers arm asynchronously; the preview-wide watcher backs them up (debounced).
    scheduleLinkEnrichment(preview, preview.documentUri, preview.document.version);
  }
  if (!preview.queue.dependsOn(filePath) || !preview.document || !sourceAvailable(preview)) {
    return;
  }
  deferWhileEditing(preview, "render", () => refreshOpenDocument(preview, true));
}

function recoverMissingSource(preview: ActivePreview): void {
  if (!sourceAvailable(preview)) {
    return;
  }
  const document = preview.document
    ?? vscode.workspace.textDocuments.find((candidate) => documentKey(candidate) === preview.documentUri);
  if (document) {
    preview.document = document;
    void refreshPreviewDocument(preview, document);
  }
}

function handleRenames(event: vscode.FileRenameEvent): void {
  for (const preview of activePreviews) {
    const activePath = preview.document?.uri.fsPath ?? vscode.Uri.parse(preview.documentUri).fsPath;
    for (const file of event.files) {
      if (canonicalPath(file.oldUri.fsPath) === canonicalPath(activePath)) {
        setMissingSource(preview, "The active Markdown source was renamed or deleted.");
        continue;
      }
    }
    if (!preview.document || !sourceAvailable(preview)) {
      continue;
    }
    const dependencyRenamed = event.files.some((file) =>
      preview.queue.dependsOn(file.oldUri.fsPath)
      || preview.queue.dependsOn(file.newUri.fsPath));
    if (dependencyRenamed) {
      void refreshPreviewDocument(preview, preview.document);
    }
  }
}

/** Keeps each anchor on the same source text when lines are added or removed above it. */
function shiftAnchorsForEdits(event: vscode.TextDocumentChangeEvent): void {
  const documentIdentity = documentKey(event.document);
  const changes = event.contentChanges.map((change) => ({
    startLine: change.range.start.line + 1,
    endLine: change.range.end.line + 1,
    insertedLineCount: change.text.split("\n").length - 1,
  }));
  for (const preview of activePreviews) {
    if (preview.anchor?.documentId === documentIdentity) {
      preview.anchor = { ...preview.anchor, line: shiftLineForEdits(preview.anchor.line, changes) };
    }
  }
}

function restorePreviewState(preview: ActivePreview): void {
  preview.restoreCalls += 1;
  // A retained webview keeps its own scroll; it only needs to catch up with an
  // editor that moved while the panel was hidden.
  if (preview.configuration.scrollPreviewWithEditor) {
    const editor = visibleEditorFor(preview);
    if (editor) {
      syncEditorToPreview(editor);
    }
  }
}

function notifyPairing(preview: ActivePreview): void {
  const stage = preview.stage;
  if (preview.disposed || !stage) {
    return;
  }
  void preview.panel.webview.postMessage({
    type: "previewPairing",
    documentId: stage.activeDocumentIdentity,
    documentVersion: stage.activeDocumentVersion,
    requestId: stage.requestId,
    pairedTextEditor: visibleEditorFor(preview) !== undefined,
  });
}

function notifyTheme(preview: ActivePreview): void {
  const stage = preview.stage;
  if (stage) {
    void preview.panel.webview.postMessage({
      type: "themeChanged",
      themeKind: vscode.window.activeColorTheme.kind,
      documentId: stage.activeDocumentIdentity,
      documentVersion: stage.activeDocumentVersion,
      requestId: stage.requestId,
    });
  }
  if (preview.document && isDocumentEligible(preview.document)) {
    void refreshPreviewDocument(preview, preview.document);
  }
}

function disposePreview(preview: ActivePreview, disposePanel: boolean): void {
  if (preview.disposed) {
    if (disposePanel) {
      preview.panel.dispose();
    }
    return;
  }
  preview.disposed = true;
  clearPendingOverlay(preview);
  clearContentPatchTimer(preview);
  preview.activeBlockEdit = undefined;
  preview.editLock.release();
  if (disposePanel) {
    releasePreviewGroupLock(preview);
  }
  for (const watcher of preview.linkedTargetWatchers?.values() ?? []) watcher.dispose();
  preview.linkedTargetWatchers?.clear();
  cancelPendingFrontmatter(preview);
  activePreviews.delete(preview);
  if (activePreview === preview) {
    activePreview = latestPreview();
  }
  for (const subscription of preview.panelSubscriptions) {
    subscription.dispose();
  }
  for (const subscription of preview.dependencyWatcherSubscriptions) {
    subscription.dispose();
  }
  preview.dependencyWatcher.dispose();
  preview.queue.dispose();
  if (disposePanel) {
    preview.panel.dispose();
  }
}

function previewTitle(preview: { followsActiveEditor: boolean }, filePath: string): string {
  const name = path.basename(filePath);
  return preview.followsActiveEditor ? `Studio · ${name}` : name;
}

function createPreview(
  panel: vscode.WebviewPanel,
  document: vscode.TextDocument | undefined,
  workspaceFolder: vscode.WorkspaceFolder | undefined,
  restoredState?: PreviewPanelState,
  followsActiveEditor = true,
): ActivePreview {
  const documentUri = document?.uri.toString() ?? restoredState?.documentId ?? "";
  const sourcePath = document?.uri.fsPath ?? restoredState?.sourceFile;
  if (!sourcePath) {
    throw new Error("The preview source path is unavailable.");
  }
  const savedDescriptions = collapsedDescriptions.get(documentUri);
  if (restoredState?.descriptionsCollapsed === undefined && typeof savedDescriptions === "boolean") {
    restoredState = { ...restoredState, documentId: documentUri, sourceFile: sourcePath,
      descriptionsCollapsed: savedDescriptions };
  }
  const documentDirectory = path.dirname(path.resolve(sourcePath));
  const readOnly = workspaceFolder === undefined || !vscode.workspace.isTrusted;
  const resourceRoot = readOnly ? documentDirectory : workspaceFolder.uri.fsPath;
  const sessionRoots = readOnly ? [] : sessionWorkspaceRoots();
  const navigationRoots = readOnly
    ? [documentDirectory]
    : [...new Set([resourceRoot, ...sessionRoots])];
  let preview: ActivePreview;
  const queue = new BuildQueue<vscode.TextDocument, RenderResult>({
    debounceMs: 40,
    build: (request, signal) => renderPreviewDocument({
      document: request.document as PreviewDocument,
      workspaceRoot: resourceRoot,
      requestId: request.requestId,
      documentIdentity: documentKey(request.document),
      signal,
      isWorkspaceTrusted: () => vscode.workspace.isTrusted,
      allowUntrusted: true,
      plantUmlJarPath: preview.plantUmlConfiguration.jarPath,
    }),
    onState: (state) => handleQueueState(preview, state),
    disposeResult: (result) => result.stage.dispose(),
  });
  const dependencyWatcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(vscode.Uri.file(resourceRoot), "**/*"),
  );
  const dependencyWatcherSubscriptions = [
    dependencyWatcher.onDidChange((uri) => refreshReferencedPath(preview, uri.fsPath)),
    dependencyWatcher.onDidCreate((uri) => {
      refreshReferencedPath(preview, uri.fsPath);
      if (preview?.status === "missing-source") {
        recoverMissingSource(preview);
      }
    }),
    dependencyWatcher.onDidDelete((uri) => {
      const activePath = preview?.document?.uri.fsPath
        ?? (preview ? vscode.Uri.parse(preview.documentUri).fsPath : "");
      if (preview && canonicalPath(uri.fsPath) === canonicalPath(activePath)) {
        setMissingSource(preview, "The active Markdown source was deleted.");
      } else {
        refreshReferencedPath(preview, uri.fsPath);
      }
    }),
  ];
  const initialStatus: PreviewStatus = document
    && isDocumentEligible(document)
    && sourceExists(document.uri.fsPath)
    ? "pending"
    : "missing-source";
  const initialMessage = initialStatus === "pending"
    ? "Waiting for the first render."
    : "The active Markdown source is unavailable.";
  preview = {
    panel,
    followsActiveEditor,
    queue,
    document,
    documentUri,
    workspaceRoot: resourceRoot,
    sessionRoots,
    navigationRoots,
    workspaceFolder,
    readOnly,
    dependencyWatcher,
    dependencyWatcherSubscriptions,
    panelSubscriptions: [],
    webview: {
      html: buildStatusWebviewHtml(initialStatus, panel.webview.cspSource, initialMessage),
      diagnostics: [],
      nonce: "",
    },
    echoGuard: new EditorEchoGuard(),
    states: new BoundedMap<PreviewPanelState>(
      MAX_DOCUMENT_STATES,
      restoredState ? [[documentUri, restoredState]] : [],
    ),
    state: restoredState,
    status: initialStatus,
    configuration: readPreviewConfiguration(
      vscode.workspace.getConfiguration(PREVIEW_CONFIGURATION_SECTION),
    ),
    plantUmlConfiguration: readPlantUmlConfiguration(
      vscode.workspace.getConfiguration(PLANTUML_CONFIGURATION_SECTION),
    ),
    frontmatterConfiguration: readFrontmatterConfiguration(
      vscode.workspace.getConfiguration(FRONTMATTER_CONFIGURATION_SECTION),
    ),
    enrichmentGeneration: 0,
    activePathChanges: 0,
    editLock: new EditLock(),
    restoreCalls: 0,
    hadFailure: false,
    htmlAssignments: 0,
    renderedStages: 0,
    contentPatches: 0,
    recordKeepsLoadedNonce: false,
    pendingOverlayDue: false,
    pendingOverlayVisible: false,
    pendingOverlayMessage: "",
    pendingOverlayShown: 0,
    disposed: false,
  };
  panel.webview.options = {
    enableScripts: true,
    localResourceRoots: [],
  };
  assignWebviewHtml(preview, preview.webview.html);
  panel.title = document ? previewTitle(preview, document.uri.fsPath) : "Studio";
  activePreviews.add(preview);
  activePreview = preview;
  // onDidChangeViewState also fires when the panel only gains or loses focus. Only a hidden panel
  // that becomes visible needs to catch up with the editor; a focus change keeps its anchor.
  let wasVisible = panel.visible;
  preview.panelSubscriptions.push(
    panel.webview.onDidReceiveMessage((message: unknown) => handlePreviewSyncMessage(preview, message)),
    panel.onDidChangeViewState(() => {
      if (preview.lockedColumn !== undefined && panel.viewColumn !== undefined) {
        // The column shifts when a group on the left closes, but the locked group is the same.
        preview.lockedColumn = panel.viewColumn;
      }
      const becameVisible = panel.visible && !wasVisible;
      wasVisible = panel.visible;
      if (becameVisible) {
        restorePreviewState(preview);
      }
    }),
    vscode.window.tabGroups.onDidChangeTabGroups(() => {
      // Closing a group on the left shifts the column of the locked group without a view-state event.
      if (preview.lockedColumn === undefined || preview.disposed) return;
      try {
        if (panel.viewColumn !== undefined) preview.lockedColumn = panel.viewColumn;
      } catch {
        // The panel is already gone.
      }
    }),
    panel.onDidDispose(() => {
      releasePreviewGroupLock(preview);
      disposePreview(preview, false);
    }),
  );
  return preview;
}

async function requestPreviewDocument(
  preview: ActivePreview,
  document: vscode.TextDocument,
): Promise<void> {
  if (preview.disposed || !activePreviews.has(preview)) {
    return;
  }
  if (!isDocumentEligible(document)) {
    setMissingSource(preview, "The restored or active source is not a Markdown file.");
    return;
  }
  if (!sourceAvailable(preview)) {
    setMissingSource(preview);
    return;
  }
  preview.document = document;
  const outcome = await preview.queue.request(document);
  if (outcome.status === "failed" && activePreviews.has(preview) && !preview.stage) {
    setStatus(preview, "error", outcome.error instanceof Error ? outcome.error.message : "The render failed.");
  }
}

async function openPreview(uri?: unknown): Promise<void> {
  // Menus pass the resource URI; the palette and keybinding pass nothing. Ignore other arguments.
  if (
    uri instanceof vscode.Uri
    && uri.scheme === "file"
    && vscode.window.activeTextEditor?.document.uri.toString() !== uri.toString()
  ) {
    try {
      const opened = await vscode.workspace.openTextDocument(uri);
      const sidePreviewForOpen = latestPreview((candidate) => candidate.followsActiveEditor);
      await vscode.window.showTextDocument(opened, sidePreviewForOpen
        ? { preview: false, viewColumn: columnOutsideSidePreview(sidePreviewForOpen) }
        : { preview: false });
    } catch (error) {
      void vscode.window.showErrorMessage(
        "Cannot open " + uri.fsPath + ": " + (error instanceof Error ? error.message : String(error)),
      );
      return;
    }
  }
  const document = vscode.window.activeTextEditor?.document;
  if (!document || !isDocumentEligible(document)) {
    void vscode.window.showInformationMessage(
      "Open a Markdown file to use Markdown OKF-Schema Studio.",
    );
    return;
  }
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
  const sidePreview = latestPreview((preview) => preview.followsActiveEditor);
  if (sidePreview) {
    sidePreview.panel.reveal(sidePreview.panel.viewColumn ?? vscode.ViewColumn.Beside);
    if (documentKey(document) !== sidePreview.documentUri) {
      switchPreviewDocument(sidePreview, document);
    } else {
      await requestPreviewDocument(sidePreview, document);
    }
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    PANEL_VIEW_TYPE,
    "Studio",
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      enableFindWidget: true,
      retainContextWhenHidden: true,
      localResourceRoots: [],
    },
  );
  const preview = createPreview(panel, document, workspaceFolder);
  await lockNewPreviewGroup(panel, preview);
  try {
    await requestPreviewDocument(preview, document);
  } catch (error) {
    if (activePreviews.has(preview) && !preview.disposed) {
      setStatus(preview, "error", error instanceof Error ? error.message : String(error));
    }
  }
}

/**
 * Locks the editor group a new side preview created, so files opened while the preview has focus
 * land in another group. Only a group that holds just this panel is locked. Never blocks the preview.
 */
async function lockNewPreviewGroup(panel: vscode.WebviewPanel, preview: ActivePreview): Promise<void> {
  try {
    const groupOf = () => vscode.window.tabGroups.all.find((group) => group.viewColumn === panel.viewColumn);
    for (let attempt = 0; attempt < 10 && groupOf() === undefined; attempt += 1) {
      await new Promise<void>((resolve) => setTimeout(resolve, 25));
    }
    if (panel.active && groupOf()?.tabs.length === 1) {
      await vscode.commands.executeCommand("workbench.action.lockEditorGroup");
      if (!preview.disposed && panel.viewColumn !== undefined) {
        preview.lockedColumn = panel.viewColumn;
      }
    }
  } catch {
    // A failed lock must never block the preview.
  }
}

const FOCUS_GROUP_COMMANDS = [
  "workbench.action.focusFirstEditorGroup",
  "workbench.action.focusSecondEditorGroup",
  "workbench.action.focusThirdEditorGroup",
  "workbench.action.focusFourthEditorGroup",
  "workbench.action.focusFifthEditorGroup",
  "workbench.action.focusSixthEditorGroup",
  "workbench.action.focusSeventhEditorGroup",
  "workbench.action.focusEighthEditorGroup",
];

/** Called when a preview's panel goes away: unlock its group one tick later, if this extension locked it. */
function releasePreviewGroupLock(preview: ActivePreview): void {
  const lockedColumn = preview.lockedColumn;
  if (lockedColumn === undefined) return;
  preview.lockedColumn = undefined;
  setTimeout(() => void unlockPreviewGroup(lockedColumn), 0);
}

function hasLivePreviewIn(column: vscode.ViewColumn): boolean {
  return [...activePreviews].some((candidate) => !candidate.disposed && candidate.panel.viewColumn === column);
}

/**
 * Releases the lock this extension put on a preview group that outlived its preview. Only empty
 * groups are ever unlocked: that is the shape of the leak (VS Code keeps an empty locked group), and
 * a non-empty group may carry a lock the user set.
 */
async function unlockPreviewGroup(column: vscode.ViewColumn): Promise<void> {
  try {
    const groupAt = (target: number) => vscode.window.tabGroups.all.find((group) => group.viewColumn === target);
    const holdsPreviewTab = (group: vscode.TabGroup | undefined): boolean => group?.tabs.some((tab) =>
      tab.input instanceof vscode.TabInputWebview && tab.input.viewType.includes(PANEL_VIEW_TYPE)) ?? false;
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
        .filter((group) => group.tabs.length === 0 && group.viewColumn !== undefined && !hasLivePreviewIn(group.viewColumn))
        .map((group) => group.viewColumn);
    const remembered = vscode.window.tabGroups.activeTabGroup.viewColumn;
    for (const target of targets) {
      const command = FOCUS_GROUP_COMMANDS[target - 1];
      if (command === undefined) continue;
      await vscode.commands.executeCommand(command);
      await vscode.commands.executeCommand("workbench.action.unlockEditorGroup");
    }
    // Focus held outside the editor area (terminal, sidebar) cannot be restored through the API.
    const restore = FOCUS_GROUP_COMMANDS[remembered - 1];
    if (!targets.includes(remembered) && targets.length > 0 && restore !== undefined && groupAt(remembered) !== undefined) {
      await vscode.commands.executeCommand(restore);
    }
  } catch {
    // Never throw from dispose.
  }
}

/** Where to open a file so it does not cover the side preview. */
function columnOutsideSidePreview(sidePreview: ActivePreview): vscode.ViewColumn {
  const previewColumn = sidePreview.panel.viewColumn;
  const editor = vscode.window.visibleTextEditors.find(
    (candidate) => candidate.viewColumn !== undefined && candidate.viewColumn !== previewColumn,
  );
  if (editor?.viewColumn !== undefined) return editor.viewColumn;
  const group = vscode.window.tabGroups.all.find((candidate) => candidate.viewColumn !== previewColumn);
  return group?.viewColumn ?? vscode.ViewColumn.Beside;
}

async function resolvePreviewEditor(
  document: vscode.TextDocument,
  panel: vscode.WebviewPanel,
): Promise<void> {
  let preview: ActivePreview | undefined;
  try {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    if (!isDocumentEligible(document)) {
      assignWebviewHtml(panel, buildStatusWebviewHtml(
        "missing-source",
        panel.webview.cspSource,
        "Markdown OKF-Schema Studio requires a Markdown file.",
      ));
      return;
    }
    preview = createPreview(panel, document, workspaceFolder, undefined, false);
    const currentPreview = preview;
    void requestPreviewDocument(currentPreview, document).catch((error: unknown) => {
      if (activePreviews.has(currentPreview) && !currentPreview.disposed) {
        setStatus(currentPreview, "error", error instanceof Error ? error.message : String(error));
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (preview && !preview.disposed) {
      setStatus(preview, "error", message);
    } else {
      assignWebviewHtml(panel, buildStatusWebviewHtml("error", panel.webview.cspSource, message));
    }
  }
}

async function deserializePreviewPanel(
  panel: vscode.WebviewPanel,
  rawState: unknown,
): Promise<void> {
  const restoredState = parsePreviewPanelState(rawState);
  if (!restoredState) {
    assignWebviewHtml(panel, buildStatusWebviewHtml(
      "missing-source",
      panel.webview.cspSource,
      "The previous preview identity could not be restored safely.",
    ));
    return;
  }
  let uri: vscode.Uri;
  try {
    uri = vscode.Uri.parse(restoredState.documentId);
  } catch {
    assignWebviewHtml(panel, buildStatusWebviewHtml(
      "missing-source",
      panel.webview.cspSource,
      "The previous preview source URI is invalid.",
    ));
    return;
  }
  const workspaceFolder = isWorkspaceUriEligible(uri) ? vscode.workspace.getWorkspaceFolder(uri) : undefined;
  if (uri.scheme !== "file" || path.extname(uri.fsPath).toLowerCase() !== ".md") {
    assignWebviewHtml(panel, buildStatusWebviewHtml(
      "missing-source",
      panel.webview.cspSource,
      "The previous preview source is not a Markdown file.",
    ));
    return;
  }
  // Earlier restored panels stay open with their live session; only the newest one follows the
  // active editor, so each older one becomes a fixed preview of the document it shows.
  for (const earlier of activePreviews) {
    if (earlier.followsActiveEditor && !earlier.disposed) {
      earlier.followsActiveEditor = false;
      earlier.panel.title = previewTitle(earlier, earlier.document?.uri.fsPath ?? vscode.Uri.parse(earlier.documentUri).fsPath);
    }
  }
  let document: vscode.TextDocument | undefined;
  try {
    document = await vscode.workspace.openTextDocument(uri);
  } catch {
    document = undefined;
  }
  const preview = createPreview(panel, document, workspaceFolder, {
    ...restoredState,
    documentId: uri.toString(),
    sourceFile: uri.fsPath,
  });
  if (preview.followsActiveEditor && panel.viewColumn !== undefined) {
    // The workbench restores the group's lock state; own it so closing the preview releases it.
    preview.lockedColumn = panel.viewColumn;
  }
  if (!document || !isDocumentEligible(document) || !sourceAvailable(preview)) {
    setMissingSource(preview, "The restored Markdown source is unavailable.");
    return;
  }
  await requestPreviewDocument(preview, document);
}

function refreshPreview(document: vscode.TextDocument): void {
  for (const preview of activePreviews) {
    if (documentKey(document) === preview.documentUri) {
      if (preview.activeBlockEdit) {
        if (preview.activeBlockEdit.applying) {
          continue;
        }
        releaseActiveBlockEdit(preview, true);
      }
      if (sourceAvailable(preview)) {
        refreshFrontmatter(preview, document);
        void refreshPreviewDocument(preview, document);
      } else {
        setMissingSource(preview);
      }
    } else {
      refreshReferencedPath(preview, document.uri.fsPath);
    }
  }
}

function followActiveEditor(editor: vscode.TextEditor | undefined): void {
  const preview = latestPreview((candidate) => candidate.followsActiveEditor);
  const document = editor?.document;
  if (!preview || !preview.followsActiveEditor || !document) {
    return;
  }
  if (!isDocumentEligible(document)) {
    // Like the built-in Markdown preview: keep the last Markdown document while another kind of
    // editor is active.
    return;
  }
  switchPreviewDocument(preview, document);
}

export function activate(context: vscode.ExtensionContext): void {
  extensionRootUri = context.extensionUri;
  preloadMystEngine();
  previewThemeModeStorage = context.workspaceState;
  previewDescriptionStorage = context.workspaceState;
  collapsedDescriptions = loadCollapsedMap(context.workspaceState);
  void migrateLegacyCollapsedKeys(context.workspaceState, collapsedDescriptions).catch((error: unknown) => {
    console.error("Failed to migrate the per-document description state.", error);
  });
  editModeStorage = context.workspaceState;
  sessionPreviewThemeMode = readPreviewThemeMode(previewThemeModeStorage);
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    watchStemRoot(folder.uri.fsPath);
  }
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_ID, openPreview),
    vscode.window.registerCustomEditorProvider(EDITOR_VIEW_TYPE, {
      resolveCustomTextEditor: resolvePreviewEditor,
    }, { webviewOptions: { enableFindWidget: true, retainContextWhenHidden: true } }),
    vscode.commands.registerCommand(REFRESH_COMMAND_ID, async () => {
      const preview = activePreview;
      const document = vscode.window.activeTextEditor?.document ?? preview?.document;
      if (preview && document && documentKey(document) === preview.documentUri) {
        await requestPreviewDocument(preview, document);
      }
    }),
    vscode.window.registerWebviewPanelSerializer(PANEL_VIEW_TYPE, {
      deserializeWebviewPanel: deserializePreviewPanel,
    }),
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.contentChanges.length > 0) {
        shiftAnchorsForEdits(event);
        refreshPreview(event.document);
      }
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (activePreviews.size === 0
        || (!event.affectsConfiguration(PREVIEW_CONFIGURATION_SECTION)
          && !event.affectsConfiguration(PLANTUML_CONFIGURATION_SECTION)
          && !event.affectsConfiguration(FRONTMATTER_CONFIGURATION_SECTION))) {
        return;
      }
      for (const preview of activePreviews) {
        const plantUmlConfigurationChanged = event.affectsConfiguration(PLANTUML_CONFIGURATION_SECTION);
        if (event.affectsConfiguration(PREVIEW_CONFIGURATION_SECTION)) {
          preview.configuration = readPreviewConfiguration(
            vscode.workspace.getConfiguration(PREVIEW_CONFIGURATION_SECTION),
          );
        }
        if (plantUmlConfigurationChanged) {
          preview.plantUmlConfiguration = readPlantUmlConfiguration(
            vscode.workspace.getConfiguration(PLANTUML_CONFIGURATION_SECTION),
          );
        }
        if (event.affectsConfiguration(FRONTMATTER_CONFIGURATION_SECTION)) {
          preview.frontmatterConfiguration = readFrontmatterConfiguration(
            vscode.workspace.getConfiguration(FRONTMATTER_CONFIGURATION_SECTION),
          );
        }
        // Re-run the whole pipeline so the table reflects state and settings.
        const document = vscode.window.activeTextEditor?.document ?? preview.document;
        if (document && documentKey(document) === preview.documentUri) {
          refreshFrontmatter(preview, document);
        }
        if (plantUmlConfigurationChanged && document && documentKey(document) === preview.documentUri) {
          void refreshPreviewDocument(preview, document);
        } else {
          const lastGood = preview.queue.getState().lastGood;
          if (lastGood) {
            updatePreview(preview, lastGood);
          }
        }
      }
    }),
    vscode.window.onDidChangeActiveTextEditor(followActiveEditor),
    vscode.window.onDidChangeVisibleTextEditors(() => {
      for (const preview of activePreviews) {
        notifyPairing(preview);
      }
    }),
    vscode.window.onDidChangeTextEditorVisibleRanges((event) => syncEditorToPreview(event.textEditor)),
    vscode.window.onDidChangeActiveColorTheme(() => {
      for (const preview of activePreviews) {
        notifyTheme(preview);
      }
    }),
    vscode.workspace.onDidRenameFiles(handleRenames),
    vscode.workspace.onDidChangeWorkspaceFolders((event) => {
      for (const folder of event.added) {
        watchStemRoot(folder.uri.fsPath);
      }
      for (const folder of event.removed) {
        unwatchStemRoot(folder.uri.fsPath);
      }
      for (const preview of [...activePreviews]) {
        const previewFolderRemoved = event.removed.some(
          (folder) => preview.workspaceFolder !== undefined
            && folder.uri.toString() === preview.workspaceFolder.uri.toString(),
        );
        if (previewFolderRemoved) {
          disposePreview(preview, true);
        }
      }
    }),
  );
}

export function deactivate(): void {
  for (const preview of [...activePreviews]) {
    disposePreview(preview, false);
  }
  disposeStemRootWatchers();
  extensionRootUri = undefined;
  previewThemeModeStorage = undefined;
  editModeStorage = undefined;
  resetRenderHooksForTests();
}

export {
  resetRenderHooksForTests,
  setRenderDelayForTests,
  setRenderOverrideForTests,
};

export function getActivePreviewForTests():
  | {
    html: string;
    documentUri: string;
    diagnostics: PreviewWebviewResult["diagnostics"];
    phase: BuildQueueState<RenderResult, vscode.TextDocument>["phase"];
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
    /** How many renders and deferred updates were applied as an in-place content patch. */
    contentPatches: number;
    /** The preview.incrementalUpdates setting as the preview currently holds it. */
    incrementalUpdates: boolean;
    /** True once the loaded webview document reported ready for the current stage. */
    webviewReady: boolean;
    pendingOverlayVisible: boolean;
    pendingOverlayShown: number;
  }
  | undefined {
  if (!activePreview) {
    return undefined;
  }
  const state = activePreview.queue.getState();
  return {
    html: activePreview.webview.html,
    documentUri: activePreview.documentUri,
    diagnostics: activePreview.webview.diagnostics,
    phase: state.phase,
    status: activePreview.status,
    requestId: state.request?.requestId,
    documentVersion: state.request?.documentVersion,
    outputDirectory: activePreview.stage?.outputDirectory,
    lastSourceScrollLine: activePreview.lastSourceScrollLine,
    lastRevealedSourceLine: activePreview.lastRevealedSourceLine,
    sourceLine: activePreview.state?.sourceLine,
    scrollTop: activePreview.state?.scrollTop,
    descriptionsCollapsed: activePreview.state?.descriptionsCollapsed,
    scrollPreviewWithEditor: activePreview.configuration.scrollPreviewWithEditor,
    scrollEditorWithPreview: activePreview.configuration.scrollEditorWithPreview,
    findWidgetEnabled: activePreview.panel.options.enableFindWidget === true,
    localResourceRoots: activePreview.panel.webview.options.localResourceRoots ?? [],
    readOnly: activePreview.readOnly,
    restorePreviewStateCalls: activePreview.restoreCalls,
    htmlAssignments: activePreview.htmlAssignments,
    renderedStages: activePreview.renderedStages,
    activePathChanges: activePreview.activePathChanges,
    contentPatches: activePreview.contentPatches,
    incrementalUpdates: activePreview.configuration.incrementalUpdates,
    webviewReady: activePreview.stage !== undefined
      && activePreview.readyRequestId === activePreview.stage.requestId,
    pendingOverlayVisible: activePreview.pendingOverlayVisible,
    pendingOverlayShown: activePreview.pendingOverlayShown,
  };
}

/** Live previews and whether each follows the active editor, oldest first. */
export function getLivePreviewRolesForTests(): { documentUri: string; followsActiveEditor: boolean; title: string }[] {
  return [...activePreviews].filter((preview) => !preview.disposed).map((preview) => ({
    documentUri: preview.documentUri,
    followsActiveEditor: preview.followsActiveEditor,
    title: preview.panel.title,
  }));
}

export function getActivePreviewPanelForTests(): vscode.WebviewPanel | undefined {
  return activePreview?.panel;
}

export function sendPreviewMessageForTests(message: unknown): Thenable<void> | undefined {
  if (activePreview) {
    return handlePreviewSyncMessage(activePreview, message);
  }
  return undefined;
}

export function syncActiveEditorForTests(): void {
  syncEditorToPreview(vscode.window.activeTextEditor);
}

export function restorePreviewStateForTests(): void {
  if (activePreview) {
    restorePreviewState(activePreview);
  }
}

export async function deserializePreviewPanelForTests(
  panel: vscode.WebviewPanel,
  rawState: unknown,
): Promise<void> {
  await deserializePreviewPanel(panel, rawState);
}

export function disposeActivePreviewForTests(): void {
  for (const preview of [...activePreviews]) {
    disposePreview(preview, true);
  }
}

export async function resetPreviewThemeModeForTests(): Promise<void> {
  sessionPreviewThemeMode = undefined;
  if (previewThemeModeStorage) {
    await clearPreviewThemeMode(previewThemeModeStorage);
  }
}

const FRONTMATTER_DEBOUNCE_MS = 300;
const LINK_ENRICHMENT_DEBOUNCE_MS = 150;

/**
 * Recomputes the frontmatter payload from the current buffer and re-renders
 * only the properties table, without running the heavier Sphinx build. Falls
 * back to a full render of the already-built webview by relaying on the last
 * good webview HTML string: the table is replaced in place via its anchor.
 */
function refreshFrontmatter(preview: ActivePreview, document: vscode.TextDocument): void {
  if (!activePreviews.has(preview) || documentKey(document) !== preview.documentUri) {
    return;
  }
  if (preview.frontmatterRefreshTimer) {
    clearTimeout(preview.frontmatterRefreshTimer);
  }
  preview.frontmatterRefreshTimer = setTimeout(() => {
    preview.frontmatterRefreshTimer = undefined;
    if (!activePreviews.has(preview) || preview.disposed) {
      return;
    }
    const current = preview.document;
    if (!current || documentKey(current) !== preview.documentUri || current.version !== document.version) {
      return;
    }
    const result = analyzeFrontmatter({
      filePath: current.uri.fsPath,
      sourceText: current.getText(),
      stopDir: preview.workspaceRoot,
      allowSchemaResolution: !preview.readOnly,
      inspectLinks: false,
      strictAdditionalProperties: preview.frontmatterConfiguration.strictAdditionalProperties,
      bundleRoot: preview.frontmatterConfiguration.bundleRoot,
      projectRoot: preview.frontmatterConfiguration.projectRoot,
      allowOutsideWorkspaceLinks: preview.frontmatterConfiguration.allowOutsideWorkspaceLinks,
      workspaceRoots: preview.sessionRoots,
    });
    setFrontmatterState(preview, result, preview.documentUri, current.version, false);
    const sourceMapping = preview.stage ? {
      documentId: preview.stage.activeDocumentIdentity,
      activeSourceFile: preview.stage.activeDocumentPath,
    } : undefined;
    patchPropertiesTable(preview, result, sourceMapping);
    scheduleLinkEnrichment(preview, preview.documentUri, current.version);
  }, FRONTMATTER_DEBOUNCE_MS);
}

function cancelPendingFrontmatter(preview: ActivePreview): void {
  if (preview.frontmatterRefreshTimer) {
    clearTimeout(preview.frontmatterRefreshTimer);
    preview.frontmatterRefreshTimer = undefined;
  }
  if (preview.linkEnrichmentTimer) {
    clearTimeout(preview.linkEnrichmentTimer);
    preview.linkEnrichmentTimer = undefined;
  }
}
