/**
 * The detached edit of the host: a final save whose editor the writer cancelled while it was in
 * flight (CR 475). The save outlives the editor, so every end of it gets an answer the page can act
 * on, and a failure gives the writer's text back instead of dropping it.
 */

import type { PageMessageOf } from "../../core/protocol/pageToHost";
import { fireAndForget } from "../../host-api/logger";
import type { PreviewManager } from "../previewManager";
import type { PreviewSession } from "../previewSession";
import type { BlockEditController } from "./blockEdits";

/** The text of a final save the host did not write, kept until the page says whether it shows it again. */
// @implements_req SwRS-MDOKFSTUDIO-BLOCK-191
// @implements_req SwRS-MDOKFSTUDIO-BLOCK-216
// @implements_req SwRS-MDOKFSTUDIO-BLOCK-270
export interface UnsavedText {
  editId: string;
  text: string;
  error: string;
}

/** The label of the warning action that puts the writer's unsaved text on the clipboard. */
const COPY_TEXT_ACTION = "Copy text";

const BUSY_MESSAGE = "Another Markdown block is already being edited.";

export class DetachedEdits {
  public constructor(private readonly manager: PreviewManager, private readonly controller: BlockEditController) {}

  /**
   * Keeps the final text of an error answer, keyed by its edit, and records the edit as the page's
   * open editor again: a detached edit's close was already processed, and the renders wait for the
   * reopened editor (STAB-03).
   */
  public keepUnsaved(preview: PreviewSession, editId: string, text: string, error: string): void {
    preview.edits.unsaved = { editId, text, error };
    if (!preview.edits.lock.pageEditorOpen && editId !== "") preview.edits.lock.openPageEditor(editId);
    this.refuseHeldOpen(preview);
  }

  /**
   * The page closed the editor `editId`. Returns true when the host handled it as a detach: the save
   * it waits for outlives the editor.
   */
  public onClosed(preview: PreviewSession, message: PageMessageOf<"previewEditClosed">): boolean {
    const { edits } = preview;
    const edit = edits.active;
    const own = edit?.editId === message.editId ? edit : undefined;
    const answered = edits.unsaved?.editId === message.editId;
    if (message.detached !== true || (!answered && (!own || own.cancelRequested))) {
      if (answered) edits.unsaved = undefined;
      return false;
    }
    // The host already answered this save with an error: the page reopens the editor, and the host waits for it.
    if (answered) {
      if (own) own.detached = true;
      return true;
    }
    const detachedEdit = own!;
    detachedEdit.detached = true;
    this.controller.closePageEditor(preview, detachedEdit.editId);
    if (!detachedEdit.applying && detachedEdit.pendingText === undefined) this.controller.completeActiveBlockEdit(preview, detachedEdit);
    return true;
  }

  /** The page's answer to an error that gave back the writer's text. */
  public onReopen(preview: PreviewSession, message: PageMessageOf<"previewEditReopen">): void {
    const { edits } = preview;
    const kept = edits.unsaved;
    if (kept?.editId !== message.editId) return;
    edits.unsaved = undefined;
    const edit = edits.active?.editId === kept.editId ? edits.active : undefined;
    if (message.reopened) {
      if (edit) edit.detached = false;
      if (edits.lock.pageEditor === kept.editId) edits.watchedPageEditorId = kept.editId;
      return;
    }
    if (edit) this.controller.releaseActiveBlockEdit(preview, true);
    this.controller.closePageEditor(preview, kept.editId);
    if (preview.document && !preview.disposed) {
      fireAndForget(this.manager.host.logger,
        this.manager.rendering.refreshPreviewDocument(preview, preview.document, { immediate: true }), "refreshPreviewDocument");
    }
    const file = preview.documentUri.split(/[\/]/u).pop() ?? preview.documentUri;
    const warning = `Your Markdown edit to ${file} could not be saved, and the preview could not show it again: ${kept.error}`;
    fireAndForget(this.manager.host.logger, Promise.resolve(this.manager.host.ui.showWarning(warning, COPY_TEXT_ACTION)).then((chosen) => {
      if (chosen === COPY_TEXT_ACTION) return this.manager.host.ui.writeClipboard(kept.text);
      return undefined;
    }), "showWarning");
  }

  /** An open that arrived during a detached edit: held, at most one; a later one replaces it. */
  public holdOpen(preview: PreviewSession, message: PageMessageOf<"previewEditOpen">): void {
    const previous = preview.edits.heldOpen;
    // A save that already failed leaves nothing to wait for: the failed editor reopens.
    preview.edits.heldOpen = preview.edits.unsaved ? undefined : message;
    if (previous || preview.edits.unsaved) this.controller.postEditSourceError(preview, previous ?? message, BUSY_MESSAGE);
    if (previous && preview.edits.unsaved) this.controller.postEditSourceError(preview, message, BUSY_MESSAGE);
  }

  /** The held open is refused: the failed editor reopens. */
  public refuseHeldOpen(preview: PreviewSession): void {
    const held = preview.edits.heldOpen;
    preview.edits.heldOpen = undefined;
    if (held) this.controller.postEditSourceError(preview, held, BUSY_MESSAGE);
  }

  /** The detached edit ended: the held open goes on with its usual checks. */
  public resumeHeldOpen(preview: PreviewSession): void {
    const held = preview.edits.heldOpen;
    preview.edits.heldOpen = undefined;
    if (held && !preview.disposed) this.controller.handleEditOpen(preview, held);
  }
}
