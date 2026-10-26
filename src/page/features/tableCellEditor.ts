/**
 * The cell editor of a pipe table: a one-cell text box in the clicked cell, the table toolbar above
 * the table (rows, columns, conversion to a list-table, and the inline palette of a cell), Tab and
 * the arrow keys from cell to cell, and the commit when the focus leaves the cell. The edit works
 * on the parsed table model; every save writes the whole table back.
 */

import { caretRectOf } from "../modules/caretRect";
import { createEditPalette } from "../modules/editPalette";
import { createSlashMenu } from "../modules/slashMenu";
import { stickyBarShift } from "../modules/stickyBar";
import { isApplePlatform } from "../pageSettings";
import type { BlockEdit, CaretPosition, PageRuntime, TableCellEditor } from "./pageRuntime";

/** The table model row of a rendered row: the model also holds the delimiter row after the header. */
function modelRowOf(renderedRow: number): number {
  return renderedRow === 0 ? 0 : renderedRow + 1;
}

/** The cell editor of a page. */
export function installTableCellEditor(rt: PageRuntime): TableCellEditor {
  const { document, window, state } = rt;
  const { editorTrace, traceFocus } = rt.diagnostics;
  const { tableTools, editActions } = rt.tools;
  // A cell editor must never stay open without focus. A pointer press in the last 500 ms means a
  // click is in progress and the click handlers decide what happens.
  let lastPointerDownAt = 0;

  function switchTableCell(edit: BlockEdit, selectedCell: HTMLTableCellElement, caretPosition: CaretPosition): void {
    if (edit.finishing || !edit.tableModel || edit.selectedCell === selectedCell) return;
    const rowIndex = (selectedCell.parentElement as HTMLTableRowElement).rowIndex;
    const columnIndex = selectedCell.cellIndex;
    const modelRowIndex = modelRowOf(rowIndex);
    if (!edit.tableModel.rows[modelRowIndex] || columnIndex >= edit.tableModel.rows[modelRowIndex].length) return;
    const previousRowIndex = modelRowOf(edit.tableRowIndex!);
    edit.tableModel.rows[previousRowIndex]![edit.tableColumnIndex!] = edit.tableInput!.value;
    rt.blockEditor.postBlockEditSave(false);
    rt.blockEditor.restoreTableCellContent(edit);
    edit.selectedCell!.removeAttribute("data-sphinx-preview-table-cell-selected");
    edit.element.remove();
    edit.selectedCell = selectedCell;
    edit.tableRowIndex = rowIndex;
    edit.tableColumnIndex = columnIndex;
    edit.initialCaretPosition = caretPosition;
    edit.renderedCellContent = rt.blockEditor.hideTableCellContent(selectedCell);
    selectedCell.setAttribute("data-sphinx-preview-table-cell-selected", "true");
    selectedCell.appendChild(edit.element);
    rt.scroll.beginEditAnchor(selectedCell);
    renderTableCellEditor(edit);
  }

  // @implements_req SwRS-MDOKFSTUDIO-TABLE-035
  // Tab / Shift+Tab: next or previous rendered cell, wrapping across rows; Tab on the last cell
  // adds a row and resumes in its first cell after the re-render.
  function tabThroughTableCells(edit: BlockEdit, backwards: boolean): void {
    if (edit.finishing || !edit.tableModel || !edit.selectedCell || !edit.tableInput) return;
    const table = edit.selectedCell.closest?.("table");
    const rows = table?.rows;
    if (!rows || typeof rows.length !== "number") return;
    const cellAt = (rowIndex: number, columnIndex: number): HTMLTableCellElement | undefined =>
      rows[rowIndex]?.cells?.[columnIndex];
    let rowIndex = edit.tableRowIndex!;
    let columnIndex = edit.tableColumnIndex!;
    if (backwards) {
      columnIndex -= 1;
      if (columnIndex < 0) {
        rowIndex -= 1;
        if (rowIndex < 0) return;
        columnIndex = (rows[rowIndex]?.cells?.length ?? 0) - 1;
      }
    } else {
      columnIndex += 1;
      if (columnIndex >= (rows[rowIndex]?.cells?.length ?? 0)) {
        rowIndex += 1;
        columnIndex = 0;
      }
    }
    if (rowIndex >= rows.length) {
      const modelRowIndex = modelRowOf(edit.tableRowIndex!);
      edit.tableModel.rows[modelRowIndex]![edit.tableColumnIndex!] = edit.tableInput.value;
      const newRow = tableTools.insertRowAfter(edit.tableModel, edit.tableRowIndex!);
      rt.blockEditor.rememberPendingBlockNavigation(edit.target, "end", undefined, {
        tableRowIndex: newRow,
        tableColumnIndex: 0,
      });
      if (!rt.blockEditor.postBlockEditSave(true)) rt.blockEditor.clearPendingBlockNavigation();
      return;
    }
    const cell = cellAt(rowIndex, columnIndex);
    if (cell) switchTableCell(edit, cell, "end");
  }

  // Arrow keys at the edge of the field move to the neighbouring rendered cell (same row for
  // Left/Right, same column for Up/Down) through the same switch as Tab. With no cell in that
  // direction the event is left to the block-to-block navigation.
  function arrowThroughTableCells(edit: BlockEdit, event: KeyboardEvent, control: HTMLTextAreaElement): boolean {
    if (event.isComposing || edit.finishing || !edit.tableModel || !edit.selectedCell) return false;
    const navigation = rt.textControls.boundaryNavigation(control, event);
    if (!navigation) return false;
    const rows = edit.selectedCell.closest?.("table")?.rows;
    if (!rows || typeof rows.length !== "number") return false;
    let rowIndex = edit.tableRowIndex!;
    let columnIndex = edit.tableColumnIndex!;
    if (event.key === "ArrowLeft") columnIndex -= 1;
    else if (event.key === "ArrowRight") columnIndex += 1;
    else if (event.key === "ArrowUp") rowIndex -= 1;
    else if (event.key === "ArrowDown") rowIndex += 1;
    else return false;
    const cell = rows[rowIndex]?.cells?.[columnIndex];
    if (!cell) return false;
    // Same validity test as switchTableCell, so a cell missing from the model row falls back.
    const modelRow = edit.tableModel.rows[modelRowOf(rowIndex)];
    if (!modelRow || columnIndex >= modelRow.length) return false;
    event.preventDefault?.();
    switchTableCell(edit, cell, navigation.caretPosition);
    return true;
  }

  function commitCellEditorOnFocusLoss(edit: BlockEdit, input: HTMLTextAreaElement): void {
    window.setTimeout(() => {
      if (state.activeBlockEdit !== edit || edit.finishing || edit.tableInput !== input) return;
      if (Date.now() - lastPointerDownAt < 500) return;
      const active = document.activeElement;
      const documentFocused = typeof document.hasFocus === "function" ? document.hasFocus() : true;
      const focusInside = documentFocused && active
        && (edit.element === active || edit.element.contains?.(active)
          || edit.tableMenu === active || edit.tableMenu?.contains?.(active));
      if (focusInside) return;
      rt.blockEditor.saveBlockEdit();
    }, 0);
  }

  // @implements_req SwRS-MDOKFSTUDIO-TABLE-064
  // CR 034: the table toolbar stays in view while a tall table scrolls. It keeps its place above the
  // table (the table's text never moves) and is translated down to just under the sticky band or
  // the preview controls, never past the table's bottom. A bar over 40% of the viewport stays put.
  function syncTableMenuSticky(edit: BlockEdit): void {
    const menu = edit.tableMenu;
    const table = edit.selectedCell?.closest?.("table");
    if (!menu || !table || edit.finishing || state.activeBlockEdit !== edit) return;
    const bar = menu.getBoundingClientRect?.();
    const tableRect = table.getBoundingClientRect?.();
    if (!bar || !tableRect || !Number.isFinite(bar.top)) return;
    const current = Number.parseFloat(menu.style?.getPropertyValue?.("--sphinx-preview-table-menu-shift")) || 0;
    const natural = { top: bar.top - current, left: bar.left, right: bar.right, width: bar.width };
    const small = bar.height <= window.innerHeight * 0.4;
    // Only once the table's own top is under the band or the controls: while the table top is in
    // view the bar keeps its place above the table and never covers a row.
    const usable = rt.editorChrome.toolbarUsableTop(natural);
    const shift = small && tableRect.top < usable
      ? stickyBarShift(natural.top, bar.height, usable, tableRect.bottom)
      : 0;
    if (shift > 0) menu.setAttribute("data-sphinx-table-menu-stuck", "true");
    else menu.removeAttribute("data-sphinx-table-menu-stuck");
    menu.style?.setProperty?.("--sphinx-preview-table-menu-shift", shift + "px");
  }

  // @implements_req SwRS-MDOKFSTUDIO-TABLE-001
  // @implements_req SwRS-MDOKFSTUDIO-TABLE-055
  // @implements_req SwRS-MDOKFSTUDIO-TABLE-091
  function renderTableCellEditor(edit: BlockEdit): void {
    const { blockEditor, textControls } = rt;
    const { hostRequests } = rt.parts;
    const selectedCell = edit.selectedCell!;
    const modelRowIndex = modelRowOf(edit.tableRowIndex!);
    const row = edit.tableModel!.rows[modelRowIndex]!;
    edit.tableColumnIndex = Math.max(0, Math.min(edit.tableColumnIndex!, row.length - 1));
    // The panel and popover belong to the control that is about to be replaced.
    edit.closeLinkPanel?.(false);
    edit.cellPalette?.closePopover();
    edit.cellSlash?.close();
    edit.element.textContent = "";

    const input = document.createElement("textarea");
    input.rows = 1;
    input.setAttribute("spellcheck", "false");
    input.setAttribute("aria-label", "Markdown table cell");
    input.value = row[edit.tableColumnIndex]!;
    // @implements_req SwRS-MDOKFSTUDIO-TABLE-006
    // The cell grows with its text: the field has no scrollbar and the buttons sit beneath it.
    const resizeInput = (): void => {
      input.style.height = "auto";
      input.style.height = input.scrollHeight + "px";
    };
    // @implements_req SwRS-MDOKFSTUDIO-TABLE-013
    const rememberCellValue = (): void => {
      // Any later change wins over a conversion that was not saved.
      edit.convertedText = undefined;
      const selectedRow = modelRowOf(edit.tableRowIndex!);
      edit.tableModel!.rows[selectedRow]![edit.tableColumnIndex!] = input.value;
    };
    input.addEventListener("input", () => {
      // A pasted or dropped line break would split the source row: it becomes a space.
      if (/[\r\n]/u.test(input.value)) {
        const flat = (text: string): string => text.replace(/\r\n|[\r\n]/gu, " ");
        const caret = input.selectionStart;
        const flatCaret = typeof caret === "number" ? flat(input.value.slice(0, caret)).length : undefined;
        input.value = flat(input.value);
        if (flatCaret !== undefined) input.setSelectionRange?.(flatCaret, flatCaret);
      }
      resizeInput();
      rememberCellValue();
      blockEditor.autosaveBlockEdit();
    });

    const menu = edit.tableMenu || document.createElement("div");
    menu.textContent = "";
    // @implements_req SwRS-MDOKFSTUDIO-TABLE-048
    if (!edit.tableMenu) {
      menu.className = "sphinx-preview-table-menu";
      menu.setAttribute("role", "toolbar");
      menu.setAttribute("aria-label", "Table row and column actions");
      menu.setAttribute("data-sphinx-table-menu", "true");
      menu.addEventListener("click", (event) => event.stopPropagation?.());
      // In the document flow, directly above the table (or its single-child wrapper), so the
      // toolbar never covers a row. The edit anchor keeps the selected cell fixed on screen.
      const table = selectedCell.closest?.("table");
      let placeBefore: HTMLElement | null | undefined = table;
      const wrapper = table?.parentElement;
      const wrapperChildren = wrapper?.children || (wrapper as { childElements?: HTMLCollection } | null | undefined)?.childElements;
      if (wrapper && wrapper.tagName === "DIV" && wrapperChildren && wrapperChildren.length === 1
        && wrapper.getAttribute("data-sphinx-source-line") === null) {
        placeBefore = wrapper;
      }
      if (placeBefore && placeBefore.parentElement) {
        placeBefore.parentElement.insertBefore(menu, placeBefore);
      } else {
        document.body.appendChild(menu);
      }
      edit.tableMenu = menu;
      // The bar rides down with the page while its table scrolls (CR 034), and follows a resize.
      edit.tableMenuPositionListener = () => syncTableMenuSticky(edit);
      window.addEventListener("scroll", edit.tableMenuPositionListener, true);
      window.addEventListener("resize", edit.tableMenuPositionListener);
      rt.scroll.applyAnchor();
    }
    const actionButtons: HTMLButtonElement[] = [];
    const tableActionIcons = {
      addRow: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 3.5h16v13H4z"></path><path d="M4 8h16M9.5 3.5v13M14.5 3.5v13M12 19v4M9.5 21.5h5"></path></svg>',
      deleteRow: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 3.5h16v13H4z"></path><path d="M4 8h16M9.5 3.5v13M14.5 3.5v13M9.5 21.5h5"></path></svg>',
      addRowAbove: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7.5h16v13H4z"></path><path d="M4 16h16M9.5 7.5v13M14.5 7.5v13M12 1v4M9.5 2.5h5"></path></svg>',
      addColumnBefore: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7.5 4h13v16h-13z"></path><path d="M16 4v16M11.5 4v16M7 9H1M4 6v6"></path></svg>',
      addColumn: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3.5 4h13v16h-13z"></path><path d="M8 4v16M12.5 4v16M17 9h6M20 6v6"></path></svg>',
      deleteColumn: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3.5 4h13v16h-13z"></path><path d="M8 4v16M12.5 4v16M17 9h6"></path></svg>',
      listTable: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 5h16v14H4z"></path><path d="M4 10h16M9 5v14M6 7.5h.01M6 14.5h.01M12 14.5h6"></path></svg>',
    };
    const addAction = (name: string, icon: string, label: string, handler: () => void, disabled: boolean,
      group: string): void => {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("aria-label", name);
      button.setAttribute("title", name);
      button.setAttribute("data-tooltip", name);
      button.setAttribute("data-sphinx-table-operation", name);
      button.setAttribute("data-sphinx-table-group", group);
      button.innerHTML = icon;
      const labelText = document.createElement("span");
      labelText.className = "sphinx-preview-table-menu-label";
      labelText.textContent = label;
      button.appendChild(labelText);
      button.disabled = disabled;
      button.addEventListener("click", () => {
        rememberCellValue();
        handler();
        if (!edit.finishing) renderTableCellEditor(edit);
      });
      menu.appendChild(button);
      actionButtons.push(button);
    };
    // A structural button changes the table, so the table is saved and rendered again, and the
    // editor reopens in the cell the press selects (the DOM of the open editor has no such cell).
    const structural = (change: () => void): void => {
      edit.closeLinkPanel?.(false);
      edit.cellPalette?.closePopover();
      edit.cellSlash?.close();
      change();
      blockEditor.rememberPendingBlockNavigation(edit.target, "end", undefined, {
        tableRowIndex: edit.tableRowIndex!,
        tableColumnIndex: edit.tableColumnIndex!,
      });
      if (!blockEditor.postBlockEditSave(true)) blockEditor.clearPendingBlockNavigation();
    };
    addAction("Insert row before selected row", tableActionIcons.addRowAbove, "Row above", () => structural(() => {
      const row = tableTools.insertRowBefore(edit.tableModel!, edit.tableRowIndex!);
      if (row !== undefined) edit.tableRowIndex = row;
    }), edit.tableRowIndex === 0, "row");
    addAction("Insert row after selected row", tableActionIcons.addRow, "Row below", () => structural(() => {
      edit.tableRowIndex = tableTools.insertRowAfter(edit.tableModel!, edit.tableRowIndex!);
    }), false, "row");
    addAction("Delete selected row", tableActionIcons.deleteRow, "Row −", () => structural(() => {
      const nextRow = tableTools.deleteRow(edit.tableModel!, edit.tableRowIndex!);
      if (nextRow !== undefined) edit.tableRowIndex = nextRow;
    }), edit.tableRowIndex === 0 || edit.tableModel!.rows.length <= 3, "row");
    addAction("Insert column before selected column", tableActionIcons.addColumnBefore, "Col left", () => structural(() => {
      edit.tableColumnIndex = tableTools.insertColumnBefore(edit.tableModel!, edit.tableColumnIndex!);
    }), false, "column");
    addAction("Insert column after selected column", tableActionIcons.addColumn, "Col right", () => structural(() => {
      edit.tableColumnIndex = tableTools.insertColumnAfter(edit.tableModel!, edit.tableColumnIndex!);
    }), false, "column");
    addAction("Delete selected column", tableActionIcons.deleteColumn, "Col −", () => structural(() => {
      const nextColumn = tableTools.deleteColumn(edit.tableModel!, edit.tableColumnIndex!);
      if (nextColumn !== undefined) edit.tableColumnIndex = nextColumn;
    }), edit.tableModel!.rows[0]!.length <= 1, "column");
    // Table level: the pipe table becomes a {list-table}, written back as one edit (one undo step).
    // A table captioned by a {table} directive sits in a figure; wrapping a list-table in it is not
    // offered.
    const tableFigure = selectedCell.closest?.("table")?.parentElement?.tagName === "FIGURE";
    // @implements_req SwRS-MDOKFSTUDIO-TABLE-070
    addAction("Convert to list-table", tableActionIcons.listTable, "List table", () => {
      const converted = tableTools.convertTable(tableTools.serialize(edit.tableModel!), "list-table");
      if (converted && converted.ok) {
        edit.convertedText = converted.text;
        blockEditor.saveBlockEdit();
      }
    }, tableFigure || Boolean(edit.tableModel!.listTable), "table");

    // The inline buttons allowed in a cell join the bar after a separator; the same group object
    // is kept for the whole edit and only moved into each rebuilt bar.
    const rememberAndAutosave = (): void => {
      resizeInput();
      rememberCellValue();
      blockEditor.autosaveBlockEdit();
    };
    edit.tableInput = input;
    // @implements_req SwRS-MDOKFSTUDIO-TABLE-085
    if (!edit.cellPalette) {
      edit.cellPalette = createEditPalette(document, {
        actions: editActions,
        scope: "cell",
        getControl: () => edit.tableInput!,
        getCaretRect: () => caretRectOf(document, window, edit.tableInput!),
        applyTextEdit: (paletteEdit) => textControls.applyTextEdit(edit.tableInput!, paletteEdit, rememberAndAutosave),
        openPanel: (action, panelName) => {
          if ((panelName ?? action.panel) === "link") rt.editorChrome.openLinkPanel(edit.tableInput!, rememberAndAutosave);
        },
        caretInside: () => false,
        mode: state.paletteMode,
        isInsideFrame: (node) => Boolean(node)
          && (node === edit.element || edit.element.contains(node as Node)
            || (Boolean(edit.tableMenu) && edit.tableMenu!.contains(node as Node))),
        requestList: (kind, done) => hostRequests.ask(
          kind === "targets" ? "previewListTargets" : "previewListCitations", {}, {},
          (result) => done(result.ok === true && Array.isArray(result.items)
            ? { items: result.items, truncated: result.truncated === true }
            : { items: [], error: typeof result.reason === "string" ? result.reason : "The list could not be read." })),
        pickHost: (kind, done) => hostRequests.ask(
          kind === "image" ? "previewPickImage" : "previewPickDocument", {}, { dialog: true },
          (result) => done(result.ok === true && typeof result.path === "string" ? result.path : undefined)),
        onLeave: () => {
          if (hostRequests.isDialogOpen()) return;
          if (state.activeBlockEdit === edit && !edit.finishing) blockEditor.saveBlockEdit();
        },
        onDone: () => {
          if (state.activeBlockEdit === edit) blockEditor.saveBlockEdit();
        },
        apple: isApplePlatform(),
      });
    }
    const cellPalette = edit.cellPalette;
    // @implements_req SwRS-MDOKFSTUDIO-PALETTE-001
    cellPalette.setMode(state.paletteMode);
    if (!edit.cellSlash) {
      edit.cellSlash = createSlashMenu(document, window, {
        getControl: () => edit.tableInput!,
        getEntries: () => cellPalette.menuEntries(),
        run: (key, range) => cellPalette.runMenuEntry(key, range),
        getCaretRect: () => caretRectOf(document, window, edit.tableInput!),
        preferGroup: () => (state.paletteMode === "myst" ? "myst" : undefined),
      });
    }
    const separator = document.createElement("span");
    separator.setAttribute("role", "separator");
    separator.setAttribute("aria-orientation", "vertical");
    separator.className = "sphinx-preview-table-menu-separator";
    // The rule and the group are one flex item: when the group wraps, the rule goes with it.
    const cellGroup = document.createElement("div");
    cellGroup.className = "sphinx-preview-table-menu-cell-group";
    cellGroup.appendChild(separator);
    cellGroup.appendChild(cellPalette.element);
    menu.appendChild(cellGroup);

    const columnCount = edit.tableModel!.rows[0]!.length;
    const columnText = "column " + (edit.tableColumnIndex + 1) + " of " + columnCount;
    edit.status.textContent = edit.tableRowIndex === 0
      ? "Header · " + columnText
      : "Row " + edit.tableRowIndex + " of " + (edit.tableModel!.rows.length - 2) + " · " + columnText;
    menu.appendChild(edit.status);
    // The menu now has its items: check them against the floating controls.
    rt.scroll.applyAnchor();
    edit.element.appendChild(input);
    // Done and Cancel under the field, without the status hint (the toolbar carries the position).
    const cellActions = document.createElement("div");
    cellActions.className = "sphinx-preview-block-editor-actions";
    cellActions.appendChild(blockEditor.createEditorButtons(edit));
    edit.element.appendChild(cellActions);
    resizeInput();
    syncTableMenuSticky(edit);
    // stabilizeLayout (window and content resize) re-fits the field when the width changes.
    edit.resizeTextarea = resizeInput;
    edit.tableInput = input;
    edit.actionButtons = actionButtons;
    input.addEventListener("blur", () => {
      edit.cellSlash?.close();
      commitCellEditorOnFocusLoss(edit, input);
    });
    // Clicking or typing in the cell closes what the bar opened, as in a block editor.
    input.addEventListener("mousedown", () => {
      edit.cellPalette?.closePopover();
      edit.closeLinkPanel?.(false);
    });
    input.addEventListener("input", (event) => {
      edit.cellPalette?.closePopover();
      edit.closeLinkPanel?.(false);
      edit.cellPalette?.updateAvailability();
      edit.cellSlash?.handleInput(event as InputEvent);
    });
    for (const kind of ["keyup", "mouseup", "select"]) {
      input.addEventListener(kind, () => {
        edit.cellPalette?.updateAvailability();
        edit.cellSlash?.sync();
      });
    }
    // @implements_req SwRS-MDOKFSTUDIO-TABLE-018
    // @implements_req SwRS-MDOKFSTUDIO-TABLE-025
    input.addEventListener("keydown", (event) => {
      if (edit.cellSlash?.handleKey(event)) return;
      if (edit.cellPalette?.handleKey(event)) return;
      if (textControls.hostEditKey(event)) return;
      if (textControls.keepUndoInControl(event)) return;
      if (textControls.paletteShortcut(event, input, rememberAndAutosave)) return;
      if (textControls.wrapSelectionInControl(event, input, () => {
        resizeInput();
        rememberCellValue();
        blockEditor.autosaveBlockEdit();
      })) return;
      if (event.key === "Tab" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault?.();
        tabThroughTableCells(edit, Boolean(event.shiftKey));
        return;
      }
      if (arrowThroughTableCells(edit, event, input)) return;
      if (blockEditor.navigateBlockEdit(event, input)) return;
      if (textControls.homeEndInControl(event, input)) return;
      if (event.key === "Escape" && !event.isComposing) {
        event.preventDefault?.();
        blockEditor.cancelBlockEdit();
      } else if (event.key === "Enter") {
        event.preventDefault?.();
        blockEditor.saveBlockEdit();
      }
    });
    textControls.focusTextControlAtLastContent(input, edit.initialCaretPosition);
    editorTrace.record("cell editor focused", "line=" + edit.line + " row=" + edit.tableRowIndex
      + " column=" + edit.tableColumnIndex + " " + traceFocus());
  }

  return {
    switchTableCell,
    renderTableCellEditor,
    bindKeys() {
      document.addEventListener("pointerdown", () => {
        lastPointerDownAt = Date.now();
      }, true);
      // Escape outside an open cell editor cancels it; it also closes the frame of a refused open.
      document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        const edit = state.activeBlockEdit;
        if (!edit || edit.finishing) return;
        // The frame of a refused open has no text box: Escape anywhere closes it.
        if (edit.openRefused) {
          event.preventDefault?.();
          rt.blockEditor.closeBlockEdit(false);
          return;
        }
        if (!edit.selectedCell) return;
        const inside = (node: EventTarget | null): boolean => Boolean(node)
          && (edit.element === node || Boolean(edit.element.contains?.(node as Node)));
        if (inside(event.target) || inside(document.activeElement)) return;
        event.preventDefault?.();
        rt.blockEditor.cancelBlockEdit();
      });
    },
  };
}
