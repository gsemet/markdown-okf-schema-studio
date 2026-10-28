/**
 * The source edit controller: the small edits the page asks for outside the block editor. A
 * checkbox toggle or radio choice, a MyST label rename, a reply to or the removal of an inline thread, a block move
 * and the copy, cut and paste of blocks. The page only names lines; the pure planners of
 * `src/core/edits/` check them against the text and return the text edits the document store
 * applies, each as one undo step.
 */

import { resolveAuthor } from "../../core/comments/author";
import { formatThreadDate } from "../../core/comments/inlineThread";
import { COMMENTS_CONFIGURATION_SECTION, readCommentsConfiguration } from "../../core/configuration/commentsConfiguration";
import {
  checkBlocksPaste,
  planBlockMoveEdit,
  planBlocksCopyCut,
  planBlocksPaste,
  planCheckboxToggle,
  planFindReplace,
  planLabelRename,
  planRadioSelect,
  planThreadDelete,
  planThreadReply,
  readThreadLines,
  STALE_REQUEST,
} from "../../core/edits/sourceEdits";
import type { TextEdit } from "../../core/edits/textEdit";
import {
  droppedFilePath,
  droppedText,
  firstHeadingTitle,
  isMarkdownFileName,
  MAX_HEADING_SCAN_BYTES,
  type DroppedFile,
} from "../../core/mapping/dropReferences";
import type { HostDocument } from "../../host-api/documentStore";
import type { PageMessageOf } from "../../core/protocol/pageToHost";
import type { PageMessageRouter } from "../pageMessages";
import type { PreviewManager } from "../previewManager";
import type { PreviewSession } from "../previewSession";
import { currentPreviewDocument, previewReadOnlyReason } from "../sessionDocuments";
import { fireAndForget } from "../../host-api/logger";

type BlocksOp = "copy" | "cut" | "paste";

/** The edits the page asks for outside the block editor. */
export class SourceEditController {
  public constructor(private readonly manager: PreviewManager) {}

  /** Registers the handlers of the source edit requests. */
  public register(router: PageMessageRouter): void {
    const { edits } = this.manager;
    router.on("previewCheckboxToggle", (message, preview) =>
      edits.trackPendingSave(preview, this.handleCheckboxToggle(preview, message)));
    router.on("previewLabelRename", (message, preview) => this.handleLabelRename(preview, message));
    router.on("previewThreadReply", (message, preview) => this.handleThreadChange(preview, message, "reply"));
    router.on("previewThreadDelete", (message, preview) => this.handleThreadChange(preview, message, "delete"));
    router.on("previewFindReplace", (message, preview) => this.handleFindReplace(preview, message));
    router.on("previewBlockMove", (message, preview) => this.handleBlockMove(preview, message));
    router.on("previewBlocksCopy", (message, preview) => this.handleBlocksCopyCut(preview, message));
    router.on("previewBlocksCut", (message, preview) => this.handleBlocksCopyCut(preview, message));
    router.on("previewBlocksPaste", (message, preview) => this.handleBlocksPaste(preview, message));
    router.on("previewDropFiles", (message, preview) => this.handleDropFiles(preview, message));
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-058
  /** Applies edits a preview asked for, as one undo step in the editor that shows the document. */
  private apply(document: HostDocument, edits: readonly TextEdit[]): PromiseLike<boolean> {
    return this.manager.host.documents.applyEdits(document, edits, { ownUndoStep: true });
  }

  /** Answers a checkbox toggle; also the refusal of a read-only preview (see the page gates). */
  public postCheckboxResult(
    preview: PreviewSession,
    message: PageMessageOf<"previewCheckboxToggle">,
    result: { saved: true } | { error: string },
  ): void {
    fireAndForget(this.manager.host.logger, preview.postToPage({
      type: "previewCheckboxResult",
      documentId: message.documentId,
      revision: message.revision,
      requestId: message.requestId,
      editId: message.editId,
      ...result,
    }), "postToPage");
  }

  // @implements_req SwRS-MDOKFSTUDIO-GFM-021
  // @implements_req SwRS-MDOKFSTUDIO-GFM-039
  /**
   * Toggles one `[ ]`/`[x]` marker with a single-character edit, or selects a radio option with at
   * most one edit per option of its group; either way one undo step.
   */
  private handleCheckboxToggle(preview: PreviewSession, message: PageMessageOf<"previewCheckboxToggle">): PromiseLike<void> | undefined {
    const document = currentPreviewDocument(preview, message);
    if (!document || message.line === undefined || message.column === undefined || message.checked === undefined) {
      this.postCheckboxResult(preview, message, { error: STALE_REQUEST });
      return undefined;
    }
    if (preview.edits.active) {
      this.postCheckboxResult(preview, message, {
        error: `Save or cancel the open Markdown edit before ${message.radioGroup ? "choosing an option" : "toggling a checkbox"}.`,
      });
      return undefined;
    }
    // A radio option moves the `x` of its group: the same guards and answer, up to two edits.
    const toggle = message.radioGroup
      ? planRadioSelect(document.getText(), message.line, message.column, message.radioGroup)
      : planCheckboxToggle(document.getText(), message.line, message.column, message.checked);
    if ("refused" in toggle) {
      this.postCheckboxResult(preview, message, { error: toggle.refused });
      return undefined;
    }
    if ("unchanged" in toggle) {
      this.postCheckboxResult(preview, message, { saved: true });
      return undefined;
    }
    return this.apply(document, "edits" in toggle ? toggle.edits : [toggle.edit]).then((applied) => {
      this.postCheckboxResult(preview, message, applied
        ? { saved: true }
        : { error: "VS Code could not apply the checkbox edit." });
    }, (error: unknown) => {
      this.postCheckboxResult(preview, message, { error: error instanceof Error ? error.message : String(error) });
    });
  }

  // @implements_req SwRS-MDOKFSTUDIO-MYST-051
  private postLabelRenameResult(
    preview: PreviewSession,
    message: PageMessageOf<"previewLabelRename">,
    result: { ok: true; remainingRefs: number } | { ok: false; reason: string },
  ): void {
    fireAndForget(this.manager.host.logger, preview.postToPage({
      type: "previewLabelRenameResult",
      documentId: message.documentId,
      revision: message.revision,
      requestId: message.requestId,
      editId: message.editId,
      ...result,
    }), "postToPage");
  }

  // @implements_req SwRS-MDOKFSTUDIO-TRUST-005
  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-041
  // @implements_req SwRS-MDOKFSTUDIO-TRUST-065
  // @implements_req SwRS-MDOKFSTUDIO-MYST-045
  /**
   * Renames a MyST label from its anchor icon: only the `(oldName)=` line changes, in one undo step.
   * A line that is not exactly `(oldName)=` is refused, never searched for elsewhere.
   */
  private handleLabelRename(preview: PreviewSession, message: PageMessageOf<"previewLabelRename">): PromiseLike<void> | undefined {
    if (preview.readOnly) {
      this.postLabelRenameResult(preview, message, { ok: false, reason: previewReadOnlyReason(preview) });
      return undefined;
    }
    if (preview.edits.active) {
      this.postLabelRenameResult(preview, message, {
        ok: false,
        reason: "Save or cancel the open Markdown edit before renaming a label.",
      });
      return undefined;
    }
    const document = currentPreviewDocument(preview, message);
    if (!document) {
      this.postLabelRenameResult(preview, message, {
        ok: false,
        reason: STALE_REQUEST,
      });
      return undefined;
    }
    const rename = planLabelRename(document.getText(), message.line, message.oldName, message.newName);
    if ("refused" in rename) {
      this.postLabelRenameResult(preview, message, { ok: false, reason: rename.refused });
      return undefined;
    }
    const { remainingRefs } = rename;
    return this.apply(document, [rename.edit]).then((applied) => {
      this.postLabelRenameResult(preview, message, applied
        ? { ok: true, remainingRefs }
        : { ok: false, reason: "VS Code could not apply the rename." });
    }, (error: unknown) => {
      this.postLabelRenameResult(preview, message, {
        ok: false,
        reason: error instanceof Error ? error.message : String(error),
      });
    });
  }

  // @implements_req SwRS-MDOKFSTUDIO-TRUST-090
  private postThreadResult(
    preview: PreviewSession,
    type: "previewThreadReplyResult" | "previewThreadDeleteResult",
    message: PageMessageOf<"previewThreadReply" | "previewThreadDelete">,
    result: { ok: true } | { ok: false; reason: string },
  ): void {
    fireAndForget(this.manager.host.logger, preview.postToPage({
      type,
      documentId: message.documentId,
      revision: message.revision,
      requestId: message.requestId,
      editId: message.editId,
      ...result,
    }), "postToPage");
  }

  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-186
  /**
   * Reply to or delete an inline comment thread (`<!-- THREAD`). The page only names the source
   * lines: the host re-reads them, refuses anything that is not exactly one thread comment, and
   * changes those lines alone (one undo step), so the rest of the file stays as it was.
   */
  private handleThreadChange(
    preview: PreviewSession,
    message: PageMessageOf<"previewThreadReply" | "previewThreadDelete">,
    action: "reply" | "delete",
  ): PromiseLike<void> | undefined {
    const { host } = this.manager;
    const type = action === "reply" ? "previewThreadReplyResult" : "previewThreadDeleteResult";
    const fail = (reason: string): undefined => {
      this.postThreadResult(preview, type, message, { ok: false, reason });
      return undefined;
    };
    if (preview.readOnly) return fail(previewReadOnlyReason(preview));
    if (preview.edits.active) return fail("Save or cancel the open Markdown edit before changing a thread.");
    const document = currentPreviewDocument(preview, message);
    if (!document) return fail(STALE_REQUEST);
    const thread = readThreadLines(document.getText(), message.line, message.endLine);
    if ("refused" in thread) return fail(thread.refused);

    const finish = (applied: PromiseLike<boolean>): PromiseLike<void> => applied.then((done) => {
      this.postThreadResult(preview, type, message, done
        ? { ok: true }
        : { ok: false, reason: "VS Code could not apply the change." });
    }, (error: unknown) => {
      this.postThreadResult(preview, type, message, {
        ok: false,
        reason: error instanceof Error ? error.message : String(error),
      });
    });

    if (action === "delete") {
      const removal = planThreadDelete(document.getText(), message.line, message.endLine);
      if ("refused" in removal) return fail(removal.refused);
      return finish(this.apply(document, [removal.edit]));
    }

    return resolveAuthor({
      setting: readCommentsConfiguration(host.settings.section(COMMENTS_CONFIGURATION_SECTION, document.id)).authorName,
      gitName: () => host.vcs.userName(document.id),
      osUserName: () => host.paths.userName(),
    }).then((author) => {
      const current = currentPreviewDocument(preview, message);
      if (!current || current.revision !== document.revision) {
        return fail("The document changed meanwhile. Try again.");
      }
      const reply = planThreadReply(document.getText(), message.line, message.endLine, {
        author,
        date: formatThreadDate(new Date()),
        body: (message as PageMessageOf<"previewThreadReply">).text,
      }, document.eol);
      if ("refused" in reply) return fail(reply.refused);
      return finish(this.apply(document, [reply.edit]));
    });
  }

  private postFindReplaceResult(
    preview: PreviewSession,
    message: PageMessageOf<"previewFindReplace">,
    result: { ok: true; replaced: number; skipped: number } | { ok: false; reason: string },
  ): void {
    void preview.postToPage({
      type: "previewFindReplaceResult",
      documentId: message.documentId,
      revision: message.revision,
      requestId: message.requestId,
      editId: message.editId,
      ...result,
    });
  }

  // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-012
  /**
   * Replaces the matches of the find bar. The page names the source lines, the matched text and the
   * occurrence; the planner edits those spans only (all of them in one undo step) and skips what
   * does not map one-to-one to the source.
   */
  private handleFindReplace(preview: PreviewSession, message: PageMessageOf<"previewFindReplace">): PromiseLike<void> | undefined {
    const fail = (reason: string): undefined => {
      this.postFindReplaceResult(preview, message, { ok: false, reason });
      return undefined;
    };
    if (preview.readOnly) return fail(previewReadOnlyReason(preview));
    if (preview.edits.active) return fail("Save or cancel the open Markdown edit before replacing.");
    const document = currentPreviewDocument(preview, message);
    if (!document) return fail(STALE_REQUEST);
    const plan = planFindReplace(document.getText(), message.items);
    if ("refused" in plan) return fail(plan.refused);
    const { replaced, skipped } = plan;
    return this.apply(document, plan.edits).then((applied) => {
      this.postFindReplaceResult(preview, message, applied
        ? { ok: true, replaced, skipped }
        : { ok: false, reason: "VS Code could not apply the replacement." });
    }, (error: unknown) => {
      this.postFindReplaceResult(preview, message, { ok: false, reason: error instanceof Error ? error.message : String(error) });
    });
  }

  private postBlockMoveResult(
    preview: PreviewSession,
    message: PageMessageOf<"previewBlockMove">,
    result: { ok: true; line: number } | { ok: false; reason: string },
  ): void {
    fireAndForget(this.manager.host.logger, preview.postToPage({
      type: "previewBlockMoveResult",
      documentId: message.documentId,
      revision: message.revision,
      requestId: message.requestId,
      ...result,
    }), "postToPage");
  }

  /**
   * Moves a body block past its neighbour from the "+" bar: the two blocks swap in one edit (one undo
   * step). The page ranges are not trusted: the planner checks order, bounds, the frontmatter and the
   * text between the blocks, and a block that opens an `{include}` directive is never moved.
   * The moving range may span several selected blocks (their inner separators travel with it).
   */
  private handleBlockMove(preview: PreviewSession, message: PageMessageOf<"previewBlockMove">): PromiseLike<void> | undefined {
    if (preview.readOnly) {
      this.postBlockMoveResult(preview, message, { ok: false, reason: previewReadOnlyReason(preview) });
      return undefined;
    }
    if (preview.edits.active) {
      this.postBlockMoveResult(preview, message, {
        ok: false,
        reason: "Save or cancel the open Markdown edit before moving a block.",
      });
      return undefined;
    }
    const document = currentPreviewDocument(preview, message);
    if (!document) {
      this.postBlockMoveResult(preview, message, {
        ok: false,
        reason: STALE_REQUEST,
      });
      return undefined;
    }
    const plan = planBlockMoveEdit(document.getText(), message);
    if ("refused" in plan) {
      this.postBlockMoveResult(preview, message, { ok: false, reason: plan.refused });
      return undefined;
    }
    return this.apply(document, [plan.edit]).then((applied) => {
      if (!applied) {
        this.postBlockMoveResult(preview, message, { ok: false, reason: "VS Code could not apply the move." });
        return;
      }
      // The moved block keeps its screen position: pin its new first line at the viewport top it had.
      const newLine = plan.line;
      this.manager.scroll.storePendingPin(preview, {
        documentId: message.documentId,
        pinLine: newLine,
        pinViewportTop: message.pinViewportTop,
      }, document.revision);
      this.postBlockMoveResult(preview, message, { ok: true, line: newLine });
    }, (error: unknown) => {
      this.postBlockMoveResult(preview, message, {
        ok: false,
        reason: error instanceof Error ? error.message : String(error),
      });
    });
  }

  private postBlocksResult(
    preview: PreviewSession,
    message: PageMessageOf<"previewBlocksCopy" | "previewBlocksCut" | "previewBlocksPaste" | "previewDropFiles">,
    op: BlocksOp,
    result: { ok: true } | { ok: false; reason: string },
  ): void {
    fireAndForget(this.manager.host.logger, preview.postToPage({
      type: "previewBlocksResult",
      documentId: message.documentId,
      revision: message.revision,
      requestId: message.requestId,
      op,
      ...result,
    }), "postToPage");
  }

  /** Read-only, open-editor and stale-version refusals shared by copy, cut and paste of blocks. */
  private blocksDocument(
    preview: PreviewSession,
    message: PageMessageOf<"previewBlocksCopy" | "previewBlocksCut" | "previewBlocksPaste" | "previewDropFiles">,
    op: BlocksOp,
  ): HostDocument | undefined {
    const refuse = (reason: string): undefined => {
      this.postBlocksResult(preview, message, op, { ok: false, reason });
      return undefined;
    };
    if (preview.readOnly) {
      return refuse(previewReadOnlyReason(preview));
    }
    if (preview.edits.active) {
      return refuse("Save or cancel the open Markdown edit first.");
    }
    return currentPreviewDocument(preview, message)
      ?? refuse(STALE_REQUEST);
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-166
  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-169
  /**
   * Copy and cut of selected blocks (T40): the exact Markdown of the lines goes to the clipboard; cut
   * then deletes them (with one blank separator) in one edit. The page ranges are not trusted.
   */
  private handleBlocksCopyCut(
    preview: PreviewSession,
    message: PageMessageOf<"previewBlocksCopy" | "previewBlocksCut">,
  ): PromiseLike<void> | undefined {
    const op: BlocksOp = message.type === "previewBlocksCut" ? "cut" : "copy";
    const document = this.blocksDocument(preview, message, op);
    if (!document) {
      return undefined;
    }
    const line = message.line;
    const plan = planBlocksCopyCut(document.getText(), line, message.endLine, op === "cut" ? "cut" : "copy");
    if ("refused" in plan) {
      this.postBlocksResult(preview, message, op, { ok: false, reason: plan.refused });
      return undefined;
    }
    const fail = (error: unknown): void => this.postBlocksResult(preview, message, op, {
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
    });
    const cut = plan.cut;
    return this.manager.host.ui.writeClipboard(plan.copied).then(() => {
      if (!cut) {
        this.postBlocksResult(preview, message, op, { ok: true });
        return undefined;
      }
      // The clipboard write is asynchronous: the edit only goes in if the text did not change.
      if (preview.document !== document || document.revision !== message.revision) {
        this.postBlocksResult(preview, message, op, {
          ok: false,
          reason: "The document changed while cutting. The blocks are on the clipboard, nothing was removed.",
        });
        return undefined;
      }
      return this.apply(document, [cut.edit]).then((applied) => {
        if (!applied) {
          this.postBlocksResult(preview, message, op, { ok: false, reason: "VS Code could not apply the cut." });
          return;
        }
        if (cut.followingLine !== undefined) {
          // The block after the cut moves up into its place: hold it at the cut blocks' screen position.
          this.manager.scroll.storePendingPin(preview, {
            documentId: message.documentId,
            pinLine: line,
            // Only a cut moves blocks; a copy carries no pin.
            pinViewportTop: (message as { pinViewportTop?: number }).pinViewportTop,
          }, document.revision);
        }
        this.postBlocksResult(preview, message, op, { ok: true });
      });
    }).then(undefined, fail);
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-174
  /** Paste of clipboard text as new blocks after a block or at the start of the body (T40). */
  private handleBlocksPaste(
    preview: PreviewSession,
    message: PageMessageOf<"previewBlocksPaste">,
  ): PromiseLike<void> | undefined {
    const document = this.blocksDocument(preview, message, "paste");
    if (!document) {
      return undefined;
    }
    const afterLine = message.insertAfterLine;
    const refuse = (reason: string): void => this.postBlocksResult(preview, message, "paste", { ok: false, reason });
    const nextToInclude = checkBlocksPaste(document.getText(), afterLine);
    if (nextToInclude) {
      refuse(nextToInclude.refused);
      return undefined;
    }
    return this.manager.host.ui.readClipboard().then((clipboard) => {
      if (preview.document !== document || document.revision !== message.revision) {
        refuse("The document changed while pasting. Try again.");
        return undefined;
      }
      const plan = planBlocksPaste(document.getText(), afterLine, clipboard);
      if ("refused" in plan) {
        refuse(plan.refused);
        return undefined;
      }
      return this.apply(document, [plan.edit]).then((applied) => {
        if (!applied) {
          refuse("VS Code could not apply the paste.");
          return;
        }
        this.manager.scroll.storePendingPin(preview, {
          documentId: message.documentId,
          pinLine: message.pinLine,
          pinViewportTop: message.pinViewportTop,
        }, document.revision);
        this.postBlocksResult(preview, message, "paste", { ok: true });
      });
    }).then(undefined, (error: unknown) => refuse(error instanceof Error ? error.message : String(error)));
  }

  // @implements_req SwRS-MDOKFSTUDIO-PALETTE-004
  /**
   * Files dropped from the Explorer: one relative Markdown reference per file, written as a new
   * block after the line of the drop. Only `file:` addresses inside a workspace folder count; the
   * first heading of a Markdown file is read (at most 64 KiB) for the link text. Refused like a
   * paste of blocks (read-only, open editor, stale version, next to an included block).
   */
  private handleDropFiles(
    preview: PreviewSession,
    message: PageMessageOf<"previewDropFiles">,
  ): PromiseLike<void> | undefined {
    const { host } = this.manager;
    const document = this.blocksDocument(preview, message, "paste");
    if (!document) {
      return undefined;
    }
    const refuse = (reason: string): void => this.postBlocksResult(preview, message, "paste", { ok: false, reason });
    const documentPath = document.path;
    if (documentPath === undefined) {
      refuse("Save the document before dropping files into it.");
      return undefined;
    }
    const nextToInclude = checkBlocksPaste(document.getText(), message.insertAfterLine);
    if (nextToInclude) {
      refuse(nextToInclude.refused);
      return undefined;
    }
    const paths = message.uris
      .map(droppedFilePath)
      .filter((file): file is string => file !== undefined && host.workspace.folderOf(file) !== undefined);
    if (paths.length === 0) {
      refuse("Only files inside a workspace folder can be dropped.");
      return undefined;
    }
    const describe = async (file: string): Promise<DroppedFile> => {
      if (!isMarkdownFileName(file)) return { path: file };
      try {
        const bytes = await host.files.readFile(file);
        const title = firstHeadingTitle(new TextDecoder().decode(bytes.subarray(0, MAX_HEADING_SCAN_BYTES)));
        return title === undefined ? { path: file } : { path: file, title };
      } catch {
        return { path: file };
      }
    };
    return Promise.all(paths.map(describe)).then((files) => {
      if (preview.document !== document || document.revision !== message.revision) {
        refuse("The document changed while dropping. Try again.");
        return undefined;
      }
      const text = droppedText(documentPath, files);
      const plan = text === undefined
        ? { refused: "Those files cannot be referenced from this document (another drive, or an unusual name)." }
        : planBlocksPaste(document.getText(), message.insertAfterLine, text);
      if ("refused" in plan) {
        refuse(plan.refused);
        return undefined;
      }
      return this.apply(document, [plan.edit]).then((applied) => {
        if (!applied) {
          refuse("VS Code could not apply the drop.");
          return;
        }
        this.manager.scroll.storePendingPin(preview, {
          documentId: message.documentId,
          pinLine: message.pinLine,
          pinViewportTop: message.pinViewportTop,
        }, document.revision);
        this.postBlocksResult(preview, message, "paste", { ok: true });
      });
    }).then(undefined, (error: unknown) => refuse(error instanceof Error ? error.message : String(error)));
  }
}
