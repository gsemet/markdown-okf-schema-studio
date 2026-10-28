/**
 * The page document of a session, the base of the rendering controller (`rendering.ts`): the only
 * place that assigns the page document, the host's record of the page (html, nonce, status,
 * resource roots), the status and pending documents, the pending overlay messages, and the content
 * patch with its full-load fallback (T34).
 */

import { reuseNonce } from "../../core/preview/contentPatch";
import { updatedRangesForPatch } from "../../core/preview/updatedRanges";
import {
  buildStatusWebviewHtml,
  PREVIEW_STATUS_LABELS,
  type PreviewStatus,
  type PreviewWebviewResult,
  setPreviewStatus,
} from "../webview";
import type { PreviewDiagnostic, RenderStage } from "../../core/render/renderPipeline";
import { createNonce } from "../../core/security/csp";
import type { PreviewManager } from "../previewManager";
import type { PreviewSession } from "../previewSession";
import { revisionOfStage } from "../sessionDocuments";
import { CONTENT_PATCH_ACK_TIMEOUT_MS } from "./pageLoadState";
import { fireAndForget } from "../../host-api/logger";

/** The page document of a session and the host's record of it. */
export class PageDocumentController {
  public constructor(protected readonly manager: PreviewManager) {}

  /** Turns scripts on and sets the folders the page may load from; remembered for the patch check. */
  public setResourceRoots(preview: PreviewSession, roots: readonly string[]): void {
    preview.page.resourceRoots = roots;
    preview.panel.setResourceRoots(roots);
  }

  public clearPendingOverlay(preview: PreviewSession): void {
    if (preview.overlay.timer !== undefined) {
      clearTimeout(preview.overlay.timer);
      preview.overlay.timer = undefined;
    }
    preview.overlay.due = false;
    preview.overlay.visible = false;
  }

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-049
  /**
   * The only place that assigns a session's page document; a new document must report ready again
   * and the overlay of the replaced document is gone with it.
   */
  public assignWebviewHtml(target: PreviewSession, html: string): void {
    // The host ignores an assignment of the identical string, so no new document is loaded and no
    // new ready report will come; only a changed string replaces the document (and is counted).
    const changed = target.panel.html !== html;
    // Work that waited for the edit runs once the page is assigned, so it sees the new document.
    let queuedAfterAssign: Array<() => void> | undefined;
    if (changed) {
      target.probe.htmlAssignments += 1;
      target.page.readyRequestId = undefined;
      target.page.assignedRequestId = target.stage?.requestId;
      target.page.recordKeepsLoadedNonce = false;
      target.page.patchedRequestId = undefined;
      // A full page replacement always destroys the inline editor, whatever the stage.
      if (target.edits.active) {
        target.edits.active = undefined;
        queuedAfterAssign = target.edits.lock.release();
      } else if (target.edits.lock.pageEditorOpen) {
        queuedAfterAssign = target.edits.lock.closePageEditor();
      }
      target.edits.watchedPageEditorId = undefined;
      // A new document supersedes a patch that was waiting for its acknowledgement.
      this.clearContentPatchTimer(target);
      target.page.propertiesTableAwaited = undefined;
      // The replaced document takes its overlay with it; the new one is not pending until told so.
      this.clearPendingOverlay(target);
    }
    target.panel.html = html;
    if (queuedAfterAssign && !target.disposed) {
      queuedAfterAssign.forEach((work) => work());
    }
  }

  protected postPendingOverlay(preview: PreviewSession, visible: boolean): void {
    const stage = preview.stage;
    if (!stage || preview.disposed) {
      return;
    }
    fireAndForget(this.manager.host.logger, preview.postToPage({
      type: "previewPendingOverlay",
      documentId: stage.activeDocumentIdentity,
      revision: revisionOfStage(stage),
      requestId: stage.requestId,
      visible,
      label: PREVIEW_STATUS_LABELS.pending,
      message: preview.overlay.message,
    }), "postToPage");
  }

  /** A render finished or failed: stop the timer and hide an overlay that stays in the loaded page. */
  protected endPendingOverlay(preview: PreviewSession): void {
    const wasVisible = preview.overlay.visible;
    this.clearPendingOverlay(preview);
    if (wasVisible) {
      this.postPendingOverlay(preview, false);
    }
  }

  /** Replaces the page document with `html` (a status or a reload of the record). */
  public setPanelHtml(
    preview: PreviewSession,
    html: string,
    diagnostics: PreviewWebviewResult["diagnostics"] = preview.webview.diagnostics,
  ): void {
    if (preview.disposed) {
      return;
    }
    // A document loaded from a record that went through a patch gets a nonce of its own.
    const previousNonce = preview.webview.nonce;
    const freshNonce = this.freshNonceRecord(preview);
    preview.webview = {
      ...preview.webview,
      html: freshNonce === undefined ? html : reuseNonce(html, previousNonce, freshNonce),
      diagnostics,
    };
    this.assignWebviewHtml(preview, preview.webview.html);
  }

  // @implements_req SwRS-MDOKFSTUDIO-TRUST-022
  /**
   * A patch keeps the nonce of the loaded document, and the record of the page carries it. A new
   * document must not reuse a nonce that an earlier document already had: before the record is loaded
   * as a new document, its nonce is replaced by a fresh one (same generator as a render). Returns the
   * fresh nonce, or undefined when the record has its own nonce already.
   */
  public freshNonceRecord(preview: PreviewSession): string | undefined {
    if (!preview.page.recordKeepsLoadedNonce || preview.webview.nonce === "") {
      return undefined;
    }
    const nonce = createNonce();
    preview.webview = {
      ...preview.webview,
      html: reuseNonce(preview.webview.html, preview.webview.nonce, nonce),
      nonce,
    };
    preview.page.recordKeepsLoadedNonce = false;
    return nonce;
  }

  /** Shows `status` (with its message and diagnostics) in the page's status area. */
  public setStatus(
    preview: PreviewSession,
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
    this.setPanelHtml(
      preview,
      setPreviewStatus(preview.webview.html, status, message, diagnostics),
      [...securityDiagnostics, ...diagnostics],
    );
  }

  // @implements_req SwRS-MDOKFSTUDIO-TRUST-007
  /** Shows the pending status; `clearContent` replaces the page with a status document. */
  public showPending(
    preview: PreviewSession,
    clearContent: boolean,
    message = "Rendering the active Markdown buffer.",
  ): void {
    if (clearContent) {
      preview.stage = undefined;
      preview.state = undefined;
      preview.webview = {
        html: buildStatusWebviewHtml("pending", preview.panel.cspSource, message),
        diagnostics: [],
        nonce: "",
      };
      this.setResourceRoots(preview, []);
      preview.shownStatus = undefined;
      this.assignWebviewHtml(preview, preview.webview.html);
      preview.status = "pending";
      return;
    }
    this.setStatus(preview, "pending", message);
  }

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-071
  /**
   * True when the loaded page shows `stage`, or will once it has handled the messages already sent
   * (a chain of content patches whose acknowledgements are still on their way).
   */
  public pageHasStage(preview: PreviewSession, stage: RenderStage): boolean {
    return preview.page.readyRequestId === stage.requestId || preview.page.patchedRequestId === stage.requestId;
  }

  public clearContentPatchTimer(preview: PreviewSession): void {
    if (preview.page.contentPatchTimer !== undefined) {
      clearTimeout(preview.page.contentPatchTimer);
      preview.page.contentPatchTimer = undefined;
    }
  }

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-094
  /**
   * Sends the new content of the page to the loaded webview (T34). The message is addressed to the
   * identifiers the page currently has; `next` carries the ones it moves to. The caller has already
   * checked that the page is ready and that its shell is unchanged, and has updated the record of the
   * page (`preview.webview`); the webview document itself is not assigned.
   */
  public postContentPatch(
    preview: PreviewSession,
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
    preview.probe.contentPatches += 1;
    // The patch carries the page's whole content, the latest properties table included.
    preview.page.propertiesTableAwaited = undefined;
    preview.page.recordKeepsLoadedNonce = true;
    preview.page.patchedRequestId = next.requestId;
    const updatedRanges = updatedRangesForPatch(
      { sourceText: previous.sourceText, version: previous.activeDocumentRevision },
      { sourceText: next.sourceText, version: next.activeDocumentRevision },
      preview.page.outsideChangeVersion,
    );
    preview.probe.updateGlowPatches = [...preview.probe.updateGlowPatches.slice(-9), {
      fromVersion: previous.activeDocumentRevision,
      toVersion: next.activeDocumentRevision,
      ranges: updatedRanges.map((range) => ({ start: range.start, end: range.end })),
    }];
    fireAndForget(this.manager.host.logger, preview.postToPage({
      type: "previewContentPatch",
      // The runtime matches this against its own document identity; the page can only be patched
      // when the previous and the next stage show the same document, so previous is also the target.
      documentId: previous.activeDocumentIdentity,
      revision: revisionOfStage(previous),
      requestId: previous.requestId,
      next: {
        revision: revisionOfStage(next),
        requestId: next.requestId,
        ...(patch.initialAnchor !== undefined ? { initialAnchor: patch.initialAnchor } : {}),
        ...(patch.initialPin ? { initialPin: patch.initialPin } : {}),
      },
      contentHtml: patch.contentHtml,
      status: patch.status,
      label: PREVIEW_STATUS_LABELS[patch.status],
      diagnostics: patch.diagnostics,
      ...(updatedRanges.length > 0 ? { updatedRanges } : {}),
    }), "postToPage");
  }

  /** Loads the full document when a patched page does not report ready for its stage in time. */
  public armContentPatchFallback(preview: PreviewSession, stage: RenderStage): void {
    this.clearContentPatchTimer(preview);
    preview.page.contentPatchTimer = setTimeout(() => {
      preview.page.contentPatchTimer = undefined;
      if (preview.disposed || preview.stage !== stage || preview.page.readyRequestId === stage.requestId) {
        return;
      }
      this.freshNonceRecord(preview);
      this.assignWebviewHtml(preview, preview.webview.html);
    }, CONTENT_PATCH_ACK_TIMEOUT_MS);
  }
}
