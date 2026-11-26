/**
 * The block editor: opening it on a block, an insertion point or a table cell (`previewEditOpen`),
 * the autosave and the final save (`previewEditSave`), cancel and close, the flush of every open
 * editor before the page leaves its document (CR 025), and the moves out of the text box (arrow
 * keys at its edge, the move chord). The text box itself is built when the source arrives (see
 * `./blockSourceEditor.ts`); the cell editor in `./tableCellEditor.ts`.
 */

import { matchLineEndings } from "../../core/edits/lineEndings";
import { clearCellEditorRoom } from "../modules/cellEditorRoom";
import { tableRankIn } from "../modules/tableInContainer";
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

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-228
  // The cancel branch is used by Cancel and Escape when something reached the document;
  // Done, Cmd/Ctrl+Enter and leaving edit mode commit the text instead.
  function closeBlockEdit(cancel = false): void {
    const edit = state.activeBlockEdit;
    if (!edit) return;
    editorTrace.record(edit.selectedCell ? "cell editor closed" : "block editor closed",
      (cancel ? "cancel " : "") + "line=" + edit.line + " " + traceFocus(), traceStack());
    state.activeBlockEdit = undefined;
    // @implements_req SwRS-MDOKFSTUDIO-BLOCK-148
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
      const identity = edit.saveIdentity ?? context;
      host.postMessage({
        type: "previewEditCancel",
        documentId: identity.documentId,
        revision: identity.revision,
        requestId: identity.requestId,
        editId: edit.editId,
        line: edit.line,
        endLine: edit.endLine,
        ...(edit.insertAfterLine !== undefined ? { insertAfterLine: edit.insertAfterLine } : {}),
        ...(edit.replaceBlankRun ? { replaceBlankRun: edit.replaceBlankRun } : {}),
      });
    }
    // @implements_req SwRS-MDOKFSTUDIO-TABLE-064
    if (edit.tableMenuPositionListener) {
      window.removeEventListener?.("scroll", edit.tableMenuPositionListener, true);
      window.removeEventListener?.("resize", edit.tableMenuPositionListener);
    }
    edit.tableMenu?.remove?.();
    edit.linkPanel?.destroy();
    edit.linkPanel = undefined;
    edit.figurePanel?.destroy();
    edit.figurePanel = undefined;
    edit.codeBlockPanel?.destroy();
    edit.codeBlockPanel = undefined;
    edit.slashMenu?.destroy();
    // @implements_req SwRS-MDOKFSTUDIO-TABLE-085
    edit.cellSlash?.destroy();
    edit.palette?.destroy();
    edit.cellPalette?.destroy();
    restoreTableCellContent(edit);
    if (edit.selectedCell) {
      edit.selectedCell.removeAttribute("data-sphinx-preview-table-cell-selected");
      clearCellEditorRoom(edit.selectedCell);
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

  function postEditClosed(editId: string, detached = false): void {
    host.postMessage({
      type: "previewEditClosed",
      documentId: context.documentId,
      revision: context.revision,
      requestId: context.requestId,
      editId,
      ...(detached ? { detached: true as const } : {}),
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

  // A table that is not the first of its block (a quote with two tables) is found again by its rank.
  const rankField = (rank: number | undefined): { tableRank?: number } => (rank ? { tableRank: rank } : {});

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-079
  const rememberPendingBlockNavigation: BlockEditor["rememberPendingBlockNavigation"] = (
    target, caretPosition, selectedCell, explicitIndices, thenMove, addedRow,
  ) => {
    state.pendingBlockNavigation = {
      ...(thenMove ? { thenMove } : {}),
      blockId: target.getAttribute("data-sphinx-preview-block") || undefined,
      sourceLine: Number(target.getAttribute("data-sphinx-source-line")),
      tagName: target.tagName,
      caretPosition: typeof caretPosition === "string" ? caretPosition : "end",
      ...(selectedCell ? {
        tableRowIndex: (selectedCell.parentElement as HTMLTableRowElement).rowIndex,
        tableColumnIndex: selectedCell.cellIndex,
        ...rankField(tableRankIn(target, selectedCell.closest?.("table"))),
      } : explicitIndices ? {
        tableRowIndex: explicitIndices.tableRowIndex,
        tableColumnIndex: explicitIndices.tableColumnIndex,
        ...rankField(explicitIndices.tableRank),
      } : {}),
      ...(addedRow ? { addedRow: true } : {}),
    };
    const saved = host.getState?.();
    host.setState?.({
      ...(saved && typeof saved === "object" ? saved : {}),
      pendingBlockNavigation: state.pendingBlockNavigation,
    });
  };

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-263
  /**
   * The text of the text box as the source writes it: the box returns LF for every line break, the
   * source may use CR LF (or both), and a text the writer left as it was must equal the source.
   */
  function textBoxText(textarea: { value: string }, edit: BlockEdit): string {
    const text = textarea.value + (edit.trailingLineEnding || "");
    return typeof edit.originalText === "string" ? matchLineEndings(text, edit.originalText) : text;
  }

  /** The top-level mapped block that holds `element` (itself when it is one). */
  function topLevelBlockOf(element: HTMLElement): HTMLElement | undefined {
    const blocks = rt.blocks.topLevelMappedBlocks();
    let top: HTMLElement | null = element;
    while (top && !blocks.includes(top)) top = top.parentElement;
    return top ?? undefined;
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-130
  /**
   * What the move chord of a list item's editor moves: the top-level block that holds the item,
   * or, inside an admonition, the outermost list of the admonition's body that holds it.
   */
  function listMovedFor(item: HTMLElement): HTMLElement | undefined {
    if (!rt.blocks.admonitionAround(item)) return topLevelBlockOf(item);
    let list: HTMLElement | undefined;
    for (let node: HTMLElement | null = item; node && ["UL", "OL", "LI"].includes(node.tagName); node = node.parentElement) {
      if (node.tagName !== "LI") list = node;
    }
    return list;
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-264
  /**
   * True when the editor's block is a top-level body block (not the properties section) or a list
   * item of a top-level list: erasing its text and pressing Done deletes it. A block inside a list
   * item, an alert, a quote, an admonition or another container keeps the placeholder line.
   */
  function deletesWhenEmpty(target: HTMLElement, renderedTarget: HTMLElement): boolean {
    const isBodyBlock = (block: HTMLElement | undefined): boolean => block !== undefined
      && block.getAttribute("data-okf-properties") === null;
    const blocks = rt.blocks.topLevelMappedBlocks();
    if (blocks.includes(target) || blocks.includes(renderedTarget)) {
      return isBodyBlock(blocks.includes(target) ? target : renderedTarget);
    }
    if (target.tagName !== "LI") return false;
    let parent = target.parentElement;
    while (parent && !blocks.includes(parent)) {
      if (!["UL", "OL", "LI"].includes(parent.tagName)) return false;
      parent = parent.parentElement;
    }
    return parent !== null && isBodyBlock(parent) && ["UL", "OL"].includes(parent.tagName);
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-079
  function adjacentMappedBlock(edit: BlockEdit, step: number): HTMLElement | undefined {
    const blocks = rt.blocks.topLevelMappedBlocks();
    let from: HTMLElement | undefined = edit.target;
    // The editor of a list item, or of a block inside one, steps to the item before or after that
    // item in its list, then past the top-level block that holds the list; a list inside an
    // admonition keeps the key at its edges. Every other editor steps between top-level blocks
    // only, and an inner block leaves the key to the text box.
    const item = edit.target.tagName === "LI" ? edit.target
      : edit.target.parentElement?.tagName === "LI" ? edit.target.parentElement : undefined;
    if (item) {
      const sideways = (element: Element): Element | null =>
        step < 0 ? element.previousElementSibling : element.nextElementSibling;
      let sibling = sideways(item);
      while (sibling && sibling.tagName !== "LI") sibling = sideways(sibling);
      if (sibling) return sibling as HTMLElement;
      if (rt.blocks.admonitionAround(item)) return undefined;
      from = topLevelBlockOf(item);
    }
    const index = from ? blocks.indexOf(from) : -1;
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
    const edited = edit.target;
    // The editor of a list item moves the whole list that holds it (inside an admonition, within
    // it), as the list's editor did before items were edited one by one; the editor reopens on
    // the moved list.
    const target = edited.tagName === "LI" ? listMovedFor(edited) : edited;
    if (!target || !rt.blockMoves.moveNeighbour(target, direction)) return true;
    const offset = Number.isSafeInteger(control.selectionStart) ? control.selectionStart as number : 0;
    const editedText = textBoxText(edit.textarea, edit);
    if (editedText === edit.originalText && !edit.hasAutosavedChange) {
      // Nothing to save: close (the host drops the edit) and move at once.
      closeBlockEdit(true);
      if (!rt.blockMoves.requestBlockMove(target, direction, "edit", offset)) {
        rt.editMode.openMappedEditor(edited, edited, { offset }, false);
      }
      return true;
    }
    rememberPendingBlockNavigation(target, "end", undefined, undefined, { direction, caretOffset: offset });
    if (!postBlockEditSave(true)) {
      clearPendingBlockNavigation();
      if (!rt.blockMoves.requestBlockMove(target, direction, "edit", offset)) {
        rt.editMode.openMappedEditor(edited, edited, { offset }, false);
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

  const openBlockEditor: BlockEditor["openBlockEditor"] = (target, selectedCell, sourceRange, initialCaretPosition = "end") => {
    // An editor whose open was refused only shows the reason: a new open replaces it.
    if (state.activeBlockEdit?.openRefused) closeBlockEdit(false);
    // @implements_req SwRS-MDOKFSTUDIO-BLOCK-041
    if (state.activeBlockEdit) return;
    // A save left in flight by Cancel ends first; the block opens after it.
    if (rt.detachedSaves.deferOpen(target, selectedCell, initialCaretPosition)) return;
    // A field editor is open (a click on a block or a "+" blurred it and posted a plain save):
    // wait for the answer. A refused value is discarded and the field shows its saved value; a
    // saved value opens the editor as before.
    const field = state.activeFrontmatterEdit;
    if (field) {
      if (field.plainSavePending) {
        const previous = field.afterResult;
        field.afterResult = () => {
          previous?.();
          if (state.activeFrontmatterEdit === field && !field.saving) {
            rt.frontmatter.closeFrontmatterEditor("refused save, block editor opened");
          }
          openBlockEditor(target, selectedCell, sourceRange, initialCaretPosition);
        };
        return;
      }
      if (!field.saving) rt.frontmatter.closeFrontmatterEditor("block editor opened");
    }
    // @implements_req SwRS-MDOKFSTUDIO-BLOCK-014
    const line = sourceRange?.line ?? Number(target.getAttribute("data-sphinx-source-line"));
    const endLine = sourceRange?.endLine
      ?? Number(target.getAttribute("data-sphinx-source-end-line") || line);
    // @implements_req SwRS-MDOKFSTUDIO-BLOCK-102
    const insertAfterLine = sourceRange?.insertAfterLine;
    const replaceBlankRun = sourceRange?.replaceBlankRun;
    const rowIndex = (selectedCell?.parentElement as HTMLTableRowElement | null | undefined)?.rowIndex;
    const columnIndex = selectedCell?.cellIndex;
    if (!Number.isSafeInteger(line) || line < 1 || !Number.isSafeInteger(endLine) || endLine < line) return;
    if (selectedCell && (!Number.isSafeInteger(rowIndex) || !Number.isSafeInteger(columnIndex))) return;
    const renderedTarget = selectedCell ? target : (target.closest?.<HTMLElement>("pre") || target);
    rt.editMode.setEditHover(undefined);
    const reopenId = rt.detachedSaves.reopeningId();
    const editId = reopenId ?? context.requestId + "-" + (++state.editSequence);
    const element = document.createElement("div");
    element.className = selectedCell
      ? "sphinx-preview-table-cell-editor"
      : "sphinx-preview-block-editor";
    // Nothing above the document's first block: the frame gets room before the top edge.
    if (!selectedCell && !rt.blocks.propertiesSection()
      && (target.className?.split?.(" ").includes("sphinx-preview-insert-point--first")
        || rt.blocks.topLevelMappedBlocks()[0] === target
        || (target.tagName === "LI" && rt.blocks.topLevelMappedBlocks()[0]?.querySelector?.("li") === target))) {
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
    // @implements_req SwRS-MDOKFSTUDIO-BLOCK-033
    const status = document.createElement("p");
    status.setAttribute("data-sphinx-preview-edit-status", "");
    status.setAttribute("role", "status");
    status.textContent = selectedCell ? "Loading Markdown table source…" : "Loading Markdown source…";
    element.appendChild(status);
    element.addEventListener("click", (event) => event.stopPropagation?.());
    // @implements_req SwRS-MDOKFSTUDIO-TABLE-001
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
      ...(replaceBlankRun ? { replaceBlankRun } : {}),
      ...(selectedCell ? { selectedCell, renderedCellContent, tableRowIndex: rowIndex, tableColumnIndex: columnIndex } : {}),
      initialCaretPosition,
      // @implements_req SwRS-MDOKFSTUDIO-BLOCK-261
      // A one-line card part (marked by the renderer): a blank line would end the card's options.
      ...(!selectedCell && sourceRange === undefined && target.getAttribute("data-single-line") !== null
        ? { singleLine: true }
        : {}),
      // @implements_req SwRS-MDOKFSTUDIO-BLOCK-255
      focusAtOpen: document.activeElement,
      ...(!selectedCell && insertAfterLine === undefined && deletesWhenEmpty(target, renderedTarget)
        ? { deleteWhenEmpty: true as const }
        : {}),
    };
    document.documentElement?.setAttribute?.("data-sphinx-preview-block-editing", "true");
    if (rt.refreshButton) rt.refreshButton.disabled = true;
    // A reopened editor takes the edit the host still holds: there is nothing to open.
    if (reopenId === undefined) host.postMessage({
      type: "previewEditOpen",
      documentId: context.documentId,
      revision: context.revision,
      requestId: context.requestId,
      editId,
      line,
      endLine,
      ...(insertAfterLine !== undefined ? { insertAfterLine } : {}),
      ...(replaceBlankRun ? { replaceBlankRun } : {}),
      // @implements_req SwRS-MDOKFSTUDIO-TABLE-119
      // The host follows the table of an open cell editor, to show the buffer after an outside change.
      ...(selectedCell ? { cellEditor: true as const } : {}),
    });
  };

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-047
  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-234
  // @implements_req SwRS-MDOKFSTUDIO-TABLE-018
  function postBlockEditSave(final: boolean): boolean | undefined {
    const edit = state.activeBlockEdit;
    if (
      !edit
      || typeof edit.originalText !== "string"
      || (!edit.textarea && !edit.tableInput)
      || edit.finishing
    ) return false;
    if (edit.autosaveTimer !== undefined) {
      window.clearTimeout(edit.autosaveTimer);
      edit.autosaveTimer = undefined;
    }
    const editedText = edit.convertedText !== undefined
      ? edit.convertedText
      : edit.tableModel
      ? rt.tools.tableTools.serialize(edit.tableModel)
      : textBoxText(edit.textarea!, edit);
    if (final && editedText === edit.originalText && !edit.hasAutosavedChange) {
      closeBlockEdit();
      return false;
    }
    if (!final && editedText === edit.lastPostedText) return;
    if (editedText !== edit.originalText) edit.hasAutosavedChange = true;
    const pin = final ? rt.scroll.blockPinFields(edit) : {};
    if (final) {
      edit.finishing = true;
      edit.status.textContent = "Saving Markdown…";
    }
    edit.lastPostedText = editedText;
    const identity = edit.saveIdentity ?? context;
    host.postMessage({
      type: "previewEditSave",
      documentId: identity.documentId,
      revision: identity.revision,
      requestId: identity.requestId,
      editId: edit.editId,
      line: edit.line,
      endLine: edit.endLine,
      originalText: edit.originalText,
      editedText,
      final,
      ...(edit.insertAfterLine !== undefined ? { insertAfterLine: edit.insertAfterLine } : {}),
      ...(edit.replaceBlankRun ? { replaceBlankRun: edit.replaceBlankRun } : {}),
      ...(final && edit.deleteWhenEmpty && editedText.trim() === "" ? { deleteWhenEmpty: true as const } : {}),
      ...pin,
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

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-173
  // The save key (the host asks, CR 312): write the typed text of the open block or cell editor with
  // an autosave and keep that editor open, save an open frontmatter field as a flush (it closes, as
  // for a navigation), then ask the host to save the document. Messages arrive in order, so the
  // host knows every text above when the request comes.
  function saveDocumentFromKey(): void {
    const blockEdit = state.activeBlockEdit;
    if (blockEdit && !blockEdit.finishing) {
      copyCellTextIntoModel(blockEdit);
      if (blockEdit.autosaveTimer !== undefined) postBlockEditSave(false);
    }
    afterFrontmatterPlainSave(rt.frontmatter.flushFrontmatterEditor(), () => {
      host.postMessage({
        type: "previewSaveRequest",
        documentId: context.documentId,
        revision: context.revision,
        requestId: context.requestId,
      });
    });
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-047
  function saveBlockEdit(): void {
    postBlockEditSave(true);
  }

  // The cell editor keeps its typed text in the input until a save reads the table model.
  function copyCellTextIntoModel(blockEdit: BlockEdit): void {
    if (blockEdit.tableModel && blockEdit.tableInput && blockEdit.selectedCell) {
      const modelRowIndex = blockEdit.tableRowIndex === 0 ? 0 : blockEdit.tableRowIndex! + 1;
      const modelRow = blockEdit.tableModel.rows[modelRowIndex];
      if (modelRow) modelRow[blockEdit.tableColumnIndex!] = blockEdit.tableInput.value;
    }
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
      copyCellTextIntoModel(blockEdit);
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
    afterFrontmatterPlainSave(flushOpenEditors(), navigate);
  }

  // Calls navigate(flushed) at once, or, when a frontmatter field waits for the result of a plain
  // save, once that result is known (bounded) and the field was flushed again if it was refused.
  function afterFrontmatterPlainSave(flushed: boolean, navigate: (flushed: boolean) => void): void {
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
    if (!edit) return;
    // @implements_req SwRS-MDOKFSTUDIO-BLOCK-053
    // A final save in flight goes on: the editor closes now and the host's answer ends the save.
    if (edit.finishing) {
      rt.detachedSaves.detach(edit);
      return;
    }
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
    const keys = edit.singleLine ? " · Enter: done · Esc: cancel · " : " · Enter: new line · Tab: indent · Esc: cancel · ";
    return lines + keys + (applePlatform ? "⌘↩" : "Ctrl+Enter") + ": done";
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-033
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
      // @implements_req SwRS-MDOKFSTUDIO-TABLE-025
      // The cell editor's Cancel is Escape: same path, so the cells left keep their text.
      if (edit.tableModel) rt.tableCellEditor.cancelTableCellEdit(edit);
      else cancelBlockEdit();
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
    saveDocumentFromKey,
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
