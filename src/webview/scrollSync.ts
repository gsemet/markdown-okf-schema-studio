import {
  parseSourceMappings,
  type MappingElement,
  type SourceBlockMapping,
} from "../mapping/sourceMapping";
import { createAnchorPolicy } from "./anchorPolicy";
import { createMarkdownTableTools } from "./markdownTable";
import { createEditActions } from "./editActions";
import { createEditPalette } from "./editPalette";
import { caretRectOf } from "./caretRect";
import { createLinkPanel } from "./linkPanel";
import { createFigureTools } from "./figureDirective";
import { createFigurePanel, installFigureEditButton } from "./figurePanel";
import { highlightLanguageNames } from "../render/highlight";
import { createTextEditingTools } from "./textEditing";
import { installCodeCopy } from "./codeCopy";
import { installLabelRename } from "./labelRename";
import { installHostRequests } from "./hostRequests";
import { installFirstClearance } from "./firstClearance";
import { applyFigureSizes } from "./figureSizes";
import { applySpanColors, isSafeOkfColor } from "./spanColors";
import { installLinkNavigation } from "./linkNavigation";
import { installHistoryControls } from "./historyControls";
import { installTocColumn } from "./tocColumn";
import { installChipToggle } from "./chipToggle";
import { installIncomingChanges } from "./incomingChanges";
import { installIncomingToggle } from "./incomingToggle";
import { installViewControls } from "./viewControls";
import { installWidthMode } from "./widthMode";
import type { ViewPreferences } from "../state/previewViewPreferences";
import type { PreviewThemeMode } from "../state/previewTheme";
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
  const editActions = (${createEditActions.toString()})(${JSON.stringify(highlightLanguageNames())}, tableTools);
  const createEditPalette = ${createEditPalette.toString()};
  const caretRectOf = ${caretRectOf.toString()};
  const createLinkPanel = ${createLinkPanel.toString()};
  const figureTools = (${createFigureTools.toString()})();
  const createFigurePanel = ${createFigurePanel.toString()};
  const anchorPolicy = (${createAnchorPolicy.toString()})();
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
  const linkNavigation = (${installLinkNavigation.toString()})(document, window, vscode, context);
  const firstClearance = (${installFirstClearance.toString()})(document, window);
  const applyFigureSizes = ${applyFigureSizes.toString()};
  const isSafeOkfColor = ${isSafeOkfColor.toString()};
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
  const incomingToggle = (${installIncomingToggle.toString()})(document, vscode, context);
  const historyControls = (${installHistoryControls.toString()})(document, vscode, context);
  const viewControls = (${installViewControls.toString()})(document, vscode, context, keepReadingLine);
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
      : "current";
  let anchorToEditor = typeof savedState?.anchorToEditor === "boolean"
    ? savedState.anchorToEditor
    : settings.scrollPreviewWithEditor;
  let editMode = editModeButton
    ? (typeof savedState?.editMode === "boolean" ? savedState.editMode : context.initialEditMode === true)
    : false;
  const paletteModes = ["strict", "gfm", "myst"];
  let paletteMode = paletteModes.includes(savedState?.paletteMode)
    ? savedState.paletteMode
    : paletteModes.includes(context.initialPaletteMode) ? context.initialPaletteMode : "myst";
  let activeBlockEdit;
  let activeFrontmatterEdit;
  // Latest properties-table markup the host sent while a frontmatter editor was open (T30).
  let deferredPropertiesMarkup;
  let editSequence = 0;
  let pendingBlockNavigation = savedState?.pendingBlockNavigation;
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
        && entry.severity.length <= 50 && typeof entry.text === "string" && entry.text.length <= 20000);
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
    deferredPropertiesMarkup = undefined;
    closeFrontmatterEditor();
    closeBlockEdit(false);
    closeLinkTooltip();
    codeCopy.hide();
    setEditHover(undefined);
    pendingCheckboxToggles.clear();
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
    return pinFields(line, table || edit.renderedTarget || edit.target, edit.element, edit.paletteShift ?? 0);
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
    });
  }

  function applyTheme(themeKind) {
    const target = document.documentElement ?? document.body;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    target?.setAttribute?.("data-sphinx-preview-theme", String(themeKind ?? "default"));
    target?.setAttribute?.("data-sphinx-preview-reduced-motion", reducedMotion ? "true" : "false");
  }

  function applyPreviewThemeMode(mode) {
    if (!themeModes.includes(mode)) mode = "current";
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
    activeBlockEdit = undefined;
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
    edit.palette?.destroy();
    restoreTableCellContent(edit);
    if (edit.selectedCell) {
      edit.selectedCell.removeAttribute("data-sphinx-preview-table-cell-selected");
    } else {
      (edit.renderedTarget || edit.target).removeAttribute("data-sphinx-preview-editing");
    }
    edit.element.remove?.();
    // Opening scrolled the page down by paletteShift to keep the text still; the frame is gone
    // now, so scroll back and the rendered block stays where the user last saw the text.
    if (edit.paletteShift > 0 && !edit.selectedCell) {
      const target = Math.max(0, Math.min(maxScrollTop(), window.scrollY - edit.paletteShift));
      programmaticScroll(target);
      const restoredLine = lineAtScroll(target);
      if (restoredLine !== undefined) anchor = { line: restoredLine, owner: anchor?.owner ?? "preview" };
    }
    if (!activeFrontmatterEdit) editAnchor = undefined;
    if (refreshButton) refreshButton.disabled = false;
  }

  function closeFrontmatterEditor() {
    if (!activeFrontmatterEdit) return;
    if (pendingEditorOpen) {
      pendingEditorOpen = false;
      clearPendingFrontmatterEdit();
    }
    activeFrontmatterEdit.frontmatterMenu?.remove?.();
    activeFrontmatterEdit.displayElement?.removeAttribute("hidden");
    activeFrontmatterEdit.valueCell.removeAttribute("data-okf-editing");
    activeFrontmatterEdit.valueCell.removeAttribute("data-okf-key-editing");
    activeFrontmatterEdit.editor.remove?.();
    activeFrontmatterEdit = undefined;
    if (!activeBlockEdit) editAnchor = undefined;
    if (!activeBlockEdit && refreshButton) refreshButton.disabled = false;
    if (deferredPropertiesMarkup !== undefined) {
      const markup = deferredPropertiesMarkup;
      deferredPropertiesMarkup = undefined;
      applyPropertiesMarkup(markup);
    }
  }

  // Swaps the host-rendered properties section in place (T30) instead of reloading the page. The
  // markup is built and escaped by the host (propertiesTable.ts); it goes through no other path.
  function applyPropertiesMarkup(markup) {
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

  function rememberPendingBlockNavigation(target, caretPosition, selectedCell, explicitIndices) {
    pendingBlockNavigation = {
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
    const action = editActions.shortcutFor(event, isApplePlatform());
    if (!action || !action.scopes.includes("block")) return false;
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
      scope: "block",
    });
    if (edit) applyTextEdit(control, edit, onFallbackInput);
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
  function applyTextEdit(control, edit, onFallbackInput) {
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
    if (caretPosition && typeof caretPosition === "object") {
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
      const newFieldName = control.value;
      if (newFieldName === name) {
        cancelled = true;
        closeFrontmatterEditor();
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
        ...frontmatterPinFields(nameCell),
        ...anchorField(),
      });
    };
    control.addEventListener("keydown", (event) => {
      if (keepUndoInControl(event)) return;
      if (event.key === "Escape") {
        event.preventDefault?.();
        cancelled = true;
        closeFrontmatterEditor();
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
    const saveValue = (forcedValue) => {
      if (cancelled || edit.saving || control.disabled) return;
      if (forcedValue === undefined && fieldType === "text" && !useYamlEditor && !useListEditorValue
        && control.tagName === "TEXTAREA" && (typeof value !== "string" || !value.endsWith("\\n"))) {
        control.value = String(control.value).replace(/(?:\\r?\\n)+$/u, "");
      }
      const fieldValue = forcedValue === undefined
        ? useListEditorValue ? readListValue()
          : useYamlEditor ? control.value
          : fieldType === "checkbox" ? control.checked
          : fieldType === "number" ? Number(control.value)
            : control.value
        : forcedValue;
      if (fieldType === "number" && forcedValue !== null && (!control.value || !Number.isFinite(fieldValue))) {
        status.textContent = "Enter a valid number.";
        status.setAttribute("data-state", "error");
        status.setAttribute("data-visible", "true");
        return;
      }
      const unchanged = useYamlEditor
        ? control.value === initialYaml
        : JSON.stringify(fieldValue) === JSON.stringify(value);
      if (unchanged) {
        cancelled = true;
        closeFrontmatterEditor();
        return;
      }
      const editId = context.requestId + "-field-" + (++editSequence);
      edit.editId = editId;
      edit.saving = true;
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
        closeFrontmatterEditor();
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
    if (message.saved === true) {
      edit.status.removeAttribute("data-visible");
      edit.status.removeAttribute("data-state");
      edit.status.textContent = "Saved. Refreshing preview…";
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
    const editedText = edit.tableModel
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
  window.addEventListener("pagehide", flushPendingAutosave);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushPendingAutosave();
  });

  function saveBlockEdit() {
    postBlockEditSave(true);
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
    closeFrontmatterEditor();
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
  function toolbarUsableTop(bar) {
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
        usableTop = Math.max(usableTop, controls.bottom + 4);
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
    const wanted = toolbarUsableTop(bar) - bar.top;
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

  function renderTableCellEditor(edit) {
    const modelRowIndex = edit.tableRowIndex === 0 ? 0 : edit.tableRowIndex + 1;
    const row = edit.tableModel.rows[modelRowIndex];
    edit.tableColumnIndex = Math.max(0, Math.min(edit.tableColumnIndex, row.length - 1));
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
      applyAnchor();
    }
    const actionButtons = [];
    const tableActionIcons = {
      addRow: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 3.5h16v13H4z"></path><path d="M4 8h16M9.5 3.5v13M14.5 3.5v13M12 19v4M9.5 21.5h5"></path></svg>',
      deleteRow: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 3.5h16v13H4z"></path><path d="M4 8h16M9.5 3.5v13M14.5 3.5v13M9.5 21.5h5"></path></svg>',
      addColumn: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3.5 4h13v16h-13z"></path><path d="M8 4v16M12.5 4v16M17 9h6M20 6v6"></path></svg>',
      deleteColumn: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3.5 4h13v16h-13z"></path><path d="M8 4v16M12.5 4v16M17 9h6"></path></svg>',
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
        renderTableCellEditor(edit);
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

    const columnCount = edit.tableModel.rows[0].length;
    const columnText = "column " + (edit.tableColumnIndex + 1) + " of " + columnCount;
    edit.status.textContent = edit.tableRowIndex === 0
      ? "Header \u00b7 " + columnText
      : "Row " + edit.tableRowIndex + " of " + (edit.tableModel.rows.length - 2) + " \u00b7 " + columnText;
    menu.appendChild(edit.status);
    edit.element.appendChild(input);
    // Done and Cancel under the field, without the status hint (the toolbar carries the position).
    const cellActions = document.createElement("div");
    cellActions.className = "sphinx-preview-block-editor-actions";
    cellActions.appendChild(createEditorButtons(edit));
    edit.element.appendChild(cellActions);
    resizeInput();
    // stabilizeLayout (window and content resize) re-fits the field when the width changes.
    edit.resizeTextarea = resizeInput;
    edit.tableInput = input;
    edit.actionButtons = actionButtons;
    input.addEventListener("blur", () => commitCellEditorOnFocusLoss(edit, input));
    input.addEventListener("keydown", (event) => {
      if (keepUndoInControl(event)) return;
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
    if (!edit || edit.finishing || edit.textarea !== control || !edit.palette) return;
    if (edit.linkPanel) {
      edit.linkPanel.focusFirst();
      return;
    }
    edit.palette.closePopover();
    const selection = {
      value: String(control.value ?? ""),
      selectionStart: Number(control.selectionStart),
      selectionEnd: Number(control.selectionEnd),
      scope: "block",
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
        edit.paletteShift = Math.max(0, (edit.paletteShift ?? 0) - shift);
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
      isInsideFrame: (node) => Boolean(node) && (node === edit.element || edit.element.contains(node)),
    });
    edit.linkPanel = panel;
    edit.closeLinkPanel = closePanel;
    const textTopBefore = control.getBoundingClientRect?.().top;
    edit.element.insertBefore(panel.element, control);
    const shift = keepTextInPlace(edit, textTopBefore);
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
      if (next && edit.element.contains(next)) return;
      // A native dialog of the host (the {doc} file picker) took the focus: not leaving.
      if (hostRequests.isDialogOpen()) return;
      saveBlockEdit();
    });
    edit.status.textContent = hint;
    edit.element.appendChild(textarea);
    edit.element.appendChild(actions);
    edit.textarea = textarea;
    edit.resizeTextarea = resizeTextarea;
    resizeTextarea();
    // The edition palette is the frame's first child. The text line the user clicked stays where
    // it was: the anchor keeps the frame, moved up by the height the bar adds above the text, but
    // never so far that the bar would end under the sticky band or the preview controls, and not
    // at all on a page scrolled to its very top.
    const textTopBefore = textarea.getBoundingClientRect?.().top;
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
      isInsideFrame: (node) => Boolean(node) && (node === edit.element || edit.element.contains(node)),
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
    edit.element.insertBefore(palette.element, edit.element.firstElementChild);
    const shift = keepTextInPlace(edit, textTopBefore);
    if (shift > 0) edit.paletteShift = shift;
    applyAnchor();
    textarea.addEventListener("mousedown", () => {
      palette.closePopover();
      edit.closeLinkPanel?.(false);
      edit.closeFigurePanel?.(false);
    });
    textarea.addEventListener("input", () => {
      palette.closePopover();
      edit.closeLinkPanel?.(false);
      edit.closeFigurePanel?.(false);
    });
    textarea.addEventListener("keydown", (event) => {
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
        edit.paletteShift = Math.max(0, (edit.paletteShift ?? 0) - shift);
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
      isInsideFrame: (node) => Boolean(node) && (node === edit.element || edit.element.contains(node)),
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
      labelRename.close();
      setEditHover(undefined);
      closeFrontmatterEditor();
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

  function removeInsertPoints() {
    insertPoints.forEach((point) => point.remove());
    insertPoints = [];
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

  function createInsertPoint(afterLine, label, standalone) {
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
    body.forEach((block) => {
      const line = Number(block.getAttribute("data-sphinx-source-line"));
      const endLine = Number(block.getAttribute("data-sphinx-source-end-line") || line);
      if (!Number.isSafeInteger(endLine) || endLine < line) return;
      place(block.closest?.("pre") || block, createInsertPoint(endLine, "+", false));
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
    incomingChanges.apply();
    measure();
    if (options.restore) {
      restoreState();
    } else {
      // The startup scan of the link navigation already covered the first content.
      linkNavigation.rescan();
    }
    if (hasRenderedPreview()) resumePendingBlockNavigation();
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
        deferredPropertiesMarkup = message.markup;
        return;
      }
      applyPropertiesMarkup(message.markup);
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
    if (sameContext(message) && message.type === "previewIncomingChanges") {
      incomingChanges.setEnabled(message.enabled !== false);
      incomingChanges.setRanges(message.ranges);
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
    if (event.target instanceof Element && event.target.closest(".sphinx-preview-insert-point")) return;
    // A chip is reserved for expanding its comment; the rest of the block edits.
    if (event.target instanceof Element && event.target.closest(".okf-chip")) return;
    const target = event.target instanceof Element
      ? event.target.closest(mappingsSelector)
      : undefined;
    if (!target || target.closest("a")) {
      if (editMode && activeBlockEdit?.selectedCell && !activeBlockEdit.finishing) {
        postBlockEditSave(true);
      }
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
