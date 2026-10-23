import {
  parseSourceMappings,
  type MappingElement,
  type SourceBlockMapping,
} from "../mapping/sourceMapping";
import { createAnchorPolicy } from "./anchorPolicy";
import { createMarkdownTableTools } from "./markdownTable";
import { createEditActions } from "./editActions";
import { createEditPalette } from "./editPalette";
import { caretRectOf, caretRevealDelta } from "./caretRect";
import { stickyBarShift } from "./stickyBar";
import { createSlashMenu } from "./slashMenu";
import { createLinkPanel } from "./linkPanel";
import { createFigureTools } from "./figureDirective";
import { createFigurePanel, installFigureEditButton } from "./figurePanel";
import { highlightLanguageNames } from "../render/highlight";
import { createTextEditingTools } from "./textEditing";
import { createBlockSelection } from "./blockSelection";
import { installCodeCopy } from "./codeCopy";
import { installLabelRename } from "./labelRename";
import { installHostRequests } from "./hostRequests";
import { installPlantUmlFileRequests, PLANTUML_FILE_REQUEST_TIMEOUT_MS } from "./plantumlFileRequests";
import { installPasteHtml } from "./pasteHtml";
import { imageParagraphEdit, installPasteImage } from "./pasteImage";
import { installWarningBanner, warningBannerState, warningBannerText } from "./warningBanner";
import { installFirstClearance } from "./firstClearance";
import { applyFigureSizes } from "./figureSizes";
import { applySpanColors, isSafeOkfColor } from "./spanColors";
import { installLinkNavigation } from "./linkNavigation";
import { installHistoryControls } from "./historyControls";
import { installTocColumn } from "./tocColumn";
import { installChipToggle } from "./chipToggle";
import { installInlineThreads } from "./inlineThread";
import { installIncomingChanges } from "./incomingChanges";
import { installMotion } from "./motion";
import { installCommentCompose } from "./commentCompose";
import { installCommentThreads } from "./commentThreads";
import { installCommentsToggle } from "./commentsToggle";
import { installIncomingToggle } from "./incomingToggle";
import { installToolbarCollapse } from "./toolbarCollapse";
import { installViewControls } from "./viewControls";
import { installWidthMode } from "./widthMode";
import { createEditorTrace } from "./editorTrace";
import { installSelectAllInControls, isTextSelectAll } from "./selectAllKey";
import { installEditorKeyContainment, isHandledEditorKey } from "./editorKeys";
import type { ViewPreferences } from "../state/previewViewPreferences";
import { DEFAULT_PREVIEW_THEME_MODE, type PreviewThemeMode } from "../state/previewTheme";
import { DEFAULT_EDITING_CONFIGURATION } from "../configuration/editingConfiguration";
import type { PreviewPanelState } from "../state/previewState";

export interface ScrollContext {
  documentId: string;
  documentVersion: number;
  requestId: number;
}

export interface PositionedSourceMapping extends SourceBlockMapping {
  top: number;
  height: number;
}

export interface PreviewRuntimeContext extends ScrollContext {
  activeSourceFile: string;
  previewThemeMode?: PreviewThemeMode;
  /** The per-workspace view preferences; the webview's own saved state wins (zoom). */
  initialViewPreferences?: ViewPreferences;
  scrollPreviewWithEditor?: boolean;
  scrollEditorWithPreview?: boolean;
  markEditorSelection?: boolean;
  doubleClickToSwitchToEditor?: boolean;
  stickyHeadingDepth?: number;
  /** True in writable previews: the page offers the Comment button and the reply box (T43). */
  commentsEnabled?: boolean;
  /** The name a new inline comment thread starts with (comments.authorName, else the Git user). */
  threadAuthor?: string;
  /** False hides the gray comment chips (preview.showComments). */
  showComments?: boolean;
  themeKind?: number;
  /** False when no visible text editor shows the previewed document. */
  pairedTextEditor?: boolean;
  /** The workspace-wide edit mode choice, used when the webview has no saved state. */
  initialEditMode?: boolean;
  /** The workspace's palette mode (stored choice, else the setting); saved state wins on load. */
  initialPaletteMode?: "strict" | "gfm" | "myst";
  /** Fractional source line to show at the preview reading line on load (see anchorPolicy). */
  initialAnchor?: number;
  /** Set after an inline save: the edited element's source line and viewport top (rule R7). */
  initialPin?: { line: number; viewportTop: number };
  /** CR 050: the key of the warning set whose banner the user closed for this document. */
  dismissedWarningBanner?: string;
  /** CR 050: false in Restricted Mode, where the Problems view does not list the conf.py warnings. */
  warningsInProblems?: boolean;
  initialState?: Pick<PreviewPanelState, "sourceLine" | "scrollTop" | "focusedBlockId" | "selectedText" | "openDisclosures" | "descriptionsCollapsed">;
}

function serializeRuntimeContext(context: PreviewRuntimeContext): string {
  return JSON.stringify(context).replace(/</gu, "\\u003c");
}

export function createScrollSyncScript(context: PreviewRuntimeContext): string {
  const serializedContext = serializeRuntimeContext(context);
  return `(function () {
  "use strict";
  const context = ${serializedContext};
  document.documentElement.setAttribute("data-sphinx-preview-document-id", context.documentId);
  document.documentElement.setAttribute("data-sphinx-preview-document-version", String(context.documentVersion));
  document.documentElement.setAttribute("data-sphinx-preview-request-id", String(context.requestId));
  const tableTools = (${createMarkdownTableTools.toString()})();
  const textEditing = (${createTextEditingTools.toString()})();
  const blockSelection = (${createBlockSelection.toString()})();
  const isSafeOkfColor = ${isSafeOkfColor.toString()};
  const editActions = (${createEditActions.toString()})(${JSON.stringify(highlightLanguageNames())}, tableTools, isSafeOkfColor, context.threadAuthor);
  const createEditPalette = ${createEditPalette.toString()};
  const caretRectOf = ${caretRectOf.toString()};
  const createSlashMenu = ${createSlashMenu.toString()};
  const caretRevealDelta = ${caretRevealDelta.toString()};
  const stickyBarShift = ${stickyBarShift.toString()};
  const createLinkPanel = ${createLinkPanel.toString()};
  const figureTools = (${createFigureTools.toString()})();
  const createFigurePanel = ${createFigurePanel.toString()};
  const anchorPolicy = (${createAnchorPolicy.toString()})();
  // Diagnostics only (they change nothing in the page): the last editor events, read by the tests
  // through window.__studioDiagnostics so that a missing editor names what closed it.
  const editorTrace = (${createEditorTrace.toString()})(40, () => (window.performance?.now?.() ?? Date.now()));
  // Wall-clock time of the trace's "at" 0, so a test can line the trace up with host-side events.
  const traceStartedAt = Date.now();
  const traceFocus = () => {
    const active = document.activeElement;
    const focused = typeof document.hasFocus === "function" ? String(document.hasFocus()) : "unknown";
    return "active=" + (active ? String(active.tagName).toLowerCase() : "none") + " pageFocus=" + focused;
  };
  const traceStack = () => editorTrace.callers(new Error().stack, 2);
  editorTrace.record("page", "request " + context.requestId + " version " + context.documentVersion);
  window.addEventListener("focus", () => editorTrace.record("page focus", traceFocus()));
  window.addEventListener("blur", () => editorTrace.record("page blur", traceFocus()));
  // Cmd/Ctrl+A in a text control selects that control's text and never reaches the workbench
  // (see selectAllKey.ts: the workbench would otherwise focus the text editor in some cases).
  (${installSelectAllInControls.toString()})(document, ${isTextSelectAll.toString()},
    isApplePlatform(),
    (target) => editorTrace.record("select-all kept in control",
      (target && target.tagName ? String(target.tagName).toLowerCase() : "unknown") + " " + traceFocus()));
  // Tab, Enter, Escape and the arrow keys an open editor has handled stay in the page (see
  // editorKeys.ts): the workbench never runs its own binding for a key the page has already used.
  (${installEditorKeyContainment.toString()})(document, ${isHandledEditorKey.toString()},
    (key, target) => editorTrace.record("editor key kept in page", key + " in "
      + (target && target.tagName ? String(target.tagName).toLowerCase() : "unknown") + " " + traceFocus()));
  const settings = {
    scrollPreviewWithEditor: context.scrollPreviewWithEditor !== false,
    scrollEditorWithPreview: context.scrollEditorWithPreview !== false,
    markEditorSelection: context.markEditorSelection === true,
    doubleClickToSwitchToEditor: context.doubleClickToSwitchToEditor === true,
  };
  const requestedStickyHeadingDepth = context.stickyHeadingDepth;
  const stickyHeadingDepth = typeof requestedStickyHeadingDepth === "number"
      && Number.isFinite(requestedStickyHeadingDepth)
    ? Math.max(1, Math.min(6, Math.round(requestedStickyHeadingDepth)))
    : 3;
  const AUTOSAVE_DELAY_MS = 400;
  const vscode = acquireVsCodeApi();
  // Review comments. Installed before every click handler below: a click on a highlight or badge
  // opens the popover and must not edit the block, follow a link or reveal the source.
  const postCommentMessage = (type, fields) => vscode.postMessage({
    type,
    documentId: context.documentId,
    documentVersion: context.documentVersion,
    requestId: context.requestId,
    ...fields,
  });
  const commentsEnabled = context.commentsEnabled === true;
  const commentThreads = (${installCommentThreads.toString()})(document, window, commentsEnabled
    ? {
      reply: (threadId, body) => postCommentMessage("previewCommentReply", { threadId, body }),
      resolve: (threadId, resolved) => postCommentMessage("previewCommentResolve", { threadId, resolved }),
      remove: (threadId) => postCommentMessage("previewCommentDelete", { threadId }),
    }
    : undefined);
  // The Comment button of a text selection (writable previews only, T43). Not shown while a block
  // editor is open or blocks are selected; it never changes the selection.
  const commentCompose = commentsEnabled ? (${installCommentCompose.toString()})(document, window, {
    post: postCommentMessage,
    busy: () => Boolean(activeBlockEdit || activeFrontmatterEdit || blockSelection.isActive()),
    beforeOpen: () => commentThreads.close(),
  }) : undefined;
  // Edit mode: a plain click on a link value edits its field; Cmd/Ctrl+click still navigates.
  // Registered before the link navigation so that it also runs first when listeners are not capturing.
  document.addEventListener("click", (event) => {
    if (!editMode || event.metaKey || event.ctrlKey || !(event.target instanceof Element)) return;
    const link = event.target.closest('a[data-sphinx-preview-navigation^="okf-link:"]');
    const cell = link ? link.closest("[data-okf-edit-cell]") : undefined;
    const row = cell ? cell.closest("tr[data-okf-field]") : undefined;
    if (!cell || !row || cell.getAttribute("data-okf-edit-cell") === "name"
      || row.getAttribute("data-okf-editable") !== "true") return;
    event.preventDefault?.();
    event.stopImmediatePropagation?.();
    openFrontmatterEditor(row);
  }, true);
  // Edit mode: a plain click on an image inside a link edits its block instead of following the
  // link; Cmd/Ctrl+click still follows it. Registered before the link navigation (see above).
  document.addEventListener("click", (event) => {
    if (!editMode || event.metaKey || event.ctrlKey || !(event.target instanceof Element)) return;
    if (event.target.tagName !== "IMG" || !event.target.closest("a")) return;
    if (event.target.closest("[data-okf-properties]") || event.target.closest("[data-sphinx-preview-block-editor]")) return;
    const block = event.target.closest(mappingsSelector);
    if (!block) return;
    event.preventDefault?.();
    event.stopImmediatePropagation?.();
    openMappedEditor(block, event.target, "end");
  }, true);
  const linkNavigation = (${installLinkNavigation.toString()})(document, window, vscode, context, (navigate) => flushOpenEditorsThen(navigate));
  const firstClearance = (${installFirstClearance.toString()})(document, window);
  try {
    Object.defineProperty(window, "__studioDiagnostics", {
      configurable: true,
      value: Object.freeze({
        trace: () => editorTrace.entries(),
        startedAt: () => traceStartedAt,
        firstClearance: () => firstClearance.describe(),
      }),
    });
  } catch {
    // Diagnostics are optional: a page that cannot expose them still works.
  }
  const applyFigureSizes = ${applyFigureSizes.toString()};
  const applySpanColors = ${applySpanColors.toString()};
  const codeCopy = (${installCodeCopy.toString()})(document, window, (text) => vscode.postMessage({
    type: "previewCopyText",
    documentId: context.documentId,
    documentVersion: context.documentVersion,
    requestId: context.requestId,
    text,
  }));
  // Edit mode: the anchor icon of a label renames it. The result is matched by edit id: the edit
  // itself moves the document version before the answer arrives.
  const labelRename = (${installLabelRename.toString()})(document, window, {
    isEditMode: () => editMode,
    blockedReason: () => activeBlockEdit || activeFrontmatterEdit
      ? "Save or cancel the open edit before renaming a label." : undefined,
    nextEditId: () => "label-" + context.requestId + "-" + (++editSequence),
    post: (rename, editId) => vscode.postMessage({
      type: "previewLabelRename",
      documentId: context.documentId,
      documentVersion: context.documentVersion,
      requestId: context.requestId,
      editId,
      ...rename,
    }),
  });
  // Host round trips of the MyST palette (labels, citation keys, the {doc} file dialog). The answer
  // is matched by edit id. While a native dialog is open the editor's blur handlers stand down:
  // the dialog takes the focus, which is not leaving the editor.
  const hostRequests = (${installHostRequests.toString()})(window, {
    nextEditId: () => "host-" + context.requestId + "-" + (++editSequence),
    post: (request) => vscode.postMessage({
      ...request,
      documentId: context.documentId,
      documentVersion: context.documentVersion,
      requestId: context.requestId,
    }),
  });
  // Local files of PlantUML \`!include\` lines, read by the host for the built-in engine (its bundle
  // asks through a document event). Requests of their own: closing an editor must not cancel them.
  let plantUmlFileSequence = 0;
  const plantUmlFileRequests = (${installHostRequests.toString()})(window, {
    nextEditId: () => "plantuml-" + (++plantUmlFileSequence),
    post: (request) => vscode.postMessage({
      ...request,
      documentId: context.documentId,
      documentVersion: context.documentVersion,
      requestId: context.requestId,
    }),
  });
  (${installPlantUmlFileRequests.toString()})(document, plantUmlFileRequests, ${PLANTUML_FILE_REQUEST_TIMEOUT_MS});
  // Pasting an image into the text box: the host saves it next to the document and names it.
  const pasteImage = (${installPasteImage.toString()})(window);
  const imageParagraphEdit = ${imageParagraphEdit.toString()};
  const pasteHtml = (${installPasteHtml.toString()})();
  // CR 050: the conf.py warnings of a successful render, as a closable banner over the top of the page.
  const warningBanner = (${installWarningBanner.toString()})(document, vscode, context,
    ${warningBannerState.toString()}, ${warningBannerText.toString()});
  // Edit mode: the "Edit figure" button over a hovered figure opens its block editor with the form.
  const figureEditButton = (${installFigureEditButton.toString()})(document, window, {
    isEditMode: () => editMode,
    open: (figure) => openFigureEditor(figure),
  });
  // Zoom changes layout only: keep the source line at the reading line across it.
  const keepReadingLine = () => {
    if (!anchor) {
      const line = lineAtScroll(window.scrollY);
      if (line !== undefined) anchor = { line, owner: "preview" };
    }
    stabilizeLayout();
  };
  // Expanding a chip changes the height of the content: keep the reading line like zoom does.
  const chipToggle = (${installChipToggle.toString()})(document, vscode, context, keepReadingLine);
  // Green bars on blocks changed since the last commit; the host sends the ranges (T16).
  const incomingChanges = (${installIncomingChanges.toString()})(document);
  // Light motion (CR 046): soft appearance after a user action, the theme colour transition, the
  // fade of a block an editor gives back and the glow of blocks an outside change or an undo updated.
  const motion = (${installMotion.toString()})(document, window);
  const incomingToggle = (${installIncomingToggle.toString()})(document, vscode, context);
  // Toolbar Comments button: hides the gray chips, which moves the content like expanding one does.
  const commentsToggle = (${installCommentsToggle.toString()})(document, vscode, context, keepReadingLine);
  const historyControls = (${installHistoryControls.toString()})(document, vscode, context, (navigate) => flushOpenEditorsThen(navigate));
  const viewControls = (${installViewControls.toString()})(document, vscode, context, keepReadingLine);
  // The toolbar changes size when rows 2-3 are collapsed: re-measure everything placed around it.
  const toolbarCollapse = (${installToolbarCollapse.toString()})(document, vscode, context, () => {
    firstClearance.update();
    refreshStickyHeadingPosition();
    tocColumn.layout();
    widthMode.update();
  });
  // The width mode changes layout only as well; Auto re-measures wide elements on every layout pass.
  const widthMode = (${installWidthMode.toString()})(document, window, vscode, context, () => {
    firstClearance.update();
    keepReadingLine();
  });
  // The TOC column changes the available width: re-measure Auto and keep the reading line.
  const tocColumn = (${installTocColumn.toString()})(document, window, vscode, context, (heading) => revealElement(heading), () => {
    firstClearance.update();
    widthMode.update();
    keepReadingLine();
  }, () => readingOffsetValue);
  const themeModes = ["current", "dark", "white", "cream"];
  const themeLabels = { current: "Current theme", dark: "Dark theme", white: "White theme", cream: "Cream theme" };
  const themeButton = document.querySelector?.("[data-sphinx-preview-theme-toggle]");
  const refreshButton = document.querySelector?.("[data-sphinx-preview-refresh]");
  const anchorButton = document.querySelector?.("[data-sphinx-preview-anchor]");
  const editModeButton = document.querySelector?.("[data-sphinx-preview-edit-toggle]");
  const stickyHeadings = document.querySelector?.("[data-sphinx-preview-sticky-headings]");
  const savedState = vscode.getState?.();
  let descriptionsCollapsed = (savedState?.documentId === context.documentId ? savedState.descriptionsCollapsed : undefined)
    ?? context.initialState?.descriptionsCollapsed
    ?? (window.innerWidth <= 640);
  let previewThemeMode = themeModes.includes(context.previewThemeMode)
    ? context.previewThemeMode
    : themeModes.includes(savedState?.previewThemeMode)
      ? savedState.previewThemeMode
      : ${JSON.stringify(DEFAULT_PREVIEW_THEME_MODE)};
  let anchorToEditor = typeof savedState?.anchorToEditor === "boolean"
    ? savedState.anchorToEditor
    : settings.scrollPreviewWithEditor;
  let editMode = editModeButton
    ? (typeof savedState?.editMode === "boolean" ? savedState.editMode : context.initialEditMode === true)
    : false;
  const paletteModes = ["strict", "gfm", "myst"];
  let paletteMode = paletteModes.includes(savedState?.paletteMode)
    ? savedState.paletteMode
    : paletteModes.includes(context.initialPaletteMode) ? context.initialPaletteMode : ${JSON.stringify(DEFAULT_EDITING_CONFIGURATION.defaultPaletteMode)};
  let activeBlockEdit;
  let activeFrontmatterEdit;
  // Latest properties-table markup the host sent while a frontmatter editor was open (T30).
  let deferredPropertiesMarkup;
  let deferredPropertiesSeq;
  let editSequence = 0;
  let pendingBlockNavigation = savedState?.pendingBlockNavigation;
  // After a move of a block selection: where the selection sits once the move is rendered, by
  // ordinal among the body blocks and the block count. Kept in the saved state so a full reload of
  // the page (not only a content patch) restores it; a changed block count restores nothing.
  let pendingMoveSelection = savedState?.pendingMoveSelection;
  // After an add, the re-rendered preview opens the editor of the new field.
  let pendingFrontmatterEdit = savedState?.pendingFrontmatterEdit;
// The requestId of the render whose load opened the editor for the pending edit.
let pendingEditOpenedIn = savedState?.pendingFrontmatterEditOpenedIn;
  // True while the editor opened for the pending edit is still open (see resumePendingFrontmatterEdit).
  let pendingEditorOpen = false;
  // The edit toggle is only rendered when the document may be edited (trusted workspace).
  const checkboxEditingEnabled = Boolean(editModeButton);
  const checkboxSelector = "input.myst-checkbox";
  const pendingCheckboxToggles = new Map();
  // Inline threads (<!-- THREAD): the reply box and Delete of an open thread; the host edits the file.
  const inlineThreads = (${installInlineThreads.toString()})(document, {
    enabled: checkboxEditingEnabled,
    blockedReason: () => activeBlockEdit || activeFrontmatterEdit
      ? "Save or cancel the open edit before changing a thread." : undefined,
    ask: (type, payload, done) => hostRequests.ask(type, payload, {}, done),
  });
  const mappingsSelector = "[data-sphinx-source-file][data-sphinx-source-line]";
  let layout = [];
  let anchorMap = [];
  let readingOffsetValue = 0;
  let observedBandHeight = 0;
  let observedWidth;
  // The single scroll anchor of this preview (see anchorPolicy.ts / docs/scroll-anchoring.md).
  let anchor;
  // While an inline editor is open, layout changes keep the edited block still on screen.
  let editAnchor;
  let expectedScroll;
  let lastPostedLine;
  let frame;
  let sourceScrollSequence = 0;

  function stateSnapshot(line) {
    const details = Array.from(document.querySelectorAll("details"))
      .map((element, index) => element.open ? index : undefined)
      .filter((index) => index !== undefined);
    const active = document.activeElement;
    const focusedBlockId = active?.closest?.(mappingsSelector)?.getAttribute(
      "data-sphinx-preview-block",
    ) || undefined;
    const selection = window.getSelection?.();
    const selectedText = selection?.toString?.().slice(0, 4096) || undefined;
    const state = {
      documentId: context.documentId,
      sourceFile: context.activeSourceFile,
      sourceLine: line === undefined ? undefined : anchorPolicy.editorTopLine(line),
      scrollTop: Math.max(0, window.scrollY),
      ...(focusedBlockId ? { focusedBlockId } : {}),
      ...(selectedText ? { selectedText } : {}),
      ...(details.length ? { openDisclosures: details } : {}),
      ...(pendingBlockNavigation ? { pendingBlockNavigation } : {}),
      ...(pendingMoveSelection ? { pendingMoveSelection } : {}),
      ...(pendingFrontmatterEdit ? { pendingFrontmatterEdit } : {}),
      ...(pendingFrontmatterEdit && pendingEditOpenedIn !== undefined
        ? { pendingFrontmatterEditOpenedIn: pendingEditOpenedIn } : {}),
      previewThemeMode,
      anchorToEditor,
      editMode,
      paletteMode,
      descriptionsCollapsed,
      viewZoom: viewControls.zoom(),
      viewWidthMode: widthMode.mode(),
      viewToc: tocColumn.open(),
      tocCollapsed: tocColumn.collapsed(),
      expandedChips: chipToggle.expanded(),
    };
    vscode.setState?.(state);
    return state;
  }

  // Floating "Preview pending" overlay (D-22). It is fixed-position and pointer-transparent, so it
  // never changes layout; the next ready render replaces the whole document, which removes it.
  let pendingOverlay = null;

  function applyPendingOverlay(message) {
    if (typeof message.visible !== "boolean"
      || typeof message.label !== "string" || message.label.length > 500
      || typeof message.message !== "string" || message.message.length > 500) {
      return;
    }
    if (!message.visible) {
      if (pendingOverlay) pendingOverlay.remove();
      pendingOverlay = null;
      return;
    }
    if (!pendingOverlay) {
      pendingOverlay = document.createElement("aside");
      pendingOverlay.setAttribute("data-sphinx-preview-pending-overlay", "");
      pendingOverlay.setAttribute("role", "status");
      pendingOverlay.setAttribute("aria-live", "polite");
      pendingOverlay.appendChild(document.createElement("strong"));
      pendingOverlay.appendChild(document.createElement("span"));
      document.body.appendChild(pendingOverlay);
    }
    pendingOverlay.childNodes[0].textContent = message.label;
    pendingOverlay.childNodes[1].textContent = message.message;
  }

  // In-place content patch (T34). The host sends the sanitized inner HTML of the content container
  // instead of loading a new document; the runtime keeps running and moves to the new render. The
  // status region is rebuilt from plain text and never goes through innerHTML.
  const PATCH_STATUSES = ["pending", "success", "stale", "error", "missing-source", "recovery"];
  const MAX_PATCH_CONTENT_LENGTH = 20 * 1024 * 1024;
  const MAX_PATCH_DIAGNOSTICS = 500;

  function isValidContentPatch(message) {
    const next = message.next;
    if (!next || typeof next !== "object"
      || !Number.isSafeInteger(next.documentVersion) || !Number.isSafeInteger(next.requestId)) return false;
    if (next.initialAnchor !== undefined && !Number.isFinite(next.initialAnchor)) return false;
    const pin = next.initialPin;
    if (pin !== undefined && (!pin || typeof pin !== "object"
      || !Number.isFinite(pin.line) || !Number.isFinite(pin.viewportTop))) return false;
    if (typeof message.contentHtml !== "string" || message.contentHtml.length > MAX_PATCH_CONTENT_LENGTH) return false;
    if (!PATCH_STATUSES.includes(message.status)) return false;
    if (typeof message.label !== "string" || message.label.length > 500) return false;
    if (message.message !== undefined && (typeof message.message !== "string" || message.message.length > 20000)) return false;
    return Array.isArray(message.diagnostics)
      && message.diagnostics.length <= MAX_PATCH_DIAGNOSTICS
      && message.diagnostics.every((entry) => entry && typeof entry.severity === "string"
        && entry.severity.length <= 50 && typeof entry.text === "string" && entry.text.length <= 20000
        && (entry.code === undefined || (typeof entry.code === "string" && entry.code.length <= 100)));
  }

  // The status region of a rendered page: label, optional message, optional diagnostics list. Every
  // field is set with textContent.
  function applyStatusRegion(message) {
    const region = document.createElement("aside");
    region.setAttribute("data-sphinx-preview-status", message.status);
    region.setAttribute("role", "status");
    region.setAttribute("aria-live", "polite");
    const label = document.createElement("strong");
    label.textContent = message.label;
    region.appendChild(label);
    if (message.message) {
      const detail = document.createElement("span");
      detail.setAttribute("data-sphinx-preview-status-message", "");
      detail.textContent = message.message;
      region.appendChild(detail);
    }
    if (message.diagnostics.length > 0) {
      const list = document.createElement("ul");
      list.setAttribute("data-sphinx-preview-diagnostics", "");
      message.diagnostics.forEach((entry) => {
        const item = document.createElement("li");
        item.setAttribute("data-sphinx-preview-diagnostic-severity", entry.severity);
        if (entry.code !== undefined) item.setAttribute("data-sphinx-preview-diagnostic-code", entry.code);
        item.textContent = entry.text;
        list.appendChild(item);
      });
      region.appendChild(list);
    }
    document.querySelector("[data-sphinx-preview-status]")?.remove?.();
    document.body.insertBefore(region, document.body.firstChild || null);
  }

  function applyContentPatch(message) {
    if (!isValidContentPatch(message)) return;
    const main = document.getElementById?.("sphinx-myst-preview-content");
    if (!main) return;
    const next = message.next;
    // Carried over because the new content starts with everything closed: the open disclosures.
    const openDisclosures = Array.from(document.querySelectorAll("details"))
      .map((element, index) => element.open ? index : undefined)
      .filter((index) => index !== undefined);
    // Target hints the host already gave for links; the new link elements start without them.
    const linkHints = new Map();
    Array.from(document.querySelectorAll("a[data-sphinx-preview-navigation]")).forEach((link) => {
      const request = link.getAttribute("data-sphinx-preview-navigation");
      const state = link.getAttribute("data-sphinx-preview-link-state");
      if (request && state) linkHints.set(request, { state, title: link.getAttribute("title") });
    });
    // Editors are closed without cancelling: the document keeps whatever was already saved.
    editorTrace.record("content patch", "request " + context.requestId + " -> " + next.requestId);
    // Whatever the patch closes or restores appears at once; only the updated blocks glow.
    motion.hold();
    deferredPropertiesMarkup = undefined;
    closeFrontmatterEditor("content patch");
    applyingContentPatch = true;
    closeBlockEdit(false);
    applyingContentPatch = false;
    closeLinkTooltip();
    codeCopy.hide();
    setEditHover(undefined);
    pendingCheckboxToggles.clear();
    clearBlockSelection(true);
    applyPendingOverlay({ visible: false, label: "", message: "" });
    main.innerHTML = message.contentHtml;
    context.documentVersion = next.documentVersion;
    context.requestId = next.requestId;
    if (next.initialAnchor !== undefined) context.initialAnchor = next.initialAnchor;
    else delete context.initialAnchor;
    if (next.initialPin !== undefined) {
      context.initialPin = { line: next.initialPin.line, viewportTop: next.initialPin.viewportTop };
    } else {
      delete context.initialPin;
    }
    if (openDisclosures.length > 0) context.initialState = { openDisclosures };
    else delete context.initialState;
    document.documentElement.setAttribute("data-sphinx-preview-document-version", String(context.documentVersion));
    document.documentElement.setAttribute("data-sphinx-preview-request-id", String(context.requestId));
    applyStatusRegion(message);
    if (linkHints.size > 0) {
      Array.from(document.querySelectorAll("a[data-sphinx-preview-navigation]")).forEach((link) => {
        const hint = linkHints.get(link.getAttribute("data-sphinx-preview-navigation"));
        if (!hint) return;
        link.setAttribute("data-sphinx-preview-link-state", hint.state);
        if (hint.title !== null) link.setAttribute("title", hint.title);
      });
    }
    pinApplied = false;
    initializeContent({ restore: true });
    linkNavigation.rescan();
    contentReplaced();
    postPreviewReady();
    applyPendingBlockSelection();
    // Set by the host only when the change came from outside the preview or was an undo / redo.
    motion.glow(message.updatedRanges);
  }

  function sameContext(candidate) {
    return candidate && candidate.documentId === context.documentId
      && candidate.documentVersion === context.documentVersion
      && candidate.requestId === context.requestId;
  }

  function normalize(value) {
    return value.replaceAll("\\\\", "/");
  }

  function isVisible(element, rectangle) {
    const style = window.getComputedStyle?.(element);
    if (style && (style.display === "none" || style.visibility === "hidden")) return false;
    const clientRects = element.getClientRects?.();
    if (clientRects && clientRects.length === 0) return false;
    return rectangle.height > 0;
  }

  // Document y where each soft-wrapped source line of a paragraph starts. Paragraph text keeps
  // the source line breaks as newline characters, so the line after each newline starts at the
  // first visible character that follows it.
  function measureLineTops(element, line, endLine) {
    if (endLine <= line || String(element.tagName || "").toUpperCase() !== "P"
      || typeof document.createTreeWalker !== "function"
      || typeof document.createRange !== "function") return undefined;
    const walker = document.createTreeWalker(element, 4);
    const range = document.createRange();
    const tops = [];
    let waiting = 0;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = String(node.data || "");
      for (let index = 0; index < text.length; index += 1) {
        const character = text[index];
        if (character === "\\n") {
          waiting += 1;
          continue;
        }
        if (waiting === 0 || character.trim() === "") continue;
        range.setStart(node, index);
        range.setEnd(node, index + 1);
        const rectangle = range.getClientRects?.()[0] ?? range.getBoundingClientRect?.();
        if (!rectangle || !Number.isFinite(rectangle.top)) return undefined;
        for (; waiting > 0; waiting -= 1) tops.push(rectangle.top + window.scrollY);
      }
    }
    return tops.length === endLine - line ? tops : undefined;
  }

  function parseMappings() {
    return Array.from(document.querySelectorAll(mappingsSelector))
      .map((element, domOrder) => {
        const sourceFile = element.getAttribute("data-sphinx-source-file");
        const sourceLine = element.getAttribute("data-sphinx-source-line");
        const documentId = element.getAttribute("data-sphinx-preview-document");
        const parsedSourceLine = sourceLine ? Number(sourceLine) : Number.NaN;
        if (!sourceFile || !sourceLine || !documentId || documentId !== context.documentId
          || normalize(sourceFile) !== normalize(context.activeSourceFile)
          || !/^[1-9]\\d*$/.test(sourceLine)
          || !Number.isSafeInteger(parsedSourceLine)) {
          return undefined;
        }
        const rectangle = element.getBoundingClientRect();
        if (!isVisible(element, rectangle)) return undefined;
        const parsedEndLine = Number(element.getAttribute("data-sphinx-source-end-line"));
        const endLine = Number.isSafeInteger(parsedEndLine) && parsedEndLine > parsedSourceLine
          ? parsedEndLine
          : parsedSourceLine;
        const lineTops = measureLineTops(element, parsedSourceLine, endLine);
        return {
          element,
          sourceLine: parsedSourceLine,
          endLine,
          ...(lineTops ? { lineTops } : {}),
          top: rectangle.top + window.scrollY,
          height: rectangle.height,
          domOrder,
        };
      })
      .filter((mapping) => mapping !== undefined)
      .sort((left, right) => left.top - right.top || left.sourceLine - right.sourceLine);
  }

  function clearMarkedSourceLine() {
    document.querySelectorAll(mappingsSelector).forEach((element) => {
      element.removeAttribute?.("data-sphinx-preview-current");
      element.removeAttribute?.("aria-current");
    });
  }

  function markSourceLine(sourceLine) {
    clearMarkedSourceLine();
    if (!settings.markEditorSelection || !Number.isFinite(sourceLine) || !layout.length) return;
    const nearest = layout.reduce((best, candidate) => {
      if (!best) return candidate;
      return Math.abs(candidate.sourceLine - sourceLine) < Math.abs(best.sourceLine - sourceLine)
        ? candidate
        : best;
    }, undefined);
    nearest?.element?.setAttribute?.("data-sphinx-preview-current", "true");
    nearest?.element?.setAttribute?.("aria-current", "location");
  }

  function visibleStickyHeadingHeight() {
    if (!stickyHeadings || stickyHeadings.hidden) return 0;
    return Math.max(0, stickyHeadings.getBoundingClientRect().height);
  }

  function visibleStickyHeadingBottom() {
    if (!stickyHeadings || stickyHeadings.hidden) return 0;
    const rectangle = stickyHeadings.getBoundingClientRect?.();
    return rectangle && Number.isFinite(rectangle.bottom) ? Math.max(0, rectangle.bottom) : 0;
  }

  function refreshStickyHeadingPosition() {
    if (!stickyHeadings) return;
    const toolbar = document.querySelector?.("[data-sphinx-preview-toolbar]");
    const toolbarBounds = toolbar?.getBoundingClientRect?.();
    const toolbarWidth = toolbarBounds && Number.isFinite(toolbarBounds.width)
      ? Math.max(0, toolbarBounds.width) + 22
      : 0;
    stickyHeadings.style?.setProperty?.("--sphinx-preview-toolbar-width", toolbarWidth + "px");
  }

  function maxScrollTop() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  // Reading offset R: the strip reserved at the top of the viewport for the fixed sticky
  // heading band. It only grows for a given width, so the reading line never moves while
  // the band changes content.
  function refreshReadingOffset() {
    if (!stickyHeadings) {
      readingOffsetValue = 0;
      return;
    }
    refreshStickyHeadingPosition();
    const width = document.documentElement?.clientWidth;
    if (width !== observedWidth) {
      observedWidth = width;
      observedBandHeight = 0;
    }
    observedBandHeight = Math.max(observedBandHeight, visibleStickyHeadingHeight());
    const style = window.getComputedStyle?.(stickyHeadings);
    const rawLineHeight = String(style?.lineHeight ?? "");
    const fontSize = Number.parseFloat(style?.fontSize);
    let lineHeight = 20;
    if (rawLineHeight.endsWith("px") && Number.parseFloat(rawLineHeight) > 0) {
      lineHeight = Number.parseFloat(rawLineHeight);
    } else if (fontSize > 0) {
      lineHeight = fontSize * 1.5;
    }
    readingOffsetValue = Math.max(
      anchorPolicy.readingOffset(stickyHeadingDepth, lineHeight, 5),
      observedBandHeight,
      visibleStickyHeadingBottom(),
    );
    document.documentElement.style?.setProperty?.("--sphinx-preview-reading-offset", readingOffsetValue + "px");
  }

  function lineAtScroll(scrollTop) {
    return anchorPolicy.lineAtScrollTop(anchorMap, scrollTop, readingOffsetValue);
  }

  function scrollAtLine(sourceLine) {
    return anchorPolicy.scrollTopForLine(anchorMap, sourceLine, readingOffsetValue, maxScrollTop());
  }

  // Programmatic scrolls are silent: the resulting scroll event is recognized and dropped.
  function programmaticScroll(top) {
    expectedScroll = { top, until: Date.now() + 500 };
    if (Math.abs(window.scrollY - top) >= 0.5) window.scrollTo({ top, behavior: "auto" });
  }

  // Re-applies the anchor after any layout change instead of re-deriving it from the scroll.
  function applyAnchor() {
    if (editAnchor?.element) {
      const viewportTop = editAnchor.element.getBoundingClientRect().top;
      if (!Number.isFinite(viewportTop)) return;
      const target = Math.max(0, Math.min(
        maxScrollTop(),
        window.scrollY + viewportTop - editAnchor.viewportTop,
      ));
      programmaticScroll(target);
      const line = lineAtScroll(target);
      if (line !== undefined) anchor = { line, owner: anchor?.owner ?? "preview" };
      // Re-check only when the toolbar first appears or changes size (a wrapping status line,
      // a resize), so a deliberate user scroll or a cell switch never makes the page jump.
      const editing = activeBlockEdit;
      if (editing?.tableMenu && editing.selectedCell) {
        const barHeight = editing.tableMenu.getBoundingClientRect?.()?.height;
        if (barHeight !== editing.tableMenuHeight) {
          editing.tableMenuHeight = barHeight;
          revealTableToolbar(editing.tableMenu, editing.selectedCell);
        }
      } else if (editing?.palette && editing.textarea) {
        const barHeight = editing.palette.element.getBoundingClientRect?.()?.height;
        if (barHeight !== editing.paletteHeight) {
          editing.paletteHeight = barHeight;
          syncPaletteSticky(editing);
          revealTableToolbar(editing.palette.element, editing.textarea);
        }
      }
      return;
    }
    if (!anchor) return;
    const target = scrollAtLine(anchor.line);
    if (target !== undefined) programmaticScroll(target);
  }

  function beginEditAnchor(element) {
    const viewportTop = element?.getBoundingClientRect?.().top;
    editAnchor = Number.isFinite(viewportTop) ? { element, viewportTop } : undefined;
  }

  function anchorField() {
    return anchor ? { anchorLine: anchor.line } : {};
  }

  // Final saves carry the edited element's source line and viewport top, so the render that
  // follows can put the element back at the same screen position (rule R7). A hidden rendered
  // element has an empty rect; the editor element then stands in for it.
  function pinFields(line, element, fallback, fallbackOffset = 0) {
    let rect = element?.getBoundingClientRect?.();
    let offset = 0;
    if (!rect || !(rect.height > 0)) {
      rect = fallback?.getBoundingClientRect?.();
      offset = fallbackOffset;
    }
    const top = rect?.top + offset;
    if (!Number.isSafeInteger(line) || line < 1 || !Number.isFinite(top) || Math.abs(top) > 100000) {
      return {};
    }
    return { pinLine: line, pinViewportTop: top };
  }

  function frontmatterPinFields(cell) {
    const properties = cell?.closest?.("[data-okf-properties]")
      || document.querySelector?.("[data-okf-properties]");
    return pinFields(1, properties);
  }

  function blockPinFields(edit) {
    const line = edit.insertAfterLine !== undefined
      ? Math.max(1, edit.insertAfterLine + 1)
      : edit.line;
    const table = edit.selectedCell?.closest?.("table");
    // The edition palette pushed the frame up (paletteShift) to keep the text still: the
    // element comes back where the frame stood before that.
    return pinFields(line, table || edit.renderedTarget || edit.target, edit.host ?? edit.element, edit.paletteShift ?? 0);
  }

  function pinEntryFor(line) {
    let best;
    for (const entry of layout) {
      if (entry.sourceLine === line) return entry;
      if (entry.sourceLine <= line && (!best || entry.sourceLine >= best.sourceLine)) best = entry;
    }
    return best;
  }

  // True when this load restored the pinned position; previewReady then reports the pinned anchor.
  let pinApplied = false;

  function restoreState() {
    const initial = context.initialState;
    let disclosuresOpened = false;
    if (initial?.openDisclosures?.length) {
      Array.from(document.querySelectorAll("details")).forEach((element, index) => {
        if (initial.openDisclosures.includes(index) && !element.open) {
          element.open = true;
          disclosuresOpened = true;
        }
      });
    }
    if (disclosuresOpened) measure();
    const pin = context.initialPin;
    const pinEntry = pin && Number.isFinite(pin.line) && Number.isFinite(pin.viewportTop)
      ? pinEntryFor(pin.line)
      : undefined;
    const initialLine = context.initialAnchor ?? initial?.sourceLine;
    if (pinEntry) {
      const target = Math.max(0, Math.min(maxScrollTop(), pinEntry.top - pin.viewportTop));
      programmaticScroll(target);
      anchor = { line: lineAtScroll(target) ?? pinEntry.sourceLine, owner: "preview" };
      pinApplied = true;
    } else if (initialLine !== undefined) {
      anchor = { line: initialLine, owner: "preview" };
    } else if (initial?.scrollTop !== undefined) {
      const line = lineAtScroll(Math.max(0, Math.min(maxScrollTop(), initial.scrollTop)));
      if (line !== undefined) anchor = { line, owner: "preview" };
    }
    if (!pinEntry) applyAnchor();
    if (initial?.focusedBlockId) {
      const focused = Array.from(document.querySelectorAll(mappingsSelector))
        .find((element) => element.getAttribute("data-sphinx-preview-block") === initial.focusedBlockId);
      focused?.focus?.({ preventScroll: true });
    }
  }

  function measure() {
    layout = parseMappings();
    anchorMap = anchorPolicy.buildAnchorMap(layout.map((entry) => ({
      top: entry.top,
      height: entry.height,
      line: entry.sourceLine,
      endLine: entry.endLine ?? entry.sourceLine,
      ...(entry.lineTops ? { lineTops: entry.lineTops } : {}),
    })));
    refreshReadingOffset();
  }


  // A comment chip and its hidden body are not part of a heading's wording.
  function headingLabel(heading) {
    if (typeof heading.cloneNode !== "function" || !heading.querySelector?.(".okf-comment")) {
      return heading.textContent;
    }
    const copy = heading.cloneNode(true);
    copy.querySelectorAll(".okf-comment").forEach((comment) => comment.remove());
    return copy.textContent;
  }

  function updateStickyHeadings() {
    if (!stickyHeadings) return;
    refreshStickyHeadingPosition();
    const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"));
    let previousActiveIndex = -2;
    for (let pass = 0; pass < 3; pass += 1) {
      const activeThreshold = stickyHeadings.hidden || window.scrollY <= 1
        ? 0
        : stickyHeadings.getBoundingClientRect().bottom;
      let activeIndex = -1;
      let activeTop = Number.NEGATIVE_INFINITY;
      for (let index = 0; index < headings.length; index += 1) {
        const bounds = headings[index].getBoundingClientRect();
        if (bounds.height > 0 && bounds.top <= activeThreshold && bounds.top > activeTop) {
          activeIndex = index;
          activeTop = bounds.top;
        }
      }
      if (activeIndex === previousActiveIndex) return;
      previousActiveIndex = activeIndex;
      if (activeIndex < 0) {
        stickyHeadings.hidden = true;
        stickyHeadings.textContent = "";
        if (document.body) document.body.removeAttribute("data-sphinx-preview-sticky-headings-active");
        continue;
      }

      const active = headings[activeIndex];
      const activeLevel = Number(active.tagName.slice(1));
      const labels = [];
      let childLevel = activeLevel;
      for (
        let index = activeIndex - 1;
        index >= 0 && labels.length < stickyHeadingDepth - 1;
        index -= 1
      ) {
        const heading = headings[index];
        const level = Number(heading.tagName.slice(1));
        const text = headingLabel(heading).trim();
        if (level < childLevel && text) {
          labels.unshift("#".repeat(level) + " " + text);
          childLevel = level;
        }
      }
      const activeText = headingLabel(active).trim();
      if (activeText) labels.push("#".repeat(activeLevel) + " " + activeText);
      stickyHeadings.textContent = labels.join("\\n");
      stickyHeadings.hidden = labels.length === 0;
      if (visibleStickyHeadingHeight() > observedBandHeight) refreshReadingOffset();
      if (document.body) {
        if (labels.length > 0) {
          document.body.setAttribute("data-sphinx-preview-sticky-headings-active", "true");
        } else {
          document.body.removeAttribute("data-sphinx-preview-sticky-headings-active");
        }
      }
    }
  }

  function postScroll() {
    frame = undefined;
    updateStickyHeadings();
    tocColumn.track();
    const scrollTop = window.scrollY;
    if (expectedScroll && Date.now() <= expectedScroll.until
      && Math.abs(scrollTop - expectedScroll.top) <= 2) return;
    expectedScroll = undefined;
    // User scroll: the preview now owns the anchor.
    const line = lineAtScroll(scrollTop);
    if (line === undefined) return;
    anchor = { line, owner: "preview" };
    if (editAnchor?.element) {
      const viewportTop = editAnchor.element.getBoundingClientRect().top;
      if (Number.isFinite(viewportTop)) editAnchor.viewportTop = viewportTop;
    }
    const state = stateSnapshot(line);
    const sourceLine = anchorPolicy.editorTopLine(line);
    const leadsEditor = anchorToEditor && settings.scrollEditorWithPreview && sourceLine !== lastPostedLine;
    if (leadsEditor) lastPostedLine = sourceLine;
    vscode.postMessage({
      type: leadsEditor ? "previewScroll" : "previewState",
      documentId: context.documentId,
      documentVersion: context.documentVersion,
      requestId: context.requestId,
      line: sourceLine,
      anchorLine: line,
      scrollTop: state.scrollTop,
      ...(state.focusedBlockId ? { focusedBlockId: state.focusedBlockId } : {}),
      ...(state.selectedText ? { selectedText: state.selectedText } : {}),
      ...(state.openDisclosures ? { openDisclosures: state.openDisclosures } : {}),
      descriptionsCollapsed,
    });
  }

  function scheduleScroll() {
    if (frame === undefined) frame = window.requestAnimationFrame(postScroll);
  }

  // Keeps short identifiers whole in a table that scrolls sideways and flags the overflow so the
  // stylesheet can draw edge shadows. Attributes are written only when the value changes, so the
  // ResizeObserver never loops.
  function markWideTables() {
    document.querySelectorAll("#sphinx-myst-preview-content table").forEach((table) => {
      if (table.closest("[data-okf-properties]")) return;
      table.querySelectorAll("th, td").forEach((cell) => {
        if (cell.getAttribute("data-sphinx-short-cell") !== null) return;
        if (/^\\S{1,24}$/u.test((cell.textContent ?? "").trim())) {
          cell.setAttribute("data-sphinx-short-cell", "true");
        }
      });
      const overflowing = table.scrollWidth > table.clientWidth + 1;
      if (overflowing !== (table.getAttribute("data-sphinx-table-overflow") === "true")) {
        if (overflowing) table.setAttribute("data-sphinx-table-overflow", "true");
        else table.removeAttribute("data-sphinx-table-overflow");
      }
    });
  }

  function stabilizeLayout() {
    window.requestAnimationFrame(() => {
      activeBlockEdit?.resizeTextarea?.();
      activeFrontmatterEdit?.resizeTextarea?.();
      markWideTables();
      widthMode.update();
      measure();
      applyAnchor();
      updateStickyHeadings();
      tocColumn.remeasure();
      incomingChanges.layout();
    });
  }

  function applyTheme(themeKind) {
    const target = document.documentElement ?? document.body;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    target?.setAttribute?.("data-sphinx-preview-theme", String(themeKind ?? "default"));
    target?.setAttribute?.("data-sphinx-preview-reduced-motion", reducedMotion ? "true" : "false");
  }

  function applyPreviewThemeMode(mode) {
    if (!themeModes.includes(mode)) mode = ${JSON.stringify(DEFAULT_PREVIEW_THEME_MODE)};
    previewThemeMode = mode;
    document.documentElement?.setAttribute?.("data-sphinx-preview-theme-mode", mode);
    themeButton?.setAttribute?.("data-theme-mode", mode);
    const nextMode = themeModes[(themeModes.indexOf(mode) + 1) % themeModes.length];
    themeButton?.setAttribute?.("aria-label", "Preview theme: " + themeLabels[mode]);
    const tooltip = themeLabels[mode] + " (click for " + themeLabels[nextMode].toLowerCase() + ")";
    themeButton?.setAttribute?.("title", tooltip);
    themeButton?.setAttribute?.("data-tooltip", tooltip);
  }

  function cyclePreviewThemeMode() {
    const currentIndex = themeModes.indexOf(previewThemeMode);
    motion.themeSwitch();
    applyPreviewThemeMode(themeModes[(currentIndex + 1) % themeModes.length]);
    const state = vscode.getState?.();
    vscode.setState?.({
      ...(state && typeof state === "object" ? state : {}),
      previewThemeMode,
    });
    vscode.postMessage({
      type: "previewThemeModeChanged",
      documentId: context.documentId,
      documentVersion: context.documentVersion,
      requestId: context.requestId,
      previewThemeMode,
    });
  }

  function applyAnchorMode(enabled) {
    anchorToEditor = enabled;
    settings.scrollPreviewWithEditor = enabled;
    anchorButton?.setAttribute?.("data-anchor-mode", enabled ? "on" : "off");
    anchorButton?.setAttribute?.("aria-pressed", String(enabled));
    const tooltip = enabled
      ? "Preview and text editor scroll together"
      : "Preview and text editor scroll independently";
    anchorButton?.setAttribute?.("title", tooltip);
    anchorButton?.setAttribute?.("data-tooltip", tooltip);
  }

  function applyPairing(paired) {
    if (!anchorButton) return;
    anchorButton.disabled = !paired;
    if (!paired) {
      const tooltip = "No text editor shows this file";
      anchorButton.setAttribute?.("title", tooltip);
      anchorButton.setAttribute?.("data-tooltip", tooltip);
      anchorButton.setAttribute?.("aria-label", tooltip);
      // A disabled button must not look active: the pressed colour applies to aria-pressed="true".
      anchorButton.setAttribute?.("aria-pressed", "false");
      return;
    }
    anchorButton.setAttribute?.("aria-label", "Anchor preview to text editor");
    applyAnchorMode(anchorToEditor);
  }

  function postAnchorModeChanged() {
    vscode.postMessage({
      type: "previewAnchorModeChanged",
      documentId: context.documentId,
      documentVersion: context.documentVersion,
      requestId: context.requestId,
      anchorToEditor,
    });
  }

  function hideTableCellContent(cell) {
    const content = document.createElement("span");
    content.setAttribute("data-sphinx-table-cell-content", "true");
    content.setAttribute("aria-hidden", "true");
    Array.from(cell.childNodes).forEach((node) => content.appendChild(node));
    cell.appendChild(content);
    return content;
  }

  function restoreTableCellContent(edit) {
    if (!edit.renderedCellContent || !edit.selectedCell) return;
    Array.from(edit.renderedCellContent.childNodes).forEach((node) => {
      edit.selectedCell.insertBefore(node, edit.renderedCellContent);
    });
    edit.renderedCellContent.remove();
    edit.renderedCellContent = undefined;
  }

  // The cancel branch is used by Cancel and Escape when something reached the document;
  // Done, Cmd/Ctrl+Enter and leaving edit mode commit the text instead.
  function closeBlockEdit(cancel = false) {
    const edit = activeBlockEdit;
    if (!edit) return;
    editorTrace.record(edit.selectedCell ? "cell editor closed" : "block editor closed",
      (cancel ? "cancel " : "") + "line=" + edit.line + " " + traceFocus(), traceStack());
    activeBlockEdit = undefined;
    // An editor that closes without the patch of its save has nothing left to wait for.
    if (!applyingContentPatch) pendingBlockSelection = undefined;
    document.documentElement?.removeAttribute?.("data-sphinx-preview-block-editing");
    hostRequests.cancelAll();
    if (edit.autosaveTimer !== undefined) {
      window.clearTimeout(edit.autosaveTimer);
      edit.autosaveTimer = undefined;
    }
    if (cancel) {
      clearPendingBlockNavigation();
      vscode.postMessage({
        type: "previewEditCancel",
        documentId: context.documentId,
        documentVersion: context.documentVersion,
        requestId: context.requestId,
        editId: edit.editId,
        line: edit.line,
        endLine: edit.endLine,
        ...(edit.insertAfterLine !== undefined ? { insertAfterLine: edit.insertAfterLine } : {}),
      });
    }
    if (edit.tableMenuPositionListener) {
      window.removeEventListener?.("scroll", edit.tableMenuPositionListener, true);
      window.removeEventListener?.("resize", edit.tableMenuPositionListener);
    }
    edit.tableMenu?.remove?.();
    edit.linkPanel?.destroy();
    edit.linkPanel = undefined;
    edit.figurePanel?.destroy();
    edit.figurePanel = undefined;
    edit.slashMenu?.destroy();
    edit.cellSlash?.destroy();
    edit.palette?.destroy();
    edit.cellPalette?.destroy();
    restoreTableCellContent(edit);
    if (edit.selectedCell) {
      edit.selectedCell.removeAttribute("data-sphinx-preview-table-cell-selected");
    } else {
      (edit.renderedTarget || edit.target).removeAttribute("data-sphinx-preview-editing");
    }
    motion.editorClosed(edit.selectedCell || edit.renderedTarget || edit.target);
    edit.element.remove?.();
    edit.host?.remove?.();
    if (edit.host) document.documentElement?.style?.removeProperty?.("scroll-padding-top");
    // Opening scrolled the page down by paletteShift to keep the text still; the frame is gone
    // now, so scroll back and the rendered block stays where the user last saw the text.
    if (edit.paletteShift && !edit.selectedCell) {
      const target = Math.max(0, Math.min(maxScrollTop(), window.scrollY - edit.paletteShift));
      programmaticScroll(target);
      const restoredLine = lineAtScroll(target);
      if (restoredLine !== undefined) anchor = { line: restoredLine, owner: anchor?.owner ?? "preview" };
    }
    if (!activeFrontmatterEdit) editAnchor = undefined;
    if (refreshButton) refreshButton.disabled = false;
  }

  function closeFrontmatterEditor(reason) {
    if (!activeFrontmatterEdit) return;
    editorTrace.record("frontmatter editor closed",
      (reason || "unspecified") + " field=" + activeFrontmatterEdit.fieldName + " " + traceFocus(), traceStack());
    if (pendingEditorOpen) {
      pendingEditorOpen = false;
      clearPendingFrontmatterEdit();
    }
    activeFrontmatterEdit.frontmatterMenu?.remove?.();
    activeFrontmatterEdit.displayElement?.removeAttribute("hidden");
    motion.editorClosed(activeFrontmatterEdit.displayElement);
    activeFrontmatterEdit.valueCell.removeAttribute("data-okf-editing");
    activeFrontmatterEdit.valueCell.removeAttribute("data-okf-key-editing");
    activeFrontmatterEdit.editor.remove?.();
    activeFrontmatterEdit = undefined;
    if (!activeBlockEdit) editAnchor = undefined;
    if (!activeBlockEdit && refreshButton) refreshButton.disabled = false;
    if (deferredPropertiesMarkup !== undefined) {
      const markup = deferredPropertiesMarkup;
      deferredPropertiesMarkup = undefined;
      applyPropertiesMarkup(markup, deferredPropertiesSeq);
    }
  }

  // Swaps the host-rendered properties section in place (T30) instead of reloading the page. The
  // markup is built and escaped by the host (propertiesTable.ts); it goes through no other path.
  // seq numbers the host's properties messages: the page shows which one it applied last on
  // <html data-okf-properties-seq>, so a test can wait until the page shows the host's last table.
  function applyPropertiesMarkup(markup, seq) {
    if (Number.isSafeInteger(seq)) {
      document.documentElement?.setAttribute?.("data-okf-properties-seq", String(seq));
    }
    editorTrace.record("properties table applied", "seq " + seq);
    closeLinkTooltip();
    const main = document.getElementById?.("sphinx-myst-preview-content");
    if (!main) return;
    const existing = main.querySelector?.("[data-okf-properties]");
    if (markup === "") {
      existing?.remove?.();
    } else if (existing) {
      existing.insertAdjacentHTML("beforebegin", markup);
      existing.remove();
    } else {
      main.insertAdjacentHTML("afterbegin", markup);
    }
    setFrontmatterEditCells(editMode);
    applyDescriptionVisibility();
    // The insertion points sit next to the properties section; rebuild them when it appeared or
    // went away, unless one of them hosts the open block editor.
    if (Boolean(existing) !== (markup !== "") && !activeBlockEdit) refreshInsertPoints();
    measure();
    applyAnchor();
  }

  function availableFrontmatterFields(properties) {
    try {
      const fields = JSON.parse(properties?.getAttribute("data-okf-available-fields") || "[]");
      return Array.isArray(fields)
        ? fields.filter((field) => field && typeof field.name === "string")
        : [];
    } catch {
      return [];
    }
  }

  function defaultFrontmatterFieldValue(field) {
    if (Object.prototype.hasOwnProperty.call(field, "defaultValue")) return field.defaultValue;
    if (Array.isArray(field.enums) && field.enums.length > 0) return field.enums[0];
    if (field.fieldType === "checkbox") return false;
    if (field.fieldType === "number") return 0;
    if (field.fieldType === "list") return [];
    return "";
  }

  function postFrontmatterAction(edit, action, fieldName, fieldValue, afterField) {
    if (!edit || edit.saving || !fieldName) return;
    const editId = context.requestId + "-field-action-" + (++editSequence);
    edit.editId = editId;
    edit.saving = true;
    edit.control.disabled = true;
    edit.status.removeAttribute("data-visible");
    edit.status.removeAttribute("data-state");
    edit.status.textContent = action === "remove"
      ? "Removing frontmatter field..."
      : "Adding frontmatter field...";
    const message = {
      type: "previewFrontmatterSave",
      documentId: context.documentId,
      documentVersion: context.documentVersion,
      requestId: context.requestId,
      editId,
      frontmatterAction: action,
      fieldName,
      ...frontmatterPinFields(edit.valueCell),
      ...anchorField(),
    };
    if (action !== "remove") message.fieldValue = fieldValue;
    if (action === "add" && typeof afterField === "string" && afterField.length > 0) {
      message.afterField = afterField;
    }
    consumePendingFrontmatterEdit();
    if (action === "add") rememberPendingFrontmatterEdit(fieldName);
    vscode.postMessage(message);
  }

  function rememberPendingFrontmatterEdit(fieldName) {
    pendingFrontmatterEdit = { fieldName, requestId: context.requestId };
    pendingEditorOpen = false;
    const state = vscode.getState?.();
    vscode.setState?.({
      ...(state && typeof state === "object" ? state : {}),
      pendingFrontmatterEdit,
    });
  }

  // Any frontmatter message posted from the editor opened for the pending edit consumes it.
  function consumePendingFrontmatterEdit() {
    if (!pendingEditorOpen) return;
    pendingEditorOpen = false;
    clearPendingFrontmatterEdit();
  }

  function clearPendingFrontmatterEdit() {
    pendingFrontmatterEdit = undefined;
    pendingEditOpenedIn = undefined;
    const state = vscode.getState?.();
    if (!state || typeof state !== "object") return;
    const nextState = { ...state };
    delete nextState.pendingFrontmatterEdit;
    delete nextState.pendingFrontmatterEditOpenedIn;
    vscode.setState?.(nextState);
  }

  // The pending edit is dropped as soon as it cannot be used, or when its editor closes. It is
  // kept across loads that cannot use it yet: a reload of the render that posted the add, or a
  // page without the rendered preview. A later load of the new render opens the editor, and a
  // repeated load of it opens the editor again.
  function resumePendingFrontmatterEdit() {
    const pending = pendingFrontmatterEdit;
    if (!pending) return;
    // A reload of the render that posted the add still shows the old document; wait for the next.
    if (pending.requestId !== undefined && pending.requestId === context.requestId) return;
    // The editor was already opened for a different render: the pending edit is spent.
    if (pendingEditOpenedIn !== undefined && pendingEditOpenedIn !== context.requestId) {
      clearPendingFrontmatterEdit();
      return;
    }
    const rows = Array.from(document.querySelectorAll("tr[data-okf-field]"));
    // The host first loads a page without the rendered preview; the rows come with the next load.
    if (rows.length === 0 && !hasRenderedPreview()) return;
    const row = editMode && typeof pending.fieldName === "string"
      ? rows.find((candidate) => candidate.getAttribute("data-okf-field") === pending.fieldName)
      : undefined;
    if (!row || row.getAttribute("data-okf-editable") !== "true") {
      clearPendingFrontmatterEdit();
      return;
    }
    openFrontmatterEditor(row, { newField: true });
    if (activeFrontmatterEdit) {
      pendingEditorOpen = true;
      pendingEditOpenedIn = context.requestId;
      const state = vscode.getState?.();
      vscode.setState?.({
        ...(state && typeof state === "object" ? state : {}),
        pendingFrontmatterEditOpenedIn: context.requestId,
      });
    } else {
      clearPendingFrontmatterEdit();
    }
  }

  function createFrontmatterMenu(edit, anchor, properties) {
    const menu = document.createElement("div");
    menu.className = "sphinx-preview-frontmatter-menu";
    menu.setAttribute("role", "toolbar");
    menu.setAttribute("aria-label", "Frontmatter field actions");
    menu.setAttribute("data-okf-frontmatter-menu", "true");
    const icons = {
      add: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 3.5h16v17H4z"></path><path d="M12 8v8M8 12h8"></path></svg>',
      remove: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 3.5h16v17H4z"></path><path d="M8 12h8"></path></svg>',
    };
    const appendMenuLabel = (button, text) => {
      const label = document.createElement("span");
      label.className = "sphinx-preview-frontmatter-menu-label";
      label.textContent = text;
      button.appendChild(label);
    };
    const createButton = (name, icon, operation, label) => {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("aria-label", name);
      button.setAttribute("title", name);
      button.setAttribute("data-tooltip", name);
      button.setAttribute("data-okf-frontmatter-operation", operation);
      button.innerHTML = icon;
      appendMenuLabel(button, label);
      menu.appendChild(button);
      return button;
    };
    const addButton = createButton("Add frontmatter field", icons.add, "add", "Add field");
    const removeButton = createButton("Remove frontmatter field", icons.remove, "remove", "Remove field");
    const editedRow = anchor?.closest?.("tr[data-okf-field]");
    if (editedRow?.getAttribute("data-okf-required") === "true") {
      const requiredMessage = "Required by the schema; it cannot be removed";
      removeButton.disabled = true;
      removeButton.setAttribute("title", requiredMessage);
      removeButton.setAttribute("aria-label", requiredMessage);
      removeButton.setAttribute("data-tooltip", requiredMessage);
    }
    const picker = document.createElement("div");
    picker.className = "sphinx-preview-frontmatter-picker";
    picker.setAttribute("hidden", "");
    picker.setAttribute("role", "group");
    picker.setAttribute("aria-label", "Add frontmatter field");
    const fields = availableFrontmatterFields(properties);
    const fieldControl = fields.length > 0
      ? document.createElement("select")
      : document.createElement("input");
    fieldControl.setAttribute("aria-label", "Frontmatter field to add");
    if (fields.length > 0) {
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Choose a field...";
      placeholder.disabled = true;
      placeholder.selected = true;
      fieldControl.appendChild(placeholder);
      for (const field of fields) {
        const option = document.createElement("option");
        option.value = field.name;
        option.textContent = field.name;
        fieldControl.appendChild(option);
      }
      if (properties?.getAttribute?.("data-okf-additional-properties") !== "false") {
        const customOption = document.createElement("option");
        customOption.value = "__custom__";
        customOption.textContent = "Custom key\\u2026";
        fieldControl.appendChild(customOption);
      }
    } else {
      fieldControl.type = "text";
      fieldControl.setAttribute("placeholder", "New field name");
    }
    const confirm = document.createElement("button");
    confirm.type = "button";
    confirm.setAttribute("aria-label", "Add selected frontmatter field");
    confirm.setAttribute("title", "Add selected frontmatter field");
    confirm.setAttribute("data-tooltip", "Add selected frontmatter field");
    confirm.setAttribute("data-okf-frontmatter-operation", "confirm-add");
    confirm.innerHTML = icons.add;
    appendMenuLabel(confirm, "Add");
    confirm.disabled = true;
    const updateConfirmState = () => {
      confirm.disabled = !String(fieldControl.value || "").trim();
    };
    const addChosenField = () => {
      const fieldName = String(fieldControl.value || "").trim();
      if (!fieldName) return;
      const selected = fields.find((field) => field.name === fieldName);
      postFrontmatterAction(
        edit,
        "add",
        fieldName,
        selected ? defaultFrontmatterFieldValue(selected) : "",
        edit.fieldName,
      );
    };
    let customInput;
    const showCustomError = (text) => {
      edit.status.textContent = text;
      edit.status.setAttribute("data-state", "error");
      edit.status.setAttribute("data-visible", "true");
    };
    const addCustomKey = () => {
      const name = String(customInput.value || "");
      if (name.length === 0 || name.trim().length === 0) {
        showCustomError("Enter a name for the new field.");
        return;
      }
      if (name !== name.trim()) {
        showCustomError("The field name cannot start or end with spaces.");
        return;
      }
      if (/[\\r\\n]/u.test(name)) {
        showCustomError("The field name cannot contain a line break.");
        return;
      }
      const exists = Array.from(document.querySelectorAll("tr[data-okf-field]"))
        .some((row) => row.getAttribute("data-okf-field") === name);
      if (exists) {
        showCustomError('The field "' + name + '" already exists.');
        return;
      }
      postFrontmatterAction(edit, "add", name, "", edit.fieldName);
    };
    const showCustomInput = () => {
      if (!customInput) {
        customInput = document.createElement("input");
        customInput.type = "text";
        customInput.setAttribute("aria-label", "New field name");
        customInput.setAttribute("placeholder", "New field name");
        customInput.setAttribute("data-okf-custom-key", "true");
        customInput.addEventListener("keydown", (event) => {
          if (keepUndoInControl(event)) return;
          if (event.key !== "Enter") return;
          event.preventDefault?.();
          addCustomKey();
        });
        fieldControl.after
          ? fieldControl.after(customInput)
          : picker.insertBefore(customInput, confirm);
      }
      customInput.removeAttribute("hidden");
      customInput.focus?.({ preventScroll: true });
    };
    fieldControl.addEventListener("change", () => {
      updateConfirmState();
      if (fieldControl.value === "__custom__") {
        showCustomInput();
        return;
      }
      if (customInput) customInput.setAttribute("hidden", "");
      if (fields.length > 0) addChosenField();
    });
    fieldControl.addEventListener("input", updateConfirmState);
    if (fields.length > 0) {
      // A choice in the select adds the field at once, so the confirm button is not needed.
      // The menu stylesheet gives buttons an explicit display, which would override [hidden].
      confirm.hidden = true;
      confirm.style.display = "none";
    } else {
      fieldControl.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault?.();
        addChosenField();
      });
    }
    confirm.addEventListener("click", addChosenField);
    picker.appendChild(fieldControl);
    picker.appendChild(confirm);
    menu.appendChild(picker);
    addButton.addEventListener("click", () => {
      if (edit.saving) return;
      if (picker.getAttribute("hidden") === null) {
        picker.setAttribute("hidden", "");
      } else {
        picker.removeAttribute("hidden");
        fieldControl.focus?.({ preventScroll: true });
      }
    });
    removeButton.addEventListener("click", () => {
      postFrontmatterAction(edit, "remove", edit.fieldName, undefined);
    });
    edit.frontmatterMenu = menu;
    edit.frontmatterMenuPositionListener = undefined;
    edit.editor.appendChild(menu);
  }

  function clearPendingBlockNavigation() {
    pendingBlockNavigation = undefined;
    const state = vscode.getState?.();
    if (!state || typeof state !== "object") return;
    const nextState = { ...state };
    delete nextState.pendingBlockNavigation;
    vscode.setState?.(nextState);
  }

  function rememberPendingBlockNavigation(target, caretPosition, selectedCell, explicitIndices, thenMove) {
    pendingBlockNavigation = {
      ...(thenMove ? { thenMove } : {}),
      blockId: target.getAttribute("data-sphinx-preview-block") || undefined,
      sourceLine: Number(target.getAttribute("data-sphinx-source-line")),
      caretPosition: typeof caretPosition === "string" ? caretPosition : "end",
      ...(selectedCell ? {
        tableRowIndex: selectedCell.parentElement.rowIndex,
        tableColumnIndex: selectedCell.cellIndex,
      } : explicitIndices ? {
        tableRowIndex: explicitIndices.tableRowIndex,
        tableColumnIndex: explicitIndices.tableColumnIndex,
      } : {}),
    };
    const state = vscode.getState?.();
    vscode.setState?.({
      ...(state && typeof state === "object" ? state : {}),
      pendingBlockNavigation,
    });
  }

  function topLevelMappedBlocks() {
    const mapped = Array.from(document.querySelectorAll(mappingsSelector)).filter((element) => {
      const sourceFile = element.getAttribute("data-sphinx-source-file");
      const documentId = element.getAttribute("data-sphinx-preview-document");
      const sourceLine = Number(element.getAttribute("data-sphinx-source-line"));
      return documentId === context.documentId
        && sourceFile
        && normalize(sourceFile) === normalize(context.activeSourceFile)
        && Number.isSafeInteger(sourceLine)
        && sourceLine >= 1;
    });
    const mappedSet = new Set(mapped);
    return mapped
      .filter((element) => {
        for (let parent = element.parentElement; parent; parent = parent.parentElement) {
          if (mappedSet.has(parent)) return false;
        }
        return true;
      })
      .sort((left, right) => Number(left.getAttribute("data-sphinx-source-line"))
        - Number(right.getAttribute("data-sphinx-source-line")));
  }

  function adjacentMappedBlock(edit, step) {
    const blocks = topLevelMappedBlocks();
    const index = blocks.indexOf(edit.target);
    if (index < 0) return undefined;
    // The properties table has its own editor: stepping onto it would only close this one.
    for (let next = index + step; next >= 0 && next < blocks.length; next += step) {
      if (blocks[next].getAttribute("data-okf-properties") === null) return blocks[next];
    }
    return undefined;
  }

  function boundaryNavigation(control, event) {
    if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return undefined;
    if (control.selectionStart !== control.selectionEnd) return undefined;
    const value = String(control.value ?? "");
    const position = Number(control.selectionStart);
    if (!Number.isSafeInteger(position)) return undefined;
    if (event.key === "ArrowLeft" && position === 0) {
      return { step: -1, caretPosition: "end" };
    }
    if (event.key === "ArrowRight" && position === value.length) {
      return { step: 1, caretPosition: "start" };
    }
    const firstLineEnd = value.indexOf("\\n");
    const lastLineStart = value.lastIndexOf("\\n") + 1;
    // Up/Down leave only from the first/last VISUAL line: a long logical line wraps in the field
    // and the native caret movement must run first.
    if (
      event.key === "ArrowUp"
      && position <= (firstLineEnd < 0 ? value.length : firstLineEnd)
      && onVisualEdge(control, "first")
    ) {
      return { step: -1, caretPosition: "end" };
    }
    if (event.key === "ArrowDown" && position >= lastLineStart && onVisualEdge(control, "last")) {
      return { step: 1, caretPosition: "start" };
    }
    return undefined;
  }

  const visualMirrorStyles = [
    "fontFamily", "fontSize", "fontWeight", "fontStyle", "fontVariant", "fontStretch",
    "letterSpacing", "lineHeight", "textTransform", "textIndent", "wordSpacing", "tabSize",
    "wordBreak", "direction", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  ];

  // Measures whether the caret of a text field sits on its first and on its last visual (wrapped)
  // line. A hidden mirror with the field's font, padding and width lays out the same text; the
  // offsetTop of a marker at the caret is compared with a marker at the very start and the very
  // end. Returns undefined when the layout cannot be measured, which callers treat as "edge".
  function measureCaretVisualLine(control) {
    let mirror;
    try {
      const style = window.getComputedStyle(control);
      const value = String(control.value ?? "");
      const position = Number(control.selectionStart);
      const width = Number(control.clientWidth);
      if (!style || !(width > 0) || !Number.isSafeInteger(position)) return undefined;
      mirror = document.createElement("div");
      for (const name of visualMirrorStyles) mirror.style[name] = style[name];
      mirror.style.position = "absolute";
      mirror.style.visibility = "hidden";
      mirror.style.top = "0";
      mirror.style.left = "-9999px";
      mirror.style.boxSizing = "border-box";
      mirror.style.width = width + "px";
      mirror.style.border = "0";
      mirror.style.whiteSpace = "pre-wrap";
      mirror.style.overflowWrap = "break-word";
      const marker = () => {
        const element = document.createElement("span");
        // U+2060 WORD JOINER: zero width and no line-break opportunity, so a marker inside a word
        // cannot split a word that the textarea wraps whole.
        element.textContent = "\u2060";
        return element;
      };
      const first = marker();
      const caret = marker();
      const last = marker();
      mirror.appendChild(first);
      mirror.appendChild(document.createTextNode(value.slice(0, position)));
      mirror.appendChild(caret);
      mirror.appendChild(document.createTextNode(value.slice(position)));
      mirror.appendChild(last);
      document.body.appendChild(mirror);
      const top = Number(caret.offsetTop);
      const firstTop = Number(first.offsetTop);
      const lastTop = Number(last.offsetTop);
      if (![top, firstTop, lastTop].every(Number.isFinite)) return undefined;
      return { first: Math.abs(top - firstTop) < 1, last: Math.abs(top - lastTop) < 1 };
    } catch {
      return undefined;
    } finally {
      try {
        mirror?.remove?.();
      } catch {
        // The mirror is detached with its document.
      }
    }
  }

  // The visual-line probe is replaceable through window.okfCaretLineProbe. This is a test-only seam
  // for the fake-DOM tests, which cannot measure layout: content scripts cannot define it under the
  // nonce CSP, so it is never set in a real preview.
  function onVisualEdge(control, edge) {
    let line;
    try {
      line = typeof window.okfCaretLineProbe === "function"
        ? window.okfCaretLineProbe(control)
        : measureCaretVisualLine(control);
    } catch {
      line = undefined;
    }
    return !line || line[edge] !== false;
  }

  // Home/End jump to the start/end of the edited text. On macOS the native keys scroll the nearest
  // scrollable ancestor (the whole preview, or a wide table horizontally) instead of moving the
  // caret, so they are handled here; Cmd+Left/Right keep their native line behaviour.
  function homeEndInControl(event, control) {
    if ((event.key !== "Home" && event.key !== "End") || event.isComposing) return false;
    if (event.ctrlKey || event.metaKey || event.altKey) return false;
    if (typeof control.setSelectionRange !== "function") return false;
    event.preventDefault?.();
    // Block sources end with a line break; End stops before it rather than on an empty last line.
    const target = event.key === "Home" ? 0 : String(control.value ?? "").replace(/[\\r\\n]+$/u, "").length;
    if (!event.shiftKey) {
      control.setSelectionRange(target, target);
      return true;
    }
    const backward = control.selectionDirection === "backward";
    const anchor = Number(backward ? control.selectionEnd : control.selectionStart);
    if (target < anchor) control.setSelectionRange(target, anchor, "backward");
    else control.setSelectionRange(anchor, target, "forward");
    return true;
  }

  function keepUndoInControl(event) {
    const mod = event.metaKey || event.ctrlKey;
    const code = event.keyCode;
    const letter = typeof event.key === "string" ? event.key.toLowerCase() : "";
    if (mod && !event.altKey && (code === 90 || code === 89 || letter === "z" || letter === "y")) {
      event.stopPropagation?.();
      return true;
    }
    return false;
  }

  // Typing *, _, backtick or ~ over a selection wraps it (as one native, undoable edit) and keeps the text
  // selected, so a second press wraps again. No selection, modifiers and IME stay native.
  function wrapSelectionInControl(event, control, onFallbackInput) {
    // AltGr reports ctrlKey and altKey together; French and German layouts type ~ and backtick so.
    const altGraph = event.getModifierState?.("AltGraph") === true;
    if (event.isComposing || event.metaKey) return false;
    if (!altGraph && (event.ctrlKey || event.altKey)) return false;
    if (typeof event.key !== "string" || event.key.length !== 1) return false;
    const edit = textEditing.wrapSelection(
      String(control.value ?? ""),
      Number(control.selectionStart),
      Number(control.selectionEnd),
      event.key,
    );
    if (!edit) return false;
    event.preventDefault?.();
    applyTextEdit(control, edit, onFallbackInput);
    return true;
  }

  // Cmd/Ctrl+B, +I and +/ run a registered edit action on the block text box as one native edit.
  // The key is consumed even when the action has nothing to change, so the host editor never
  // sees it (Cmd+B would toggle the side bar).
  function paletteShortcut(event, control, onFallbackInput) {
    const scope = activeBlockEdit?.selectedCell ? "cell" : "block";
    const action = editActions.shortcutFor(event, isApplePlatform());
    if (!action || !action.scopes.includes(scope)) return false;
    event.preventDefault?.();
    event.stopPropagation?.();
    if (action.panel === "link") {
      openLinkPanel(control, onFallbackInput);
      return true;
    }
    const edit = action.apply({
      value: String(control.value ?? ""),
      selectionStart: Number(control.selectionStart),
      selectionEnd: Number(control.selectionEnd),
      scope,
    });
    if (edit) applyTextEdit(control, edit, onFallbackInput);
    return true;
  }

  // Cmd+Alt (Ctrl+Alt elsewhere) + Up/Down in the block text box: save the edit, move the block,
  // reopen the editor on it with the caret where it was. Plain Option/Alt+arrow stays native.
  // Handled chords are always consumed; a key repeat or a move in flight does nothing.
  function moveBlockFromEditor(event, control) {
    const direction = moveChordDirection(event, true);
    if (!direction) return false;
    event.preventDefault?.();
    event.stopPropagation?.();
    const edit = activeBlockEdit;
    if (!edit || edit.finishing || event.repeat || blockMoveInFlight) return true;
    if (edit.selectedCell || edit.insertAfterLine !== undefined || control !== edit.textarea) return true;
    const target = edit.target;
    if (!bodyBlockNeighbour(target, direction)) return true;
    const offset = Number.isSafeInteger(control.selectionStart) ? control.selectionStart : 0;
    const editedText = edit.textarea.value + (edit.trailingLineEnding || "");
    if (editedText === edit.originalText && !edit.hasAutosavedChange) {
      // Nothing to save: close (the host drops the edit) and move at once.
      closeBlockEdit(true);
      if (!requestBlockMove(target, direction, "edit", offset)) {
        openMappedEditor(target, target, { offset }, false);
      }
      return true;
    }
    rememberPendingBlockNavigation(target, "end", undefined, undefined, { direction, caretOffset: offset });
    if (!postBlockEditSave(true)) {
      clearPendingBlockNavigation();
      if (!requestBlockMove(target, direction, "edit", offset)) {
        openMappedEditor(target, target, { offset }, false);
      }
    }
    return true;
  }

  function navigateBlockEdit(event, control) {
    const edit = activeBlockEdit;
    if (!edit || edit.finishing) return false;
    const navigation = boundaryNavigation(control, event);
    if (!navigation) return false;
    const target = adjacentMappedBlock(edit, navigation.step);
    if (!target) return false;
    event.preventDefault?.();
    rememberPendingBlockNavigation(target, navigation.caretPosition);
    const savePosted = postBlockEditSave(true);
    if (!savePosted) {
      clearPendingBlockNavigation();
      openMappedEditor(target, target, navigation.caretPosition, true);
    }
    return true;
  }

  // Applies a text edit through the native editing path so the undo stack keeps the step; falls
  // back to a manual splice where execCommand is unavailable.
  function applyTextEdit(control, rawEdit, onFallbackInput) {
    // A table cell holds one line, and a bare pipe would split it: sanitize what is inserted.
    const inCell = Boolean(activeBlockEdit?.selectedCell) && control === activeBlockEdit.tableInput;
    const edit = inCell ? textEditing.cellSafeEdit(String(control.value ?? ""), rawEdit) : rawEdit;
    control.focus({ preventScroll: true });
    control.setSelectionRange(edit.start, edit.end);
    let done = false;
    if (typeof document.execCommand === "function") {
      try {
        done = edit.text === "" && edit.end > edit.start
          ? document.execCommand("delete", false)
          : document.execCommand("insertText", false, edit.text);
      } catch {
        done = false;
      }
    }
    if (!done) {
      const value = String(control.value);
      control.value = value.slice(0, edit.start) + edit.text + value.slice(edit.end);
      onFallbackInput();
    }
    control.setSelectionRange(edit.selectionStart, edit.selectionEnd);
  }

  function focusTextControlAtLastContent(control, caretPosition = "end") {
    control.focus({ preventScroll: true });
    const tagName = String(control.tagName || "").toUpperCase();
    const supportsTextSelection = tagName === "TEXTAREA"
      || (tagName === "INPUT" && ["text", "search", "tel", "url", "password"].includes(control.type));
    if (!supportsTextSelection || typeof control.setSelectionRange !== "function") return;
    const value = String(control.value ?? "");
    let position = caretPosition === "start" ? 0 : value.trimEnd().length;
    if (caretPosition && typeof caretPosition === "object" && Number.isSafeInteger(caretPosition.offset)) {
      position = Math.max(0, Math.min(value.length, caretPosition.offset));
    } else if (caretPosition && typeof caretPosition === "object") {
      const mapped = textEditing.mapRenderedCaret(
        value,
        String(caretPosition.before ?? ""),
        String(caretPosition.after ?? ""),
      );
      if (Number.isSafeInteger(mapped) && mapped >= 0 && mapped <= value.length) position = mapped;
    }
    control.setSelectionRange(position, position);
  }

  function openFrontmatterKeyEditor(row, nameCell) {
    if (activeBlockEdit || activeFrontmatterEdit || row.getAttribute("data-okf-editable") !== "true") return;
    const name = row.getAttribute("data-okf-field");
    if (!name) return;
    let value;
    try {
      value = JSON.parse(row.getAttribute("data-okf-value") || "null");
    } catch {
      return;
    }
    const properties = nameCell.closest("[data-okf-properties]");
    let availableKeys = [];
    try {
      const keys = JSON.parse(properties?.getAttribute("data-okf-available-keys") || "[]");
      if (Array.isArray(keys)) availableKeys = keys.filter((key) => typeof key === "string");
    } catch {
      availableKeys = [];
    }
    const displayElement = nameCell.querySelector?.(".okf-name-cell");
    const editor = document.createElement("div");
    editor.className = "sphinx-preview-frontmatter-editor sphinx-preview-frontmatter-key-editor";
    editor.setAttribute("data-okf-frontmatter-editor", "true");
    const control = document.createElement("input");
    control.type = "text";
    control.value = name;
    control.setAttribute("aria-label", "Frontmatter key " + name);
    const listId = "okf-frontmatter-key-options-" + context.requestId + "-" + (++editSequence);
    control.setAttribute("list", listId);
    const datalist = document.createElement("datalist");
    datalist.setAttribute("id", listId);
    for (const key of availableKeys) {
      const option = document.createElement("option");
      option.value = key;
      option.setAttribute("value", key);
      datalist.appendChild(option);
    }
    const status = document.createElement("p");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.setAttribute("data-okf-frontmatter-key-status", "true");
    let cancelled = false;
    const saveKey = () => {
      if (cancelled || control.disabled) return;
      // A flush keeps the key the reader typed minus the spaces around it; an empty key keeps the old one.
      const newFieldName = flushingEditors ? control.value.trim() : control.value;
      if (newFieldName === name || (flushingEditors && newFieldName === "")) {
        cancelled = true;
        closeFrontmatterEditor("key unchanged");
        return;
      }
      if (!newFieldName.trim() || newFieldName !== newFieldName.trim()) {
        status.textContent = "Enter a non-empty key without leading or trailing spaces.";
        status.setAttribute("data-state", "error");
        status.setAttribute("data-visible", "true");
        return;
      }
      const editId = context.requestId + "-key-" + (++editSequence);
      activeFrontmatterEdit = {
        valueCell: nameCell,
        displayElement,
        editor,
        control,
        status,
        editId,
        fieldName: name,
        fieldValue: value,
        // A refused plain save (a blur) is saved again as a flush when a navigation waits for it.
        plainSavePending: !flushingEditors,
        cancel: () => { cancelled = true; },
        save: () => saveKey(),
      };
      nameCell.setAttribute("data-okf-editing", "true");
      nameCell.setAttribute("data-okf-key-editing", "true");
      if (refreshButton) refreshButton.disabled = true;
      control.disabled = true;
      status.removeAttribute("data-visible");
      status.removeAttribute("data-state");
      status.textContent = "Saving frontmatter key…";
      consumePendingFrontmatterEdit();
      vscode.postMessage({
        type: "previewFrontmatterSave",
        documentId: context.documentId,
        documentVersion: context.documentVersion,
        requestId: context.requestId,
        editId,
        fieldName: name,
        newFieldName,
        fieldValue: value,
        ...(flushingEditors ? { flush: true } : {}),
        ...frontmatterPinFields(nameCell),
        ...anchorField(),
      });
    };
    control.addEventListener("keydown", (event) => {
      if (keepUndoInControl(event)) return;
      if (event.key === "Escape") {
        event.preventDefault?.();
        cancelled = true;
        closeFrontmatterEditor("Escape in key editor");
      } else if (event.key === "Enter") {
        event.preventDefault?.();
        saveKey();
      }
    });
    control.addEventListener("blur", (event) => {
      const relatedTarget = event.relatedTarget;
      if (relatedTarget?.closest?.("[data-okf-frontmatter-menu]")) return;
      saveKey();
    });
    editor.appendChild(control);
    editor.appendChild(datalist);
    editor.appendChild(status);
    displayElement?.setAttribute("hidden", "");
    nameCell.setAttribute("data-okf-editing", "true");
    nameCell.setAttribute("data-okf-key-editing", "true");
    beginEditAnchor(nameCell);
    nameCell.appendChild(editor);
    activeFrontmatterEdit = {
      valueCell: nameCell,
      displayElement,
      editor,
      control,
      status,
      fieldName: name,
      fieldValue: value,
      cancel: () => { cancelled = true; },
      save: () => saveKey(),
    };
    if (refreshButton) refreshButton.disabled = true;
    createFrontmatterMenu(activeFrontmatterEdit, nameCell, properties);
    focusTextControlAtLastContent(control);
  }

  function openFrontmatterEditor(row, options) {
    if (activeBlockEdit || activeFrontmatterEdit || row.getAttribute("data-okf-editable") !== "true") return;
    const valueCell = row.querySelector?.("[data-okf-value-cell]");
    if (!valueCell) return;
    const name = row.getAttribute("data-okf-field");
    const declaredType = row.getAttribute("data-okf-type") || "unknown";
    const schemaFound = row.getAttribute("data-okf-schema-found") === "true";
    if (!name) return;
    let value;
    let enums = [];
    try {
      value = JSON.parse(row.getAttribute("data-okf-value") || "null");
      enums = JSON.parse(row.getAttribute("data-okf-enums") || "[]");
    } catch {
      return;
    }
    const useListEditor = Array.isArray(value);
    const structuredValue = useListEditor
      || (value !== null && typeof value === "object");
    // A key that was just added as a custom key holds an empty string: it is edited as one line
    // of text, like a text field, and saved as a plain YAML scalar when that is safe.
    const newCustomKey = Boolean(options && options.newField) && value === ""
      && declaredType === "unknown" && /\\bokf-unknown\\b/u.test(row.getAttribute("class") || "");
    const fieldType = newCustomKey ? "text" : declaredType;
    const useYamlEditor = !newCustomKey && !useListEditor
      && (!schemaFound || fieldType === "list" || fieldType === "unknown" || structuredValue);
    const useListEditorValue = useListEditor;
    const useTextarea = useYamlEditor || fieldType === "text";
    const nullable = row.getAttribute("data-okf-nullable") === "true";
    const displayElement = valueCell.querySelector?.("[data-okf-value-display]");
    const editor = document.createElement("div");
    editor.className = "sphinx-preview-frontmatter-editor sphinx-preview-frontmatter-value-editor";
    editor.setAttribute("data-okf-frontmatter-editor", "true");
    const control = schemaFound && fieldType === "enum"
      ? document.createElement("select")
      : useListEditorValue
        ? document.createElement("div")
      : useTextarea
        ? document.createElement("textarea")
        : document.createElement("input");
    control.setAttribute("aria-label", "Frontmatter " + name);
    let readListValue = () => [];
    let setListEditorDisabled = (_disabled) => {};
    let focusListEditor = () => {};
    let checkboxValueLabel;
    let setNullButton;
    let listDragInProgress = false;
    if (nullable) {
      setNullButton = document.createElement("button");
      setNullButton.type = "button";
      setNullButton.className = useListEditorValue ? "okf-list-editor-null" : "okf-frontmatter-null";
      setNullButton.textContent = "Set to null";
      setNullButton.setAttribute("aria-label", "Set " + name + " value to null");
      setNullButton.setAttribute("title", "Set " + name + " value to null");
      setNullButton.setAttribute("data-okf-set-null", "true");
      if (useListEditorValue) {
        setNullButton.setAttribute("data-okf-list-set-null", "true");
      }
    }
    if (useListEditorValue) {
      control.className = "okf-list-editor";
      control.setAttribute("role", "group");
      control.addEventListener("click", (event) => event.stopPropagation?.());
      const itemList = document.createElement("div");
      itemList.className = "okf-list-editor-items";
      const addButton = document.createElement("button");
      addButton.type = "button";
      addButton.className = "okf-list-editor-add";
      addButton.textContent = "+ Add item";
      addButton.setAttribute("aria-label", "Add list item");
      addButton.setAttribute("title", "Add list item");
      const itemRows = () => Array.from(itemList.children || itemList.childElements || []);
      let linkStems;
      let linkDatalistId = "";
      let linkDatalist;
      try {
        const parsedStems = JSON.parse(row.getAttribute("data-okf-link-suggestions") || "null");
        if (Array.isArray(parsedStems)) {
          const stems = parsedStems.filter((stem) => typeof stem === "string");
          if (stems.length > 0) {
            linkStems = new Set(stems);
            linkDatalistId = "okf-frontmatter-link-options-" + context.requestId + "-" + (++editSequence);
            linkDatalist = document.createElement("datalist");
            linkDatalist.setAttribute("id", linkDatalistId);
            for (const stem of stems) {
              const option = document.createElement("option");
              option.value = stem;
              option.setAttribute("value", stem);
              linkDatalist.appendChild(option);
            }
          }
        }
      } catch {
        linkStems = undefined;
      }
      // Marks unknown link targets without blocking the save.
      const refreshLinkWarning = (current) => {
        if (!linkStems) return;
        let unknown;
        itemRows().forEach((itemRow) => {
          const candidate = itemRow.querySelector?.("[data-okf-list-item-input]");
          if (!candidate) return;
          const isUnknown = candidate.value !== "" && !linkStems.has(candidate.value);
          if (isUnknown) {
            candidate.setAttribute("aria-invalid", "true");
            if (candidate === current || !unknown) unknown = candidate;
          } else {
            candidate.removeAttribute("aria-invalid");
          }
        });
        if (unknown) {
          status.textContent = 'No Markdown file named "' + unknown.value + '.md" was found. It will be saved as typed.';
          status.setAttribute("data-state", "warning");
          status.setAttribute("data-visible", "true");
        } else if (status.getAttribute("data-state") === "warning") {
          status.removeAttribute("data-state");
          status.removeAttribute("data-visible");
          status.textContent = "";
        }
      };
      const refreshItemLabels = () => {
        itemRows().forEach((row, index) => {
          const input = row.querySelector?.("[data-okf-list-item-input]");
          if (input) input.setAttribute("aria-label", "List item " + (index + 1));
        });
      };
      const moveItem = (row, direction) => {
        const rows = itemRows();
        const index = rows.indexOf(row);
        const targetIndex = index + direction;
        if (index < 0 || targetIndex < 0 || targetIndex >= rows.length) return;
        if (direction < 0) {
          itemList.insertBefore(row, rows[targetIndex]);
        } else {
          itemList.insertBefore(rows[targetIndex], row);
        }
        refreshItemLabels();
        row.querySelector?.("[data-okf-list-item-input]")?.focus?.();
      };
      let draggedRow;
      let dropRow;
      let dropBefore = false;
      const clearDropIndicator = () => {
        itemRows().forEach((row) => row.removeAttribute("data-okf-list-drop"));
        dropRow = undefined;
      };
      const updateDropIndicator = (event, targetRow) => {
        if (!draggedRow) return;
        event.preventDefault?.();
        event.stopPropagation?.();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
        clearDropIndicator();
        if (targetRow === draggedRow) return;
        const rows = itemRows();
        if (!targetRow) {
          const candidates = rows.filter((row) => row !== draggedRow);
          targetRow = candidates.find((row) => {
            const rectangle = row.getBoundingClientRect();
            return event.clientY < rectangle.top + rectangle.height / 2;
          }) || candidates[candidates.length - 1];
        }
        if (!targetRow) return;
        const rectangle = targetRow.getBoundingClientRect();
        dropBefore = typeof event.clientY === "number"
          ? event.clientY < rectangle.top + rectangle.height / 2
          : rows.indexOf(draggedRow) > rows.indexOf(targetRow);
        dropRow = targetRow;
        dropRow.setAttribute("data-okf-list-drop", dropBefore ? "before" : "after");
      };
      const finishDrag = () => {
        draggedRow?.removeAttribute("data-okf-list-dragging");
        draggedRow = undefined;
        listDragInProgress = false;
        clearDropIndicator();
      };
      const dropItem = (event, targetRow) => {
        if (!draggedRow) return;
        updateDropIndicator(event, targetRow);
        const movedRow = draggedRow;
        if (dropRow) {
          const rows = itemRows();
          const reference = dropBefore ? dropRow : rows[rows.indexOf(dropRow) + 1];
          if (reference !== movedRow) itemList.insertBefore(movedRow, reference || null);
          refreshItemLabels();
        }
        finishDrag();
        movedRow.querySelector?.("[data-okf-list-item-input]")?.focus?.();
      };
      control.addEventListener("dragover", (event) => updateDropIndicator(event));
      control.addEventListener("drop", (event) => dropItem(event));
      control.addEventListener("dragleave", (event) => {
        if (!event.relatedTarget || !control.contains?.(event.relatedTarget)) {
          clearDropIndicator();
        }
      });
      // Moves focus to the previous item (caret at its end), else the next item, else the add button.
      // It runs before the row is removed, so the editor never sees focus leave it.
      const focusNeighbour = (row) => {
        const rows = itemRows();
        const index = rows.indexOf(row);
        const neighbour = rows[index - 1] || rows[index + 1];
        const target = neighbour?.querySelector?.("[data-okf-list-item-input]") || addButton;
        target.focus?.();
        if (neighbour && target !== addButton && rows[index - 1]) {
          target.setSelectionRange?.(target.value.length, target.value.length);
        }
      };
      const appendItem = (itemValue) => {
        const row = document.createElement("div");
        row.className = "okf-list-editor-item";
        row.setAttribute("data-okf-list-item", "true");
        const handle = document.createElement("button");
        handle.type = "button";
        handle.className = "okf-list-editor-handle";
        handle.setAttribute("aria-label", "Move list item");
        handle.setAttribute("title", "Drag to move list item");
        handle.setAttribute("draggable", "true");
        const input = document.createElement("input");
        input.type = "text";
        input.className = "okf-list-editor-input";
        input.setAttribute("data-okf-list-item-input", "true");
        input.value = itemValue;
        if (linkDatalistId) {
          input.setAttribute("list", linkDatalistId);
          input.addEventListener("input", () => refreshLinkWarning(input));
        }
        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "okf-list-editor-remove";
        removeButton.setAttribute("aria-label", "Remove list item");
        removeButton.setAttribute("title", "Remove list item");
        removeButton.addEventListener("mousedown", (event) => {
          event.preventDefault?.();
        });
        handle.addEventListener("keydown", (event) => {
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault?.();
            moveItem(row, event.key === "ArrowUp" ? -1 : 1);
          }
        });
        handle.addEventListener("dragstart", (event) => {
          draggedRow = row;
          listDragInProgress = true;
          row.setAttribute("data-okf-list-dragging", "true");
          event.dataTransfer?.setData?.("text/plain", "list-item");
          event.dataTransfer?.setDragImage?.(row, 12, 12);
          if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
        });
        row.addEventListener("dragover", (event) => updateDropIndicator(event, row));
        row.addEventListener("drop", (event) => dropItem(event, row));
        handle.addEventListener("dragend", () => {
          finishDrag();
          input.focus?.();
        });
        removeButton.addEventListener("click", (event) => {
          event.stopPropagation?.();
          const rows = itemRows();
          const index = rows.indexOf(row);
          const remainingRows = rows.filter((candidate) => candidate !== row);
          const focusRow = remainingRows[Math.min(index, remainingRows.length - 1)];
          const focusTarget = focusRow?.querySelector?.("[data-okf-list-item-input]") || addButton;
          focusTarget?.focus?.();
          row.remove?.();
          refreshItemLabels();
        });
        input.addEventListener("keydown", (event) => {
          if (event.isComposing) return;
          if (keepUndoInControl(event)) return;
          if (event.key === "Enter") {
            if (event.shiftKey || event.altKey) return;
            event.preventDefault?.();
            if (event.metaKey || event.ctrlKey) {
              saveValue();
              return;
            }
            const rows = itemRows();
            const index = rows.indexOf(row);
            if (input.value.trim() === "" && index === rows.length - 1) {
              focusNeighbour(row);
              row.remove?.();
              refreshItemLabels();
              saveValue();
              return;
            }
            const newRow = appendItem("");
            itemList.insertBefore(newRow, rows[index + 1] || null);
            refreshItemLabels();
            newRow.querySelector?.("[data-okf-list-item-input]")?.focus?.();
          } else if (event.key === "Backspace" && input.value === "" && input.selectionStart === 0) {
            event.preventDefault?.();
            focusNeighbour(row);
            row.remove?.();
            refreshItemLabels();
          }
        });
        row.appendChild(handle);
        row.appendChild(input);
        row.appendChild(removeButton);
        itemList.appendChild(row);
        refreshItemLabels();
        return row;
      };
      readListValue = () => itemRows()
        .map((row) => row.querySelector?.("[data-okf-list-item-input]")?.value ?? "");
      setListEditorDisabled = (disabled) => {
        itemRows().forEach((row) => {
          row.querySelectorAll?.("input, button").forEach((element) => {
            element.disabled = disabled;
          });
        });
        addButton.disabled = disabled;
        if (setNullButton) setNullButton.disabled = disabled;
      };
      addButton.addEventListener("click", () => {
        appendItem("");
        const rows = itemRows();
        rows[rows.length - 1]?.querySelector?.("[data-okf-list-item-input]")?.focus?.();
      });
      const initialItems = value.map((item) => item === null || item === undefined ? "" : String(item));
      initialItems.forEach(appendItem);
      control.appendChild(itemList);
      if (linkDatalist) control.appendChild(linkDatalist);
      control.appendChild(addButton);
      if (setNullButton) control.appendChild(setNullButton);
      focusListEditor = () => {
        const firstInput = itemRows()[0]?.querySelector?.("[data-okf-list-item-input]");
        (firstInput || addButton)?.focus?.();
      };
    }
    if (schemaFound && fieldType === "enum") {
      const enumValues = Array.isArray(enums)
        ? enums.filter((enumValue) => typeof enumValue === "string")
        : [];
      const hasSelectedEnumValue = enumValues.includes(value);
      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "Choose a value...";
      empty.disabled = true;
      empty.selected = !hasSelectedEnumValue;
      control.appendChild(empty);
      control.setAttribute("data-okf-empty-select", hasSelectedEnumValue ? "false" : "true");
      for (const enumValue of enumValues) {
        const option = document.createElement("option");
        option.value = enumValue;
        option.textContent = enumValue;
        option.selected = enumValue === value;
        control.appendChild(option);
      }
    } else if (useYamlEditor) {
      control.value = row.getAttribute("data-okf-value-yaml") || "";
      // A field that was just added holds an empty string, shown as "" in YAML. Start empty so
      // that the first typed text is the value, not text appended after the quotes.
      if (options && options.newField && control.value === '""\\n') control.value = "";
      control.setAttribute("spellcheck", "false");
      control.rows = Math.max(1, Math.min(20, control.value.split(/\\r?\\n/u).length));
    } else if (fieldType === "text") {
      control.value = value === null || value === undefined ? "" : String(value);
      control.setAttribute("data-okf-text-value", "true");
      control.rows = 1;
      control.setAttribute("aria-keyshortcuts", "Enter Shift+Enter");
      control.setAttribute("title", "Enter saves \\u00b7 Shift+Enter adds a line");
    } else if (fieldType === "checkbox") {
      control.type = "checkbox";
      control.className = "okf-value-checkbox";
      control.checked = value === true;
      checkboxValueLabel = document.createElement("span");
      checkboxValueLabel.className = "okf-boolean-value";
      checkboxValueLabel.textContent = String(control.checked);
    } else {
      control.type = fieldType === "number" ? "number"
        : fieldType === "date" ? "date"
          : fieldType === "time" ? "time"
            : "text";
      if (fieldType === "number") control.step = "any";
      control.value = value === null || value === undefined ? "" : String(value);
    }
    const status = document.createElement("p");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    let cancelled = false;
    const initialYaml = useYamlEditor && options && options.newField
      ? control.value
      : row.getAttribute("data-okf-value-yaml") || "";
    const edit = {
      row,
      valueCell,
      displayElement,
      editor,
      control,
      status,
      editId: "",
      saving: false,
      fieldName: name,
      fieldValue: value,
      setNullButton,
      setDisabled: setListEditorDisabled,
      cancel: () => { cancelled = true; },
    };
    const resizeTextarea = control.tagName === "TEXTAREA"
      ? () => {
        control.style.height = "auto";
        control.style.height = control.scrollHeight + "px";
      }
      : undefined;
    if (resizeTextarea) {
      control.addEventListener("input", resizeTextarea);
      edit.resizeTextarea = resizeTextarea;
    }
    edit.save = () => saveValue();
    const saveValue = (forcedValue) => {
      if (cancelled || edit.saving || control.disabled) return;
      if (forcedValue === undefined && fieldType === "text" && !useYamlEditor && !useListEditorValue
        && control.tagName === "TEXTAREA" && (typeof value !== "string" || !value.endsWith("\\n"))) {
        control.value = String(control.value).replace(/(?:\\r?\\n)+$/u, "");
      }
      let fieldValue = forcedValue === undefined
        ? useListEditorValue ? readListValue()
          : useYamlEditor ? control.value
          : fieldType === "checkbox" ? control.checked
          : fieldType === "number" ? Number(control.value)
            : control.value
        : forcedValue;
      if (fieldType === "number" && forcedValue !== null && (!control.value || !Number.isFinite(fieldValue))) {
        // A flush keeps the typed text as it is: the host writes it and the preview shows the problem.
        if (flushingEditors) {
          fieldValue = control.value;
        } else {
          status.textContent = "Enter a valid number.";
          status.setAttribute("data-state", "error");
          status.setAttribute("data-visible", "true");
          return;
        }
      }
      const unchanged = useYamlEditor
        ? control.value === initialYaml
        : JSON.stringify(fieldValue) === JSON.stringify(value);
      if (unchanged) {
        cancelled = true;
        closeFrontmatterEditor("save of an unchanged value");
        return;
      }
      const editId = context.requestId + "-field-" + (++editSequence);
      edit.editId = editId;
      edit.saving = true;
      // A plain save (Enter, blur) can be refused; a navigation waits for its result (CR 025).
      edit.plainSavePending = !flushingEditors;
      activeFrontmatterEdit = edit;
      valueCell.setAttribute("data-okf-editing", "true");
      if (refreshButton) refreshButton.disabled = true;
      control.disabled = true;
      if (setNullButton) setNullButton.disabled = true;
      setListEditorDisabled(true);
      status.removeAttribute("data-visible");
      status.removeAttribute("data-state");
      status.textContent = "Saving frontmatter…";
      consumePendingFrontmatterEdit();
      vscode.postMessage({
        type: "previewFrontmatterSave",
        documentId: context.documentId,
        documentVersion: context.documentVersion,
        requestId: context.requestId,
        editId,
        fieldName: name,
        ...(useYamlEditor ? { fieldValueFormat: "yaml" } : {}),
        ...(flushingEditors ? { flush: true } : {}),
        ...(newCustomKey ? { fieldValueStyle: "plain" } : {}),
        fieldValue,
        ...frontmatterPinFields(valueCell),
        ...anchorField(),
      });
    };
    setNullButton?.addEventListener("click", (event) => {
      event.stopPropagation?.();
      saveValue(null);
    });
    control.addEventListener("keydown", (event) => {
      if (keepUndoInControl(event)) return;
      if (event.key === "Escape") {
        event.preventDefault?.();
        cancelled = true;
        closeFrontmatterEditor("Escape in value editor");
      } else if (!useListEditorValue && event.key === "Enter" && !event.isComposing) {
        const commitShortcut = event.metaKey || event.ctrlKey;
        const isTextField = control.tagName === "TEXTAREA" && fieldType === "text" && !useYamlEditor;
        const multiline = String(control.value).includes("\\n");
        if (control.tagName !== "TEXTAREA"
          || commitShortcut
          || (isTextField && !multiline && !event.shiftKey && !event.altKey)) {
          event.preventDefault?.();
          saveValue();
        }
      }
    });
    if (fieldType === "checkbox") {
      control.addEventListener("click", (event) => event.stopPropagation?.());
      control.addEventListener("change", () => {
        if (checkboxValueLabel) checkboxValueLabel.textContent = String(control.checked);
        saveValue();
      });
    }
    if (useListEditorValue) {
      editor.addEventListener("focusout", (event) => {
        if (listDragInProgress) return;
        const relatedTarget = event.relatedTarget;
        if (relatedTarget && (
          relatedTarget === editor
          || editor.contains?.(relatedTarget)
          || relatedTarget.closest?.("[data-okf-frontmatter-menu]")
        )) return;
        saveValue();
      });
    } else {
      control.addEventListener("blur", (event) => {
        const relatedTarget = event.relatedTarget;
        editorTrace.record("frontmatter control blur", "field=" + name + " related="
          + (relatedTarget && relatedTarget.tagName ? String(relatedTarget.tagName).toLowerCase() : "none") + " " + traceFocus());
        if ((setNullButton && relatedTarget === setNullButton)
          || relatedTarget?.closest?.("[data-okf-frontmatter-menu]")) return;
        saveValue();
      });
    }
    editor.appendChild(control);
    if (checkboxValueLabel) editor.appendChild(checkboxValueLabel);
    if (setNullButton && !useListEditorValue) editor.appendChild(setNullButton);
    editor.appendChild(status);
    valueCell.setAttribute("data-okf-editing", "true");
    beginEditAnchor(valueCell);
    displayElement?.setAttribute("hidden", "");
    valueCell.appendChild(editor);
    activeFrontmatterEdit = edit;
    editorTrace.record("frontmatter editor opened", "field=" + name + " control=" + String(control.tagName).toLowerCase());
    if (refreshButton) refreshButton.disabled = true;
    createFrontmatterMenu(edit, valueCell, valueCell.closest?.("[data-okf-properties]"));
    resizeTextarea?.();
    if (useListEditorValue) {
      focusListEditor();
    } else {
      focusTextControlAtLastContent(control);
    }
    if (options && options.toggleBoolean && fieldType === "checkbox" && schemaFound) {
      control.checked = value !== true;
      if (checkboxValueLabel) checkboxValueLabel.textContent = String(control.checked);
      saveValue();
    }
  }

  function receiveFrontmatterResult(message) {
    const edit = activeFrontmatterEdit;
    if (!edit || message.editId !== edit.editId) return;
    edit.plainSavePending = false;
    const afterResult = edit.afterResult;
    edit.afterResult = undefined;
    if (message.saved === true) {
      edit.status.removeAttribute("data-visible");
      edit.status.removeAttribute("data-state");
      edit.status.textContent = "Saved. Refreshing preview…";
      afterResult?.();
      return;
    }
    clearPendingFrontmatterEdit();
    edit.status.textContent = typeof message.error === "string"
      ? message.error
      : "The frontmatter edit could not be applied.";
    edit.status.setAttribute("data-state", "error");
    edit.status.setAttribute("data-visible", "true");
    edit.saving = false;
    edit.control.disabled = false;
    if (edit.setNullButton) edit.setNullButton.disabled = false;
    edit.setDisabled?.(false);
    // A navigation waiting for this refused save now saves the typed text again, as a flush.
    afterResult?.();
  }

  function setFrontmatterEditCells(enabled) {
    document.querySelectorAll?.("[data-okf-edit-cell]").forEach((cell) => {
      if (enabled) {
        cell.setAttribute("tabindex", "0");
      } else {
        cell.removeAttribute("tabindex");
      }
    });
  }

  function openBlockEditor(target, selectedCell, sourceRange, initialCaretPosition = "end") {
    if (activeBlockEdit) return;
    const line = sourceRange?.line ?? Number(target.getAttribute("data-sphinx-source-line"));
    const endLine = sourceRange?.endLine
      ?? Number(target.getAttribute("data-sphinx-source-end-line") || line);
    const insertAfterLine = sourceRange?.insertAfterLine;
    const rowIndex = selectedCell?.parentElement?.rowIndex;
    const columnIndex = selectedCell?.cellIndex;
    if (!Number.isSafeInteger(line) || line < 1 || !Number.isSafeInteger(endLine) || endLine < line) return;
    if (selectedCell && (!Number.isSafeInteger(rowIndex) || !Number.isSafeInteger(columnIndex))) return;
    const renderedTarget = selectedCell ? target : (target.closest?.("pre") || target);
    setEditHover(undefined);
    const editId = context.requestId + "-" + (++editSequence);
    const element = document.createElement("div");
    element.className = selectedCell
      ? "sphinx-preview-table-cell-editor"
      : "sphinx-preview-block-editor";
    // Nothing above the document's first block: the frame gets room before the top edge.
    if (!selectedCell && !propertiesSection()
      && (target.className?.split?.(" ").includes("sphinx-preview-insert-point--first")
        || topLevelMappedBlocks()[0] === target)) {
      element.className += " sphinx-preview-block-editor--first";
    }
    element.setAttribute("data-sphinx-preview-block-editor", "true");
    element.setAttribute("role", "region");
    element.setAttribute("aria-label", selectedCell ? "Markdown table cell editor" : "Raw Markdown editor");
    if (selectedCell) element.setAttribute("data-sphinx-preview-table-cell-editor", "true");
    let renderedCellContent;
    if (selectedCell) {
      renderedCellContent = hideTableCellContent(selectedCell);
    }
    const status = document.createElement("p");
    status.setAttribute("data-sphinx-preview-edit-status", "");
    status.setAttribute("role", "status");
    status.textContent = selectedCell ? "Loading Markdown table source…" : "Loading Markdown source…";
    if (selectedCell) element.appendChild(status);
    element.addEventListener("click", (event) => event.stopPropagation?.());
    if (selectedCell) {
      selectedCell.setAttribute("data-sphinx-preview-table-cell-selected", "true");
    } else {
      renderedTarget.setAttribute("data-sphinx-preview-editing", "true");
    }
    if (selectedCell) {
      selectedCell.appendChild(element);
    } else {
      renderedTarget.insertAdjacentElement("afterend", element);
    }
    beginEditAnchor(selectedCell ?? element);
    editorTrace.record(selectedCell ? "cell editor opened" : "block editor opened",
      "line=" + line + (selectedCell ? " row=" + rowIndex + " column=" + columnIndex : "") + " " + traceFocus(),
      traceStack());
    activeBlockEdit = {
      target,
      renderedTarget,
      element,
      status,
      editId,
      line,
      endLine,
      ...(insertAfterLine !== undefined ? { insertAfterLine } : {}),
      ...(selectedCell ? { selectedCell, renderedCellContent, tableRowIndex: rowIndex, tableColumnIndex: columnIndex } : {}),
      initialCaretPosition,
    };
    document.documentElement?.setAttribute?.("data-sphinx-preview-block-editing", "true");
    if (refreshButton) refreshButton.disabled = true;
    vscode.postMessage({
      type: "previewEditOpen",
      documentId: context.documentId,
      documentVersion: context.documentVersion,
      requestId: context.requestId,
      editId,
      line,
      endLine,
      ...(insertAfterLine !== undefined ? { insertAfterLine } : {}),
    });
  }

  function postBlockEditSave(final) {
    const edit = activeBlockEdit;
    if (
      !edit
      || typeof edit.originalText !== "string"
      || (!edit.textarea && !edit.tableInput)
      || (edit.finishing && !final)
    ) return false;
    if (edit.autosaveTimer !== undefined) {
      window.clearTimeout(edit.autosaveTimer);
      edit.autosaveTimer = undefined;
    }
    const editedText = edit.convertedText !== undefined
      ? edit.convertedText
      : edit.tableModel
      ? tableTools.serialize(edit.tableModel)
      : edit.textarea.value + (edit.trailingLineEnding || "");
    if (final && editedText === edit.originalText && !edit.hasAutosavedChange) {
      closeBlockEdit();
      return false;
    }
    if (!final && editedText === edit.lastPostedText) return;
    if (editedText !== edit.originalText) edit.hasAutosavedChange = true;
    if (final) {
      edit.finishing = true;
      edit.status.textContent = "Saving Markdown…";
    }
    edit.lastPostedText = editedText;
    vscode.postMessage({
      type: "previewEditSave",
      documentId: context.documentId,
      documentVersion: context.documentVersion,
      requestId: context.requestId,
      editId: edit.editId,
      line: edit.line,
      endLine: edit.endLine,
      originalText: edit.originalText,
      editedText,
      final,
      ...(edit.insertAfterLine !== undefined ? { insertAfterLine: edit.insertAfterLine } : {}),
      ...(final ? blockPinFields(edit) : {}),
      ...(flushingEditors ? { flush: true } : {}),
      ...anchorField(),
    });
    return true;
  }

  function autosaveBlockEdit() {
    const edit = activeBlockEdit;
    if (!edit) return;
    if (edit.autosaveTimer !== undefined) window.clearTimeout(edit.autosaveTimer);
    edit.autosaveTimer = window.setTimeout(() => {
      if (activeBlockEdit !== edit) return;
      edit.autosaveTimer = undefined;
      postBlockEditSave(false);
    }, AUTOSAVE_DELAY_MS);
  }

  // The webview can be hidden or disposed before the debounce fires; send the pending burst now.
  function flushPendingAutosave() {
    const edit = activeBlockEdit;
    if (!edit || edit.autosaveTimer === undefined) return;
    postBlockEditSave(false);
  }
  // A frontmatter editor has no autosave: its typed text is saved (and the editor closed) when the
  // page goes away or is hidden, as a flush, so a window close or Reload Window loses nothing.
  function flushHiddenPage() {
    flushPendingAutosave();
    flushFrontmatterEditor();
  }
  window.addEventListener("pagehide", flushHiddenPage);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushHiddenPage();
  });

  function saveBlockEdit() {
    postBlockEditSave(true);
  }

  // True while flushOpenEditors runs: a frontmatter value save then tells the host to keep text
  // that is not valid YAML as typed.
  let flushingEditors = false;

  // Before the preview leaves this document (a link to another file, Back / Next, the host
  // following another tab, CR 025): save and close every open editor now, whatever it holds, and
  // do not wait for the autosave timer. The host applies the saves before it switches document.
  // Returns true when a save was posted.
  function flushOpenEditors() {
    let flushed = false;
    const blockEdit = activeBlockEdit;
    if (blockEdit && !blockEdit.finishing) {
      if (blockEdit.tableModel && blockEdit.tableInput && blockEdit.selectedCell) {
        const modelRowIndex = blockEdit.tableRowIndex === 0 ? 0 : blockEdit.tableRowIndex + 1;
        const modelRow = blockEdit.tableModel.rows[modelRowIndex];
        if (modelRow) modelRow[blockEdit.tableColumnIndex] = blockEdit.tableInput.value;
      }
      flushingEditors = true;
      try {
        flushed = postBlockEditSave(true) === true;
      } finally {
        flushingEditors = false;
      }
    }
    return flushFrontmatterEditor() || flushed;
  }

  // Saves the open frontmatter editor as a flush (typed text is kept whatever it holds).
  function flushFrontmatterEditor() {
    const frontmatterEdit = activeFrontmatterEdit;
    if (!frontmatterEdit || frontmatterEdit.saving || typeof frontmatterEdit.save !== "function") return false;
    flushingEditors = true;
    try {
      frontmatterEdit.save();
    } finally {
      flushingEditors = false;
    }
    return Boolean(activeFrontmatterEdit?.saving || activeFrontmatterEdit?.editId);
  }

  // Flushes the open editors, then calls navigate(flushed) once the saves are posted (CR 025).
  // Leaving the page (a click, the host focusing another editor tab) blurs the frontmatter
  // editor first, and its blur posts a plain save. The host refuses a plain save of text that is
  // not valid YAML or does not fit the schema, and the flush would find the editor busy and skip
  // it, so the typed text would be lost with the page. While such a save waits for its result,
  // wait too (bounded, below the host's own 1.5 s wait) and save again as a flush when it was
  // refused. With nothing pending, navigate runs at once.
  function flushOpenEditorsThen(navigate) {
    const flushed = flushOpenEditors();
    const edit = activeFrontmatterEdit;
    if (!edit || !edit.plainSavePending) {
      navigate(flushed);
      return;
    }
    let done = false;
    let timer;
    const finish = () => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      navigate(flushFrontmatterEditor() || flushed);
    };
    const previous = edit.afterResult;
    edit.afterResult = previous ? () => { previous(); finish(); } : finish;
    timer = window.setTimeout(finish, 1000);
  }

  // Cancel button and Escape: close without saving, and restore the block when an autosave already
  // reached the document.
  function cancelBlockEdit() {
    const edit = activeBlockEdit;
    if (!edit || edit.finishing) return;
    closeBlockEdit(edit.hasAutosavedChange === true);
  }

  function switchTableCell(edit, selectedCell, caretPosition) {
    if (edit.finishing || !edit.tableModel || edit.selectedCell === selectedCell) return;
    const rowIndex = selectedCell.parentElement.rowIndex;
    const columnIndex = selectedCell.cellIndex;
    const modelRowIndex = rowIndex === 0 ? 0 : rowIndex + 1;
    if (!edit.tableModel.rows[modelRowIndex] || columnIndex >= edit.tableModel.rows[modelRowIndex].length) return;
    const previousRowIndex = edit.tableRowIndex === 0 ? 0 : edit.tableRowIndex + 1;
    edit.tableModel.rows[previousRowIndex][edit.tableColumnIndex] = edit.tableInput.value;
    postBlockEditSave(false);
    restoreTableCellContent(edit);
    edit.selectedCell.removeAttribute("data-sphinx-preview-table-cell-selected");
    edit.element.remove();
    edit.selectedCell = selectedCell;
    edit.tableRowIndex = rowIndex;
    edit.tableColumnIndex = columnIndex;
    edit.initialCaretPosition = caretPosition;
    edit.renderedCellContent = hideTableCellContent(selectedCell);
    selectedCell.setAttribute("data-sphinx-preview-table-cell-selected", "true");
    selectedCell.appendChild(edit.element);
    beginEditAnchor(selectedCell);
    renderTableCellEditor(edit);
  }

  // Tab / Shift+Tab: next or previous rendered cell, wrapping across rows; Tab on the last cell
  // adds a row and resumes in its first cell after the re-render.
  function tabThroughTableCells(edit, backwards) {
    if (edit.finishing || !edit.tableModel || !edit.selectedCell || !edit.tableInput) return;
    const table = edit.selectedCell.closest?.("table");
    const rows = table?.rows;
    if (!rows || typeof rows.length !== "number") return;
    const cellAt = (rowIndex, columnIndex) => rows[rowIndex]?.cells?.[columnIndex];
    let rowIndex = edit.tableRowIndex;
    let columnIndex = edit.tableColumnIndex;
    if (backwards) {
      columnIndex -= 1;
      if (columnIndex < 0) {
        rowIndex -= 1;
        if (rowIndex < 0) return;
        columnIndex = (rows[rowIndex]?.cells?.length ?? 0) - 1;
      }
    } else {
      columnIndex += 1;
      if (columnIndex >= (rows[rowIndex]?.cells?.length ?? 0)) {
        rowIndex += 1;
        columnIndex = 0;
      }
    }
    if (rowIndex >= rows.length) {
      const modelRowIndex = edit.tableRowIndex === 0 ? 0 : edit.tableRowIndex + 1;
      edit.tableModel.rows[modelRowIndex][edit.tableColumnIndex] = edit.tableInput.value;
      const newRow = tableTools.insertRowAfter(edit.tableModel, edit.tableRowIndex);
      rememberPendingBlockNavigation(edit.target, "end", undefined, {
        tableRowIndex: newRow,
        tableColumnIndex: 0,
      });
      if (!postBlockEditSave(true)) clearPendingBlockNavigation();
      return;
    }
    const cell = cellAt(rowIndex, columnIndex);
    if (cell) switchTableCell(edit, cell, "end");
  }

  // Arrow keys at the edge of the field move to the neighbouring rendered cell (same row for
  // Left/Right, same column for Up/Down) through the same switch as Tab. With no cell in that
  // direction the event is left to the block-to-block navigation.
  function arrowThroughTableCells(edit, event, control) {
    if (event.isComposing || edit.finishing || !edit.tableModel || !edit.selectedCell) return false;
    const navigation = boundaryNavigation(control, event);
    if (!navigation) return false;
    const rows = edit.selectedCell.closest?.("table")?.rows;
    if (!rows || typeof rows.length !== "number") return false;
    let rowIndex = edit.tableRowIndex;
    let columnIndex = edit.tableColumnIndex;
    if (event.key === "ArrowLeft") columnIndex -= 1;
    else if (event.key === "ArrowRight") columnIndex += 1;
    else if (event.key === "ArrowUp") rowIndex -= 1;
    else if (event.key === "ArrowDown") rowIndex += 1;
    else return false;
    const cell = rows[rowIndex]?.cells?.[columnIndex];
    if (!cell) return false;
    // Same validity test as switchTableCell, so a cell missing from the model row falls back.
    const modelRow = edit.tableModel.rows[rowIndex === 0 ? 0 : rowIndex + 1];
    if (!modelRow || columnIndex >= modelRow.length) return false;
    event.preventDefault?.();
    switchTableCell(edit, cell, navigation.caretPosition);
    return true;
  }

  // A cell editor must never stay open without focus. A pointer press in the last 500 ms means a
  // click is in progress and the click handlers decide what happens.
  let lastPointerDownAt = 0;
  document.addEventListener("pointerdown", () => {
    lastPointerDownAt = Date.now();
  }, true);

  function commitCellEditorOnFocusLoss(edit, input) {
    window.setTimeout(() => {
      if (activeBlockEdit !== edit || edit.finishing || edit.tableInput !== input) return;
      if (Date.now() - lastPointerDownAt < 500) return;
      const active = document.activeElement;
      const documentFocused = typeof document.hasFocus === "function" ? document.hasFocus() : true;
      const focusInside = documentFocused && active
        && (edit.element === active || edit.element.contains?.(active)
          || edit.tableMenu === active || edit.tableMenu?.contains?.(active));
      if (focusInside) return;
      saveBlockEdit();
    }, 0);
  }

  // Escape cancels the open frontmatter edit from anywhere inside the properties section, for
  // example the field picker or a header cell, as it does inside the field control itself.
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const edit = activeFrontmatterEdit;
    if (!edit || edit.saving || edit.control?.disabled) return;
    const target = event.target;
    if (!target || typeof target.closest !== "function" || !target.closest("[data-okf-properties]")) return;
    event.preventDefault?.();
    edit.cancel?.();
    closeFrontmatterEditor("Escape in properties");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const edit = activeBlockEdit;
    if (!edit || !edit.selectedCell || edit.finishing) return;
    const inside = (node) => Boolean(node)
      && (edit.element === node || edit.element.contains?.(node));
    if (inside(event.target) || inside(document.activeElement)) return;
    event.preventDefault?.();
    cancelBlockEdit();
  });

  // The top of the strip of the viewport where the table toolbar is fully usable: below the sticky
  // heading band (its measured bottom when that exceeds the reserved reading offset) and, when the
  // toolbar shares horizontal space with the fixed preview controls, below those controls.
  // "content" (optional) is the element behind the rectangle "bar": only its visible controls and
  // text count against the preview controls (a wide toolbar box whose right part is empty does not
  // need to clear a toolbar that only covers that empty part). An element without any visible item
  // yet (a menu that is still being filled) is checked again when it grows.
  function toolbarUsableTop(bar, content) {
    refreshReadingOffset();
    let usableTop = readingOffsetValue;
    if (stickyHeadings && !stickyHeadings.hidden) {
      const band = stickyHeadings.getBoundingClientRect?.();
      if (band && Number.isFinite(band.bottom)) usableTop = Math.max(usableTop, band.bottom);
    }
    const controls = document.querySelector?.("[data-sphinx-preview-toolbar]")?.getBoundingClientRect?.();
    if (controls && Number.isFinite(controls.bottom) && Number.isFinite(controls.left)) {
      const controlsRight = Number.isFinite(controls.right) ? controls.right : controls.left + controls.width;
      const barRight = Number.isFinite(bar.right) ? bar.right : bar.left + bar.width;
      if (Number.isFinite(controlsRight) && Number.isFinite(barRight)
        && bar.left < controlsRight && barRight > controls.left) {
        const visible = Array.from(content?.querySelectorAll?.("button, input, textarea, select, a, span, p") ?? [])
          .map((item) => item.getBoundingClientRect?.())
          .filter((box) => box && box.width > 0 && box.height > 0 && Number.isFinite(box.left)
            && Number.isFinite(box.top))
          .map((box) => ({ top: box.top, left: box.left, right: Number.isFinite(box.right) ? box.right : box.left + box.width }));
        const items = visible.filter((box) => box.left < controlsRight && box.right > controls.left);
        if (!content) {
          usableTop = Math.max(usableTop, controls.bottom + 4);
        } else if (items.length > 0) {
          // The bar must move down until its first item sharing columns with the controls clears them.
          const offset = Math.min(...items.map((box) => box.top)) - bar.top;
          usableTop = Math.max(usableTop, controls.bottom + 4 - offset);
        }
      }
    }
    return usableTop;
  }

  // Keeps the table toolbar fully visible while its table is edited: when it sits above the usable
  // top of the viewport (under the sticky band or the preview controls, or off-screen), scroll up
  // just enough to show it, but only if the selected cell stays inside the viewport. The scroll is
  // a preview-owned programmatic one. Called when the toolbar appears and after every anchor
  // restore, so a later layout change (for example a wrapping status line) cannot hide it again.
  function revealTableToolbar(menu, cell) {
    const bar = menu.getBoundingClientRect?.();
    const cellRect = cell?.getBoundingClientRect?.();
    if (!bar || !cellRect || !Number.isFinite(bar.top) || !Number.isFinite(cellRect.bottom)) return;
    const wanted = toolbarUsableTop(bar, menu) - bar.top;
    const delta = Math.min(wanted, window.scrollY);
    if (!(delta > 0)) return;
    const viewportHeight = window.innerHeight || document.documentElement?.clientHeight || 0;
    if (!(viewportHeight > 0) || cellRect.bottom + delta > viewportHeight) return;
    const target = window.scrollY - delta;
    programmaticScroll(target);
    if (editAnchor?.element) editAnchor.viewportTop += delta;
    const line = lineAtScroll(target);
    if (line !== undefined) anchor = { line, owner: anchor?.owner ?? "preview" };
  }

  // CR 034: the table toolbar stays in view while a tall table scrolls. It keeps its place above the
  // table (the table's text never moves) and is translated down to just under the sticky band or
  // the preview controls, never past the table's bottom. A bar over 40% of the viewport stays put.
  function syncTableMenuSticky(edit) {
    const menu = edit.tableMenu;
    const table = edit.selectedCell?.closest?.("table");
    if (!menu || !table || edit.finishing || activeBlockEdit !== edit) return;
    const bar = menu.getBoundingClientRect?.();
    const tableRect = table.getBoundingClientRect?.();
    if (!bar || !tableRect || !Number.isFinite(bar.top)) return;
    const current = Number.parseFloat(menu.style?.getPropertyValue?.("--sphinx-preview-table-menu-shift")) || 0;
    const natural = { top: bar.top - current, left: bar.left, right: bar.right, width: bar.width };
    const small = bar.height <= window.innerHeight * 0.4;
    // Only once the table's own top is under the band or the controls: while the table top is in
    // view the bar keeps its place above the table and never covers a row.
    const usable = toolbarUsableTop(natural);
    const shift = small && tableRect.top < usable
      ? stickyBarShift(natural.top, bar.height, usable, tableRect.bottom)
      : 0;
    if (shift > 0) menu.setAttribute("data-sphinx-table-menu-stuck", "true");
    else menu.removeAttribute("data-sphinx-table-menu-stuck");
    menu.style?.setProperty?.("--sphinx-preview-table-menu-shift", shift + "px");
  }

  function renderTableCellEditor(edit) {
    const modelRowIndex = edit.tableRowIndex === 0 ? 0 : edit.tableRowIndex + 1;
    const row = edit.tableModel.rows[modelRowIndex];
    edit.tableColumnIndex = Math.max(0, Math.min(edit.tableColumnIndex, row.length - 1));
    // The panel and popover belong to the control that is about to be replaced.
    edit.closeLinkPanel?.(false);
    edit.cellPalette?.closePopover();
    edit.cellSlash?.close();
    edit.element.textContent = "";

    const input = document.createElement("textarea");
    input.rows = 1;
    input.setAttribute("spellcheck", "false");
    input.setAttribute("aria-label", "Markdown table cell");
    input.value = row[edit.tableColumnIndex];
    // The cell grows with its text: the field has no scrollbar and the buttons sit beneath it.
    const resizeInput = () => {
      input.style.height = "auto";
      input.style.height = input.scrollHeight + "px";
    };
    const rememberCellValue = () => {
      // Any later change wins over a conversion that was not saved.
      edit.convertedText = undefined;
      const selectedRow = edit.tableRowIndex === 0 ? 0 : edit.tableRowIndex + 1;
      edit.tableModel.rows[selectedRow][edit.tableColumnIndex] = input.value;
    };
    input.addEventListener("input", () => {
      resizeInput();
      rememberCellValue();
      autosaveBlockEdit();
    });

    const menu = edit.tableMenu || document.createElement("div");
    menu.textContent = "";
    if (!edit.tableMenu) {
      menu.className = "sphinx-preview-table-menu";
      menu.setAttribute("role", "toolbar");
      menu.setAttribute("aria-label", "Table row and column actions");
      menu.setAttribute("data-sphinx-table-menu", "true");
      menu.addEventListener("click", (event) => event.stopPropagation?.());
      // In the document flow, directly above the table (or its single-child wrapper), so the
      // toolbar never covers a row. The edit anchor keeps the selected cell fixed on screen.
      const table = edit.selectedCell.closest?.("table");
      let placeBefore = table;
      const wrapper = table?.parentElement;
      const wrapperChildren = wrapper?.children || wrapper?.childElements;
      if (wrapper && wrapper.tagName === "DIV" && wrapperChildren && wrapperChildren.length === 1
        && wrapper.getAttribute("data-sphinx-source-line") === null) {
        placeBefore = wrapper;
      }
      if (placeBefore && placeBefore.parentElement) {
        placeBefore.parentElement.insertBefore(menu, placeBefore);
      } else {
        document.body.appendChild(menu);
      }
      edit.tableMenu = menu;
      // The bar rides down with the page while its table scrolls (CR 034), and follows a resize.
      edit.tableMenuPositionListener = () => syncTableMenuSticky(edit);
      window.addEventListener("scroll", edit.tableMenuPositionListener, true);
      window.addEventListener("resize", edit.tableMenuPositionListener);
      applyAnchor();
    }
    const actionButtons = [];
    const tableActionIcons = {
      addRow: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 3.5h16v13H4z"></path><path d="M4 8h16M9.5 3.5v13M14.5 3.5v13M12 19v4M9.5 21.5h5"></path></svg>',
      deleteRow: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 3.5h16v13H4z"></path><path d="M4 8h16M9.5 3.5v13M14.5 3.5v13M9.5 21.5h5"></path></svg>',
      addColumn: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3.5 4h13v16h-13z"></path><path d="M8 4v16M12.5 4v16M17 9h6M20 6v6"></path></svg>',
      deleteColumn: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3.5 4h13v16h-13z"></path><path d="M8 4v16M12.5 4v16M17 9h6"></path></svg>',
      listTable: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 5h16v14H4z"></path><path d="M4 10h16M9 5v14M6 7.5h.01M6 14.5h.01M12 14.5h6"></path></svg>',
    };
    const addAction = (name, icon, label, handler, disabled, group) => {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("aria-label", name);
      button.setAttribute("title", name);
      button.setAttribute("data-tooltip", name);
      button.setAttribute("data-sphinx-table-operation", name);
      button.setAttribute("data-sphinx-table-group", group);
      button.innerHTML = icon;
      const labelText = document.createElement("span");
      labelText.className = "sphinx-preview-table-menu-label";
      labelText.textContent = label;
      button.appendChild(labelText);
      button.disabled = disabled;
      button.addEventListener("click", () => {
        rememberCellValue();
        handler();
        if (!edit.finishing) renderTableCellEditor(edit);
      });
      menu.appendChild(button);
      actionButtons.push(button);
    };
    addAction("Insert row after selected row", tableActionIcons.addRow, "Row +", () => {
      edit.tableRowIndex = tableTools.insertRowAfter(edit.tableModel, edit.tableRowIndex);
    }, false, "row");
    addAction("Delete selected row", tableActionIcons.deleteRow, "Row \u2212", () => {
      const nextRow = tableTools.deleteRow(edit.tableModel, edit.tableRowIndex);
      if (nextRow !== undefined) edit.tableRowIndex = nextRow;
    }, edit.tableRowIndex === 0 || edit.tableModel.rows.length <= 3, "row");
    addAction("Insert column after selected column", tableActionIcons.addColumn, "Col +", () => {
      edit.tableColumnIndex = tableTools.insertColumnAfter(edit.tableModel, edit.tableColumnIndex);
    }, false, "column");
    addAction("Delete selected column", tableActionIcons.deleteColumn, "Col \u2212", () => {
      const nextColumn = tableTools.deleteColumn(edit.tableModel, edit.tableColumnIndex);
      if (nextColumn !== undefined) edit.tableColumnIndex = nextColumn;
    }, edit.tableModel.rows[0].length <= 1, "column");
    // Table level: the pipe table becomes a {list-table}, written back as one edit (one undo step).
    // A table captioned by a {table} directive sits in a figure; wrapping a list-table in it is not
    // offered.
    const tableFigure = edit.selectedCell.closest?.("table")?.parentElement?.tagName === "FIGURE";
    addAction("Convert to list-table", tableActionIcons.listTable, "List table", () => {
      const converted = tableTools.convertTable(tableTools.serialize(edit.tableModel), "list-table");
      if (converted && converted.ok) {
        edit.convertedText = converted.text;
        saveBlockEdit();
      } else if (converted) {
        edit.status.textContent = converted.reason;
      }
    }, tableFigure, "table");

    // The inline buttons allowed in a cell join the bar after a separator; the same group object
    // is kept for the whole edit and only moved into each rebuilt bar.
    const rememberAndAutosave = () => {
      resizeInput();
      rememberCellValue();
      autosaveBlockEdit();
    };
    edit.tableInput = input;
    if (!edit.cellPalette) {
      edit.cellPalette = createEditPalette(document, {
        actions: editActions,
        scope: "cell",
        getControl: () => edit.tableInput,
        getCaretRect: () => caretRectOf(document, window, edit.tableInput),
        applyTextEdit: (paletteEdit) => applyTextEdit(edit.tableInput, paletteEdit, rememberAndAutosave),
        openPanel: (action, panelName) => {
          if ((panelName ?? action.panel) === "link") openLinkPanel(edit.tableInput, rememberAndAutosave);
        },
        caretInside: () => false,
        mode: paletteMode,
        isInsideFrame: (node) => Boolean(node)
          && (node === edit.element || edit.element.contains(node)
            || (Boolean(edit.tableMenu) && edit.tableMenu.contains(node))),
        requestList: (kind, done) => hostRequests.ask(
          kind === "targets" ? "previewListTargets" : "previewListCitations", {}, {},
          (result) => done(result.ok === true && Array.isArray(result.items)
            ? { items: result.items, truncated: result.truncated === true }
            : { items: [], error: typeof result.reason === "string" ? result.reason : "The list could not be read." })),
        pickHost: (kind, done) => hostRequests.ask(
          kind === "image" ? "previewPickImage" : "previewPickDocument", {}, { dialog: true },
          (result) => done(result.ok === true && typeof result.path === "string" ? result.path : undefined)),
        onLeave: () => {
          if (hostRequests.isDialogOpen()) return;
          if (activeBlockEdit === edit && !edit.finishing) saveBlockEdit();
        },
        onDone: () => {
          if (activeBlockEdit === edit) saveBlockEdit();
        },
        apple: isApplePlatform(),
      });
    }
    edit.cellPalette.setMode(paletteMode);
    if (!edit.cellSlash) {
      edit.cellSlash = createSlashMenu(document, window, {
        getControl: () => edit.tableInput,
        getEntries: () => edit.cellPalette.menuEntries(),
        run: (key, range) => edit.cellPalette.runMenuEntry(key, range),
        getCaretRect: () => caretRectOf(document, window, edit.tableInput),
        preferGroup: () => (paletteMode === "myst" ? "myst" : undefined),
      });
    }
    const separator = document.createElement("span");
    separator.setAttribute("role", "separator");
    separator.setAttribute("aria-orientation", "vertical");
    separator.className = "sphinx-preview-table-menu-separator";
    menu.appendChild(separator);
    menu.appendChild(edit.cellPalette.element);

    const columnCount = edit.tableModel.rows[0].length;
    const columnText = "column " + (edit.tableColumnIndex + 1) + " of " + columnCount;
    edit.status.textContent = edit.tableRowIndex === 0
      ? "Header \u00b7 " + columnText
      : "Row " + edit.tableRowIndex + " of " + (edit.tableModel.rows.length - 2) + " \u00b7 " + columnText;
    menu.appendChild(edit.status);
    // The menu now has its items: check them against the floating controls.
    applyAnchor();
    edit.element.appendChild(input);
    // Done and Cancel under the field, without the status hint (the toolbar carries the position).
    const cellActions = document.createElement("div");
    cellActions.className = "sphinx-preview-block-editor-actions";
    cellActions.appendChild(createEditorButtons(edit));
    edit.element.appendChild(cellActions);
    resizeInput();
    syncTableMenuSticky(edit);
    // stabilizeLayout (window and content resize) re-fits the field when the width changes.
    edit.resizeTextarea = resizeInput;
    edit.tableInput = input;
    edit.actionButtons = actionButtons;
    input.addEventListener("blur", () => {
      edit.cellSlash?.close();
      commitCellEditorOnFocusLoss(edit, input);
    });
    // Clicking or typing in the cell closes what the bar opened, as in a block editor.
    input.addEventListener("mousedown", () => {
      edit.cellPalette?.closePopover();
      edit.closeLinkPanel?.(false);
    });
    input.addEventListener("input", (event) => {
      edit.cellPalette?.closePopover();
      edit.closeLinkPanel?.(false);
      edit.cellPalette?.updateAvailability();
      edit.cellSlash?.handleInput(event);
    });
    for (const kind of ["keyup", "mouseup", "select"]) {
      input.addEventListener(kind, () => {
        edit.cellPalette?.updateAvailability();
        edit.cellSlash?.sync();
      });
    }
    input.addEventListener("keydown", (event) => {
      if (edit.cellSlash?.handleKey(event)) return;
      if (edit.cellPalette?.handleKey(event)) return;
      if (keepUndoInControl(event)) return;
      if (paletteShortcut(event, input, rememberAndAutosave)) return;
      if (wrapSelectionInControl(event, input, () => {
        resizeInput();
        rememberCellValue();
        autosaveBlockEdit();
      })) return;
      if (event.key === "Tab" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault?.();
        tabThroughTableCells(edit, Boolean(event.shiftKey));
        return;
      }
      if (arrowThroughTableCells(edit, event, input)) return;
      if (navigateBlockEdit(event, input)) return;
      if (homeEndInControl(event, input)) return;
      if (event.key === "Escape" && !event.isComposing) {
        event.preventDefault?.();
        cancelBlockEdit();
      } else if (event.key === "Enter") {
        event.preventDefault?.();
        saveBlockEdit();
      }
    });
    focusTextControlAtLastContent(input, edit.initialCaretPosition);
    editorTrace.record("cell editor focused", "line=" + edit.line + " row=" + edit.tableRowIndex
      + " column=" + edit.tableColumnIndex + " " + traceFocus());
  }

  function isApplePlatform() {
    try {
      const platform = typeof navigator === "undefined"
        ? ""
        : String((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "");
      return /mac|iphone|ipad/iu.test(platform);
    } catch {
      return false;
    }
  }

  function blockEditHint(edit) {
    const applePlatform = isApplePlatform();
    const lines = edit.insertAfterLine !== undefined
      ? "New block"
      : edit.endLine > edit.line
      ? "Lines " + edit.line + "\u2013" + edit.endLine
      : "Line " + edit.line;
    return lines + " \u00b7 Enter: new line \u00b7 Tab: indent \u00b7 Esc: cancel \u00b7 "
      + (applePlatform ? "\u2318\u21a9" : "Ctrl+Enter") + ": done";
  }

  // Done and Cancel, shared by the block editor and the table-cell editor. The mousedown default is
  // prevented to keep the focus in the field, so its blur commit does not run before the click.
  function createEditorButtons(edit) {
    const doneButton = document.createElement("button");
    doneButton.setAttribute("type", "button");
    doneButton.setAttribute("aria-label", "Done editing");
    doneButton.textContent = "Done";
    const cancelButton = document.createElement("button");
    cancelButton.setAttribute("type", "button");
    cancelButton.setAttribute("aria-label", "Cancel editing and restore the original text");
    cancelButton.setAttribute("title", "Cancel (Esc)");
    cancelButton.textContent = "Cancel";
    const keepFocus = (event) => event.preventDefault?.();
    doneButton.addEventListener("mousedown", keepFocus);
    cancelButton.addEventListener("mousedown", keepFocus);
    doneButton.addEventListener("click", () => saveBlockEdit());
    cancelButton.addEventListener("click", () => {
      if (activeBlockEdit !== edit) return;
      cancelBlockEdit();
    });
    const buttons = document.createElement("div");
    buttons.className = "sphinx-preview-block-editor-buttons";
    buttons.appendChild(doneButton);
    buttons.appendChild(cancelButton);
    return buttons;
  }

  // After a row (the palette, the link panel) was added above the text box, the page scrolls down
  // by the height it added so the text the user is editing stays where it was. Returns the shift
  // applied: none on a page at its very top, and never more than the room under the sticky band.
  // The palette sits on top of the frame, attached to it, in a host that holds both: the host
  // bounds the palette's sticky position, so it follows a tall frame and leaves with it.
  function placePaletteAboveFrame(edit, paletteElement) {
    if (!edit.host) {
      const host = document.createElement("div");
      host.className = "sphinx-preview-block-editor-host";
      if (edit.element.className?.includes?.("sphinx-preview-block-editor--first")) {
        host.className += " sphinx-preview-block-editor--first";
      }
      host.setAttribute("data-sphinx-preview-block-editor-host", "true");
      // Like the frame, the palette's clicks never reach the page's block click handling.
      host.addEventListener("click", (event) => event.stopPropagation?.());
      edit.element.before(host);
      host.appendChild(edit.element);
      edit.host = host;
    }
    edit.host.insertBefore(paletteElement, edit.element);
  }

  // A tall box scrolls under the stuck palette: the palette stays sticky only while it is small
  // next to the viewport (the CSS also drops it in narrow or short panes), and the page keeps
  // the caret clear of it (scroll-padding for native scrolling, plus a nudge after caret moves).
  function syncPaletteSticky(edit) {
    const bar = edit.palette?.element?.getBoundingClientRect?.();
    if (!edit.host || !bar || !Number.isFinite(bar.height)) return;
    const small = bar.height <= window.innerHeight * 0.4;
    const flowing = window.getComputedStyle?.(edit.palette.element)?.position !== "sticky";
    if (small) edit.host.removeAttribute("data-sphinx-palette-static");
    else edit.host.setAttribute("data-sphinx-palette-static", "true");
    // Scroll padding only while the bar is stuck over the box: with the bar in its place above the
    // box it would make the browser scroll the page for a caret that is not hidden.
    const frameTop = edit.element.getBoundingClientRect?.()?.top;
    const stuck = !flowing && Number.isFinite(frameTop) && bar.bottom > frameTop + 0.5;
    const padding = small && stuck
      ? "calc(max(var(--sphinx-preview-reading-offset, 0px), var(--sphinx-preview-toolbar-bottom, 0px)) + "
        + Math.ceil(bar.height + 12) + "px)"
      : "";
    if (padding) document.documentElement?.style?.setProperty?.("scroll-padding-top", padding);
    else document.documentElement?.style?.removeProperty?.("scroll-padding-top");
  }

  function revealCaretBelowPalette(edit, textarea) {
    if (!edit.host || !edit.palette || edit.finishing || activeBlockEdit !== edit) return;
    if (edit.host.getAttribute("data-sphinx-palette-static") === "true") return;
    const bar = edit.palette.element.getBoundingClientRect?.();
    const frame = edit.element.getBoundingClientRect?.();
    const caret = caretRectOf(document, window, textarea);
    if (!bar || !frame || !caret) return;
    const delta = caretRevealDelta(caret, bar, frame, window.innerHeight);
    if (!delta) return;
    const target = Math.max(0, Math.min(maxScrollTop(), window.scrollY + delta));
    programmaticScroll(target);
    if (editAnchor?.element) {
      const viewportTop = editAnchor.element.getBoundingClientRect().top;
      if (Number.isFinite(viewportTop)) editAnchor.viewportTop = viewportTop;
    }
  }

  // The editor frame and, in a block editor, the host that also holds the palette above it.
  function frameContains(edit, node) {
    if (!node) return false;
    const root = edit.host ?? edit.element;
    return node === root || node === edit.element || Boolean(root.contains?.(node))
      || Boolean(edit.element.contains?.(node));
  }

  // Opening the palette adds its height above the frame, in the host. The frame is the scroll
  // anchor, so the text would stay where it is and the content above scrolls up by that height
  // (scroll shift). Not on a page scrolled to its top, and never so far that the bar would end
  // under the sticky band or the preview controls: the frame then goes down by the difference.
  // Returns the scroll shift, which a close scrolls back.
  function keepTextInPlaceBelowPalette(edit, textTopBefore) {
    const textTopAfter = edit.textarea.getBoundingClientRect?.().top;
    const height = textTopAfter - textTopBefore;
    if (!editAnchor?.element || !Number.isFinite(textTopBefore) || !Number.isFinite(textTopAfter) || !(height > 0)) {
      return 0;
    }
    let shift = 0;
    if (window.scrollY > 0) {
      // The palette's own place is the top of its host: the bar's rectangle is not it while the bar
      // is stuck below the preview controls (that would count the stuck distance as free room).
      const bar = edit.palette.element.getBoundingClientRect?.();
      const natural = edit.host?.getBoundingClientRect?.()?.top;
      const top = Number.isFinite(natural) ? natural : bar?.top;
      if (Number.isFinite(top)) {
        const usable = toolbarUsableTop(bar ?? { top, left: 0, width: 0 });
        shift = Math.min(height, Math.max(0, top - usable));
        // Not enough room below the preview controls: scroll up (the text goes down) so the bar
        // keeps its place instead of being stuck over the first lines of the text, as long as the
        // frame stays in the viewport. The close scrolls back (a negative shift).
        const frameBottom = edit.element.getBoundingClientRect?.()?.bottom;
        const spare = Number.isFinite(frameBottom) ? Math.max(0, window.innerHeight - 24 - frameBottom) : 0;
        const missing = Math.min(Math.max(0, usable - top), spare, window.scrollY + shift);
        shift -= missing;
      }
    }
    editAnchor.viewportTop += height - shift;
    return shift;
  }

  function keepTextInPlace(edit, textTopBefore) {
    const textTopAfter = edit.textarea.getBoundingClientRect?.().top;
    if (
      !(window.scrollY > 0)
      || !editAnchor?.element
      || !Number.isFinite(textTopBefore)
      || !Number.isFinite(textTopAfter)
    ) return 0;
    const frame = edit.element.getBoundingClientRect?.();
    const room = frame && Number.isFinite(frame.top)
      ? Math.max(0, frame.top - toolbarUsableTop(frame))
      : 0;
    const shift = Math.min(textTopAfter - textTopBefore, room);
    if (!(shift > 0)) return 0;
    editAnchor.viewportTop -= shift;
    return shift;
  }

  // The link panel (Cmd/Ctrl+K and the palette's Link button): Text and URL fields under the
  // palette. The text box selection is remembered on open and restored on every way out; the
  // blur commit of the text box ignores the move into the panel.
  function openLinkPanel(control, onFallbackInput) {
    const edit = activeBlockEdit;
    // In a table cell the panel sits inside the table bar, under the buttons.
    const inCell = Boolean(edit?.selectedCell);
    const palette = inCell ? edit?.cellPalette : edit?.palette;
    if (!edit || edit.finishing || (inCell ? edit.tableInput : edit.textarea) !== control || !palette) return;
    if (edit.linkPanel) {
      edit.linkPanel.focusFirst();
      return;
    }
    palette.closePopover();
    const selection = {
      value: String(control.value ?? ""),
      selectionStart: Number(control.selectionStart),
      selectionEnd: Number(control.selectionEnd),
      scope: inCell ? "cell" : "block",
    };
    const draft = editActions.linkDraft(selection);
    // "restore" is false when the user went back to the text box: its caret and text are theirs.
    const closePanel = (restore = true) => {
      const panel = edit.linkPanel;
      if (!panel) return;
      edit.linkPanel = undefined;
      edit.closeLinkPanel = undefined;
      panel.destroy();
      if (restore) {
        control.focus({ preventScroll: true });
        control.setSelectionRange(selection.selectionStart, selection.selectionEnd);
      }
      const shift = edit.linkPanelShift ?? 0;
      edit.linkPanelShift = 0;
      if (shift > 0 && activeBlockEdit === edit && editAnchor) {
        edit.paletteShift = (edit.paletteShift ?? 0) - shift;
        editAnchor.viewportTop += shift;
        applyAnchor();
      }
    };
    const panel = createLinkPanel(document, {
      text: draft.text,
      url: draft.url,
      onSubmit: (text, url) => {
        if (activeBlockEdit !== edit || edit.finishing) return;
        // The offsets were taken when the panel opened; a changed text makes them meaningless.
        if (String(control.value ?? "") !== selection.value) {
          closePanel(false);
          return;
        }
        closePanel();
        applyTextEdit(control, editActions.linkEdit(selection, text, url), onFallbackInput);
      },
      onCancel: () => closePanel(),
      onLeave: () => {
        if (activeBlockEdit === edit) saveBlockEdit();
      },
      isInsideFrame: (node) => frameContains(edit, node)
        || (inCell && Boolean(node) && Boolean(edit.tableMenu) && edit.tableMenu.contains(node)),
    });
    edit.linkPanel = panel;
    edit.closeLinkPanel = closePanel;
    const textTopBefore = control.getBoundingClientRect?.().top;
    if (inCell) edit.tableMenu.appendChild(panel.element);
    else edit.element.insertBefore(panel.element, control);
    const shift = inCell ? 0 : keepTextInPlace(edit, textTopBefore);
    edit.linkPanelShift = shift;
    if (shift > 0) edit.paletteShift = (edit.paletteShift ?? 0) + shift;
    applyAnchor();
    panel.focusFirst();
  }

  function receiveBlockEditSource(message) {
    const edit = activeBlockEdit;
    if (!edit || message.editId !== edit.editId) return;
    if (typeof message.error === "string") {
      clearPendingBlockNavigation();
      pendingBlockSelection = undefined;
      edit.finishing = false;
      edit.lastPostedText = undefined;
      edit.status.textContent = message.error;
      edit.hintReplaced = Boolean(edit.textarea);
      return;
    }
    if (typeof message.originalText !== "string" || edit.textarea || edit.tableInput) return;
    edit.originalText = message.originalText;
    edit.lastPostedText = message.originalText;
    edit.hasAutosavedChange = false;
    edit.finishing = false;
    const carriageReturnLineFeed = String.fromCharCode(13) + String.fromCharCode(10);
    edit.trailingLineEnding = message.originalText.endsWith(carriageReturnLineFeed)
      ? carriageReturnLineFeed
      : message.originalText.endsWith(String.fromCharCode(10))
        ? String.fromCharCode(10)
        : message.originalText.endsWith(String.fromCharCode(13))
          ? String.fromCharCode(13)
          : "";
    if (edit.selectedCell) {
      const model = tableTools.parse(message.originalText);
      if (
        model
        && edit.tableRowIndex < model.rows.length - 1
        && edit.tableColumnIndex < model.rows[0].length
      ) {
        edit.tableModel = model;
        renderTableCellEditor(edit);
        return;
      }
      restoreTableCellContent(edit);
      edit.selectedCell.removeAttribute("data-sphinx-preview-table-cell-selected");
      edit.selectedCell = undefined;
      edit.target.setAttribute("data-sphinx-preview-editing", "true");
      edit.element.className = "sphinx-preview-block-editor";
      edit.element.removeAttribute("data-sphinx-preview-table-cell-editor");
      edit.element.setAttribute("aria-label", "Raw Markdown editor");
      edit.status.textContent = "";
    }
    edit.element.textContent = "";
    const textarea = document.createElement("textarea");
    textarea.setAttribute("aria-label", "Raw Markdown block");
    textarea.setAttribute("spellcheck", "false");
    textarea.setAttribute("autocorrect", "off");
    textarea.setAttribute("autocapitalize", "off");
    textarea.setAttribute("autocomplete", "off");
    if (edit.insertAfterLine !== undefined) {
      textarea.setAttribute("placeholder", 'Type Markdown, for example "## Heading" or "- item"');
    }
    const displayText = edit.trailingLineEnding
      ? message.originalText.slice(0, -edit.trailingLineEnding.length)
      : message.originalText;
    textarea.value = displayText;
    textarea.rows = 1;
    const resizeTextarea = () => {
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";
    };
    const hint = blockEditHint(edit);
    const actions = document.createElement("div");
    actions.className = "sphinx-preview-block-editor-actions";
    const buttons = createEditorButtons(edit);
    actions.appendChild(edit.status);
    actions.appendChild(buttons);
    textarea.addEventListener("input", () => {
      resizeTextarea();
      autosaveBlockEdit();
      if (edit.hintReplaced) {
        edit.hintReplaced = false;
        edit.status.textContent = hint;
      }
    });
    // Focus moving into the palette or a panel of the same frame is not leaving the editor; only
    // a focus that goes outside the frame (or nowhere) commits.
    textarea.addEventListener("blur", (event) => {
      const next = event && event.relatedTarget;
      if (next && frameContains(edit, next)) return;
      // A native dialog of the host (the {doc} file picker) took the focus: not leaving.
      if (hostRequests.isDialogOpen()) return;
      saveBlockEdit();
    });
    textarea.addEventListener("blur", () => edit.slashMenu?.close());
    textarea.addEventListener("keydown", (event) => pasteHtml.noteKey(event));
    textarea.addEventListener("paste", (event) => {
      // An image on an otherwise empty clipboard first, then rich text; plain text stays native.
      if (pasteImage.handle(event, textarea, {
        send: (mime, dataBase64, done) => hostRequests.ask(
          "previewPasteImage", { mime, dataBase64 }, { timeoutMs: 30000 }, done),
        status: (text) => { edit.status.textContent = text; },
        isCurrent: () => activeBlockEdit === edit && !edit.finishing && edit.textarea === textarea,
        restoreStatus: () => { edit.status.textContent = hint; },
        // CR 050: the image goes on a paragraph of its own, never at the end of a text line.
        insert: (name, start, end) => {
          applyTextEdit(textarea, imageParagraphEdit(textarea.value, start, end, name), () => {
            resizeTextarea();
            autosaveBlockEdit();
          });
        },
      })) return;
      pasteHtml.handle(event, textarea, {
        send: (html, done) => hostRequests.ask("previewPasteHtml", { html }, { timeoutMs: 10000 }, done),
        isCurrent: () => activeBlockEdit === edit && !edit.finishing && edit.textarea === textarea,
        insert: (text, start, end) => {
          const length = textarea.value.length;
          const from = Math.min(start, length);
          const to = Math.max(from, Math.min(end, length));
          applyTextEdit(textarea, {
            start: from, end: to, text,
            selectionStart: from + text.length, selectionEnd: from + text.length,
          }, () => {
            resizeTextarea();
            autosaveBlockEdit();
          });
        },
      });
    });
    edit.status.textContent = hint;
    edit.element.appendChild(textarea);
    edit.element.appendChild(actions);
    edit.textarea = textarea;
    edit.resizeTextarea = resizeTextarea;
    resizeTextarea();
    // The edition palette sits on top of the frame, in a host holding both. The text line the user
    // clicked stays where it was: the anchor keeps the frame and the content above scrolls up by
    // the height the bar adds, but never so far that the bar would end under the sticky band or
    // the preview controls, and not at all on a page scrolled to its very top.
    const textTopBefore = textarea.getBoundingClientRect?.().top;
    edit.palette?.destroy();
    const palette = createEditPalette(document, {
      actions: editActions,
      getControl: () => textarea,
      getCaretRect: () => caretRectOf(document, window, textarea),
      applyTextEdit: (paletteEdit) => applyTextEdit(textarea, paletteEdit, () => {
        resizeTextarea();
        autosaveBlockEdit();
      }),
      openPanel: (action, panelName) => {
        const onFallbackInput = () => {
          resizeTextarea();
          autosaveBlockEdit();
        };
        if ((panelName ?? action.panel) === "link") openLinkPanel(textarea, onFallbackInput);
        else if (panelName === "figure") openFigurePanel(textarea, onFallbackInput);
      },
      caretInside: (kind) => kind === "figure"
        && figureTools.locateFigure(String(textarea.value ?? ""), Number(textarea.selectionStart)) !== undefined,
      mode: paletteMode,
      modeShortcut: (isApplePlatform() ? "Cmd" : "Ctrl") + "+Shift+M",
      isInsideFrame: (node) => frameContains(edit, node),
      notify: (message) => {
        if (activeBlockEdit === edit && !edit.finishing) edit.status.textContent = message;
      },
      requestList: (kind, done) => hostRequests.ask(
        kind === "targets" ? "previewListTargets" : "previewListCitations", {}, {},
        (result) => done(result.ok === true && Array.isArray(result.items)
          ? { items: result.items, truncated: result.truncated === true }
          : { items: [], error: typeof result.reason === "string" ? result.reason : "The list could not be read." })),
      pickHost: (kind, done) => hostRequests.ask(
        kind === "image" ? "previewPickImage" : "previewPickDocument", {}, { dialog: true },
        (result) => {
          done(result.ok === true && typeof result.path === "string" ? result.path : undefined);
          if (result.ok !== true && activeBlockEdit === edit && typeof result.reason === "string") {
            edit.status.textContent = result.reason;
          }
        }),
      onLeave: () => {
        if (hostRequests.isDialogOpen()) return;
        if (activeBlockEdit === edit && !edit.finishing) saveBlockEdit();
      },
      onDone: () => {
        if (activeBlockEdit === edit) saveBlockEdit();
      },
      onModeChange: (nextMode) => {
        paletteMode = nextMode;
        vscode.postMessage({
          type: "previewPaletteModeChanged",
          documentId: context.documentId,
          documentVersion: context.documentVersion,
          requestId: context.requestId,
          mode: nextMode,
        });
        const state = vscode.getState?.();
        vscode.setState?.({
          ...(state && typeof state === "object" ? state : {}),
          paletteMode,
        });
      },
      apple: isApplePlatform(),
    });
    edit.palette = palette;
    // The slash command menu lists the palette's own entries and runs them through it.
    edit.slashMenu?.destroy();
    edit.slashMenu = createSlashMenu(document, window, {
      getControl: () => textarea,
      getEntries: () => palette.menuEntries(),
      run: (key, range) => palette.runMenuEntry(key, range),
      getCaretRect: () => caretRectOf(document, window, textarea),
      preferGroup: () => (paletteMode === "myst" ? "myst" : undefined),
    });
    placePaletteAboveFrame(edit, palette.element);
    syncPaletteSticky(edit);
    const shift = keepTextInPlaceBelowPalette(edit, textTopBefore);
    if (shift) edit.paletteShift = shift;
    applyAnchor();
    textarea.addEventListener("mousedown", () => {
      palette.closePopover();
      edit.closeLinkPanel?.(false);
      edit.closeFigurePanel?.(false);
    });
    textarea.addEventListener("input", (event) => {
      palette.closePopover();
      edit.closeLinkPanel?.(false);
      edit.closeFigurePanel?.(false);
      palette.updateAvailability();
      revealCaretBelowPalette(edit, textarea);
      edit.slashMenu?.handleInput(event);
    });
    // The colour-code swatch follows the caret: arrows and selections end in a key or mouse release.
    for (const kind of ["keyup", "mouseup", "select"]) {
      textarea.addEventListener(kind, () => {
        palette.updateAvailability();
        revealCaretBelowPalette(edit, textarea);
        edit.slashMenu?.sync();
      });
    }
    textarea.addEventListener("keydown", (event) => {
      if (edit.slashMenu?.handleKey(event)) return;
      if (palette.handleKey(event)) return;
      // Cmd/Ctrl+Shift+M: keyboard path to the palette mode select.
      if (
        (event.key === "m" || event.key === "M" || event.code === "KeyM")
        && event.shiftKey && !event.altKey && !event.isComposing
        && (isApplePlatform() ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey)
      ) {
        event.preventDefault?.();
        event.stopPropagation?.();
        palette.focusModeSelect();
        return;
      }
      if (keepUndoInControl(event)) return;
      if (moveBlockFromEditor(event, textarea)) return;
      if (paletteShortcut(event, textarea, () => {
        resizeTextarea();
        autosaveBlockEdit();
      })) return;
      if (wrapSelectionInControl(event, textarea, () => {
        resizeTextarea();
        autosaveBlockEdit();
      })) return;
      if (navigateBlockEdit(event, textarea)) return;
      if (homeEndInControl(event, textarea)) return;
      if (
        event.key === "Enter"
        && !event.shiftKey && !event.altKey && !event.metaKey && !event.ctrlKey
        && !event.isComposing
      ) {
        const continuation = textEditing.continueOnEnter(
          textarea.value,
          textarea.selectionStart,
          textarea.selectionEnd,
        );
        if (continuation) {
          event.preventDefault?.();
          applyTextEdit(textarea, continuation, () => {
            resizeTextarea();
            autosaveBlockEdit();
          });
        }
        return;
      }
      if (
        event.key === "Tab"
        && !event.altKey && !event.metaKey && !event.ctrlKey
        && !event.isComposing
      ) {
        // Tab never leaves the editor; Escape (cancel) and Cmd/Ctrl+Enter (done) are the exits.
        event.preventDefault?.();
        const indentation = textEditing.indentSelection(
          textarea.value,
          textarea.selectionStart,
          textarea.selectionEnd,
          Boolean(event.shiftKey),
        );
        if (indentation) {
          applyTextEdit(textarea, indentation, () => {
            resizeTextarea();
            autosaveBlockEdit();
          });
        }
        return;
      }
      if (event.key === "Escape" && !event.isComposing) {
        event.preventDefault?.();
        cancelBlockEdit();
      } else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault?.();
        saveBlockEdit();
      }
    });
    focusTextControlAtLastContent(textarea, edit.initialCaretPosition);
    editorTrace.record("block editor focused", "line=" + edit.line + " " + traceFocus());
    if (edit.openFigureForm) {
      edit.openFigureForm = false;
      openFigurePanel(textarea, () => {
        resizeTextarea();
        autosaveBlockEdit();
      }, true);
    }
  }

  // The figure form: the {figure} directive around the caret (the first one when the editor was
  // opened by the Edit figure button), or a Markdown image alone in its paragraph. Apply rewrites
  // that range as one native edit; the text box keeps its caret and the editor stays open.
  function openFigurePanel(control, onFallbackInput, first = false) {
    const edit = activeBlockEdit;
    if (!edit || edit.finishing || edit.textarea !== control || !edit.palette) return;
    if (edit.figurePanel) {
      edit.figurePanel.focusFirst();
      return;
    }
    edit.palette.closePopover();
    edit.closeLinkPanel?.(false);
    const text = String(control.value ?? "");
    const location = figureTools.locateFigure(text, first ? undefined : Number(control.selectionStart));
    if (!location) {
      edit.status.textContent = "No figure at the caret.";
      return;
    }
    const slice = text.slice(location.start, location.end);
    const model = location.kind === "image"
      ? figureTools.modelFromImage(location.alt ?? "", location.source ?? "")
      : figureTools.parseFigure(slice);
    if (!model) {
      edit.status.textContent = "This figure uses a YAML option block: edit it in the text box.";
      return;
    }
    const selection = {
      selectionStart: Number(control.selectionStart),
      selectionEnd: Number(control.selectionEnd),
    };
    const closePanel = (restore = true) => {
      const panel = edit.figurePanel;
      if (!panel) return;
      edit.figurePanel = undefined;
      edit.closeFigurePanel = undefined;
      panel.destroy();
      if (restore) {
        control.focus({ preventScroll: true });
        control.setSelectionRange(selection.selectionStart, selection.selectionEnd);
      }
      const shift = edit.figurePanelShift ?? 0;
      edit.figurePanelShift = 0;
      if (shift > 0 && activeBlockEdit === edit && editAnchor) {
        edit.paletteShift = (edit.paletteShift ?? 0) - shift;
        editAnchor.viewportTop += shift;
        applyAnchor();
      }
    };
    const panel = createFigurePanel(document, {
      values: figureTools.valuesOf(model),
      mode: location.kind === "image" ? "image" : "figure",
      validate: (values) => figureTools.validate(values),
      browse: (done) => hostRequests.ask("previewPickImage", {}, { dialog: true }, (result) => {
        done(result.ok === true && typeof result.path === "string" ? result.path : undefined);
        if (result.ok !== true && activeBlockEdit === edit && typeof result.reason === "string") {
          edit.status.textContent = result.reason;
        }
      }),
      onSubmit: (values) => {
        if (activeBlockEdit !== edit || edit.finishing) return;
        // The range was taken when the form opened; a text changed without an input event is stale.
        if (String(control.value ?? "") !== text) {
          closePanel(false);
          return;
        }
        const written = figureTools.serializeFigure(figureTools.applyValues(model, values));
        closePanel(false);
        if (written === slice) {
          control.focus({ preventScroll: true });
          control.setSelectionRange(selection.selectionStart, selection.selectionEnd);
          return;
        }
        applyTextEdit(control, {
          start: location.start,
          end: location.end,
          text: written,
          selectionStart: location.start,
          selectionEnd: location.start,
        }, onFallbackInput);
      },
      onCancel: () => closePanel(),
      onLeave: () => {
        if (hostRequests.isDialogOpen()) return;
        if (activeBlockEdit === edit) saveBlockEdit();
      },
      isInsideFrame: (node) => frameContains(edit, node),
    });
    edit.figurePanel = panel;
    edit.closeFigurePanel = closePanel;
    const textTopBefore = control.getBoundingClientRect?.().top;
    edit.element.insertBefore(panel.element, control);
    const shift = keepTextInPlace(edit, textTopBefore);
    edit.figurePanelShift = shift;
    if (shift > 0) edit.paletteShift = (edit.paletteShift ?? 0) + shift;
    applyAnchor();
    panel.focusFirst();
  }

  // The Edit figure button: open the figure's block editor, then its form once the source arrives.
  function openFigureEditor(figure) {
    if (!editMode || activeFrontmatterEdit) return;
    if (activeBlockEdit) {
      if (activeBlockEdit.finishing || activeBlockEdit.selectedCell) return;
      if (activeBlockEdit.target === figure) {
        if (activeBlockEdit.textarea) openFigurePanel(activeBlockEdit.textarea, () => undefined, true);
        return;
      }
      saveBlockEdit();
      return;
    }
    openMappedEditor(figure, figure, "end", true);
    if (activeBlockEdit && activeBlockEdit.target === figure) activeBlockEdit.openFigureForm = true;
  }

  let editHoverElement;

  function setEditHover(element) {
    if (editHoverElement === element) return;
    editHoverElement?.removeAttribute?.("data-sphinx-preview-edit-hover");
    editHoverElement = element;
    editHoverElement?.setAttribute?.("data-sphinx-preview-edit-hover", "true");
    figureEditButton.sync(element);
  }

  // The element whose outline shows what a click at this node would edit, or undefined.
  function editHoverTarget(node) {
    if (!editMode || !(node instanceof Element)) return undefined;
    if (node.closest("[data-okf-properties]") || node.closest("[data-sphinx-preview-block-editor]")) {
      return undefined;
    }
    const mapped = node.closest(mappingsSelector);
    if (!mapped || mapped.closest("a")) return undefined;
    const cell = node.closest("td, th");
    const editing = editingElementFor(mapped).element;
    const element = cell && cell.closest("table")
      ? cell
      : (editing === mapped ? (mapped.closest("pre") || mapped) : editing);
    return element.getAttribute("data-sphinx-preview-editing") === "true" ? undefined : element;
  }

  function applyEditMode(enabled) {
    if (!enabled) {
      clearBlockSelection();
      labelRename.close();
      setEditHover(undefined);
      if (editMode) editorTrace.record("edit mode off", traceFocus(), traceStack());
      closeFrontmatterEditor("edit mode off");
      if (activeBlockEdit && typeof activeBlockEdit.originalText === "string") {
        postBlockEditSave(true);
      } else {
        closeBlockEdit(false);
      }
    }
    editMode = enabled;
    document.documentElement?.setAttribute?.(
      "data-sphinx-preview-edit-mode",
      enabled ? "on" : "off",
    );
    editModeButton?.setAttribute?.("data-edit-mode", enabled ? "on" : "off");
    editModeButton?.setAttribute?.("aria-pressed", String(enabled));
    const tooltip = enabled ? "Exit edit mode" : "Edit mode";
    editModeButton?.setAttribute?.("title", tooltip);
    editModeButton?.setAttribute?.("data-tooltip", tooltip);
    setFrontmatterEditCells(enabled);
    refreshInsertPoints();
  }

  // Block insertion points: zero-height elements after each top-level block in edit mode. They are
  // never mapped blocks (no source attributes) and are rebuilt, not patched, on every toggle.
  let insertPoints = [];

  const insertMoves = new Map();

  function removeInsertPoints() {
    insertPoints.forEach((point) => point.remove());
    insertPoints = [];
    insertMoves.clear();
  }

  function propertiesSection() {
    return topLevelMappedBlocks().find((block) => block.getAttribute("data-okf-properties") !== null)
      ?? document.querySelector?.("[data-okf-properties]");
  }

  function openInsertPoint(point, afterLine) {
    openBlockEditor(
      point,
      undefined,
      { line: Math.max(1, afterLine), endLine: Math.max(1, afterLine), insertAfterLine: afterLine },
      "end",
    );
  }

  // Enter on an empty document opens the "Start writing" editor, like clicking the button.
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || !editMode || activeBlockEdit || activeFrontmatterEdit) return;
    if (event.shiftKey || event.altKey || event.metaKey || event.ctrlKey || event.isComposing) return;
    const target = event.target;
    if (target instanceof Element
      && (["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(target.tagName)
        || target.isContentEditable
        || target.closest("[data-okf-properties], [data-sphinx-preview-block-editor]"))) return;
    const start = insertPoints.find((point) =>
      point.className.split(" ").includes("sphinx-preview-insert-point--start"));
    if (!start) return;
    event.preventDefault?.();
    openInsertPoint(start, 0);
  });

  // Block selection (edit mode): a contiguous run of top-level body blocks, built with
  // Shift+click and Shift+Arrow. The model is blockSelection; this part reads the blocks from the
  // page, marks them and announces the count. Nothing here edits the document (no Delete in v1).
  let selectionElements = [];
  // The anchor and a pending selection are remembered by position among the body blocks, with the
  // block count they were read at: a line number goes stale when an edit adds or removes lines,
  // and a different block count means the ordinal no longer names the same block.
  let selectionAnchor;
  let applyingContentPatch = false;
  let selectionStatus;
  let pendingBlockSelection;

  function selectableBlocks() {
    return topLevelMappedBlocks().filter((block) => block.getAttribute("data-okf-properties") === null);
  }

  function syncSelectionModel() {
    const blocks = selectableBlocks();
    blockSelection.setBlocks(blocks.map((block) => ({
      ...blockRange(block),
      included: isIncludedBlock(block),
    })));
    return blocks;
  }

  function ensureSelectionStatus() {
    if (!selectionStatus) {
      selectionStatus = document.createElement("div");
      selectionStatus.className = "sphinx-preview-selection-status";
      selectionStatus.setAttribute("role", "status");
      selectionStatus.setAttribute("aria-live", "polite");
      document.body?.appendChild(selectionStatus);
    }
    return selectionStatus;
  }

  function announceSelection(count) {
    if (!selectionStatus && count === 0) return;
    ensureSelectionStatus().textContent = count === 0 ? "" : count + (count === 1 ? " block selected" : " blocks selected");
  }

  function renderBlockSelection(blocks) {
    selectionElements.forEach((element) => element.removeAttribute("data-sphinx-preview-block-selected"));
    selectionElements = blockSelection.indices()
      .map((index) => blocks[index])
      .filter(Boolean)
      .map((block) => block.closest?.("pre") || block);
    selectionElements.forEach((element) => element.setAttribute("data-sphinx-preview-block-selected", "true"));
    announceSelection(selectionElements.length);
    updateMoveLabels(blocks);
  }

  // A selection that waits for a save (pendingBlockSelection) survives the patch that clears the
  // old one; every other reason to clear drops it too.
  function clearBlockSelection(keepPending = false) {
    if (!keepPending) pendingBlockSelection = undefined;
    if (!blockSelection.isActive() && selectionElements.length === 0) return;
    blockSelection.clear();
    renderBlockSelection([]);
  }

  function rememberSelectionAnchor(block) {
    const blocks = selectableBlocks();
    const element = block?.closest ? blockOfTarget(block) : block;
    const index = blocks.indexOf(element);
    selectionAnchor = index >= 0 ? { index, count: blocks.length } : undefined;
  }

  // The block the free end of the selection sits on: gets the focus so the keyboard (and a screen
  // reader) follows it.
  function focusSelectionEnd(blocks) {
    const anchorIndex = blockSelection.anchorIndex;
    const free = blockSelection.startIndex === anchorIndex ? blockSelection.endIndex : blockSelection.startIndex;
    const block = blocks[free];
    if (!block) return;
    block.setAttribute("tabindex", "-1");
    block.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    block.focus?.({ preventScroll: true });
  }

  // Shift+click without an open editor: select from the anchor to the clicked block.
  function selectBlocksNow(anchor, targetIndex) {
    const blocks = syncSelectionModel();
    if (!(targetIndex >= 0 && targetIndex < blocks.length)) return;
    if (!blockSelection.isActive()) {
      const known = anchor && anchor.count === blocks.length && anchor.index < blocks.length;
      blockSelection.setAnchor(known ? anchor.index : targetIndex);
    }
    if (!blockSelection.extendTo(targetIndex)) {
      renderBlockSelection(blocks);
      return;
    }
    renderBlockSelection(blocks);
    window.getSelection?.()?.removeAllRanges?.();
    focusSelectionEnd(blocks);
  }

  function selectBlocksTo(node) {
    const block = blockOfTarget(node);
    if (!block || block.getAttribute("data-okf-properties") !== null) return;
    if (activeFrontmatterEdit) return;
    const blocks = selectableBlocks();
    const targetIndex = blocks.indexOf(block);
    const anchor = blockSelection.isActive() ? undefined : selectionAnchor;
    const edit = activeBlockEdit;
    if (edit) {
      // The open editor is saved first; the blocks are selected once its patch is in. The edit
      // may add or remove lines, so the blocks are named by position, not by line.
      if (edit.finishing || postBlockEditSave(true)) {
        pendingBlockSelection = { anchor, targetIndex, count: blocks.length };
        return;
      }
      if (activeBlockEdit) closeBlockEdit(true);
    }
    selectBlocksNow(anchor, targetIndex);
  }

  // Applied on the first patch after the save. When the edit changed the number of blocks the
  // positions no longer name the same blocks: nothing is selected rather than something else.
  function applyPendingBlockSelection() {
    const pending = pendingBlockSelection;
    pendingBlockSelection = undefined;
    if (!pending || !editMode || activeBlockEdit) return;
    if (selectableBlocks().length !== pending.count) return;
    selectBlocksNow(pending.anchor, pending.targetIndex);
  }

  // Shift+Arrow on a focused block or on a selection extends or shrinks it. Alt+Arrow (move) and
  // the Ctrl/Cmd chords are other gestures; the text box, fields and the property table keep
  // their own keys.
  document.addEventListener("keydown", (event) => {
    if (!editMode || event.isComposing || !event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    if (activeBlockEdit || activeFrontmatterEdit) return;
    const target = event.target;
    if (target instanceof Element
      && (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
        || target.isContentEditable
        || target.closest("[data-sphinx-preview-block-editor], [data-okf-properties], [data-okf-frontmatter-editor]"))) return;
    const focused = target instanceof Element ? blockOfTarget(target) : undefined;
    // With a selection the keys are ours only on a block, an insertion bar or the page itself:
    // toolbar buttons and menus keep their arrow keys.
    if (!focused && target instanceof Element
      && target !== document.body && target !== document.documentElement
      && !target.closest(".sphinx-preview-insert-point")) return;
    const blocks = syncSelectionModel();
    if (!blockSelection.isActive() && (!focused || focused.getAttribute("data-okf-properties") !== null)) return;
    const index = focused ? blocks.indexOf(focused) : -1;
    if (!blockSelection.isActive() && index < 0) return;
    event.preventDefault?.();
    event.stopPropagation?.();
    blockSelection.extendBy(event.key === "ArrowUp" ? -1 : 1, index);
    renderBlockSelection(blocks);
    if (blockSelection.isActive()) {
      rememberSelectionAnchor(blocks[blockSelection.anchorIndex]);
      focusSelectionEnd(blocks);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !blockSelection.isActive()) return;
    const target = event.target;
    if (target instanceof Element
      && (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
        || target.closest("[data-sphinx-preview-block-editor], [data-okf-frontmatter-editor]"))) return;
    event.preventDefault?.();
    clearBlockSelection();
  });

  // Copy, cut and paste of whole blocks as Markdown (edit mode). With a block selection Cmd/Ctrl+C
  // and +X send its source lines to the host, which owns the clipboard and the edit; Cmd/Ctrl+V
  // pastes after the selection or after the block of a focused "+" bar. Text boxes, fields and the
  // property table keep their native keys.
  let blocksFlight;
  let selectionNoticeTimer;

  function showSelectionNotice(text) {
    ensureSelectionStatus().textContent = text;
    window.clearTimeout(selectionNoticeTimer);
    selectionNoticeTimer = window.setTimeout(() => announceSelection(selectionElements.length), 4000);
  }

  function clipboardKey(event) {
    if (event.isComposing || event.shiftKey || event.altKey) return undefined;
    const apple = isApplePlatform();
    if (!(apple ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey)) return undefined;
    const key = event.key && event.key !== "Unidentified" ? String(event.key).toLowerCase()
      : (event.code === "KeyC" ? "c" : event.code === "KeyX" ? "x" : event.code === "KeyV" ? "v" : "");
    return key === "c" || key === "x" || key === "v" ? key : undefined;
  }

  function postBlocksMessage(type, fields, element) {
    const top = element?.getBoundingClientRect?.().top;
    vscode.postMessage({
      type,
      documentId: context.documentId,
      documentVersion: context.documentVersion,
      requestId: context.requestId,
      ...fields,
      ...(type !== "previewBlocksCopy" && Number.isFinite(top) && Math.abs(top) <= 100000
        ? { pinViewportTop: top } : {}),
    });
    blocksFlight = { timer: window.setTimeout(() => { blocksFlight = undefined; }, 5000) };
  }

  document.addEventListener("keydown", (event) => {
    const key = clipboardKey(event);
    if (!key || !editMode || activeBlockEdit || activeFrontmatterEdit) return;
    const target = event.target;
    if (target instanceof Element
      && (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
        || target.isContentEditable
        || target.closest("[data-sphinx-preview-block-editor], [data-okf-properties], [data-okf-frontmatter-editor]"))) return;
    const blocks = syncSelectionModel();
    const range = blockSelection.isActive() ? blockSelection.range() : undefined;
    const point = target instanceof Element ? target.closest(".sphinx-preview-insert-point") : null;
    if (key !== "v" && !range) return;
    if (key === "v" && !range && !point) return;
    event.preventDefault?.();
    event.stopPropagation?.();
    if (blocksFlight) return;
    if (key === "c" && range) {
      postBlocksMessage("previewBlocksCopy", { line: range.line, endLine: range.endLine });
    } else if (key === "x" && range) {
      postBlocksMessage("previewBlocksCut", { line: range.line, endLine: range.endLine },
        blocks[blockSelection.startIndex]?.closest?.("pre") || blocks[blockSelection.startIndex]);
    } else if (key === "v") {
      const move = point ? insertMoves.get(point) : undefined;
      if (!range && move && isIncludedBlock(move.block)) {
        showSelectionNotice("Text cannot be pasted next to a block that comes from an included file.");
        return;
      }
      const anchorBlock = range ? blocks[blockSelection.endIndex] : move?.block;
      const afterLine = range ? range.endLine : Number(point.getAttribute("data-sphinx-insert-after-line"));
      if (!Number.isSafeInteger(afterLine) || afterLine < 0) return;
      postBlocksMessage("previewBlocksPaste", {
        insertAfterLine: afterLine,
        ...(anchorBlock ? { pinLine: blockRange(anchorBlock).line } : {}),
      }, anchorBlock?.closest?.("pre") || anchorBlock);
    }
  });

  function receiveBlocksResult(message) {
    if (blocksFlight) window.clearTimeout(blocksFlight.timer);
    blocksFlight = undefined;
    if (message.ok === true) {
      if (message.op === "copy") showSelectionNotice("Copied as Markdown");
      else clearBlockSelection();
      return;
    }
    if (typeof message.reason === "string") showSelectionNotice(message.reason);
  }

  // Shift+mousedown on a block would extend the browser's text selection under the block
  // selection; edit mode already turns a click into an edit, so the native range adds nothing.
  document.addEventListener("mousedown", (event) => {
    if (!editMode || !event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target;
    if (!(target instanceof Element)
      || ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName)
      || target.closest("a")
      || target.closest("[data-okf-properties], [data-sphinx-preview-block-editor], .sphinx-preview-insert-point")) return;
    if (!blockOfTarget(target)) return;
    event.preventDefault?.();
  });

  // The two move buttons of a body block's insert point (backlog move-block-up-down). The host
  // swaps the block above the bar with its neighbour; it re-checks every range it is sent.
  const moveButtonSpecs = [
    { direction: "up", label: "Move the block above up", text: "\u2191" },
    { direction: "down", label: "Move the block above down", text: "\u2193" },
  ];
  let moveStatusTimer;

  function blockRange(block) {
    const line = Number(block.getAttribute("data-sphinx-source-line"));
    const endLine = Number(block.getAttribute("data-sphinx-source-end-line") || line);
    return { line, endLine };
  }

  function isIncludedBlock(block) {
    return block.getAttribute("data-sphinx-preview-included") !== null
      || Boolean(block.closest?.("[data-sphinx-preview-included]"));
  }

  function postBlockMove(block, neighbour, direction, span) {
    if (!editMode || activeBlockEdit || activeFrontmatterEdit) return false;
    const own = span || blockRange(block);
    const other = blockRange(neighbour);
    const top = (block.closest?.("pre") || block).getBoundingClientRect?.().top;
    vscode.postMessage({
      type: "previewBlockMove",
      documentId: context.documentId,
      documentVersion: context.documentVersion,
      requestId: context.requestId,
      line: own.line,
      endLine: own.endLine,
      neighbourLine: other.line,
      neighbourEndLine: other.endLine,
      direction,
      ...(Number.isFinite(top) && Math.abs(top) <= 100000 ? { pinViewportTop: top } : {}),
    });
    return true;
  }

  // The keyboard path (Alt+Up/Down, and the text-box chord): one move at a time. The page keeps
  // the old block ranges until the render of the move arrives, so a second request in between
  // (key repeat) would be stale; it is dropped until the result and the render are in.
  let blockMoveInFlight;

  function clearBlockMoveInFlight() {
    if (!blockMoveInFlight) return undefined;
    const flight = blockMoveInFlight;
    window.clearTimeout(flight.timer);
    blockMoveInFlight = undefined;
    return flight;
  }

  function bodyBlockNeighbour(block, direction) {
    const body = topLevelMappedBlocks().filter((candidate) =>
      candidate.getAttribute("data-okf-properties") === null);
    const index = body.indexOf(block);
    if (index < 0) return undefined;
    const neighbour = body[index + (direction === "up" ? -1 : 1)];
    if (!neighbour || isIncludedBlock(block) || isIncludedBlock(neighbour)) return undefined;
    return neighbour;
  }

  function requestBlockMove(block, direction, mode, caretOffset) {
    if (blockMoveInFlight) return false;
    const neighbour = bodyBlockNeighbour(block, direction);
    if (!neighbour || !postBlockMove(block, neighbour, direction)) return false;
    startBlockMoveFlight(mode, caretOffset, blockRange(block).line);
    return true;
  }

  function startBlockMoveFlight(mode, caretOffset, line) {
    blockMoveInFlight = {
      mode,
      caretOffset,
      line,
      version: context.documentVersion,
      timer: window.setTimeout(() => {
        blockMoveInFlight = undefined;
        setPendingMoveSelection(undefined);
      }, 5000),
    };
  }

  function setPendingMoveSelection(next) {
    pendingMoveSelection = next;
    const state = vscode.getState?.() ?? {};
    const { pendingMoveSelection: previous, ...rest } = state;
    vscode.setState?.(next ? { ...rest, pendingMoveSelection: next } : rest);
  }

  // Alt+Up/Down and the arrows of the last selected block move the whole selection past the
  // block beside it. The span goes to the host as one range; the selection is restored one block
  // up or down, by ordinal (the block count must be unchanged), once the render is in.
  // The keyboard takes the selection when focus is on one of its blocks (or a bar of one) or on
  // the page itself; a focused block outside the selection keeps the single-block move.
  function selectionMoveOwns(block) {
    if (!blockSelection.isActive()) return false;
    const blocks = syncSelectionModel();
    return !block || blockSelection.indices().some((index) => blocks[index] === block);
  }

  // The arrows of the bar under the selection's last block move the whole selection.
  function selectionEndsAt(block) {
    if (!blockSelection.isActive()) return false;
    return syncSelectionModel()[blockSelection.endIndex] === block;
  }

  function updateMoveLabels(blocks) {
    insertMoves.forEach((move, point) => {
      const owns = blockSelection.isActive() && blocks[blockSelection.endIndex] === move.block;
      Array.from(point.childNodes ?? point.childElements ?? []).forEach((button) => {
        const direction = button.getAttribute?.("data-sphinx-move");
        if (!direction) return;
        const spec = moveButtonSpecs.find((candidate) => candidate.direction === direction);
        const label = owns ? "Move the selected blocks " + direction : spec.label;
        button.setAttribute("aria-label", label);
        if (owns) button.setAttribute("title", label);
        else button.removeAttribute("title");
      });
    });
  }

  function requestSelectionMove(direction) {
    if (blockMoveInFlight) return false;
    const blocks = syncSelectionModel();
    if (!blockSelection.isActive()) return false;
    const start = blockSelection.startIndex;
    const end = blockSelection.endIndex;
    const step = direction === "up" ? -1 : 1;
    const neighbour = blocks[direction === "up" ? start - 1 : end + 1];
    if (!neighbour || isIncludedBlock(neighbour)) return false;
    const anchorIndex = blockSelection.anchorIndex;
    const freeIndex = start === anchorIndex ? end : start;
    const first = blocks[start];
    if (!postBlockMove(first, neighbour, direction, blockSelection.range())) return false;
    startBlockMoveFlight("select", undefined, blockRange(first).line);
    setPendingMoveSelection({
      anchor: anchorIndex + step,
      target: freeIndex + step,
      count: blocks.length,
      documentId: context.documentId,
      version: context.documentVersion,
      at: Date.now(),
    });
    return true;
  }

  const MOVE_SELECTION_MAX_AGE = 5000;

  // The move is rendered: select the same blocks at their new place. A different block count
  // means the ordinals no longer name the same blocks, so nothing is selected.
  function applyMoveSelection() {
    const pending = pendingMoveSelection;
    if (!pending) return;
    setPendingMoveSelection(undefined);
    if (!(Date.now() - pending.at < MOVE_SELECTION_MAX_AGE)) return;
    if (!editMode || activeBlockEdit || pending.documentId !== context.documentId) return;
    if (selectableBlocks().length !== pending.count) return;
    selectBlocksNow({ index: pending.anchor, count: pending.count }, pending.target);
  }

  // A full reload has no move in flight any more; the saved state still names the selection.
  function resumeMoveSelection() {
    const pending = pendingMoveSelection;
    if (!pending || blockMoveInFlight) return;
    // The same version after a reload means the move never landed (a lost flight cannot be
    // completed): forget it, so it cannot select blocks after some later edit.
    if (context.documentVersion === pending.version) {
      setPendingMoveSelection(undefined);
      return;
    }
    applyMoveSelection();
  }

  function bodyBlockAtLine(line) {
    return topLevelMappedBlocks().find((block) =>
      block.getAttribute("data-okf-properties") === null
      && Number(block.getAttribute("data-sphinx-source-line")) === line);
  }

  function settleBlockMove(block, flight) {
    if (flight.mode === "select") {
      applyMoveSelection();
      return;
    }
    if (!block) return;
    if (flight.mode === "edit") {
      openMappedEditor(block, block, { offset: flight.caretOffset }, false);
      return;
    }
    block.setAttribute("tabindex", "-1");
    block.focus?.({ preventScroll: true });
  }

  // The move is done and its render is in: focus or edit the block at its new place.
  function resumeBlockMove() {
    const flight = blockMoveInFlight;
    if (!flight || flight.newLine === undefined || context.documentVersion === flight.version) return;
    if (!editMode) return;
    clearBlockMoveInFlight();
    settleBlockMove(bodyBlockAtLine(flight.newLine), flight);
  }

  function moveChordDirection(event, inEditor) {
    if (event.isComposing || event.shiftKey || !event.altKey) return undefined;
    const key = event.key === "ArrowUp" || event.key === "ArrowDown" ? event.key
      : (!event.key || event.key === "Unidentified" ? event.code : undefined);
    const direction = key === "ArrowUp" ? "up" : key === "ArrowDown" ? "down" : undefined;
    if (!direction) return undefined;
    if (!inEditor) return event.ctrlKey || event.metaKey ? undefined : direction;
    const apple = isApplePlatform();
    return (apple ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey)
      ? direction : undefined;
  }

  // The top-level block a focused or clicked node belongs to (the block of an insertion bar's
  // buttons too), or undefined.
  function blockOfTarget(target) {
    const fromBar = insertMoves.get(target.closest(".sphinx-preview-insert-point"))?.block;
    if (fromBar) return fromBar;
    const blocks = topLevelMappedBlocks();
    for (let element = target.closest(mappingsSelector); element; element = element.parentElement) {
      if (blocks.includes(element)) return element;
    }
    return undefined;
  }

  // Alt+Up/Down on a focused block or insertion bar moves the block like its arrow buttons.
  document.addEventListener("keydown", (event) => {
    const direction = moveChordDirection(event, false);
    if (!direction || !editMode || activeBlockEdit || activeFrontmatterEdit) return;
    const target = event.target;
    if (!(target instanceof Element)
      || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
      || target.isContentEditable
      || target.closest("[data-sphinx-preview-block-editor], [data-okf-properties]")) return;
    const block = blockOfTarget(target);
    const owner = !block && (target === document.body || target === document.documentElement);
    if (!block && !(owner && blockSelection.isActive())) return;
    event.preventDefault?.();
    event.stopPropagation?.();
    if (event.repeat && blockMoveInFlight) return;
    if (selectionMoveOwns(block)) {
      requestSelectionMove(direction);
      return;
    }
    if (block) requestBlockMove(block, direction, "focus");
  });

  function addMoveButtons(point, move) {
    insertMoves.set(point, move);
    moveButtonSpecs.forEach((spec) => {
      const neighbour = spec.direction === "up" ? move.previous : move.next;
      const button = document.createElement("button");
      button.className = "sphinx-preview-move sphinx-preview-move--" + spec.direction;
      button.setAttribute("type", "button");
      button.setAttribute("aria-label", spec.label);
      button.setAttribute("data-sphinx-move", spec.direction);
      button.textContent = spec.text;
      if (!neighbour || isIncludedBlock(move.block) || isIncludedBlock(neighbour)) {
        button.setAttribute("disabled", "");
      }
      button.addEventListener("click", (event) => {
        event.preventDefault?.();
        event.stopPropagation?.();
        if (selectionEndsAt(move.block)) {
          if (requestSelectionMove(spec.direction)) point.setAttribute("data-sphinx-move-pending", "true");
          return;
        }
        if (button.getAttribute("disabled") !== null || !neighbour) return;
        if (postBlockMove(move.block, neighbour, spec.direction)) {
          point.setAttribute("data-sphinx-move-pending", "true");
        }
      });
      point.appendChild(button);
    });
  }

  // A refused move says why next to the bar it came from; a done move re-renders the page.
  function receiveBlockMoveResult(message) {
    if (message.ok === true) {
      if (blockMoveInFlight && Number.isSafeInteger(message.line)) {
        blockMoveInFlight.newLine = message.line;
        resumeBlockMove();
      }
      return;
    }
    const flight = clearBlockMoveInFlight();
    if (flight?.mode === "select") setPendingMoveSelection(undefined);
    else if (flight) settleBlockMove(bodyBlockAtLine(flight.line), flight);
    if (message.ok !== false || typeof message.reason !== "string") return;
    const point = insertPoints.find((candidate) =>
      candidate.getAttribute("data-sphinx-move-pending") === "true");
    insertPoints.forEach((candidate) => candidate.removeAttribute("data-sphinx-move-pending"));
    if (!point) return;
    point.querySelector?.(".sphinx-preview-move-status")?.remove?.();
    const status = document.createElement("span");
    status.className = "sphinx-preview-move-status";
    status.setAttribute("role", "status");
    status.textContent = message.reason;
    point.appendChild(status);
    window.clearTimeout(moveStatusTimer);
    moveStatusTimer = window.setTimeout(() => status.remove(), 6000);
  }

  function createInsertPoint(afterLine, label, standalone, move) {
    const point = document.createElement("div");
    point.className = "sphinx-preview-insert-point"
      + (standalone ? " sphinx-preview-insert-point--start" : "")
      + (standalone && !propertiesSection() ? " sphinx-preview-insert-point--first" : "");
    point.setAttribute("data-sphinx-insert-after-line", String(afterLine));
    const button = document.createElement("button");
    button.setAttribute("type", "button");
    button.setAttribute("aria-label", standalone ? label : "Insert a block here");
    button.textContent = label;
    button.addEventListener("click", (event) => {
      event.preventDefault?.();
      event.stopPropagation?.();
      openInsertPoint(point, afterLine);
    });
    point.appendChild(button);
    if (move) addMoveButtons(point, move);
    return point;
  }

  function refreshInsertPoints() {
    removeInsertPoints();
    if (!editMode) return;
    const isProperties = (block) => block.getAttribute("data-okf-properties") !== null;
    const blocks = topLevelMappedBlocks();
    const properties = blocks.find(isProperties) ?? document.querySelector?.("[data-okf-properties]");
    const body = blocks.filter((block) => !isProperties(block));
    const place = (anchor, point) => {
      anchor.insertAdjacentElement("afterend", point);
      insertPoints.push(point);
    };
    if (body.length === 0) {
      // An empty or frontmatter-only body: one visible entry point, but never on a failed render.
      if (!hasRenderedPreview()) return;
      const point = createInsertPoint(0, "Start writing", true);
      if (properties) {
        place(properties, point);
        return;
      }
      const content = document.getElementById?.("sphinx-myst-preview-content");
      if (!content) return;
      content.appendChild(point);
      insertPoints.push(point);
      return;
    }
    if (properties) place(properties, createInsertPoint(0, "+", false));
    body.forEach((block, index) => {
      const line = Number(block.getAttribute("data-sphinx-source-line"));
      const endLine = Number(block.getAttribute("data-sphinx-source-end-line") || line);
      if (!Number.isSafeInteger(endLine) || endLine < line) return;
      place(block.closest?.("pre") || block, createInsertPoint(endLine, "+", false, {
        block,
        previous: body[index - 1],
        next: body[index + 1],
      }));
    });
  }

  // Every frontmatter link that is not still resolving: valid anchors and invalid or unavailable
  // spans (which are keyboard-focusable) all show the custom tooltip.
  const linkTooltipSelector = ".okf-frontmatter-link:not([data-okf-link-status=\\"pending\\"])";
  let closeLinkTooltip = () => {};
  let tooltipLink;
  let linkTooltipSequence = 0;

  function showLinkTooltip(event) {
    const link = event.target?.closest?.(linkTooltipSelector);
    if (!link || link === tooltipLink) return;
    closeLinkTooltip();
    const title = link.getAttribute("title");
    if (title === null) return;
    const describedBy = link.getAttribute("aria-describedby");
    const tooltip = document.createElement("div");
    const id = "sphinx-preview-link-tooltip-" + (++linkTooltipSequence);
    tooltip.className = "sphinx-preview-link-tooltip";
    tooltip.setAttribute("id", id);
    tooltip.setAttribute("role", "tooltip");
    tooltip.textContent = title;
    link.removeAttribute("title");
    link.setAttribute("aria-describedby", describedBy ? describedBy + " " + id : id);
    tooltipLink = link;
    closeLinkTooltip = () => {
      tooltip.remove();
      link.setAttribute("title", title);
      if (describedBy === null) link.removeAttribute("aria-describedby");
      else link.setAttribute("aria-describedby", describedBy);
      tooltipLink = undefined;
      closeLinkTooltip = () => {};
    };
    const margin = 8;
    const controlsHeight = Number.parseFloat(window.getComputedStyle?.(document.documentElement)
      ?.getPropertyValue?.("--sphinx-preview-controls-height")) || 116;
    const minimumTop = controlsHeight + margin;
    tooltip.style.setProperty("max-width", Math.max(1, Math.min(480, window.innerWidth - margin * 2)) + "px");
    tooltip.style.setProperty("max-height", Math.max(1, window.innerHeight - minimumTop - margin) + "px");
    document.body.appendChild(tooltip);
    const linkRect = link.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const below = linkRect.bottom + margin;
    const preferredTop = below + tooltipRect.height <= window.innerHeight - margin
      ? below : linkRect.top - tooltipRect.height - margin;
    tooltip.style.setProperty("left", Math.max(margin, Math.min(
      linkRect.left, window.innerWidth - tooltipRect.width - margin,
    )) + "px");
    tooltip.style.setProperty("top", Math.max(minimumTop, Math.min(
      preferredTop, window.innerHeight - tooltipRect.height - margin,
    )) + "px");
  }

  function leaveLinkTooltip(event) {
    if (tooltipLink && event.target?.closest?.(linkTooltipSelector) === tooltipLink
      && !tooltipLink.contains(event.relatedTarget)) closeLinkTooltip();
  }

  document.addEventListener("mouseover", showLinkTooltip);
  document.addEventListener("focusin", showLinkTooltip);
  document.addEventListener("mouseout", leaveLinkTooltip);
  document.addEventListener("focusout", leaveLinkTooltip);
  document.addEventListener("pointerdown", (event) => {
    if (event.target?.closest?.(linkTooltipSelector) !== tooltipLink) closeLinkTooltip();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeLinkTooltip();
  });
  window.addEventListener("scroll", () => closeLinkTooltip(), true);
  window.addEventListener("resize", () => closeLinkTooltip());
  window.visualViewport?.addEventListener("resize", () => closeLinkTooltip());
  window.addEventListener("resize", () => {
    if (activeBlockEdit?.host) syncPaletteSticky(activeBlockEdit);
  });
  window.addEventListener("scroll", () => {
    if (activeBlockEdit?.host) syncPaletteSticky(activeBlockEdit);
  }, { passive: true });
  window.addEventListener("pagehide", () => closeLinkTooltip());
  window.addEventListener("beforeunload", () => closeLinkTooltip());

  function initializeCheckboxes() {
    document.querySelectorAll?.(checkboxSelector).forEach((checkbox) => {
      if (checkboxEditingEnabled) return;
      checkbox.disabled = true;
      checkbox.setAttribute("title", "Editing requires a trusted workspace.");
    });
  }

  function toggleCheckbox(checkbox, event) {
    const line = Number(checkbox.getAttribute("data-myst-checkbox-line"));
    const column = Number(checkbox.getAttribute("data-myst-checkbox-column"));
    if (
      !checkboxEditingEnabled
      || !Number.isSafeInteger(line) || line < 1
      || !Number.isSafeInteger(column) || column < 0
      || checkbox.getAttribute("aria-busy") === "true"
    ) {
      event.preventDefault?.();
      return;
    }
    const pendingEdit = activeBlockEdit || activeFrontmatterEdit;
    if (pendingEdit) {
      // Toggling now would race the open editor's save and be rejected as stale.
      event.preventDefault?.();
      pendingEdit.status.textContent = "Save or cancel this edit before toggling a checkbox.";
      pendingEdit.status.setAttribute?.("data-visible", "true");
      return;
    }
    // The browser has already flipped the box; the host confirms or the result reverts it.
    const checked = checkbox.checked === true;
    const editId = "checkbox-" + context.requestId + "-" + (++editSequence);
    checkbox.setAttribute("aria-busy", "true");
    pendingCheckboxToggles.set(editId, { checkbox, checked });
    vscode.postMessage({
      type: "previewCheckboxToggle",
      documentId: context.documentId,
      documentVersion: context.documentVersion,
      requestId: context.requestId,
      editId,
      line,
      endLine: line,
      column,
      checked,
      ...anchorField(),
    });
  }

  function receiveCheckboxResult(message) {
    const pending = pendingCheckboxToggles.get(message.editId);
    if (!pending) return;
    pendingCheckboxToggles.delete(message.editId);
    pending.checkbox.removeAttribute("aria-busy");
    if (message.saved === true) return;
    pending.checkbox.checked = !pending.checked;
    if (typeof message.error === "string") pending.checkbox.setAttribute("title", message.error);
  }

  function refreshPreview() {
    closeLinkTooltip();
    if (activeBlockEdit || activeFrontmatterEdit) {
      (activeBlockEdit || activeFrontmatterEdit).status.textContent = "Save or cancel this edit before refreshing.";
      return;
    }
    const state = stateSnapshot(anchor?.line ?? lineAtScroll(window.scrollY));
    vscode.postMessage({
      type: "previewRefresh",
      documentId: context.documentId,
      documentVersion: context.documentVersion,
      requestId: context.requestId,
      sourceLine: state.sourceLine,
      scrollTop: state.scrollTop,
      ...anchorField(),
      ...(state.focusedBlockId ? { focusedBlockId: state.focusedBlockId } : {}),
      ...(state.selectedText ? { selectedText: state.selectedText } : {}),
      ...(state.openDisclosures ? { openDisclosures: state.openDisclosures } : {}),
      descriptionsCollapsed,
    });
  }

  function postReveal(target, activation) {
    const line = target.getAttribute("data-sphinx-source-line");
    const sourceFile = target.getAttribute("data-sphinx-source-file");
    if (!line || !sourceFile) return;
    vscode.postMessage({
      type: "previewReveal",
      activation,
      documentId: context.documentId,
      documentVersion: context.documentVersion,
      requestId: context.requestId,
      blockId: target.getAttribute("data-sphinx-preview-block"),
      sourceFile,
      line: Number(line),
    });
  }

  function sourceRangeForList(list, reference) {
    const sourceFile = reference.getAttribute("data-sphinx-source-file");
    const documentId = reference.getAttribute("data-sphinx-preview-document");
    const mappedElements = [];
    if (list.getAttribute("data-sphinx-source-line") !== null) mappedElements.push(list);
    mappedElements.push(...list.querySelectorAll(mappingsSelector));

    let firstLine = Number.POSITIVE_INFINITY;
    let lastLine = 0;
    for (const element of mappedElements) {
      if (
        element.getAttribute("data-sphinx-source-file") !== sourceFile
        || element.getAttribute("data-sphinx-preview-document") !== documentId
      ) continue;
      const line = Number(element.getAttribute("data-sphinx-source-line"));
      const endLine = Number(element.getAttribute("data-sphinx-source-end-line") || line);
      if (
        !Number.isSafeInteger(line)
        || line < 1
        || !Number.isSafeInteger(endLine)
        || endLine < line
      ) continue;
      firstLine = Math.min(firstLine, line);
      lastLine = Math.max(lastLine, endLine);
    }
    return Number.isFinite(firstLine) ? { line: firstLine, endLine: lastLine } : undefined;
  }

  function editingElementFor(target) {
    const list = target.closest?.("ul, ol");
    if (list) {
      const sourceRange = sourceRangeForList(list, target);
      if (sourceRange) return { element: list, sourceRange };
    }
    return { element: target, sourceRange: undefined };
  }

  function clickCaretContext(target, eventTarget, x, y) {
    try {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
      const selectedCell = eventTarget.closest?.("td, th");
      if (selectedCell || eventTarget.closest?.("[data-okf-properties]")) return undefined;
      const editingElement = editingElementFor(target).element;
      let container;
      let offset;
      if (typeof document.caretRangeFromPoint === "function") {
        const range = document.caretRangeFromPoint(x, y);
        container = range?.startContainer;
        offset = range?.startOffset;
      } else if (typeof document.caretPositionFromPoint === "function") {
        const position = document.caretPositionFromPoint(x, y);
        container = position?.offsetNode;
        offset = position?.offset;
      }
      if (!container || container.nodeType !== 3 || !Number.isSafeInteger(offset)) return undefined;
      if (!editingElement.contains?.(container)) return undefined;
      if (typeof document.createTreeWalker !== "function") return undefined;
      const walker = document.createTreeWalker(editingElement, 4);
      let renderedOffset = 0;
      let found = false;
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node === container) {
          renderedOffset += offset;
          found = true;
          break;
        }
        renderedOffset += String(node.nodeValue || "").length;
      }
      if (!found) return undefined;
      const text = String(editingElement.textContent || "");
      return {
        before: text.slice(Math.max(0, renderedOffset - 32), renderedOffset),
        after: text.slice(renderedOffset, renderedOffset + 32),
      };
    } catch {
      return undefined;
    }
  }

  function openMappedEditor(target, eventTarget, initialCaretPosition = "end", reveal = false) {
    if (eventTarget.closest?.("[data-okf-properties]")) return;
    clearBlockSelection();
    rememberSelectionAnchor(target);
    if (reveal) target.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    const selectedCell = eventTarget.closest?.("td, th");
    const table = selectedCell?.closest?.("table");
    if (activeBlockEdit?.selectedCell) {
      if (table === activeBlockEdit.selectedCell.closest("table")) {
        switchTableCell(activeBlockEdit, selectedCell, initialCaretPosition);
        return;
      }
      if (activeBlockEdit.finishing || !activeBlockEdit.tableModel) return;
      rememberPendingBlockNavigation(target, initialCaretPosition, selectedCell);
      if (!postBlockEditSave(true)) {
        clearPendingBlockNavigation();
        openMappedEditor(target, eventTarget, initialCaretPosition, reveal);
      }
      return;
    }
    if (selectedCell && table && !selectedCell.closest?.("[data-okf-properties]")) {
      openBlockEditor(target, selectedCell, undefined, initialCaretPosition);
      return;
    }
    const editing = editingElementFor(target);
    openBlockEditor(editing.element, undefined, editing.sourceRange, initialCaretPosition);
  }

  function hasRenderedPreview() {
    const status = document.querySelector?.("[data-sphinx-preview-status]")
      ?.getAttribute?.("data-sphinx-preview-status");
    return status === "success" || status === "recovery";
  }

  function resumePendingBlockNavigation() {
    const pending = pendingBlockNavigation;
    if (!pending || !editMode) return;
    const sourceLine = Number(pending.sourceLine);
    const target = topLevelMappedBlocks().find((element) =>
      (pending.blockId && element.getAttribute("data-sphinx-preview-block") === pending.blockId)
      || (!pending.blockId && Number(element.getAttribute("data-sphinx-source-line")) === sourceLine),
    );
    clearPendingBlockNavigation();
    if (!target) return;
    const then = pending.thenMove;
    if (then && (then.direction === "up" || then.direction === "down")
      && Number.isSafeInteger(then.caretOffset)) {
      if (!requestBlockMove(target, then.direction, "edit", then.caretOffset)) {
        openMappedEditor(target, target, { offset: then.caretOffset }, false);
      }
      return;
    }
    const caretPosition = pending.caretPosition === "start" ? "start" : "end";
    const table = target.closest?.("table");
    const cell = table?.rows?.[pending.tableRowIndex]?.cells?.[pending.tableColumnIndex];
    openMappedEditor(target, cell || target, caretPosition, true);
  }

  // Elements the content initialization has already bound listeners to, so that running it again
  // on content that was partly kept does not register a second listener.
  const initializedImages = new WeakSet();
  const initializedDetails = new WeakSet();

  // Everything that binds to elements of the rendered content. Startup runs it once with
  // restore: true; replacing the content in place runs it again with restore: false. The caller
  // posts previewReady; this function never does.
  function initializeContent(options) {
    applyEditMode(editMode);
    warningBanner.update();
    initializeCheckboxes();
    updateStickyHeadings();
    applyDescriptionVisibility();
    applyFigureSizes(document);
    applySpanColors(document, isSafeOkfColor);
    document.querySelectorAll("img").forEach((image) => {
      if (initializedImages.has(image)) return;
      initializedImages.add(image);
      image.addEventListener("load", stabilizeLayout, { once: true });
      image.decode?.().then(stabilizeLayout).catch(() => undefined);
    });
    markWideTables();
    widthMode.update();
    firstClearance.update();
    tocColumn.refresh();
    chipToggle.apply();
    inlineThreads.apply();
    incomingChanges.apply();
    // Idempotent: puts the last threads back on replaced content; skips blocks being edited.
    commentThreads.apply();
    measure();
    if (options.restore) {
      restoreState();
    } else {
      // The startup scan of the link navigation already covered the first content.
      linkNavigation.rescan();
    }
    if (hasRenderedPreview()) {
      resumePendingBlockNavigation();
      resumeBlockMove();
      resumeMoveSelection();
    }
    resumePendingFrontmatterEdit();
    document.querySelectorAll("details").forEach((element) => {
      if (initializedDetails.has(element)) return;
      initializedDetails.add(element);
      element.addEventListener("toggle", () => stateSnapshot(anchor?.line ?? lineAtScroll(window.scrollY)));
    });
  }

  // Scrolls to a document position and takes it as the new anchor (navigation, TOC entries).
  function revealAt(targetTop) {
    programmaticScroll(targetTop);
    const line = lineAtScroll(targetTop);
    if (line === undefined) return;
    anchor = { line, owner: "preview" };
    const sourceLine = anchorPolicy.editorTopLine(line);
    if (anchorToEditor && settings.scrollEditorWithPreview && sourceLine !== lastPostedLine) {
      lastPostedLine = sourceLine;
      vscode.postMessage({
        type: "previewScroll",
        documentId: context.documentId,
        documentVersion: context.documentVersion,
        requestId: context.requestId,
        line: sourceLine,
        anchorLine: line,
        scrollTop: targetTop,
      });
    }
  }

  // Puts an element at the reading line, below the sticky heading band.
  function revealElement(target) {
    const rectangle = target.getBoundingClientRect?.();
    if (!rectangle) return;
    revealAt(anchorPolicy.scrollTopForY(rectangle.top + window.scrollY, readingOffsetValue, maxScrollTop()));
  }

  // Announces replaced content to scripts that render it themselves (Mermaid).
  function contentReplaced() {
    if (typeof CustomEvent === "function") {
      document.dispatchEvent(new CustomEvent("studio:content-replaced"));
    }
  }

  applyPreviewThemeMode(previewThemeMode);
  applyAnchorMode(anchorToEditor);
  applyPairing(context.pairedTextEditor !== false);
  themeButton?.addEventListener?.("click", cyclePreviewThemeMode);
  refreshButton?.addEventListener?.("click", refreshPreview);
  anchorButton?.addEventListener?.("click", () => {
    applyAnchorMode(!anchorToEditor);
    const state = vscode.getState?.();
    vscode.setState?.({
      ...(state && typeof state === "object" ? state : {}),
      anchorToEditor,
    });
    postAnchorModeChanged();
  });
  if (
    typeof savedState?.anchorToEditor === "boolean"
    && savedState.anchorToEditor !== (context.scrollPreviewWithEditor !== false)
  ) {
    postAnchorModeChanged();
  }
  editModeButton?.addEventListener?.("click", () => {
    const nextEditMode = !editMode;
    // Posted before the toggle applies: leaving edit mode may post a block save, which stays last.
    vscode.postMessage({
      type: "previewEditModeChanged",
      documentId: context.documentId,
      documentVersion: context.documentVersion,
      requestId: context.requestId,
      editMode: nextEditMode,
    });
    applyEditMode(nextEditMode);
    const state = vscode.getState?.();
    vscode.setState?.({
      ...(state && typeof state === "object" ? state : {}),
      editMode,
    });
  });
  applyTheme(context.themeKind);

  window.addEventListener("scroll", scheduleScroll, { passive: true });
  window.addEventListener("resize", stabilizeLayout, { passive: true });
  window.visualViewport?.addEventListener("resize", stabilizeLayout, { passive: true });
  window.addEventListener("message", (event) => {
    const message = event.data;
    if (sameContext(message) && message.type === "previewPendingOverlay") {
      applyPendingOverlay(message);
      return;
    }
    if (sameContext(message) && message.type === "previewContentPatch") {
      applyContentPatch(message);
      return;
    }
    if (sameContext(message) && message.type === "previewPropertiesTable") {
      if (typeof message.markup !== "string") return;
      if (activeFrontmatterEdit) {
        editorTrace.record("properties table deferred", "seq " + message.seq);
        deferredPropertiesMarkup = message.markup;
        deferredPropertiesSeq = message.seq;
        return;
      }
      applyPropertiesMarkup(message.markup, message.seq);
      return;
    }
    if (sameContext(message) && message.type === "previewPairing") {
      applyPairing(message.pairedTextEditor !== false);
      return;
    }
    if (sameContext(message) && message.type === "themeChanged") {
      applyTheme(message.themeKind);
      return;
    }
    if (sameContext(message) && message.type === "previewShowComments") {
      chipToggle.setShowComments(message.showComments !== false);
      return;
    }
    if (sameContext(message) && message.type === "previewCommentResult") {
      // The answer to a create or a reply: the compose box and the reply box keep the text until ok.
      if (!commentCompose?.result(message)) commentThreads.result(message);
      return;
    }
    if (sameContext(message) && message.type === "previewComments") {
      commentThreads.setThreads(message.threads);
      measure();
      return;
    }
    if (sameContext(message) && message.type === "previewIncomingChanges") {
      incomingChanges.setEnabled(message.enabled !== false);
      incomingChanges.setRanges(message.ranges);
      return;
    }
    if (message && message.type === "previewFlushEdit" && typeof message.flushId === "string") {
      // The host is about to switch document: post the final saves, then the answer, in that order.
      const flushId = message.flushId;
      flushOpenEditorsThen((flushed) => vscode.postMessage({
        type: "previewEditFlushed",
        documentId: context.documentId,
        documentVersion: context.documentVersion,
        requestId: context.requestId,
        flushId,
        flushed,
      }));
      return;
    }
    if (sameContext(message) && message.type === "previewHistoryState") {
      historyControls.apply(message);
      return;
    }
    if (sameContext(message) && message.type === "navigateAnchor") {
      const value = typeof message.value === "string" ? message.value : "";
      const decodeFragment = (fragment) => {
        let decoded = fragment;
        try {
          for (let attempt = 0; attempt < 4; attempt += 1) {
            const next = decodeURIComponent(decoded);
            if (next === decoded) return decoded;
            decoded = next;
          }
        } catch {
          return undefined;
        }
        return /%[\da-f]{2}/iu.test(decoded) ? undefined : decoded;
      };
      const fragmentSourceLine = Number(message.sourceLine ?? message.line);
      const mappedEntry = Number.isInteger(fragmentSourceLine) && fragmentSourceLine > 0
        ? layout.find((entry) => fragmentSourceLine >= entry.sourceLine
          && fragmentSourceLine <= (entry.endLine ?? entry.sourceLine))
        : undefined;
      const mappedTarget = mappedEntry?.element;
      const decodedValue = value.startsWith("#") ? decodeFragment(value.slice(1)) : undefined;
      if (!decodedValue && !mappedTarget) return;
      const target = mappedTarget
        ?? (decodedValue ? document.getElementById?.(decodedValue) : undefined)
        ?? (decodedValue?.startsWith("^")
          ? document.getElementById?.(decodedValue.slice(1))
          : undefined);
      if (!target) return;
      const rectangle = target.getBoundingClientRect?.();
      if (!rectangle) return;
      const mappedScrollTop = mappedEntry && Number.isInteger(fragmentSourceLine)
        ? anchorPolicy.scrollTopForLine(anchorMap, fragmentSourceLine, readingOffsetValue, maxScrollTop())
        : undefined;
      const targetTop = mappedScrollTop ?? anchorPolicy.scrollTopForY(
          rectangle.top + window.scrollY,
          readingOffsetValue,
          maxScrollTop(),
        );
      revealAt(targetTop);
      return;
    }
    if (message?.type === "previewLabelRenameResult" && labelRename.receive(message)) return;
    if (message?.type === "previewPlantUmlIncludeResult" && plantUmlFileRequests.receive(message)) return;
    if (message?.type === "previewPlantUmlIncludesChanged" && message.documentId === context.documentId) {
      if (typeof CustomEvent === "function") {
        document.dispatchEvent(new CustomEvent("studio:plantuml-includes-changed"));
      }
      return;
    }
    if (message?.type === "previewBlocksResult" && sameContext(message)) {
      receiveBlocksResult(message);
      return;
    }
    if (message?.type === "previewBlockMoveResult" && sameContext(message)) {
      receiveBlockMoveResult(message);
      return;
    }
    if (message && typeof message.type === "string" && message.type.endsWith("Result")
      && hostRequests.receive(message)) return;
    if (sameContext(message) && message.type === "previewEditSource") {
      receiveBlockEditSource(message);
      return;
    }
    if (sameContext(message) && message.type === "previewFrontmatterResult") {
      receiveFrontmatterResult(message);
      return;
    }
    if (sameContext(message) && message.type === "previewCheckboxResult") {
      receiveCheckboxResult(message);
      return;
    }
    if (!sameContext(message) || message.type !== "sourceScroll") return;
    markSourceLine(Number(message.selectionLine ?? message.line));
    if (!settings.scrollPreviewWithEditor) return;
    const line = Number(message.line);
    if (!Number.isFinite(line) || line < 1) return;
    lastPostedLine = anchorPolicy.editorTopLine(line);
    // The editor leads: its first visible line is the anchor.
    anchor = { line, owner: "editor" };
    const sequence = ++sourceScrollSequence;
    window.requestAnimationFrame(() => {
      if (sequence !== sourceScrollSequence) return;
      if (editAnchor?.element) {
        measure();
        const target = scrollAtLine(line);
        if (target !== undefined) {
          programmaticScroll(target);
          editAnchor.viewportTop = editAnchor.element.getBoundingClientRect().top;
        }
        return;
      }
      applyAnchor();
    });
  });
  function applyDescriptionVisibility() {
    document.documentElement?.setAttribute("data-okf-descriptions-collapsed", String(descriptionsCollapsed));
    document.querySelectorAll("[data-okf-description-toggle]").forEach((button) => {
      const label = descriptionsCollapsed ? "Expand Description column" : "Collapse Description column";
      button.setAttribute("aria-expanded", String(!descriptionsCollapsed));
      button.setAttribute("aria-label", label);
      button.setAttribute("title", label);
    });
    document.querySelectorAll(".okf-info-row th[colspan]").forEach((cell) => {
      const withDocs = cell.closest(".okf-properties-docs");
      cell.setAttribute("colspan", withDocs && !descriptionsCollapsed ? "3" : "2");
    });
  }
  // Registered first so a checkbox click never opens a block editor or reveals the source.
  document.addEventListener("click", (event) => {
    const checkbox = event.target instanceof Element ? event.target.closest(checkboxSelector) : undefined;
    if (!checkbox) return;
    event.stopImmediatePropagation?.();
    toggleCheckbox(checkbox, event);
  });
  // The header issue badge jumps to the first row with a problem. It must run before the mapped
  // block click handlers, which would otherwise reveal or edit the properties section.
  document.addEventListener("click", (event) => {
    const badge = event.target instanceof Element ? event.target.closest("[data-okf-badge]") : undefined;
    if (!badge) return;
    event.preventDefault?.();
    event.stopImmediatePropagation?.();
    const row = document.querySelector?.(
      "tr[data-okf-field].okf-error, tr[data-okf-field].okf-warning, tr[data-okf-field].okf-info");
    if (!row) return;
    row.scrollIntoView?.({ block: "center" });
    const cell = row.querySelector?.('[data-okf-edit-cell="value"]') ?? row.querySelector?.("th");
    if (cell) {
      if (cell.getAttribute("tabindex") === null) cell.setAttribute("tabindex", "-1");
      cell.focus?.({ preventScroll: true });
      cell.setAttribute("data-okf-issue-highlight", "true");
      window.setTimeout(() => cell.removeAttribute("data-okf-issue-highlight"), 1500);
    }
  });
  document.addEventListener("click", (event) => {
    const button = event.target instanceof Element
      ? event.target.closest("[data-okf-description-toggle]") : undefined;
    if (!button) return;
    event.preventDefault?.();
    event.stopImmediatePropagation?.();
    descriptionsCollapsed = !descriptionsCollapsed;
    applyDescriptionVisibility();
    measure();
    const state = stateSnapshot(anchor?.line ?? lineAtScroll(window.scrollY));
    vscode.postMessage({
      type: "previewState",
      documentId: context.documentId,
      documentVersion: context.documentVersion,
      requestId: context.requestId,
      ...state,
    });
  });
  document.addEventListener("click", (event) => {
    if (event.target instanceof Element
      && event.target.closest('a[data-sphinx-preview-navigation^="okf-link:"]')) return;
    const frontmatterEditor = event.target instanceof Element
      ? event.target.closest("[data-okf-frontmatter-editor]")
      : undefined;
    if (frontmatterEditor) return;
    const cell = event.target instanceof Element
      ? event.target.closest("[data-okf-edit-cell]")
      : undefined;
    const row = cell?.closest("tr[data-okf-field]");
    if (!cell || !row || !editMode) return;
    event.preventDefault?.();
    event.stopPropagation?.();
    if (cell.getAttribute("data-okf-edit-cell") === "name") {
      openFrontmatterKeyEditor(row, cell);
    } else if (row.getAttribute("data-okf-type") === "checkbox") {
      openFrontmatterEditor(row, { toggleBoolean: true });
    } else {
      openFrontmatterEditor(row);
    }
  });
  document.addEventListener("click", (event) => {
    const extendsSelection = editMode && event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey;
    if (editMode && !extendsSelection) clearBlockSelection();
    if (event.target instanceof Element && event.target.closest(".sphinx-preview-insert-point")) return;
    // A chip is reserved for expanding its comment; the rest of the block edits.
    if (event.target instanceof Element && event.target.closest(".okf-chip")) return;
    // The open thread is a small form of its own: clicking in it never opens the block editor.
    if (event.target instanceof Element
      && event.target.closest('.okf-comment[data-okf-comment-kind="thread"] > .okf-comment-body')) return;
    const target = event.target instanceof Element
      ? event.target.closest(mappingsSelector)
      : undefined;
    if (!target || target.closest("a")) {
      if (editMode && activeBlockEdit?.selectedCell && !activeBlockEdit.finishing) {
        postBlockEditSave(true);
      }
      return;
    }
    if (extendsSelection) {
      event.preventDefault?.();
      selectBlocksTo(target);
      return;
    }
    if (editMode) {
      event.preventDefault?.();
      openMappedEditor(
        target,
        event.target,
        clickCaretContext(target, event.target, event.clientX, event.clientY) ?? "end",
      );
      return;
    }
    postReveal(target, "click");
  });
  document.addEventListener("mouseover", (event) => {
    if (figureEditButton.owns(event.target)) return;
    setEditHover(editHoverTarget(event.target));
  });
  document.addEventListener("mouseout", (event) => {
    if (figureEditButton.owns(event.relatedTarget)) return;
    setEditHover(editHoverTarget(event.relatedTarget));
  });
  document.addEventListener("focusin", (event) => setEditHover(editHoverTarget(event.target)));
  document.addEventListener("focusout", () => setEditHover(undefined));
  document.addEventListener("dblclick", (event) => {
    if (editMode || !settings.doubleClickToSwitchToEditor) return;
    const target = event.target instanceof Element
      ? event.target.closest(mappingsSelector)
      : undefined;
    if (!target || target.closest("a")) return;
    postReveal(target, "double-click");
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target instanceof Element && event.target.closest(".sphinx-preview-insert-point")) return;
    if (event.target instanceof Element
      && (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(event.target.tagName)
        || event.target.isContentEditable)) return;
    if (event.target instanceof Element
      && event.target.closest("[data-okf-description-toggle]")) return;
    if (event.target instanceof Element
      && event.target.closest(".okf-chip")) return;
    if (event.target instanceof Element
      && event.target.closest('a[data-sphinx-preview-navigation^="okf-link:"]')) return;
    const frontmatterEditor = event.target instanceof Element
      ? event.target.closest("[data-okf-frontmatter-editor]")
      : undefined;
    const cell = event.target instanceof Element
      ? event.target.closest("[data-okf-edit-cell]")
      : undefined;
    const row = cell?.closest("tr[data-okf-field]");
    if (!frontmatterEditor && cell && row && editMode) {
      event.preventDefault?.();
      if (cell.getAttribute("data-okf-edit-cell") === "name") {
        openFrontmatterKeyEditor(row, cell);
      } else {
        openFrontmatterEditor(row);
      }
      return;
    }
    const target = event.target instanceof Element
      ? event.target.closest(mappingsSelector)
      : undefined;
    if (!target || target.closest("a")) return;
    event.preventDefault?.();
    if (editMode) {
      openMappedEditor(target, event.target);
      return;
    }
    postReveal(target, "keyboard");
  });
  if (typeof ResizeObserver !== "undefined") {
    const previewContent = document.getElementById?.("sphinx-myst-preview-content");
    if (previewContent) new ResizeObserver(stabilizeLayout).observe(previewContent);
  }
  // Reports the page as ready for the current identifiers: at startup and after a content patch.
  function postPreviewReady() {
    const readyState = stateSnapshot(anchor?.line ?? lineAtScroll(window.scrollY));
    vscode.postMessage({
      type: "previewReady",
      documentId: context.documentId,
      documentVersion: context.documentVersion,
      requestId: context.requestId,
      sourceLine: readyState.sourceLine,
      scrollTop: readyState.scrollTop,
      ...(pinApplied ? anchorField() : {}),
      ...(readyState.focusedBlockId ? { focusedBlockId: readyState.focusedBlockId } : {}),
      ...(readyState.selectedText ? { selectedText: readyState.selectedText } : {}),
      ...(readyState.openDisclosures ? { openDisclosures: readyState.openDisclosures } : {}),
      descriptionsCollapsed,
      // The host holds its edit lock only while this page has an editor open.
      blockEditOpen: activeBlockEdit !== undefined,
    });
  }
  initializeContent({ restore: true });
  postPreviewReady();
})();`;
}

export function layoutMappings(
  mappings: readonly SourceBlockMapping[],
  positions: readonly { top: number; height: number }[],
): PositionedSourceMapping[] {
  return mappings
    .map((mapping, index) => {
      const position = positions[index];
      return position && Number.isFinite(position.top) && Number.isFinite(position.height)
        ? { ...mapping, top: position.top, height: position.height }
        : undefined;
    })
    .filter((mapping): mapping is PositionedSourceMapping => mapping !== undefined);
}

export { parseSourceMappings };
export type { MappingElement, SourceBlockMapping };
