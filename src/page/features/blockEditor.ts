/**
 * The block editor: opening it on a block, an insertion point or a table cell (`previewEditOpen`),
 * the autosave and the final save (`previewEditSave`), cancel and close, the flush of every open
 * editor before the page leaves its document (CR 025), and the moves out of the text box (arrow
 * keys at its edge, the move chord). The text box itself is built when the source arrives (see
 * `./blockSourceEditor.ts`); the cell editor in `./tableCellEditor.ts`.
 */

import { AUTOSAVE_DELAY_MS, isApplePlatform } from "../pageSettings";
import type { BlockEdit, BlockEditor, PageRuntime } from "./pageRuntime";

/** The block editor of a page. */
export function installBlockEditor(rt: PageRuntime): BlockEditor {
  const { document, window, context, host, state } = rt;
  const { editorTrace, traceFocus, traceStack } = rt.diagnostics;

  function hideTableCellContent(cell: HTMLTableCellElement): HTMLElement {
    const content = document.createElement("span");
    content.setAttribute("data-sphinx-table-cell-content", "true");
    content.setAttribute("aria-hidden", "true");
    Array.from(cell.childNodes).forEach((node) => content.appendChild(node));
    cell.appendChild(content);
    return content;
  }

  function restoreTableCellContent(edit: BlockEdit): void {
    if (!edit.renderedCellContent || !edit.selectedCell) return;
    const content = edit.renderedCellContent;
    const cell = edit.selectedCell;
    Array.from(content.childNodes).forEach((node) => {
      cell.insertBefore(node, content);
    });
    content.remove();
    edit.renderedCellContent = undefined;
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-148
  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-228
  // @implements_req SwRS-MDOKFSTUDIO-PALETTE-089
  // @implements_req SwRS-MDOKFSTUDIO-TABLE-064
  // @implements_req SwRS-MDOKFSTUDIO-TABLE-085
  // The cancel branch is used by Cancel and Escape when something reached the document;
  // Done, Cmd/Ctrl+Enter and leaving edit mode commit the text instead.
  function closeBlockEdit(cancel = false): void {
    const edit = state.activeBlockEdit;
    if (!edit) return;
    editorTrace.record(edit.selectedCell ? "cell editor closed" : "block editor closed",
      (cancel ? "cancel " : "") + "line=" + edit.line + " " + traceFocus(), traceStack());
    state.activeBlockEdit = undefined;
    // An editor that closes without the patch of its save has nothing left to wait for.
    if (!state.applyingContentPatch) state.pendingBlockSelection = undefined;
    document.documentElement?.removeAttribute?.("data-sphinx-preview-block-editing");
    rt.parts.hostRequests.cancelAll();
    if (edit.autosaveTimer !== undefined) {
      window.clearTimeout(edit.autosaveTimer);
      edit.autosaveTimer = undefined;
    }
    if (cancel) {
      clearPendingBlockNavigation();
      host.postMessage({
        type: "previewEditCancel",
        documentId: context.documentId,
        revision: context.revision,
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
    rt.parts.motion.editorClosed(edit.selectedCell || edit.renderedTarget || edit.target);
    edit.element.remove?.();
    edit.host?.remove?.();
    if (edit.host) document.documentElement?.style?.removeProperty?.("scroll-padding-top");
    // Opening scrolled the page down by paletteShift to keep the text still; the frame is gone
    // now, so scroll back and the rendered block stays where the user last saw the text.
    if (edit.paletteShift && !edit.selectedCell) {
      const target = Math.max(0, Math.min(rt.scroll.maxScrollTop(), window.scrollY - edit.paletteShift));
      rt.scroll.programmaticScroll(target);
      const restoredLine = rt.scroll.lineAtScroll(target);
      if (restoredLine !== undefined) state.anchor = { line: restoredLine, owner: state.anchor?.owner ?? "preview" };
    }
    if (!state.activeFrontmatterEdit) state.editAnchor = undefined;
    if (rt.refreshButton) rt.refreshButton.disabled = false;
    // The host holds back page updates while this editor is open and asked to hear when it closes.
    if (edit.reportClose) postEditClosed(edit.editId);
  }

  function postEditClosed(editId: string): void {
    host.postMessage({
      type: "previewEditClosed",
      documentId: context.documentId,
      revision: context.revision,
      requestId: context.requestId,
      editId,
    });
  }

  function clearPendingBlockNavigation(): void {
    state.pendingBlockNavigation = undefined;
    const saved = host.getState?.();
    if (!saved || typeof saved !== "object") return;
    const nextState = { ...saved };
    delete nextState.pendingBlockNavigation;
    host.setState?.(nextState);
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-079
  const rememberPendingBlockNavigation: BlockEditor["rememberPendingBlockNavigation"] = (
    target, caretPosition, selectedCell, explicitIndices, thenMove,
  ) => {
    state.pendingBlockNavigation = {
      ...(thenMove ? { thenMove } : {}),
      blockId: target.getAttribute("data-sphinx-preview-block") || undefined,
      sourceLine: Number(target.getAttribute("data-sphinx-source-line")),
      caretPosition: typeof caretPosition === "string" ? caretPosition : "end",
      ...(selectedCell ? {
        tableRowIndex: (selectedCell.parentElement as HTMLTableRowElement).rowIndex,
        tableColumnIndex: selectedCell.cellIndex,
      } : explicitIndices ? {
        tableRowIndex: explicitIndices.tableRowIndex,
        tableColumnIndex: explicitIndices.tableColumnIndex,
      } : {}),
    };
    const saved = host.getState?.();
    host.setState?.({
      ...(saved && typeof saved === "object" ? saved : {}),
      pendingBlockNavigation: state.pendingBlockNavigation,
    });
  };

  function adjacentMappedBlock(edit: BlockEdit, step: number): HTMLElement | undefined {
    const blocks = rt.blocks.topLevelMappedBlocks();
    const index = blocks.indexOf(edit.target);
    if (index < 0) return undefined;
    // The properties table has its own editor: stepping onto it would only close this one.
    for (let next = index + step; next >= 0 && next < blocks.length; next += step) {
      if (blocks[next]!.getAttribute("data-okf-properties") === null) return blocks[next];
    }
    return undefined;
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-130
  // Cmd+Alt (Ctrl+Alt elsewhere) + Up/Down in the block text box: save the edit, move the block,
  // reopen the editor on it with the caret where it was. Plain Option/Alt+arrow stays native.
  // Handled chords are always consumed; a key repeat or a move in flight does nothing.
  const moveBlockFromEditor: BlockEditor["moveBlockFromEditor"] = (event, control) => {
    const direction = rt.blockMoves.moveChordDirection(event, true);
    if (!direction) return false;
    event.preventDefault?.();
    event.stopPropagation?.();
    const edit = state.activeBlockEdit;
    if (!edit || edit.finishing || event.repeat || rt.blockMoves.inFlight()) return true;
    if (edit.selectedCell || edit.insertAfterLine !== undefined || control !== edit.textarea) return true;
    const target = edit.target;
    if (!rt.blockMoves.bodyBlockNeighbour(target, direction)) return true;
    const offset = Number.isSafeInteger(control.selectionStart) ? control.selectionStart as number : 0;
    const editedText = edit.textarea.value + (edit.trailingLineEnding || "");
    if (editedText === edit.originalText && !edit.hasAutosavedChange) {
      // Nothing to save: close (the host drops the edit) and move at once.
      closeBlockEdit(true);
      if (!rt.blockMoves.requestBlockMove(target, direction, "edit", offset)) {
        rt.editMode.openMappedEditor(target, target, { offset }, false);
      }
      return true;
    }
    rememberPendingBlockNavigation(target, "end", undefined, undefined, { direction, caretOffset: offset });
    if (!postBlockEditSave(true)) {
      clearPendingBlockNavigation();
      if (!rt.blockMoves.requestBlockMove(target, direction, "edit", offset)) {
        rt.editMode.openMappedEditor(target, target, { offset }, false);
      }
    }
    return true;
  };

  const navigateBlockEdit: BlockEditor["navigateBlockEdit"] = (event, control) => {
    const edit = state.activeBlockEdit;
    if (!edit || edit.finishing) return false;
    const navigation = rt.textControls.boundaryNavigation(control, event);
    if (!navigation) return false;
    const target = adjacentMappedBlock(edit, navigation.step);
    if (!target) return false;
    event.preventDefault?.();
    rememberPendingBlockNavigation(target, navigation.caretPosition);
    const savePosted = postBlockEditSave(true);
    if (!savePosted) {
      clearPendingBlockNavigation();
      rt.editMode.openMappedEditor(target, target, navigation.caretPosition, true);
    }
    return true;
  };

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-014
  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-029
  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-041
  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-102
  // @implements_req SwRS-MDOKFSTUDIO-TABLE-001
  const openBlockEditor: BlockEditor["openBlockEditor"] = (target, selectedCell, sourceRange, initialCaretPosition = "end") => {
    // An editor whose open was refused only shows the reason: a new open replaces it.
    if (state.activeBlockEdit?.openRefused) closeBlockEdit(false);
    if (state.activeBlockEdit) return;
    const line = sourceRange?.line ?? Number(target.getAttribute("data-sphinx-source-line"));
    const endLine = sourceRange?.endLine
      ?? Number(target.getAttribute("data-sphinx-source-end-line") || line);
    const insertAfterLine = sourceRange?.insertAfterLine;
    const rowIndex = (selectedCell?.parentElement as HTMLTableRowElement | null | undefined)?.rowIndex;
    const columnIndex = selectedCell?.cellIndex;
    if (!Number.isSafeInteger(line) || line < 1 || !Number.isSafeInteger(endLine) || endLine < line) return;
    if (selectedCell && (!Number.isSafeInteger(rowIndex) || !Number.isSafeInteger(columnIndex))) return;
    const renderedTarget = selectedCell ? target : (target.closest?.<HTMLElement>("pre") || target);
    rt.editMode.setEditHover(undefined);
    const editId = context.requestId + "-" + (++state.editSequence);
    const element = document.createElement("div");
    element.className = selectedCell
      ? "sphinx-preview-table-cell-editor"
      : "sphinx-preview-block-editor";
    // Nothing above the document's first block: the frame gets room before the top edge.
    if (!selectedCell && !rt.blocks.propertiesSection()
      && (target.className?.split?.(" ").includes("sphinx-preview-insert-point--first")
        || rt.blocks.topLevelMappedBlocks()[0] === target)) {
      element.className += " sphinx-preview-block-editor--first";
    }
    element.setAttribute("data-sphinx-preview-block-editor", "true");
    element.setAttribute("role", "region");
    element.setAttribute("aria-label", selectedCell ? "Markdown table cell editor" : "Raw Markdown editor");
    if (selectedCell) element.setAttribute("data-sphinx-preview-table-cell-editor", "true");
    let renderedCellContent: HTMLElement | undefined;
    if (selectedCell) {
      renderedCellContent = hideTableCellContent(selectedCell);
    }
    const status = document.createElement("p");
    status.setAttribute("data-sphinx-preview-edit-status", "");
    status.setAttribute("role", "status");
    status.textContent = selectedCell ? "Loading Markdown table source…" : "Loading Markdown source…";
    element.appendChild(status);
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
    rt.scroll.beginEditAnchor(selectedCell ?? element);
    editorTrace.record(selectedCell ? "cell editor opened" : "block editor opened",
      "line=" + line + (selectedCell ? " row=" + rowIndex + " column=" + columnIndex : "") + " " + traceFocus(),
      traceStack());
    state.activeBlockEdit = {
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
    if (rt.refreshButton) rt.refreshButton.disabled = true;
    host.postMessage({
      type: "previewEditOpen",
      documentId: context.documentId,
      revision: context.revision,
      requestId: context.requestId,
      editId,
      line,
      endLine,
      ...(insertAfterLine !== undefined ? { insertAfterLine } : {}),
    });
  };

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-234
  // @implements_req SwRS-MDOKFSTUDIO-TABLE-018
  function postBlockEditSave(final: boolean): boolean | undefined {
    const edit = state.activeBlockEdit;
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
      ? rt.tools.tableTools.serialize(edit.tableModel)
      : edit.textarea!.value + (edit.trailingLineEnding || "");
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
    host.postMessage({
      type: "previewEditSave",
      documentId: context.documentId,
      revision: context.revision,
      requestId: context.requestId,
      editId: edit.editId,
      line: edit.line,
      endLine: edit.endLine,
      originalText: edit.originalText,
      editedText,
      final,
      ...(edit.insertAfterLine !== undefined ? { insertAfterLine: edit.insertAfterLine } : {}),
      ...(final ? rt.scroll.blockPinFields(edit) : {}),
      ...(state.flushingEditors ? { flush: true } : {}),
      ...rt.scroll.anchorField(),
    });
    return true;
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-042
  function autosaveBlockEdit(): void {
    const edit = state.activeBlockEdit;
    if (!edit) return;
    if (edit.autosaveTimer !== undefined) window.clearTimeout(edit.autosaveTimer);
    edit.autosaveTimer = window.setTimeout(() => {
      if (state.activeBlockEdit !== edit) return;
      edit.autosaveTimer = undefined;
      postBlockEditSave(false);
    }, AUTOSAVE_DELAY_MS);
  }

  // The webview can be hidden or disposed before the debounce fires; send the pending burst now.
  function flushPendingAutosave(): void {
    const edit = state.activeBlockEdit;
    if (!edit || edit.autosaveTimer === undefined) return;
    postBlockEditSave(false);
  }

  // A frontmatter editor has no autosave: its typed text is saved (and the editor closed) when the
  // page goes away or is hidden, as a flush, so a window close or Reload Window loses nothing.
  function flushHiddenPage(): void {
    rt.pageHost.flushPendingState();
    rt.pageHost.flushStateMessage();
    flushPendingAutosave();
    rt.frontmatter.flushFrontmatterEditor();
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-047
  function saveBlockEdit(): void {
    postBlockEditSave(true);
  }

  // @implements_req SwRS-MDOKFSTUDIO-FMEDIT-067
  // Before the preview leaves this document (a link to another file, Back / Next, the host
  // following another tab, CR 025): save and close every open editor now, whatever it holds, and
  // do not wait for the autosave timer. The host applies the saves before it switches document.
  // Returns true when a save was posted.
  function flushOpenEditors(): boolean {
    let flushed = false;
    const blockEdit = state.activeBlockEdit;
    if (blockEdit && !blockEdit.finishing) {
      if (blockEdit.tableModel && blockEdit.tableInput && blockEdit.selectedCell) {
        const modelRowIndex = blockEdit.tableRowIndex === 0 ? 0 : blockEdit.tableRowIndex! + 1;
        const modelRow = blockEdit.tableModel.rows[modelRowIndex];
        if (modelRow) modelRow[blockEdit.tableColumnIndex!] = blockEdit.tableInput.value;
      }
      state.flushingEditors = true;
      try {
        flushed = postBlockEditSave(true) === true;
      } finally {
        state.flushingEditors = false;
      }
    }
    return rt.frontmatter.flushFrontmatterEditor() || flushed;
  }

  // Flushes the open editors, then calls navigate(flushed) once the saves are posted (CR 025).
  // Leaving the page (a click, the host focusing another editor tab) blurs the frontmatter
  // editor first, and its blur posts a plain save. The host refuses a plain save of text that is
  // not valid YAML or does not fit the schema, and the flush would find the editor busy and skip
  // it, so the typed text would be lost with the page. While such a save waits for its result,
  // wait too (bounded, below the host's own 1.5 s wait) and save again as a flush when it was
  // refused. With nothing pending, navigate runs at once.
  function flushOpenEditorsThen(navigate: (flushed: boolean) => void): void {
    const flushed = flushOpenEditors();
    const edit = state.activeFrontmatterEdit;
    if (!edit || !edit.plainSavePending) {
      navigate(flushed);
      return;
    }
    let done = false;
    let timer: number | undefined;
    const finish = (): void => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      navigate(rt.frontmatter.flushFrontmatterEditor() || flushed);
    };
    const previous = edit.afterResult;
    edit.afterResult = previous ? () => { previous(); finish(); } : finish;
    timer = window.setTimeout(finish, 1000);
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-053
  // Cancel button and Escape: close without saving, and restore the block when an autosave already
  // reached the document.
  function cancelBlockEdit(): void {
    const edit = state.activeBlockEdit;
    if (!edit || edit.finishing) return;
    closeBlockEdit(edit.hasAutosavedChange === true);
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-033
  function blockEditHint(edit: BlockEdit): string {
    const applePlatform = isApplePlatform();
    const lines = edit.insertAfterLine !== undefined
      ? "New block"
      : edit.endLine > edit.line
      ? "Lines " + edit.line + "–" + edit.endLine
      : "Line " + edit.line;
    return lines + " · Enter: new line · Tab: indent · Esc: cancel · "
      + (applePlatform ? "⌘↩" : "Ctrl+Enter") + ": done";
  }

  // @implements_req SwRS-MDOKFSTUDIO-TABLE-006
  // Done and Cancel, shared by the block editor and the table-cell editor. The mousedown default is
  // prevented to keep the focus in the field, so its blur commit does not run before the click.
  function createEditorButtons(edit: BlockEdit): HTMLElement {
    const doneButton = document.createElement("button");
    doneButton.setAttribute("type", "button");
    doneButton.setAttribute("aria-label", "Done editing");
    doneButton.textContent = "Done";
    const cancelButton = document.createElement("button");
    cancelButton.setAttribute("type", "button");
    cancelButton.setAttribute("aria-label", "Cancel editing and restore the original text");
    cancelButton.setAttribute("title", "Cancel (Esc)");
    cancelButton.textContent = "Cancel";
    const keepFocus = (event: Event): void => event.preventDefault?.();
    doneButton.addEventListener("mousedown", keepFocus);
    cancelButton.addEventListener("mousedown", keepFocus);
    doneButton.addEventListener("click", () => saveBlockEdit());
    cancelButton.addEventListener("click", () => {
      if (state.activeBlockEdit !== edit) return;
      cancelBlockEdit();
    });
    const buttons = document.createElement("div");
    buttons.className = "sphinx-preview-block-editor-buttons";
    buttons.appendChild(doneButton);
    buttons.appendChild(cancelButton);
    return buttons;
  }

  return {
    openBlockEditor,
    closeBlockEdit,
    postEditClosed,
    postBlockEditSave,
    autosaveBlockEdit,
    saveBlockEdit,
    cancelBlockEdit,
    flushOpenEditorsThen,
    clearPendingBlockNavigation,
    rememberPendingBlockNavigation,
    createEditorButtons,
    blockEditHint,
    moveBlockFromEditor,
    navigateBlockEdit,
    hideTableCellContent,
    restoreTableCellContent,
    // @implements_req SwRS-MDOKFSTUDIO-BLOCK-205
    bindPageHide() {
      window.addEventListener("pagehide", flushHiddenPage);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") flushHiddenPage();
      });
    },
  };
}
