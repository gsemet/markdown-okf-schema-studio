/**
 * The page message dispatcher: every message of a preview page arrives here. It is validated by the
 * protocol, matched to the preview by the gate of its type, then handed to the one handler a feature
 * controller registered for that type on the typed router.
 */

import {
  isPageStateMessage,
  isPageToHostMessage,
  type PageMessageOf,
  type PageStateMessageUnion,
  type PageToHostMessage,
  type PageToHostType,
} from "../core/protocol/pageToHost";
import { reportsReloadedDocument } from "../core/preview/contentPatch";
import type { MessageRouter } from "../core/protocol/router";
import type { PreviewManager } from "./previewManager";
import type { PreviewSession } from "./previewSession";
import { LABEL_GONE, MALFORMED_TOGGLE, STALE_REQUEST } from "../core/edits/sourceEdits";
import { previewReadOnlyReason, revisionOfStage } from "./sessionDocuments";
import { fireAndForget } from "../host-api/logger";

/** What a page message handler returns: the work it started, when a caller may wait for it. */
export type PageMessageResult = PromiseLike<void> | void;

/** The host's router of page messages: one handler per type, the preview session as context. */
export type PageMessageRouter = MessageRouter<PageToHostMessage, [PreviewSession], PageMessageResult>;

/**
 * How a page message is matched to the preview before its handler runs; a message that does not
 * pass is dropped. Every type has a gate: the table is typed by the protocol union.
 * - `render`: it names the render the host holds (document, revision and request).
 * - `comment`: `render` with any revision of the document. Comments live in the sidecar, not in
 *   the document text: a newer revision does not stale them (the quote re-anchors), and typed text
 *   must not be lost to a race with typing.
 * - `document`: it names the document the preview shows; the render may be one behind (a file read
 *   is bounded by the include policy anyway; the warning banner belongs to the document).
 * - `own-id`: matched by an id of its own only, an editor id or a flush id: the answer must reach
 *   the waiting host even when the stage moved on, or already follows the next document.
 * - `page-state`: the `render` gate of the page-state family, with what comes around it (see
 *   {@link PageMessageDispatcher}).
 */
export type PageMessageGate = "render" | "comment" | "document" | "own-id" | "page-state";

/** The gate of every page message type. */
export const PAGE_MESSAGE_GATES: { readonly [T in PageToHostType]: PageMessageGate } = {
  previewReady: "page-state",
  previewScroll: "page-state",
  previewReveal: "page-state",
  previewState: "page-state",
  previewLink: "page-state",
  previewLinkDiscover: "page-state",
  previewThemeModeChanged: "page-state",
  previewRefresh: "page-state",
  previewAnchorModeChanged: "page-state",
  previewEditModeChanged: "page-state",
  previewEditOpen: "page-state",
  previewEditSave: "page-state",
  previewEditCancel: "page-state",
  previewFrontmatterSave: "page-state",
  previewCheckboxToggle: "page-state",
  previewCopyText: "document",
  previewHistoryGo: "render",
  previewViewPreferenceChanged: "render",
  previewPaletteModeChanged: "render",
  previewLabelRename: "render",
  previewThreadReply: "render",
  previewThreadDelete: "render",
  previewFindReplace: "render",
  previewBlockMove: "render",
  previewBlocksCopy: "render",
  previewBlocksCut: "render",
  previewBlocksPaste: "render",
  previewListTargets: "render",
  previewListCitations: "render",
  previewPickDocument: "render",
  previewPickImage: "render",
  previewPasteImage: "render",
  previewPasteHtml: "render",
  previewCommentCreate: "comment",
  previewCommentReply: "comment",
  previewCommentResolve: "comment",
  previewCommentDelete: "comment",
  previewPlantUmlInclude: "document",
  previewShowProblems: "document",
  previewWarningBannerClosed: "document",
  previewEditClosed: "own-id",
  previewEditFlushed: "own-id",
};

/** The edit requests of the page-state family: they need a writable preview. */
export const EDIT_REQUEST_TYPES: ReadonlySet<PageToHostType> = new Set([
  "previewEditOpen", "previewEditSave", "previewEditCancel", "previewFrontmatterSave", "previewCheckboxToggle",
]);

/** Matches each page message to its preview by its gate, then runs the registered handler. */
export class PageMessageDispatcher {
  public constructor(
    private readonly manager: PreviewManager,
    private readonly router: PageMessageRouter,
  ) {}

  // @implements_req SwRS-MDOKFSTUDIO-TRUST-065
  /**
   * Handles a message of a preview page. The result is the work the handler started (a save, a
   * navigation), or undefined when the message was dropped.
   */
  public handle(preview: PreviewSession, value: unknown): PromiseLike<void> | undefined {
    if (!isPageToHostMessage(value)) {
      this.answerMalformedToggle(preview, value);
      return undefined;
    }
    const { manager } = this;
    switch (PAGE_MESSAGE_GATES[value.type]) {
      case "own-id":
        return preview.disposed ? undefined : this.route(preview, value);
      case "document":
        return preview.disposed || value.documentId !== preview.documentUri
          ? undefined
          : this.route(preview, value);
      case "comment": {
        const candidate = preview.stage ? { ...value, revision: revisionOfStage(preview.stage) } : value;
        return manager.matchesCurrent(preview, candidate) ? this.route(preview, value) : undefined;
      }
      case "render":
        if (manager.matchesCurrent(preview, value)) return this.route(preview, value);
        this.refuseStaleRequest(preview, value);
        return undefined;
      case "page-state":
        return isPageStateMessage(value) ? this.handlePageState(preview, value) : undefined;
    }
  }

  // @implements_req SwRS-MDOKFSTUDIO-GFM-027
  /**
   * A checkbox toggle the validator rejected is still answered (when it names its box and render),
   * so the box on the page never stays busy.
   */
  private answerMalformedToggle(preview: PreviewSession, value: unknown): void {
    if (typeof value !== "object" || value === null || preview.disposed || !this.manager.has(preview)) return;
    const { type, documentId, revision, requestId, editId } = value as Record<string, unknown>;
    if (
      type !== "previewCheckboxToggle"
      || documentId !== preview.documentUri
      || typeof revision !== "number" || typeof requestId !== "number"
      || typeof editId !== "string" || editId === "" || editId.length > 100
    ) return;
    this.manager.sourceEdits.postCheckboxResult(
      preview,
      { type, documentId, revision, requestId, editId } as PageMessageOf<"previewCheckboxToggle">,
      { error: MALFORMED_TOGGLE },
    );
  }

  // @implements_req SwRS-MDOKFSTUDIO-MYST-038
  // @implements_req SwRS-MDOKFSTUDIO-TRUST-065
  /**
   * A request of the render gate sent from an older render is answered with the out-of-date reason
   * instead of being dropped, so the page clears what it holds pending and shows the reason. The
   * messages that are no request (history, view preference, palette mode) have no answer type.
   */
  private refuseStaleRequest(preview: PreviewSession, value: PageToHostMessage): void {
    if (preview.disposed || !this.manager.has(preview) || value.documentId !== preview.documentUri) return;
    const identity = { documentId: value.documentId, revision: value.revision, requestId: value.requestId };
    switch (value.type) {
      case "previewLabelRename":
        fireAndForget(this.manager.host.logger, preview.postToPage({ ...identity, type: "previewLabelRenameResult", editId: value.editId, ok: false, reason: LABEL_GONE }), "postToPage");
        return;
      case "previewBlockMove":
        fireAndForget(this.manager.host.logger, preview.postToPage({ ...identity, type: "previewBlockMoveResult", ok: false, reason: STALE_REQUEST }), "postToPage");
        return;
      case "previewBlocksCopy":
      case "previewBlocksCut":
      case "previewBlocksPaste":
        fireAndForget(this.manager.host.logger, preview.postToPage({
          ...identity,
          type: "previewBlocksResult",
          op: value.type === "previewBlocksCopy" ? "copy" : value.type === "previewBlocksCut" ? "cut" : "paste",
          ok: false,
          reason: STALE_REQUEST,
        }), "postToPage");
        return;
      case "previewThreadReply":
      case "previewThreadDelete":
      case "previewFindReplace":
      case "previewListTargets":
      case "previewListCitations":
      case "previewPickDocument":
      case "previewPickImage":
      case "previewPasteImage":
      case "previewPasteHtml":
        fireAndForget(this.manager.host.logger, preview.postToPage({ ...identity, type: `${value.type}Result`, editId: value.editId, ok: false, reason: STALE_REQUEST }), "postToPage");
        return;
      default:
        return;
    }
  }

  /** Runs the handler of a message that passed its gate; the caller may wait for what it started. */
  private route(preview: PreviewSession, message: PageToHostMessage): PromiseLike<void> | undefined {
    const outcome = this.router.dispatch(message, preview);
    return outcome.handled ? Promise.resolve(outcome.result) : undefined;
  }

  /**
   * An open, a save or a cancel of an editor opened on an older page than the one the host holds is refused
   * with an explicit error the editor shows, instead of being dropped: the reader keeps the text and
   * knows it was not saved (STAB-06).
   */
  private reportStaleEdit(preview: PreviewSession, value: PageStateMessageUnion): void {
    const { manager } = this;
    if (preview.disposed || preview.readOnly || !manager.has(preview) || value.documentId !== preview.documentUri) {
      return;
    }
    if (value.type === "previewEditSave" || value.type === "previewEditCancel") {
      manager.edits.postEditSourceError(
        preview,
        value,
        "The preview changed while this block was being edited. Copy your text, then reopen the block.",
      );
    } else if (value.type === "previewEditOpen") {
      manager.edits.postEditSourceError(preview, value, STALE_REQUEST);
    } else if (value.type === "previewCheckboxToggle") {
      manager.sourceEdits.postCheckboxResult(preview, value, { error: STALE_REQUEST });
    } else if (value.type === "previewFrontmatterSave") {
      manager.frontmatter.postEditError(preview, value, "The preview changed while this field was being edited. Reopen the field.");
    }
  }

  // @implements_req SwRS-MDOKFSTUDIO-TRUST-005
  // @implements_req SwRS-MDOKFSTUDIO-TRUST-006
  /**
   * The gate of the page-state family. Before the render check, a ready report can show that the
   * webview reloaded an older document, or that it works through a chain of content patches. A stale
   * edit is answered with an error. A message that passes reports the page's anchor, and an edit
   * request of a read-only preview is refused with an error the page shows. Unlike the other gates,
   * the result is the handler's own (undefined when it started nothing).
   */
  private handlePageState(preview: PreviewSession, value: PageStateMessageUnion): PromiseLike<void> | undefined {
    const { manager } = this;
    const { rendering } = manager;
    // @implements_req SwRS-MDOKFSTUDIO-LIFE-071
    if (value.type === "previewReady" && !preview.disposed && reportsReloadedDocument(value, {
      documentId: preview.stage?.activeDocumentIdentity,
      stageRequestId: preview.stage?.requestId,
      assignedRequestId: preview.page.assignedRequestId,
      reportedReady: preview.page.readyRequestId !== undefined,
    })) {
      // The webview was created again and loaded the html of the last assignment, which predates the
      // content patches it received before: load the current document.
      rendering.freshNonceRecord(preview);
      rendering.assignWebviewHtml(preview, preview.webview.html);
      return undefined;
    }
    if (
      value.type === "previewReady"
      && preview.page.contentPatchTimer !== undefined
      && preview.stage !== undefined
      && value.documentId === preview.stage.activeDocumentIdentity
      && value.requestId < preview.stage.requestId
    ) {
      // The page handled an earlier patch of a chain: it is alive and works through the rest. Wait
      // again for the newest stage instead of loading the document while the page is catching up.
      rendering.armContentPatchFallback(preview, preview.stage);
      return undefined;
    }
    if (!manager.matchesCurrent(preview, value)) {
      this.reportStaleEdit(preview, value);
      return undefined;
    }
    if (value.type !== "previewLinkDiscover" && value.anchorLine !== undefined && value.documentId === preview.documentUri) {
      // The preview reports its anchor with every scroll, refresh and inline edit save.
      preview.scroll.anchor = { line: value.anchorLine, owner: "preview", documentId: value.documentId };
    }
    if (preview.readOnly && EDIT_REQUEST_TYPES.has(value.type)) {
      if (value.type === "previewFrontmatterSave") {
        manager.frontmatter.postEditError(preview, value, previewReadOnlyReason(preview));
      } else if (value.type === "previewCheckboxToggle") {
        manager.sourceEdits.postCheckboxResult(preview, value, {
          error: previewReadOnlyReason(preview),
        });
      } else if (value.type === "previewEditOpen" || value.type === "previewEditSave" || value.type === "previewEditCancel") {
        manager.edits.postEditSourceError(preview, value, previewReadOnlyReason(preview));
      }
      return undefined;
    }
    const outcome = this.router.dispatch(value, preview);
    return outcome.handled && outcome.result ? outcome.result : undefined;
  }
}
