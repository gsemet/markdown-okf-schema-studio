/**
 * The text box of the block editor, built when the host sends the block's source
 * (`previewEditSource`): the raw Markdown text box with its palette above the frame, the `/` menu,
 * paste of images and rich text, and its keys (list continuation, indent, move, Done, Cancel). The
 * source of a table cell opens the cell editor instead (see `./tableCellEditor.ts`).
 */

import { createEditPalette } from "../modules/editPalette";
import { caretRectOf } from "../modules/caretRect";
import { imageParagraphEdit } from "../modules/pasteImage";
import { createSlashMenu } from "../modules/slashMenu";
import { isApplePlatform } from "../pageSettings";
import type { BlockSourceEditor, PageRuntime, PaletteMode } from "./pageRuntime";

/** The source editor of a page. */
export function installBlockSourceEditor(rt: PageRuntime): BlockSourceEditor {
  const { document, window, context, host, state } = rt;
  const { editorTrace, traceFocus } = rt.diagnostics;
  const { textEditing, editActions, figureTools, tableTools } = rt.tools;

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-029
  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-087
  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-216
  // @implements_req SwRS-MDOKFSTUDIO-PALETTE-001
  // @implements_req SwRS-MDOKFSTUDIO-TRUST-001
  // @implements_req SwRS-MDOKFSTUDIO-PALETTE-021
  // @implements_req SwRS-MDOKFSTUDIO-TABLE-001
  // @implements_req SwRS-MDOKFSTUDIO-TABLE-034
  const receiveBlockEditSource: BlockSourceEditor["receiveBlockEditSource"] = (message) => {
    if (rt.tableRowMove.receiveSource(message)) return;
    const edit = state.activeBlockEdit;
    if (!edit || message.editId !== edit.editId) return;
    const { blockEditor, editorChrome, textControls } = rt;
    const { hostRequests, pasteImage, pasteHtml } = rt.parts;
    if (typeof message.error === "string") {
      blockEditor.clearPendingBlockNavigation();
      state.pendingBlockSelection = undefined;
      edit.finishing = false;
      edit.lastPostedText = undefined;
      edit.status.textContent = message.error;
      edit.hintReplaced = Boolean(edit.textarea);
      // Nothing was ever opened: the frame keeps the reason and a Close button; Escape and a
      // click on another block leave it too.
      if (edit.originalText === undefined && !edit.textarea && !edit.tableInput) {
        edit.openRefused = true;
        if (rt.refreshButton) rt.refreshButton.disabled = false;
        if (!edit.element.querySelector?.("[data-sphinx-preview-open-refused-close]")) {
          const close = document.createElement("button");
          close.setAttribute("type", "button");
          close.setAttribute("data-sphinx-preview-open-refused-close", "");
          close.setAttribute("title", "Close (Esc)");
          close.textContent = "Close";
          close.addEventListener("click", () => {
            if (state.activeBlockEdit === edit) blockEditor.closeBlockEdit(false);
          });
          // The row of the Done and Cancel buttons gives it the same look.
          const row = document.createElement("div");
          row.className = "sphinx-preview-block-editor-buttons";
          row.appendChild(close);
          edit.element.appendChild(row);
        }
      }
      return;
    }
    if (typeof message.originalText !== "string" || edit.textarea || edit.tableInput) return;
    const originalText = message.originalText;
    edit.originalText = originalText;
    edit.lastPostedText = originalText;
    edit.hasAutosavedChange = false;
    edit.finishing = false;
    const carriageReturnLineFeed = String.fromCharCode(13) + String.fromCharCode(10);
    edit.trailingLineEnding = originalText.endsWith(carriageReturnLineFeed)
      ? carriageReturnLineFeed
      : originalText.endsWith(String.fromCharCode(10))
        ? String.fromCharCode(10)
        : originalText.endsWith(String.fromCharCode(13))
          ? String.fromCharCode(13)
          : "";
    if (edit.selectedCell) {
      const model = tableTools.parse(originalText) ?? tableTools.parseListTable(originalText);
      if (
        model
        && edit.tableRowIndex! < model.rows.length - 1
        && edit.tableColumnIndex! < model.rows[0]!.length
      ) {
        edit.tableModel = model;
        rt.tableCellEditor.renderTableCellEditor(edit);
        return;
      }
      blockEditor.restoreTableCellContent(edit);
      edit.selectedCell.removeAttribute("data-sphinx-preview-table-cell-selected");
      edit.selectedCell = undefined;
      edit.target.setAttribute("data-sphinx-preview-editing", "true");
      // The frame opened inside the clicked cell, and the table is hidden while it is edited as raw
      // Markdown (a {list-table}, a table the cell editor cannot read): the frame goes after the
      // table, where the editor of any other block sits, or it would vanish with the table.
      edit.target.insertAdjacentElement?.("afterend", edit.element);
      rt.scroll.beginEditAnchor(edit.element);
      edit.element.className = "sphinx-preview-block-editor";
      edit.element.removeAttribute("data-sphinx-preview-table-cell-editor");
      edit.element.setAttribute("aria-label", "Raw Markdown editor");
      edit.status.textContent = "";
    }
    edit.element.textContent = "";
    const textarea = document.createElement("textarea");
    textarea.setAttribute("aria-label", "Raw Markdown block");
    textarea.setAttribute("spellcheck", "false");
    textarea.setAttribute("autocorrect", "off");
    textarea.setAttribute("autocapitalize", "off");
    textarea.setAttribute("autocomplete", "off");
    if (edit.insertAfterLine !== undefined) {
      textarea.setAttribute("placeholder", 'Type Markdown, for example "## Heading" or "- item"');
    }
    const displayText = edit.trailingLineEnding
      ? originalText.slice(0, -edit.trailingLineEnding.length)
      : originalText;
    textarea.value = displayText;
    textarea.rows = 1;
    const resizeTextarea = (): void => {
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";
    };
    const hint = blockEditor.blockEditHint(edit);
    const actions = document.createElement("div");
    actions.className = "sphinx-preview-block-editor-actions";
    const buttons = blockEditor.createEditorButtons(edit);
    actions.appendChild(edit.status);
    actions.appendChild(buttons);
    textarea.addEventListener("input", () => {
      resizeTextarea();
      blockEditor.autosaveBlockEdit();
      if (edit.hintReplaced) {
        edit.hintReplaced = false;
        edit.status.textContent = hint;
      }
    });
    // @implements_req SwRS-MDOKFSTUDIO-BLOCK-047
    // Focus moving into the palette or a panel of the same frame is not leaving the editor; only
    // a focus that goes outside the frame (or nowhere) commits.
    textarea.addEventListener("blur", (event) => {
      const next = event && event.relatedTarget as Node | null;
      if (next && editorChrome.frameContains(edit, next)) return;
      // A native dialog of the host (the {doc} file picker) took the focus: not leaving.
      if (hostRequests.isDialogOpen()) return;
      blockEditor.saveBlockEdit();
    });
    textarea.addEventListener("blur", () => edit.slashMenu?.close());
    textarea.addEventListener("keydown", (event) => pasteHtml.noteKey(event));
    // @implements_req SwRS-MDOKFSTUDIO-PALETTE-213
    // Only this text box takes over a paste; the table cell editor has no paste listener (native paste).
    textarea.addEventListener("paste", (event) => {
      // An image on an otherwise empty clipboard first, then rich text; plain text stays native.
      if (pasteImage.handle(event, textarea, {
        send: (mime, dataBase64, done) => hostRequests.ask(
          "previewPasteImage", { mime, dataBase64 }, { timeoutMs: 30000 }, done),
        status: (text) => { edit.status.textContent = text; },
        isCurrent: () => state.activeBlockEdit === edit && !edit.finishing && edit.textarea === textarea,
        restoreStatus: () => { edit.status.textContent = hint; },
        // CR 050: the image goes on a paragraph of its own, never at the end of a text line.
        insert: (name, start, end) => {
          textControls.applyTextEdit(textarea, imageParagraphEdit(textarea.value, start, end, name), () => {
            resizeTextarea();
            blockEditor.autosaveBlockEdit();
          });
        },
      })) return;
      pasteHtml.handle(event, textarea, {
        send: (html, done) => hostRequests.ask("previewPasteHtml", { html }, { timeoutMs: 10000 }, done),
        isCurrent: () => state.activeBlockEdit === edit && !edit.finishing && edit.textarea === textarea,
        insert: (text, start, end) => {
          const length = textarea.value.length;
          const from = Math.min(start, length);
          const to = Math.max(from, Math.min(end, length));
          textControls.applyTextEdit(textarea, {
            start: from, end: to, text,
            selectionStart: from + text.length, selectionEnd: from + text.length,
          }, () => {
            resizeTextarea();
            blockEditor.autosaveBlockEdit();
          });
        },
      });
    });
    edit.status.textContent = hint;
    edit.element.appendChild(textarea);
    edit.element.appendChild(actions);
    edit.textarea = textarea;
    edit.resizeTextarea = resizeTextarea;
    resizeTextarea();
    // The edition palette sits on top of the frame, in a host holding both. The text line the user
    // clicked stays where it was: the anchor keeps the frame and the content above scrolls up by
    // the height the bar adds, but never so far that the bar would end under the sticky band or
    // the preview controls, and not at all on a page scrolled to its very top.
    const textTopBefore = textarea.getBoundingClientRect?.().top;
    edit.palette?.destroy();
    const palette = createEditPalette(document, {
      actions: editActions,
      getControl: () => textarea,
      getCaretRect: () => caretRectOf(document, window, textarea),
      applyTextEdit: (paletteEdit) => textControls.applyTextEdit(textarea, paletteEdit, () => {
        resizeTextarea();
        blockEditor.autosaveBlockEdit();
      }),
      openPanel: (action, panelName, focus) => {
        const onFallbackInput = (): void => {
          resizeTextarea();
          blockEditor.autosaveBlockEdit();
        };
        if ((panelName ?? action.panel) === "link") editorChrome.openLinkPanel(textarea, onFallbackInput);
        else if (panelName === "figure") editorChrome.openFigurePanel(textarea, onFallbackInput, false, focus);
      },
      caretInside: (kind) => kind === "figure"
        && figureTools.locateFigure(String(textarea.value ?? ""), Number(textarea.selectionStart)) !== undefined,
      mode: state.paletteMode,
      modeShortcut: (isApplePlatform() ? "Cmd" : "Ctrl") + "+Shift+M",
      isInsideFrame: (node) => editorChrome.frameContains(edit, node as Node | null | undefined),
      notify: (text) => {
        if (state.activeBlockEdit === edit && !edit.finishing) edit.status.textContent = text;
      },
      requestList: (kind, done) => hostRequests.ask(
        kind === "targets" ? "previewListTargets" : "previewListCitations", {}, {},
        (result) => done(result.ok === true && Array.isArray(result.items)
          ? { items: result.items, truncated: result.truncated === true }
          : { items: [], error: typeof result.reason === "string" ? result.reason : "The list could not be read." })),
      pickHost: (kind, done) => hostRequests.ask(
        kind === "image" ? "previewPickImage" : "previewPickDocument", {}, { dialog: true },
        (result) => {
          done(result.ok === true && typeof result.path === "string" ? result.path : undefined);
          if (result.ok !== true && state.activeBlockEdit === edit && typeof result.reason === "string") {
            edit.status.textContent = result.reason;
          }
        }),
      onLeave: () => {
        if (hostRequests.isDialogOpen()) return;
        if (state.activeBlockEdit === edit && !edit.finishing) blockEditor.saveBlockEdit();
      },
      onDone: () => {
        if (state.activeBlockEdit === edit) blockEditor.saveBlockEdit();
      },
      // @implements_req SwRS-MDOKFSTUDIO-LIFE-169
      onModeChange: (nextMode) => {
        state.paletteMode = nextMode as PaletteMode;
        host.postMessage({
          type: "previewPaletteModeChanged",
          documentId: context.documentId,
          revision: context.revision,
          requestId: context.requestId,
          mode: nextMode,
        });
        const saved = host.getState?.();
        host.setState?.({
          ...(saved && typeof saved === "object" ? saved : {}),
          paletteMode: state.paletteMode,
        });
      },
      apple: isApplePlatform(),
    });
    edit.palette = palette;
    // The slash command menu lists the palette's own entries and runs them through it.
    edit.slashMenu?.destroy();
    // @implements_req SwRS-MDOKFSTUDIO-PALETTE-232
    edit.slashMenu = createSlashMenu(document, window, {
      getControl: () => textarea,
      getEntries: () => palette.menuEntries(),
      run: (key, range) => palette.runMenuEntry(key, range),
      getCaretRect: () => caretRectOf(document, window, textarea),
      preferGroup: () => (state.paletteMode === "myst" ? "myst" : undefined),
    });
    editorChrome.placePaletteAboveFrame(edit, palette.element);
    editorChrome.syncPaletteSticky(edit);
    const shift = editorChrome.keepTextInPlaceBelowPalette(edit, textTopBefore);
    if (shift) edit.paletteShift = shift;
    rt.scroll.applyAnchor();
    textarea.addEventListener("mousedown", () => {
      palette.closePopover();
      edit.closeLinkPanel?.(false);
      edit.closeFigurePanel?.(false);
    });
    // @implements_req SwRS-MDOKFSTUDIO-PALETTE-031
    textarea.addEventListener("input", (event) => {
      palette.closePopover();
      edit.closeLinkPanel?.(false);
      edit.closeFigurePanel?.(false);
      palette.updateAvailability();
      editorChrome.revealCaretBelowPalette(edit, textarea);
      edit.slashMenu?.handleInput(event as InputEvent);
    });
    // The colour-code swatch follows the caret: arrows and selections end in a key or mouse release.
    for (const kind of ["keyup", "mouseup", "select"]) {
      textarea.addEventListener(kind, () => {
        palette.updateAvailability();
        editorChrome.revealCaretBelowPalette(edit, textarea);
        edit.slashMenu?.sync();
      });
    }
    // @implements_req SwRS-MDOKFSTUDIO-BLOCK-053
    // @implements_req SwRS-MDOKFSTUDIO-BLOCK-069
    // @implements_req SwRS-MDOKFSTUDIO-PALETTE-017
    textarea.addEventListener("keydown", (event) => {
      if (edit.slashMenu?.handleKey(event)) return;
      if (palette.handleKey(event)) return;
      // Cmd/Ctrl+Shift+M: keyboard path to the palette mode select.
      if (
        (event.key === "m" || event.key === "M" || event.code === "KeyM")
        && event.shiftKey && !event.altKey && !event.isComposing
        && (isApplePlatform() ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey)
      ) {
        event.preventDefault?.();
        event.stopPropagation?.();
        palette.focusModeSelect();
        return;
      }
      if (textControls.hostEditKey(event)) return;
      if (textControls.keepUndoInControl(event)) return;
      if (blockEditor.moveBlockFromEditor(event, textarea)) return;
      if (textControls.paletteShortcut(event, textarea, () => {
        resizeTextarea();
        blockEditor.autosaveBlockEdit();
      })) return;
      if (textControls.wrapSelectionInControl(event, textarea, () => {
        resizeTextarea();
        blockEditor.autosaveBlockEdit();
      })) return;
      if (blockEditor.navigateBlockEdit(event, textarea)) return;
      if (textControls.homeEndInControl(event, textarea)) return;
      if (
        event.key === "Enter"
        && !event.shiftKey && !event.altKey && !event.metaKey && !event.ctrlKey
        && !event.isComposing
      ) {
        // Enter in the alt text of an image (selected after a paste or a pick) validates it and
        // moves the caret just after the image; the alt text is one line, a newline is never wanted.
        const afterImage = editActions.imageAltExit({
          value: textarea.value,
          selectionStart: textarea.selectionStart,
          selectionEnd: textarea.selectionEnd,
          scope: "block",
        });
        if (afterImage !== undefined) {
          event.preventDefault?.();
          textarea.setSelectionRange(afterImage, afterImage);
          return;
        }
        const continuation = textEditing.continueOnEnter(
          textarea.value,
          textarea.selectionStart,
          textarea.selectionEnd,
        );
        if (continuation) {
          event.preventDefault?.();
          textControls.applyTextEdit(textarea, continuation, () => {
            resizeTextarea();
            blockEditor.autosaveBlockEdit();
          });
        }
        return;
      }
      if (
        event.key === "Tab"
        && !event.altKey && !event.metaKey && !event.ctrlKey
        && !event.isComposing
      ) {
        // Tab never leaves the editor; Escape (cancel) and Cmd/Ctrl+Enter (done) are the exits.
        event.preventDefault?.();
        const indentation = textEditing.indentSelection(
          textarea.value,
          textarea.selectionStart,
          textarea.selectionEnd,
          Boolean(event.shiftKey),
        );
        if (indentation) {
          textControls.applyTextEdit(textarea, indentation, () => {
            resizeTextarea();
            blockEditor.autosaveBlockEdit();
          });
        }
        return;
      }
      if (event.key === "Escape" && !event.isComposing) {
        event.preventDefault?.();
        rt.selection.finishEditorWithSelection("cancel", () => blockEditor.cancelBlockEdit());
      } else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault?.();
        rt.selection.finishEditorWithSelection("save", () => blockEditor.saveBlockEdit());
      }
    });
    textControls.focusTextControlAtLastContent(textarea, edit.initialCaretPosition);
    editorTrace.record("block editor focused", "line=" + edit.line + " " + traceFocus());
    if (edit.openFigureForm) {
      edit.openFigureForm = false;
      editorChrome.openFigurePanel(textarea, () => {
        resizeTextarea();
        blockEditor.autosaveBlockEdit();
      }, true);
    }
  };

  return { receiveBlockEditSource };
}
