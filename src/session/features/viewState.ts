/**
 * The view state controller: how the reader looks at the page, never the document. It records the
 * page's scroll and disclosure state, keeps the reader's choices (theme mode, view preferences,
 * edit and palette mode, closed warning banners), follows the host's color theme and handles the
 * Refresh button. None of these messages edit the document, so read-only previews accept them.
 */

import { isPaletteMode } from "../../configuration/editingConfiguration";
import type { PageStateMessageUnion } from "../../protocol/pageToHost";
import { isPreviewThemeMode } from "../../state/previewTheme";
import { parsePreviewPanelState } from "../../state/previewState";
import type { PageMessageRouter } from "../pageMessages";
import type { PreviewManager } from "../previewManager";
import type { PreviewSession } from "../previewSession";
import { isDocumentEligible, revisionOfStage } from "../sessionDocuments";

/** The page's view state and the reader's choices. */
export class ViewStateController {
  public constructor(private readonly manager: PreviewManager) {}

  /** Registers the handlers of the page's view messages. */
  public register(router: PageMessageRouter): void {
    const { manager } = this;
    // A view preference only changes how the preview looks (workspace state, no document edit), so a
    // read-only or untrusted preview accepts it; the value is validated by the protocol.
    router.on("previewViewPreferenceChanged", (message, preview) => {
      manager.choices.setViewPreference(message.preference, message.value);
      if (message.preference === "incomingChanges") {
        manager.incoming.schedule(preview, 0);
      }
    });
    // The palette mode is a workspace choice like the edit mode: it changes buttons only, never the
    // rendering, so it is saved from the page and only a document edit needs a writable preview.
    router.on("previewPaletteModeChanged", (message, preview) => {
      if (!preview.readOnly && isPaletteMode(message.mode)) {
        void manager.choices.setPaletteMode(message.mode);
      }
    });
    // CR 050: the warning banner. Opening the Problems view and closing the banner edit nothing, so a
    // read-only or untrusted preview allows them.
    router.on("previewShowProblems", () =>
      manager.host.ui.showProblems());
    router.on("previewWarningBannerClosed", (message, preview) => {
      manager.choices.dismissedWarningBanners.set(preview.documentUri, message.key);
    });
    router.on("previewThemeModeChanged", (message) => {
      if (isPreviewThemeMode(message.previewThemeMode)) {
        manager.choices.setPreviewThemeMode(message.previewThemeMode);
      }
    });
    router.on("previewEditModeChanged", (message, preview) => {
      if (!preview.readOnly && typeof message.editMode === "boolean") {
        manager.choices.setEditMode(message.editMode);
      }
    });
    // The remaining page-state messages each report the page's scroll state first.
    router.on("previewState", (message, preview) => {
      this.recordPreviewState(preview, message);
    });
    router.on("previewRefresh", (value, preview) => {
      this.recordPreviewState(preview, value);
      if (preview.document) {
        preview.edits.forceNextResult = true;
        void manager.rendering.refreshPreviewDocument(preview, preview.document);
      }
    });
  }

  /** Records the scroll and disclosure state a page message reports. */
  public recordPreviewState(preview: PreviewSession, message: PageStateMessageUnion): void {
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
    if (typeof state.descriptionsCollapsed === "boolean") {
      this.manager.choices.recordCollapsedDescriptions(preview.documentUri, state.descriptionsCollapsed);
    }
  }

  /** Tells the page whether the gray comment chips show. Stale ids are dropped by the page. */
  public postShowComments(preview: PreviewSession): void {
    const stage = preview.stage;
    if (preview.disposed || !stage) return;
    void preview.postToPage({
      type: "previewShowComments",
      showComments: preview.configuration.showComments,
      documentId: stage.activeDocumentIdentity,
      revision: revisionOfStage(stage),
      requestId: stage.requestId,
    });
  }

  /** The host's color theme changed: the page re-themes at once, the render follows. */
  public notifyTheme(preview: PreviewSession): void {
    const { manager } = this;
    const stage = preview.stage;
    if (stage) {
      void preview.postToPage({
        type: "themeChanged",
        themeKind: manager.host.theme.kind,
        documentId: stage.activeDocumentIdentity,
        revision: revisionOfStage(stage),
        requestId: stage.requestId,
      });
    }
    if (preview.document && isDocumentEligible(preview.document)) {
      // The page re-themes itself at once; the render with the new theme waits for an open editor.
      const document = preview.document;
      manager.edits.deferWhileEditing(preview, "theme-render", () => {
        if (!preview.disposed) void manager.rendering.refreshPreviewDocument(preview, document);
      });
    }
  }
}
