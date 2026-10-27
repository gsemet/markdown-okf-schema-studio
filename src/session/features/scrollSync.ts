/**
 * The scroll sync controller: the pairing of the page with a text editor that shows its document.
 * The editor's scroll moves the page and the page's scroll moves the editor, as the settings allow;
 * the single scroll anchor of a preview survives renders (docs/scroll-anchoring.md); a final save
 * pins the edited block on screen across the render that follows (R7). Hosts without a text editor
 * report none (`HostCapabilities.editorPairing`), and the page then runs without pairing.
 */

import * as path from "node:path";

import type { DocumentChange } from "../../host-api/documentStore";
import type { PairedEditor } from "../../host-api/textEditors";
import { pageLiveStateMessages } from "../../core/preview/pageLiveState";
import type { PageIdentity } from "../../core/protocol/envelope";
import type { PageMessageOf } from "../../core/protocol/pageToHost";
import { EditorEchoGuard, shiftLineForEdits, type ScrollAnchor } from "../../core/scroll/anchorPolicy";
import type { PageMessageRouter } from "../pageMessages";
import type { PreviewManager } from "../previewManager";
import type { PreviewSession } from "../previewSession";
import { revisionOfStage } from "../sessionDocuments";

/** Scroll state of one page (owned by the scroll sync controller). */
export interface ScrollState {
  /** Drops editor visible-range events caused by the host's own reveals. */
  echoGuard: EditorEchoGuard;
  /** The single scroll anchor of this preview (see docs/scroll-anchoring.md). */
  anchor?: ScrollAnchor & { documentId: string };
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
  /**
   * Until when the text editor's scroll is the echo of an edit the preview itself applied (CR 134):
   * VS Code reveals the end of a large paste in the editor, and the page must not follow that move
   * while the writer is still in the block editor. `Infinity` while the edit is being applied.
   */
  ownEditUntil?: number;
}

/** How long after an own edit settled the editor's scroll still counts as its echo. */
export const OWN_EDIT_ECHO_MS = 750;

/** A fresh {@link ScrollState}. */
export function createScrollState(): ScrollState {
  return { echoGuard: new EditorEchoGuard() };
}

/** Scroll sync between the page and its paired text editor. */
export class ScrollSyncController {
  public constructor(private readonly manager: PreviewManager) {}

  /** Registers the handlers of the page's scroll and reveal reports. */
  public register(router: PageMessageRouter): void {
    router.on("previewScroll", (message, preview) => {
      this.manager.view.recordPreviewState(preview, message);
      this.revealFromPage(preview, message);
    });
    router.on("previewReveal", (message, preview) => {
      this.manager.view.recordPreviewState(preview, message);
      this.revealFromPage(preview, message);
    });
    // @implements_req SwRS-MDOKFSTUDIO-LIFE-169
    // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-120
    router.on("previewAnchorModeChanged", (value, preview) => {
      this.manager.view.recordPreviewState(preview, value);
      if (typeof value.anchorToEditor === "boolean") {
        preview.configuration = {
          ...preview.configuration,
          scrollPreviewWithEditor: value.anchorToEditor,
        };
        // The page changed its own setting; it is not a difference that needs a new document.
        if (preview.page.loadedContext) {
          preview.page.loadedContext = { ...preview.page.loadedContext, scrollPreviewWithEditor: value.anchorToEditor };
        }
        if (value.anchorToEditor) {
          this.syncEditorToPreview(undefined);
        }
      }
    });
  }

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-100
  /** The visible text editor that shows the preview's document, if any. */
  public visibleEditorFor(preview: PreviewSession): PairedEditor | undefined {
    const { host } = this.manager;
    if (!host.capabilities.editorPairing) {
      return undefined;
    }
    return host.editors.visible().find((candidate) => candidate.document.id === preview.documentUri);
  }

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-108
  private revealEditorLine(
    preview: PreviewSession,
    line: number,
    position: "top" | "center-if-outside",
  ): void {
    if (!preview.configuration.scrollEditorWithPreview) {
      return;
    }
    const stage = preview.stage;
    if (!stage) {
      return;
    }
    const documentPath = path.resolve(stage.activeDocumentPath);
    const editor = this.manager.host.editors.visible().find(
      (candidate) => path.resolve(candidate.fsPath) === documentPath,
    );
    if (!editor) {
      return;
    }
    const zeroBasedLine = Math.max(0, Math.min(editor.document.lineCount - 1, line - 1));
    preview.scroll.echoGuard.expect(
      preview.documentUri,
      (editor.firstVisibleLine ?? zeroBasedLine) + 1,
      zeroBasedLine + 1,
    );
    preview.scroll.lastRevealedSourceLine = zeroBasedLine + 1;
    editor.revealLine(zeroBasedLine, position);
  }

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-097
  // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-128
  /** The editor's first visible line moves the pages of its document (all visible editors when undefined). */
  public syncEditorToPreview(editor: PairedEditor | undefined): void {
    const sourceEditors = editor ? [editor] : this.manager.host.editors.visible();
    for (const sourceEditor of sourceEditors) {
      const documentIdentity = sourceEditor.document.id;
      const firstVisibleLine = sourceEditor.firstVisibleLine;
      if (firstVisibleLine === undefined) {
        continue;
      }
      for (const preview of this.manager.sessions()) {
        const stage = preview.stage;
        if (preview.disposed || !stage || preview.documentUri !== documentIdentity) {
          continue;
        }
        // @implements_req SwRS-MDOKFSTUDIO-PALETTE-021
        // The editor scrolled to show the edit the preview just applied: the page is where the writer is.
        if (preview.scroll.ownEditUntil !== undefined && Date.now() < preview.scroll.ownEditUntil) {
          continue;
        }
        const sourceLine = firstVisibleLine + 1;
        const lastRevealed = preview.scroll.lastRevealedSourceLine;
        const revealedLineIsVisible = lastRevealed !== undefined
          && sourceEditor.isLineVisible(lastRevealed - 1);
        if (preview.configuration.scrollPreviewWithEditor
          && preview.scroll.echoGuard.isEcho(documentIdentity, sourceLine, Date.now(), revealedLineIsVisible)) {
          continue;
        }
        if (!preview.configuration.scrollPreviewWithEditor && !preview.configuration.markEditorSelection) {
          continue;
        }
        if (preview.configuration.scrollPreviewWithEditor) {
          // The editor leads: its first visible line becomes the anchor.
          preview.scroll.anchor = { line: sourceLine, owner: "editor", documentId: documentIdentity };
        }
        preview.scroll.lastSourceScrollLine = sourceLine;
        void preview.postToPage({
          type: "sourceScroll",
          documentId: stage.activeDocumentIdentity,
          revision: revisionOfStage(stage),
          requestId: stage.requestId,
          line: sourceLine,
          selectionLine: sourceEditor.selectionLine + 1,
        });
      }
    }
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-228
  /** Remembers the pin of an accepted final save for the render that shows the saved text (R7). */
  public storePendingPin(
    preview: PreviewSession,
    message: { documentId: string; pinLine?: number; pinViewportTop?: number },
    minVersion: number,
  ): void {
    if (
      message.pinLine === undefined
      || message.pinViewportTop === undefined
      || message.documentId !== preview.documentUri
    ) {
      return;
    }
    preview.scroll.pendingPin = {
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
  public takePendingPin(
    preview: PreviewSession,
    documentId: string,
    renderedVersion: number,
    now: number = Date.now(),
  ): { line: number; viewportTop: number } | undefined {
    const pin = preview.scroll.pendingPin;
    if (!pin) {
      return undefined;
    }
    if (pin.expiresAt < now || pin.documentId !== documentId) {
      preview.scroll.pendingPin = undefined;
      return undefined;
    }
    if (renderedVersion < pin.minVersion) {
      return undefined;
    }
    preview.scroll.pendingPin = undefined;
    return { line: pin.line, viewportTop: pin.viewportTop };
  }

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-119
  /** Source line the next render shows at the preview reading line (anchoring rule R6). */
  public initialAnchorLine(preview: PreviewSession): number | undefined {
    if (preview.scroll.anchor?.documentId === preview.documentUri) {
      return preview.scroll.anchor.line;
    }
    if (!preview.configuration.scrollPreviewWithEditor) {
      return undefined;
    }
    const firstVisibleLine = this.visibleEditorFor(preview)?.firstVisibleLine;
    return firstVisibleLine !== undefined ? firstVisibleLine + 1 : undefined;
  }

  /** Marks the editor's caret line in the page. */
  public markEditorSelectionInPreview(preview: PreviewSession): void {
    const stage = preview.stage;
    const editor = this.visibleEditorFor(preview);
    if (!preview.configuration.markEditorSelection || !stage || !editor) {
      return;
    }
    void preview.postToPage({
      type: "sourceScroll",
      documentId: stage.activeDocumentIdentity,
      revision: revisionOfStage(stage),
      requestId: stage.requestId,
      selectionLine: editor.selectionLine + 1,
    });
  }

  /** A scroll of the page or a reveal request moves the text editor, as the settings allow. */
  private revealFromPage(preview: PreviewSession, value: PageMessageOf<"previewScroll" | "previewReveal">): void {
    if (value.type === "previewScroll" && !preview.configuration.scrollPreviewWithEditor) {
      return;
    }
    if (!preview.configuration.scrollEditorWithPreview) {
      return;
    }
    const position = value.type === "previewScroll" ? "top" : "center-if-outside";
    if (value.line !== undefined && value.sourceFile === undefined) {
      this.revealEditorLine(preview, value.line, position);
      return;
    }
    if (
      value.line !== undefined
      && value.sourceFile !== undefined
      && path.resolve(value.sourceFile) === path.resolve(preview.stage?.activeDocumentPath ?? "")
    ) {
      this.revealEditorLine(preview, value.line, position);
    }
  }

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-026
  /** A hidden panel shown again catches up with an editor that moved meanwhile. */
  public restorePreviewState(preview: PreviewSession): void {
    preview.probe.restoreCalls += 1;
    // A retained webview keeps its own scroll; it only needs to catch up with an
    // editor that moved while the panel was hidden.
    if (preview.configuration.scrollPreviewWithEditor) {
      const editor = this.visibleEditorFor(preview);
      if (editor) {
        this.syncEditorToPreview(editor);
      }
    }
  }

  /** Tells the page whether a visible text editor shows its document (the anchor button). */
  public notifyPairing(preview: PreviewSession): void {
    const stage = preview.stage;
    if (preview.disposed || !stage) {
      return;
    }
    void preview.postToPage({
      type: "previewPairing",
      documentId: stage.activeDocumentIdentity,
      revision: revisionOfStage(stage),
      requestId: stage.requestId,
      pairedTextEditor: this.visibleEditorFor(preview) !== undefined,
    });
  }

  // @implements_req SwRS-MDOKFSTUDIO-THEME-016
  /**
   * Answers a page's ready report with the live state it read from its render's context: a change
   * announced while the page was still loading may have reached it before it listened.
   */
  public postPageLiveState(preview: PreviewSession, ready: PageIdentity): void {
    if (preview.disposed) {
      return;
    }
    for (const message of pageLiveStateMessages(ready, {
      pairedTextEditor: this.visibleEditorFor(preview) !== undefined,
      themeKind: this.manager.host.theme.kind,
    })) {
      void preview.postToPage(message);
    }
  }

  /** Keeps each anchor on the same source text when lines are added or removed above it. */
  public shiftAnchorsForEdits(event: DocumentChange): void {
    const documentIdentity = event.document.id;
    const changes = event.changes.map((change) => ({
      startLine: change.startLine + 1,
      endLine: change.endLine + 1,
      insertedLineCount: change.text.split("\n").length - 1,
    }));
    for (const preview of this.manager.sessions()) {
      const anchor = preview.scroll.anchor;
      if (anchor?.documentId === documentIdentity) {
        preview.scroll.anchor = { ...anchor, line: shiftLineForEdits(anchor.line, changes) };
      }
    }
  }
}
