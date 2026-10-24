/**
 * The block edit controller: the inline block editor of the page (open, autosave, final save,
 * cancel), the edit lock that keeps page updates from destroying an open editor (STAB-02, STAB-03,
 * STAB-06), and the flush of the page's open editors before the host switches document (CR 025).
 */

import { planBlockTextEdit } from "../../core/edits/sourceEdits";
import type { HostDocument } from "../../host-api/documentStore";
import { sourceRangeForLines } from "../../core/mapping/sourceMapping";
import { insertionText, planInsertion, type InsertionPlan } from "../../core/mapping/insertion";
import { FLUSH_WAIT_MS, flushRefusalMessage, waitForAnswer, waitForSettled } from "../../core/preview/flushWait";
import type { BlockEditMessage, PageMessageOf } from "../../core/protocol/pageToHost";
import type { Revision } from "../../core/protocol/revision";
import { rebaseBlockRange, type BlockRangeChange } from "../../core/state/blockRange";
import { EditLock } from "../../core/state/editLock";
import type { PageMessageRouter } from "../pageMessages";
import type { PreviewManager } from "../previewManager";
import type { PreviewSession } from "../previewSession";
import { currentPreviewDocument, isDocumentEligible, revisionOfStage } from "../sessionDocuments";

/** The block edit the host holds for the page's open inline editor. */
export interface ActiveBlockEdit {
  editId: string;
  documentId: string;
  revision: Revision;
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
  lastMessage: BlockEditMessage;
}

/** The edits of one page (owned by the block edit controller). */
export interface EditState {
  /** Release and deferral decisions of the inline block-edit lock (STAB-02, STAB-03). */
  lock: EditLock;
  /** The block edit the host holds, until its final save completed. */
  active?: ActiveBlockEdit;
  /** Frontmatter and checkbox saves whose edit is still being applied (CR 025). */
  pendingSaves: Set<Promise<unknown>>;
  /** Flush requests posted to the page and not answered yet, by flush id (CR 025). */
  flushWaiters: Map<string, () => void>;
  flushSequence: number;
  /** The page editor the page was asked to report the close of (`previewEditorWatch`, STAB-03). */
  watchedPageEditorId?: string;
  /** An explicit refresh asked for the next render: it reaches the page even over an open editor. */
  forceNextResult?: boolean;
}

/** A fresh {@link EditState}. */
export function createEditState(): EditState {
  return { lock: new EditLock(), pendingSaves: new Set(), flushWaiters: new Map(), flushSequence: 0 };
}

/** The source text a block edit replaces: the document and the offsets of the block. */
interface BlockSource {
  document: HostDocument;
  start: number;
  end: number;
}

/** The inline block edits of the page and the lock around them. */
export class BlockEditController {
  public constructor(private readonly manager: PreviewManager) {}

  /** Registers the handlers of the block editor's messages. */
  public register(router: PageMessageRouter): void {
    // The page saved its open editors and says so (CR 025); the waiting flush goes on. No document edit.
    router.on("previewEditFlushed", (message, preview) => {
      preview.edits.flushWaiters.get(message.flushId)?.();
    });
    // The page closed an inline editor the host was waiting for (STAB-03). It edits nothing.
    router.on("previewEditClosed", (message, preview) => {
      this.closePageEditor(preview, message.editId);
    });
    router.on("previewEditOpen", (message, preview) => this.handleEditOpen(preview, message));
    router.on("previewEditSave", (message, preview) => this.handleEditSave(preview, message));
    router.on("previewEditCancel", (message, preview) => this.handleEditCancel(preview, message));
  }

  /** Answers a block edit message with an error the page's editor shows. */
  public postEditSourceError(
    preview: PreviewSession,
    message: BlockEditMessage,
    error: string,
  ): void {
    if (message.flush === true) {
      const where = message.line !== undefined && message.endLine !== undefined
        ? `the block at lines ${message.line}-${message.endLine}`
        : "a block";
      void this.manager.host.ui.showWarning(flushRefusalMessage(where, error));
    }
    void preview.postToPage({
      type: "previewEditSource",
      documentId: message.documentId,
      revision: message.revision,
      requestId: message.requestId,
      editId: message.editId,
      error,
    });
  }

  private currentSourceEdit(
    preview: PreviewSession,
    message: BlockEditMessage,
  ): BlockSource | undefined {
    const document = currentPreviewDocument(preview, message);
    if (!document || message.line === undefined || message.endLine === undefined) {
      return undefined;
    }
    const offsets = sourceRangeForLines(document.getText(), message.line, message.endLine);
    return offsets ? { document, start: offsets.start, end: offsets.end } : undefined;
  }

  private handleEditOpen(preview: PreviewSession, message: PageMessageOf<"previewEditOpen">): void {
    if (preview.edits.active) {
      this.postEditSourceError(preview, message, "Another Markdown block is already being edited.");
      return;
    }
    if (message.insertAfterLine !== undefined) {
      const document = currentPreviewDocument(preview, message);
      if (!document
        || message.line === undefined
        || message.endLine === undefined
        || !planInsertion(document.getText(), message.insertAfterLine)) {
        this.postEditSourceError(preview, message, "The preview is stale. Refresh it before editing this block.");
        return;
      }
      this.openPageEditor(preview, message);
      void preview.postToPage({
        type: "previewEditSource",
        documentId: message.documentId,
        revision: message.revision,
        requestId: message.requestId,
        editId: message.editId,
        line: message.line,
        endLine: message.endLine,
        originalText: "",
        insertAfterLine: message.insertAfterLine,
      });
      return;
    }
    const source = this.currentSourceEdit(preview, message);
    if (!source || message.line === undefined || message.endLine === undefined) {
      this.postEditSourceError(preview, message, "The preview is stale. Refresh it before editing this block.");
      return;
    }
    const originalText = source.document.getText().slice(source.start, source.end);
    this.openPageEditor(preview, message);
    void preview.postToPage({
      type: "previewEditSource",
      documentId: message.documentId,
      revision: message.revision,
      requestId: message.requestId,
      editId: message.editId,
      line: message.line,
      endLine: message.endLine,
      originalText,
    });
  }

  /** The page shows an inline editor from now on: page updates wait for it to close (STAB-03). */
  private openPageEditor(preview: PreviewSession, message: BlockEditMessage): void {
    if (typeof message.editId === "string" && message.editId !== "") {
      preview.edits.lock.openPageEditor(message.editId);
    }
  }

  /** The page closed its inline editor `editId`: the page updates that waited for it run now. */
  public closePageEditor(preview: PreviewSession, editId?: string): void {
    const queued = preview.edits.lock.closePageEditor(editId);
    if (!preview.edits.lock.pageEditorOpen) {
      preview.edits.watchedPageEditorId = undefined;
    }
    if (!preview.disposed) {
      queued.forEach((work) => work());
    }
  }

  private activeBlockEditSource(
    preview: PreviewSession,
    edit: ActiveBlockEdit,
  ): BlockSource | undefined {
    const document = preview.document;
    const endOffset = edit.sourceStartOffset + edit.lastSavedText.length;
    if (!document
      || document.id !== preview.documentUri
      || endOffset > document.getText().length
      || !isDocumentEligible(document)) {
      return undefined;
    }
    return { document, start: edit.sourceStartOffset, end: endOffset };
  }

  private beginActiveBlockEdit(preview: PreviewSession, edit: ActiveBlockEdit): void {
    preview.edits.active = edit;
    preview.edits.lock.acquire(edit.requestId);
    if (!preview.edits.lock.pageEditorOpen) {
      preview.edits.lock.openPageEditor(edit.editId);
    }
  }

  /**
   * Ends the lock and runs the PlantUML, link-enrichment and render work that waited for it.
   * `renderFollows`: the caller refreshes the document itself, so a queued render is dropped.
   */
  public releaseActiveBlockEdit(
    preview: PreviewSession,
    renderFollows = false,
    alreadyReleased?: Array<() => void>,
  ): void {
    preview.edits.active = undefined;
    if (renderFollows) {
      preview.edits.lock.drop("render");
      preview.edits.lock.drop("render-result");
    }
    const queued = alreadyReleased ?? preview.edits.lock.release();
    preview.edits.watchedPageEditorId = undefined;
    if (!preview.disposed) {
      queued.forEach((work) => work());
    }
  }

  /**
   * The host's edit ended on an error the page shows in its still open editor: the lock is free for
   * a new edit, but page updates keep waiting for the editor to close (STAB-03).
   */
  private releaseHostEditKeepingEditor(preview: PreviewSession): void {
    preview.edits.active = undefined;
    const queued = preview.edits.lock.releaseHostEdit();
    if (!preview.disposed) {
      queued.forEach((work) => work());
    }
  }

  private completeActiveBlockEdit(preview: PreviewSession, edit: ActiveBlockEdit): void {
    if (preview.edits.active !== edit) {
      return;
    }
    const refreshes = edit.hasAppliedEdit
      && preview.document !== undefined
      && this.manager.sourceAvailable(preview)
      && preview.document.revision !== preview.stage?.activeDocumentRevision;
    const pin = preview.scroll.pendingPin;
    if (pin && preview.document) {
      // Every apply of this edit has resolved: only a render of this version or later shows it.
      pin.minVersion = Math.max(pin.minVersion, preview.document.revision);
    }
    this.releaseActiveBlockEdit(preview, refreshes);
    if (refreshes && preview.document) {
      void this.manager.rendering.refreshPreviewDocument(preview, preview.document);
    }
  }

  private drainActiveBlockEdit(preview: PreviewSession, edit: ActiveBlockEdit): void {
    if (preview.edits.active !== edit || edit.applying) {
      return;
    }
    const editedText = edit.pendingText;
    if (editedText === undefined || editedText === edit.lastSavedText) {
      edit.pendingText = undefined;
      if (edit.finalRequested) {
        this.completeActiveBlockEdit(preview, edit);
      }
      return;
    }
    edit.pendingText = undefined;
    const source = this.activeBlockEditSource(preview, edit);
    if (!source || source.document.getText().slice(source.start, source.end) !== edit.lastSavedText) {
      this.postEditSourceError(preview, edit.lastMessage, "The source block changed while it was being edited.");
      this.releaseHostEditKeepingEditor(preview);
      return;
    }
    const textEdit = planBlockTextEdit(edit.sourceStartOffset, edit.lastSavedText, editedText);
    if (!textEdit) {
      this.drainActiveBlockEdit(preview, edit);
      return;
    }
    edit.applying = true;
    void this.manager.host.documents.applyEdits(source.document, [textEdit]).then((applied) => {
      if (preview.edits.active !== edit) {
        return;
      }
      edit.applying = false;
      if (!applied) {
        this.postEditSourceError(preview, edit.lastMessage, "VS Code could not apply the Markdown edit.");
        edit.finalRequested = false;
        return;
      }
      edit.lastSavedText = editedText;
      edit.hasAppliedEdit = true;
      this.drainActiveBlockEdit(preview, edit);
    }, (error: unknown) => {
      if (preview.edits.active !== edit) {
        return;
      }
      edit.applying = false;
      edit.finalRequested = false;
      this.postEditSourceError(
        preview,
        edit.lastMessage,
        error instanceof Error ? error.message : String(error),
      );
    });
  }

  private handleEditSave(preview: PreviewSession, message: PageMessageOf<"previewEditSave">): void {
    let edit = preview.edits.active;
    if (!edit && message.insertAfterLine !== undefined) {
      const document = currentPreviewDocument(preview, message);
      const plan = document ? planInsertion(document.getText(), message.insertAfterLine) : undefined;
      if (!document || !plan || message.originalText === undefined || message.editedText === undefined) {
        this.postEditSourceError(preview, message, "The preview is stale. Reopen the block before saving.");
        return;
      }
      if (message.originalText !== "") {
        this.postEditSourceError(preview, message, "The source block changed while it was being edited.");
        return;
      }
      edit = {
        editId: message.editId,
        documentId: message.documentId,
        revision: message.revision,
        requestId: message.requestId,
        line: message.line,
        endLine: message.endLine,
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
      this.beginActiveBlockEdit(preview, edit);
    } else if (!edit) {
      const source = this.currentSourceEdit(preview, message);
      if (!source || message.originalText === undefined || message.editedText === undefined) {
        this.postEditSourceError(preview, message, "The preview is stale. Reopen the block before saving.");
        return;
      }
      const originalText = source.document.getText().slice(source.start, source.end);
      if (originalText !== message.originalText) {
        this.postEditSourceError(preview, message, "The source block changed while it was being edited.");
        return;
      }
      edit = {
        editId: message.editId,
        documentId: message.documentId,
        revision: message.revision,
        requestId: message.requestId,
        line: message.line,
        endLine: message.endLine,
        sourceStartOffset: source.start,
        originalText,
        lastSavedText: originalText,
        finalRequested: false,
        cancelRequested: false,
        applying: false,
        hasAppliedEdit: false,
        lastMessage: message,
      };
      this.beginActiveBlockEdit(preview, edit);
    }
    if (edit.cancelRequested
      || message.editId !== edit.editId
      || message.documentId !== edit.documentId
      || message.revision !== edit.revision
      || message.requestId !== edit.requestId
      || message.line !== edit.line
      || message.endLine !== edit.endLine
      || message.originalText !== edit.originalText
      || message.insertAfterLine !== edit.insertAfterLine
      || message.editedText === undefined) {
      this.postEditSourceError(preview, message, "The preview block edit is stale. Reopen the block before saving.");
      return;
    }
    edit.lastMessage = message;
    edit.pendingText = edit.insertion
      ? insertionText(edit.insertion, message.editedText)
      : message.editedText;
    edit.finalRequested = message.final !== false;
    if (message.final === true) {
      this.manager.scroll.storePendingPin(preview, message, preview.document ? preview.document.revision : 0);
    }
    this.drainActiveBlockEdit(preview, edit);
  }

  private handleEditCancel(preview: PreviewSession, message: PageMessageOf<"previewEditCancel">): void {
    const edit = preview.edits.active;
    if (!edit
      || message.editId !== edit.editId
      || message.documentId !== edit.documentId
      || message.revision !== edit.revision
      || message.requestId !== edit.requestId
      || message.line !== edit.line
      || message.endLine !== edit.endLine) {
      this.postEditSourceError(preview, message, "The preview block edit is stale. Reopen the block before cancelling.");
      return;
    }
    edit.lastMessage = message;
    edit.cancelRequested = true;
    edit.finalRequested = true;
    edit.pendingText = edit.originalText;
    this.drainActiveBlockEdit(preview, edit);
  }

  /**
   * Keeps the open block edit in step with a change made outside it (STAB-06). A change before the
   * block moves its offset; a change inside it ends the host's edit with an explicit error in the
   * editor, which stays open with the reader's text. Returns false when the edit cannot be tracked.
   */
  public trackOutsideChange(
    preview: PreviewSession,
    edit: ActiveBlockEdit,
    changes: readonly BlockRangeChange[],
  ): boolean {
    if (edit.pendingText !== undefined || edit.finalRequested) {
      return false;
    }
    const rebased = rebaseBlockRange({ start: edit.sourceStartOffset, length: edit.lastSavedText.length }, changes);
    if (rebased === "conflict") {
      this.postEditSourceError(preview, edit.lastMessage,
        "The source block changed outside the preview while it was being edited. Copy your text, then reopen the block.");
      this.releaseHostEditKeepingEditor(preview);
      return true;
    }
    edit.sourceStartOffset = rebased.start;
    return true;
  }

  /** Runs `work` now, or after the open inline block edit ends: the work would replace its page. */
  public deferWhileEditing(preview: PreviewSession, key: string, work: () => void): void {
    if (preview.edits.lock.shouldDeferReload()) {
      this.deferPageWork(preview, key, work);
      return;
    }
    work();
  }

  /**
   * Queues page work behind the open edit. When the page has an inline editor open, it is asked once
   * per editor to report the close (`previewEditorWatch`): an editor closed without a change sends
   * nothing otherwise, and the work would wait forever (STAB-03).
   */
  public deferPageWork(preview: PreviewSession, key: string, work: () => void, discard?: () => void): void {
    preview.edits.lock.defer(key, work, discard);
    this.watchPageEditor(preview);
  }

  /** Asks the page, once per editor, to report when its open inline editor closes (STAB-03). */
  public watchPageEditor(preview: PreviewSession): void {
    const editId = preview.edits.lock.pageEditor;
    if (editId === undefined || preview.edits.watchedPageEditorId === editId || preview.disposed) {
      return;
    }
    preview.edits.watchedPageEditorId = editId;
    void preview.postToPage({
      type: "previewEditorWatch",
      documentId: preview.documentUri,
      editId,
    });
  }

  /** Remembers a save until its edit is applied, so a navigation can wait for it (CR 025). */
  public trackPendingSave(preview: PreviewSession, save: PromiseLike<void> | undefined): PromiseLike<void> | undefined {
    if (!save) return save;
    const tracked = Promise.resolve(save).finally(() => preview.edits.pendingSaves.delete(tracked));
    preview.edits.pendingSaves.add(tracked);
    return tracked;
  }

  /** Waits, bounded, until the block edit and the frontmatter saves of the preview reached the document. */
  public async settleHostEdits(preview: PreviewSession): Promise<void> {
    await waitForSettled(() => preview.disposed || (!preview.edits.active && preview.edits.pendingSaves.size === 0));
  }

  /**
   * Asks the page to save and close what its open editors hold, then waits for the saves to reach the
   * document (CR 025). Used before the host switches document on its own (tab follow, Back / Next):
   * the page posts the final saves first and the answer after them, and messages arrive in order, so
   * the host knows every save when the answer comes. A dead page or a refused save ends after
   * `FLUSH_WAIT_MS`; the navigation is never blocked and nothing is flushed in a read-only preview.
   */
  public async flushPageEdits(preview: PreviewSession): Promise<void> {
    const stage = preview.stage;
    if (!preview.disposed && !preview.readOnly && stage && preview.page.readyRequestId !== undefined) {
      const flushId = `flush-${++preview.edits.flushSequence}`;
      const answered = new Promise<void>((resolve) => preview.edits.flushWaiters.set(flushId, resolve));
      const posted = await preview.postToPage({
        type: "previewFlushEdit",
        flushId,
        documentId: stage.activeDocumentIdentity,
        revision: revisionOfStage(stage),
        requestId: stage.requestId,
      }).then((ok) => ok, () => false);
      if (posted) {
        await waitForAnswer(answered, FLUSH_WAIT_MS);
      }
      preview.edits.flushWaiters.delete(flushId);
    }
    await this.settleHostEdits(preview);
  }
}
