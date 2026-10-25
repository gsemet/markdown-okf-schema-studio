/**
 * Edit mode: the toolbar toggle, the outline of what a click would edit (the edit hover), and the
 * editor a click or a key opens on a mapped block (its list, its table cell, the caret at the
 * clicked text). Also reopens, after a render, the editor a save asked for (arrow-key navigation
 * from block to block, Tab past the last cell).
 */

import { MAPPINGS_SELECTOR, type CaretPoint, type CaretPosition, type EditMode, type PageRuntime } from "./pageRuntime";

/** Edit mode of a page. */
export function installEditMode(rt: PageRuntime): EditMode {
  const { document, context, host, state } = rt;
  const { editorTrace, traceFocus, traceStack } = rt.diagnostics;
  let editHoverElement: Element | undefined;

  function setEditHover(element: Element | undefined): void {
    if (editHoverElement === element) return;
    editHoverElement?.removeAttribute?.("data-sphinx-preview-edit-hover");
    editHoverElement = element;
    editHoverElement?.setAttribute?.("data-sphinx-preview-edit-hover", "true");
    rt.parts.figureEditButton.sync(element);
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-017
  // @implements_req SwRS-MDOKFSTUDIO-TRUST-001
  // The element whose outline shows what a click at this node would edit, or undefined.
  function editHoverTarget(node: EventTarget | null): Element | undefined {
    if (!state.editMode || !(node instanceof Element)) return undefined;
    if (node.closest("[data-okf-properties]") || node.closest("[data-sphinx-preview-block-editor]")) {
      return undefined;
    }
    const mapped = node.closest<HTMLElement>(MAPPINGS_SELECTOR);
    if (!mapped || mapped.closest("a") || node.closest("a")) return undefined;
    const cell = node.closest("td, th");
    const editing = rt.blocks.editingElementFor(mapped).element;
    const element = cell && cell.closest("table")
      ? cell
      : (editing === mapped ? (mapped.closest("pre") || mapped) : editing);
    return element.getAttribute("data-sphinx-preview-editing") === "true" ? undefined : element;
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-001
  // @implements_req SwRS-MDOKFSTUDIO-FMEDIT-019
  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-205
  function applyEditMode(enabled: boolean): void {
    if (!enabled) {
      rt.selection.clearBlockSelection();
      rt.parts.labelRename.close();
      setEditHover(undefined);
      if (state.editMode) editorTrace.record("edit mode off", traceFocus(), traceStack());
      rt.frontmatter.closeFrontmatterEditor("edit mode off");
      if (state.activeBlockEdit && typeof state.activeBlockEdit.originalText === "string") {
        rt.blockEditor.postBlockEditSave(true);
      } else {
        rt.blockEditor.closeBlockEdit(false);
      }
    }
    state.editMode = enabled;
    document.documentElement?.setAttribute?.(
      "data-sphinx-preview-edit-mode",
      enabled ? "on" : "off",
    );
    const editModeButton = rt.editModeButton;
    editModeButton?.setAttribute?.("data-edit-mode", enabled ? "on" : "off");
    editModeButton?.setAttribute?.("aria-pressed", String(enabled));
    const tooltip = enabled ? "Exit edit mode" : "Edit mode";
    editModeButton?.setAttribute?.("title", tooltip);
    editModeButton?.setAttribute?.("data-tooltip", tooltip);
    rt.frontmatter.setFrontmatterEditCells(enabled);
    rt.insertPoints.refreshInsertPoints();
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-026
  function clickCaretContext(target: HTMLElement, eventTarget: Element, x: number, y: number): CaretPoint | undefined {
    try {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
      const selectedCell = eventTarget.closest?.("td, th");
      if (selectedCell || eventTarget.closest?.("[data-okf-properties]")) return undefined;
      const editingElement = rt.blocks.editingElementFor(target).element;
      let container: Node | undefined;
      let offset: number | undefined;
      if (typeof document.caretRangeFromPoint === "function") {
        const range = document.caretRangeFromPoint(x, y);
        container = range?.startContainer;
        offset = range?.startOffset;
      } else if (typeof document.caretPositionFromPoint === "function") {
        const position = document.caretPositionFromPoint(x, y);
        container = position?.offsetNode;
        offset = position?.offset;
      }
      if (!container || container.nodeType !== 3 || !Number.isSafeInteger(offset)) return undefined;
      if (!editingElement.contains?.(container)) return undefined;
      if (typeof document.createTreeWalker !== "function") return undefined;
      const walker = document.createTreeWalker(editingElement, 4);
      let renderedOffset = 0;
      let found = false;
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node === container) {
          renderedOffset += offset!;
          found = true;
          break;
        }
        renderedOffset += String(node.nodeValue || "").length;
      }
      if (!found) return undefined;
      const text = String(editingElement.textContent || "");
      return {
        before: text.slice(Math.max(0, renderedOffset - 32), renderedOffset),
        after: text.slice(renderedOffset, renderedOffset + 32),
      };
    } catch {
      return undefined;
    }
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-014
  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-041
  // @implements_req SwRS-MDOKFSTUDIO-TABLE-001
  // @implements_req SwRS-MDOKFSTUDIO-TABLE-018
  function openMappedEditor(target: HTMLElement, eventTarget: Element, initialCaretPosition: CaretPosition = "end",
    reveal = false): void {
    if (eventTarget.closest?.("[data-okf-properties]")) return;
    rt.selection.clearBlockSelection();
    rt.selection.rememberSelectionAnchor(target);
    if (reveal) target.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    const selectedCell = eventTarget.closest?.<HTMLTableCellElement>("td, th");
    const table = selectedCell?.closest?.("table");
    if (state.activeBlockEdit?.openRefused) rt.blockEditor.closeBlockEdit(false);
    const edit = state.activeBlockEdit;
    if (edit?.selectedCell) {
      if (table === edit.selectedCell.closest("table")) {
        rt.tableCellEditor.switchTableCell(edit, selectedCell!, initialCaretPosition);
        return;
      }
      if (edit.finishing || !edit.tableModel) return;
      rt.blockEditor.rememberPendingBlockNavigation(target, initialCaretPosition, selectedCell ?? undefined);
      if (!rt.blockEditor.postBlockEditSave(true)) {
        rt.blockEditor.clearPendingBlockNavigation();
        openMappedEditor(target, eventTarget, initialCaretPosition, reveal);
      }
      return;
    }
    if (edit) {
      if (target === edit.target) return;
      // A block editor is open: its text is saved first and this block opens once the save is
      // rendered. A save already in flight is not posted again. An editor that cannot save
      // (its source has not arrived) keeps the click from doing anything, as before.
      rt.blockEditor.rememberPendingBlockNavigation(target, initialCaretPosition, selectedCell ?? undefined);
      if (!edit.finishing && !rt.blockEditor.postBlockEditSave(true)) {
        rt.blockEditor.clearPendingBlockNavigation();
        if (!state.activeBlockEdit) openMappedEditor(target, eventTarget, initialCaretPosition, reveal);
      }
      return;
    }
    if (selectedCell && table && !selectedCell.closest?.("[data-okf-properties]")) {
      rt.blockEditor.openBlockEditor(target, selectedCell, undefined, initialCaretPosition);
      return;
    }
    const editing = rt.blocks.editingElementFor(target);
    rt.blockEditor.openBlockEditor(editing.element, undefined, editing.sourceRange, initialCaretPosition);
  }

  function resumePendingBlockNavigation(): void {
    const pending = state.pendingBlockNavigation;
    if (!pending || !state.editMode) return;
    const sourceLine = Number(pending.sourceLine);
    const target = rt.blocks.topLevelMappedBlocks().find((element) =>
      (pending.blockId && element.getAttribute("data-sphinx-preview-block") === pending.blockId)
      || (!pending.blockId && Number(element.getAttribute("data-sphinx-source-line")) === sourceLine),
    );
    rt.blockEditor.clearPendingBlockNavigation();
    if (!target) return;
    const then = pending.thenMove;
    if (then && (then.direction === "up" || then.direction === "down")
      && Number.isSafeInteger(then.caretOffset)) {
      if (!rt.blockMoves.requestBlockMove(target, then.direction, "edit", then.caretOffset)) {
        openMappedEditor(target, target, { offset: then.caretOffset }, false);
      }
      return;
    }
    const caretPosition = pending.caretPosition === "start" ? "start" : "end";
    const table = target.closest?.("table");
    const cell = table?.rows?.[pending.tableRowIndex!]?.cells?.[pending.tableColumnIndex!];
    openMappedEditor(target, cell || target, caretPosition, true);
  }

  return {
    applyEditMode,
    setEditHover,
    openMappedEditor,
    clickCaretContext,
    resumePendingBlockNavigation,
    // @implements_req SwRS-MDOKFSTUDIO-LIFE-169
    bindButton() {
      rt.editModeButton?.addEventListener?.("click", () => {
        const nextEditMode = !state.editMode;
        // Posted before the toggle applies: leaving edit mode may post a block save, which stays last.
        host.postMessage({
          type: "previewEditModeChanged",
          documentId: context.documentId,
          revision: context.revision,
          requestId: context.requestId,
          editMode: nextEditMode,
        });
        applyEditMode(nextEditMode);
        const saved = host.getState?.();
        host.setState?.({
          ...(saved && typeof saved === "object" ? saved : {}),
          editMode: state.editMode,
        });
      });
    },
    bindHover() {
      document.addEventListener("mouseover", (event) => {
        if (rt.parts.figureEditButton.owns(event.target)) return;
        setEditHover(editHoverTarget(event.target));
      });
      document.addEventListener("mouseout", (event) => {
        if (rt.parts.figureEditButton.owns(event.relatedTarget)) return;
        setEditHover(editHoverTarget(event.relatedTarget));
      });
      document.addEventListener("focusin", (event) => setEditHover(editHoverTarget(event.target)));
      document.addEventListener("focusout", () => setEditHover(undefined));
    },
  };
}
