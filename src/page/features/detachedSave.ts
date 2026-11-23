/**
 * The detached save (CR 475): a final save the writer left with Cancel or Escape while it was in
 * flight. The editor closes at once, as the writer asked; the save stays in flight until the host
 * answers it (`done`, or an error that gives the typed text back), and no other edit starts
 * meanwhile. A failed save reopens an editor on the same block with the text the writer typed.
 */

import type { PreviewEditSourceMessage } from "../../core/protocol/hostToPage";
import type { DetachedSave, DetachedSaves } from "./detachedSaveState";
import type { BlockEdit, PageRuntime } from "./pageRuntime";

/** Installs the detached saves of the page. */
// @implements_req SwRS-MDOKFSTUDIO-BLOCK-053
// @implements_req SwRS-MDOKFSTUDIO-BLOCK-216
// @implements_req SwRS-MDOKFSTUDIO-BLOCK-270
export function installDetachedSaves(rt: PageRuntime): DetachedSaves {
  const { context, host, state } = rt;
  let reopening: string | undefined;
  /** The frontmatter field open the writer asked for during the save (Q14): runs when the save ends well. */
  let pendingField: (() => void) | undefined;

  const runPendingField = (): void => {
    const open = pendingField;
    pendingField = undefined;
    open?.();
  };

  const postReopen = (editId: string, reopened: boolean): void => {
    host.postMessage({
      type: "previewEditReopen",
      documentId: context.documentId,
      revision: context.revision,
      requestId: context.requestId,
      editId,
      reopened,
    });
  };

  /** Opens the editor of the failed save again on the same block, bar or blank-line block. */
  const openAgain = (record: DetachedSave): void => {
    if (record.replaceBlankRun) {
      const run = record.replaceBlankRun;
      const block = rt.blankLines.blocks().find((candidate) => {
        const found = rt.blankLines.runOf(candidate);
        return found !== undefined && found.line === run.line && found.endLine === run.endLine
          && found.itemLine === run.itemLine && found.containerLine === run.containerLine;
      });
      if (block) rt.blankLines.open(block);
    } else if (record.insertAfterLine !== undefined) {
      const point = rt.insertPoints.points().find((candidate) =>
        candidate.getAttribute("data-sphinx-insert-after-line") === String(record.insertAfterLine));
      if (point) {
        rt.blockEditor.openBlockEditor(
          point, undefined,
          { line: record.line, endLine: record.endLine, insertAfterLine: record.insertAfterLine }, "end");
      }
    } else if (record.navigation) {
      state.pendingBlockNavigation = record.navigation;
      rt.editMode.resumePendingBlockNavigation();
    }
  };

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-216
  /** Opens an editor on the block of the failed save, holding the text the writer typed. */
  const reopen = (record: DetachedSave, message: PreviewEditSourceMessage, text: string): void => {
    reopening = record.editId;
    try {
      openAgain(record);
    } finally {
      reopening = undefined;
    }
    const edit = state.activeBlockEdit;
    if (!edit || edit.editId !== record.editId) {
      postReopen(record.editId, false);
      return;
    }
    // The source answer builds the text box (or the cell editor) from the typed text.
    rt.blockSourceEditor.receiveBlockEditSource({
      type: "previewEditSource",
      documentId: message.documentId,
      revision: message.revision,
      requestId: message.requestId,
      editId: record.editId,
      originalText: text,
    });
    // What the saves of this edit say is what the first one said.
    edit.originalText = record.originalText;
    edit.line = record.line;
    edit.endLine = record.endLine;
    if (record.insertAfterLine !== undefined) edit.insertAfterLine = record.insertAfterLine;
    if (record.replaceBlankRun) edit.replaceBlankRun = record.replaceBlankRun;
    edit.deleteWhenEmpty = record.deleteWhenEmpty;
    edit.singleLine = record.singleLine;
    if (record.trailingLineEnding !== undefined) {
      edit.trailingLineEnding = record.trailingLineEnding;
      if (edit.textarea && record.trailingLineEnding && text.endsWith(record.trailingLineEnding)) {
        edit.textarea.value = text.slice(0, -record.trailingLineEnding.length);
      } else if (edit.textarea) {
        edit.textarea.value = text;
      }
    }
    if (record.convertedText !== undefined) edit.convertedText = record.convertedText;
    edit.lastPostedText = undefined;
    edit.hasAutosavedChange = true;
    edit.finishing = false;
    edit.saveIdentity = { ...record.identity };
    edit.reportClose = true;
    if (record.cellTextAtOpen !== undefined) edit.cellTextAtOpen = record.cellTextAtOpen;
    if (record.keptCellChange) edit.keptCellChange = true;
    if (record.tabAddedRow !== undefined) edit.tabAddedRow = record.tabAddedRow;
    edit.status.textContent = message.error ?? "";
    edit.hintReplaced = Boolean(edit.textarea);
    postReopen(record.editId, edit.textarea !== undefined || edit.tableInput !== undefined);
  };

  return {
    // @implements_req SwRS-MDOKFSTUDIO-BLOCK-053
    detach(edit: BlockEdit): void {
      const { blockEditor } = rt;
      blockEditor.clearPendingBlockNavigation();
      state.pendingBlockSelection = undefined;
      // A paragraph or a cell is found again by its place in the document; an insertion bar and a
      // blank-line block by their lines.
      let navigation: DetachedSave["navigation"];
      if (edit.insertAfterLine === undefined && !edit.replaceBlankRun) {
        blockEditor.rememberPendingBlockNavigation(edit.target, "end", edit.selectedCell);
        navigation = state.pendingBlockNavigation;
        blockEditor.clearPendingBlockNavigation();
      }
      state.detachedSave = {
        editId: edit.editId,
        identity: edit.saveIdentity ?? {
          documentId: context.documentId,
          revision: context.revision,
          requestId: context.requestId,
        },
        ...(navigation ? { navigation } : {}),
        line: edit.line,
        endLine: edit.endLine,
        originalText: edit.originalText ?? "",
        editedText: edit.lastPostedText ?? "",
        ...(edit.insertAfterLine !== undefined ? { insertAfterLine: edit.insertAfterLine } : {}),
        ...(edit.replaceBlankRun ? { replaceBlankRun: edit.replaceBlankRun } : {}),
        ...(edit.deleteWhenEmpty ? { deleteWhenEmpty: true as const } : {}),
        ...(edit.singleLine ? { singleLine: true } : {}),
        ...(edit.trailingLineEnding !== undefined ? { trailingLineEnding: edit.trailingLineEnding } : {}),
        ...(edit.convertedText !== undefined ? { convertedText: edit.convertedText } : {}),
        ...(edit.cellTextAtOpen !== undefined ? { cellTextAtOpen: edit.cellTextAtOpen } : {}),
        ...(edit.keptCellChange ? { keptCellChange: true } : {}),
        ...(edit.tabAddedRow !== undefined ? { tabAddedRow: edit.tabAddedRow } : {}),
        ...(edit.tableRowIndex !== undefined ? { tableRowIndex: edit.tableRowIndex } : {}),
        ...(edit.tableColumnIndex !== undefined ? { tableColumnIndex: edit.tableColumnIndex } : {}),
        renderFollows: false,
      };
      // The host waits for this close whatever it asked: its edit is not held for an editor any more.
      edit.reportClose = false;
      blockEditor.closeBlockEdit(false);
      blockEditor.postEditClosed(edit.editId, true);
    },

    receive(message): boolean {
      const record = state.detachedSave;
      if (!record || message.editId !== record.editId) {
        // The text of a final save that failed, for an editor this page does not hold (it was
        // replaced): nothing can be reopened, and the host has to show the text another way.
        if (!record && typeof message.error === "string" && typeof message.unsavedText === "string"
          && state.activeBlockEdit?.editId !== message.editId) {
          postReopen(message.editId, false);
          return true;
        }
        return false;
      }
      if (message.done === true) {
        if (message.renderFollows === true) {
          record.renderFollows = true;
        } else {
          state.detachedSave = undefined;
          rt.editMode.resumePendingBlockNavigation();
          runPendingField();
        }
        return true;
      }
      if (typeof message.error === "string") {
        state.detachedSave = undefined;
        // A field the writer clicked meanwhile is dropped: only the failed editor reopens.
        pendingField = undefined;
        rt.blockEditor.clearPendingBlockNavigation();
        state.pendingBlockSelection = undefined;
        // An answer without the text reopens the editor with the text of the save that was in flight.
        reopen(record, message, typeof message.unsavedText === "string" ? message.unsavedText : record.editedText);
      }
      return true;
    },

    deferOpen(target, selectedCell, caret): boolean {
      if (!state.detachedSave || reopening !== undefined) return false;
      rt.blockEditor.rememberPendingBlockNavigation(target, caret, selectedCell);
      return true;
    },

    reopeningId: () => reopening,

    deferField(open): boolean {
      if (!state.detachedSave) return false;
      pendingField = open;
      return true;
    },

    rendered(): void {
      if (!state.detachedSave?.renderFollows) return;
      state.detachedSave = undefined;
      runPendingField();
    },
  };
}
