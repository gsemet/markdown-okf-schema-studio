/**
 * The frontmatter editors of the properties table: the key editor of a field, the value editor (see
 * `./frontmatterValueEditor.ts`), their saves (`previewFrontmatterSave`) and results, the field
 * menu's add and remove, the editor the next render opens after an add, and the properties table
 * the host swaps in place (T30).
 */

import { createFrontmatterMenu } from "./frontmatterMenu";
import { openFrontmatterValueEditor } from "./frontmatterValueEditor";
import type { FrontmatterEdit, FrontmatterEditor, PageRuntime } from "./pageRuntime";

/** The frontmatter editors of a page. */
export function installFrontmatterEditor(rt: PageRuntime): FrontmatterEditor {
  const { document, context, host, state } = rt;
  const { editorTrace, traceFocus, traceStack } = rt.diagnostics;
  // True while the editor opened for the pending edit is still open (see resumePendingFrontmatterEdit).
  let pendingEditorOpen = false;

  function closeFrontmatterEditor(reason?: string): void {
    if (!state.activeFrontmatterEdit) return;
    const edit = state.activeFrontmatterEdit;
    editorTrace.record("frontmatter editor closed",
      (reason || "unspecified") + " field=" + edit.fieldName + " " + traceFocus(), traceStack());
    if (pendingEditorOpen) {
      pendingEditorOpen = false;
      clearPendingFrontmatterEdit();
    }
    edit.frontmatterMenu?.remove?.();
    edit.displayElement?.removeAttribute("hidden");
    rt.parts.motion.editorClosed(edit.displayElement);
    edit.valueCell.removeAttribute("data-okf-editing");
    edit.valueCell.removeAttribute("data-okf-key-editing");
    edit.editor.remove?.();
    state.activeFrontmatterEdit = undefined;
    if (!state.activeBlockEdit) state.editAnchor = undefined;
    if (!state.activeBlockEdit && rt.refreshButton) rt.refreshButton.disabled = false;
    if (state.deferredPropertiesMarkup !== undefined) {
      const markup = state.deferredPropertiesMarkup;
      state.deferredPropertiesMarkup = undefined;
      applyPropertiesMarkup(markup, state.deferredPropertiesSeq);
    }
  }

  // Swaps the host-rendered properties section in place (T30) instead of reloading the page. The
  // markup is built and escaped by the host (propertiesTable.ts); it goes through no other path.
  // seq numbers the host's properties messages: the page shows which one it applied last on
  // <html data-okf-properties-seq>, so a test can wait until the page shows the host's last table.
  function applyPropertiesMarkup(markup: string, seq: number | undefined): void {
    if (Number.isSafeInteger(seq)) {
      document.documentElement?.setAttribute?.("data-okf-properties-seq", String(seq));
    }
    editorTrace.record("properties table applied", "seq " + seq);
    rt.parts.linkTooltip.close();
    const main = document.getElementById?.("sphinx-myst-preview-content");
    if (!main) return;
    const existing = main.querySelector?.("[data-okf-properties]");
    if (markup === "") {
      existing?.remove?.();
    } else if (existing) {
      existing.insertAdjacentHTML("beforebegin", markup);
      existing.remove();
    } else {
      main.insertAdjacentHTML("afterbegin", markup);
    }
    setFrontmatterEditCells(state.editMode);
    rt.input.applyDescriptionVisibility();
    // The insertion points sit next to the properties section; rebuild them when it appeared or
    // went away, unless one of them hosts the open block editor.
    if (Boolean(existing) !== (markup !== "") && !state.activeBlockEdit) rt.insertPoints.refreshInsertPoints();
    rt.scroll.measure();
    rt.scroll.applyAnchor();
  }

  const postFrontmatterAction: FrontmatterEditor["postFrontmatterAction"] = (edit, action, fieldName, fieldValue, afterField) => {
    if (!edit || edit.saving || !fieldName) return;
    const editId = context.requestId + "-field-action-" + (++state.editSequence);
    edit.editId = editId;
    edit.saving = true;
    edit.control.disabled = true;
    edit.status.removeAttribute("data-visible");
    edit.status.removeAttribute("data-state");
    edit.status.textContent = action === "remove"
      ? "Removing frontmatter field..."
      : "Adding frontmatter field...";
    const message: Record<string, unknown> = {
      type: "previewFrontmatterSave",
      documentId: context.documentId,
      revision: context.revision,
      requestId: context.requestId,
      editId,
      frontmatterAction: action,
      fieldName,
      ...rt.scroll.frontmatterPinFields(edit.valueCell),
      ...rt.scroll.anchorField(),
    };
    if (action !== "remove") message.fieldValue = fieldValue;
    if (action === "add" && typeof afterField === "string" && afterField.length > 0) {
      message.afterField = afterField;
    }
    consumePendingFrontmatterEdit();
    if (action === "add") rememberPendingFrontmatterEdit(fieldName);
    host.postMessage(message);
  };

  function rememberPendingFrontmatterEdit(fieldName: string): void {
    state.pendingFrontmatterEdit = { fieldName, requestId: context.requestId };
    pendingEditorOpen = false;
    const saved = host.getState?.();
    host.setState?.({
      ...(saved && typeof saved === "object" ? saved : {}),
      pendingFrontmatterEdit: state.pendingFrontmatterEdit,
    });
  }

  // Any frontmatter message posted from the editor opened for the pending edit consumes it.
  function consumePendingFrontmatterEdit(): void {
    if (!pendingEditorOpen) return;
    pendingEditorOpen = false;
    clearPendingFrontmatterEdit();
  }

  function clearPendingFrontmatterEdit(): void {
    state.pendingFrontmatterEdit = undefined;
    state.pendingEditOpenedIn = undefined;
    const saved = host.getState?.();
    if (!saved || typeof saved !== "object") return;
    const nextState = { ...saved };
    delete nextState.pendingFrontmatterEdit;
    delete nextState.pendingFrontmatterEditOpenedIn;
    host.setState?.(nextState);
  }

  // @implements_req SwRS-MDOKFSTUDIO-FMEDIT-037
  // The pending edit is dropped as soon as it cannot be used, or when its editor closes. It is
  // kept across loads that cannot use it yet: a reload of the render that posted the add, or a
  // page without the rendered preview. A later load of the new render opens the editor, and a
  // repeated load of it opens the editor again.
  function resumePendingFrontmatterEdit(): void {
    const pending = state.pendingFrontmatterEdit;
    if (!pending) return;
    // A reload of the render that posted the add still shows the old document; wait for the next.
    if (pending.requestId !== undefined && pending.requestId === context.requestId) return;
    // The editor was already opened for a different render: the pending edit is spent.
    if (state.pendingEditOpenedIn !== undefined && state.pendingEditOpenedIn !== context.requestId) {
      clearPendingFrontmatterEdit();
      return;
    }
    const rows = Array.from(document.querySelectorAll("tr[data-okf-field]"));
    // The host first loads a page without the rendered preview; the rows come with the next load.
    if (rows.length === 0 && !rt.blocks.hasRenderedPreview()) return;
    const row = state.editMode && typeof pending.fieldName === "string"
      ? rows.find((candidate) => candidate.getAttribute("data-okf-field") === pending.fieldName)
      : undefined;
    if (!row || row.getAttribute("data-okf-editable") !== "true") {
      clearPendingFrontmatterEdit();
      return;
    }
    openFrontmatterEditor(row, { newField: true });
    if (openEdit()) {
      pendingEditorOpen = true;
      state.pendingEditOpenedIn = context.requestId;
      const saved = host.getState?.();
      host.setState?.({
        ...(saved && typeof saved === "object" ? saved : {}),
        pendingFrontmatterEditOpenedIn: context.requestId,
      });
    } else {
      clearPendingFrontmatterEdit();
    }
  }

  // The open frontmatter editor, read again after a call that may have opened one.
  function openEdit(): FrontmatterEdit | undefined {
    return state.activeFrontmatterEdit;
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-041
  // @implements_req SwRS-MDOKFSTUDIO-FMEDIT-024
  function openFrontmatterKeyEditor(row: Element, nameCell: Element): void {
    if (state.activeBlockEdit || state.activeFrontmatterEdit || row.getAttribute("data-okf-editable") !== "true") return;
    const name = row.getAttribute("data-okf-field");
    if (!name) return;
    let value: unknown;
    try {
      value = JSON.parse(row.getAttribute("data-okf-value") || "null");
    } catch {
      return;
    }
    const properties = nameCell.closest("[data-okf-properties]");
    let availableKeys: string[] = [];
    try {
      const keys: unknown = JSON.parse(properties?.getAttribute("data-okf-available-keys") || "[]");
      if (Array.isArray(keys)) availableKeys = keys.filter((key): key is string => typeof key === "string");
    } catch {
      availableKeys = [];
    }
    const displayElement = nameCell.querySelector?.(".okf-name-cell");
    const editor = document.createElement("div");
    editor.className = "sphinx-preview-frontmatter-editor sphinx-preview-frontmatter-key-editor";
    editor.setAttribute("data-okf-frontmatter-editor", "true");
    const control = document.createElement("input");
    control.type = "text";
    control.value = name;
    control.setAttribute("aria-label", "Frontmatter key " + name);
    const listId = "okf-frontmatter-key-options-" + context.requestId + "-" + (++state.editSequence);
    control.setAttribute("list", listId);
    const datalist = document.createElement("datalist");
    datalist.setAttribute("id", listId);
    for (const key of availableKeys) {
      const option = document.createElement("option");
      option.value = key;
      option.setAttribute("value", key);
      datalist.appendChild(option);
    }
    const status = document.createElement("p");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.setAttribute("data-okf-frontmatter-key-status", "true");
    let cancelled = false;
    const saveKey = (): void => {
      if (cancelled || control.disabled) return;
      // A flush keeps the key the reader typed minus the spaces around it; an empty key keeps the old one.
      const newFieldName = state.flushingEditors ? control.value.trim() : control.value;
      if (newFieldName === name || (state.flushingEditors && newFieldName === "")) {
        cancelled = true;
        closeFrontmatterEditor("key unchanged");
        return;
      }
      if (!newFieldName.trim() || newFieldName !== newFieldName.trim()) {
        status.textContent = "Enter a non-empty key without leading or trailing spaces.";
        status.setAttribute("data-state", "error");
        status.setAttribute("data-visible", "true");
        return;
      }
      const editId = context.requestId + "-key-" + (++state.editSequence);
      state.activeFrontmatterEdit = {
        valueCell: nameCell,
        displayElement,
        editor,
        control,
        status,
        editId,
        fieldName: name,
        fieldValue: value,
        // A refused plain save (a blur) is saved again as a flush when a navigation waits for it.
        plainSavePending: !state.flushingEditors,
        cancel: () => { cancelled = true; },
        save: () => saveKey(),
      };
      nameCell.setAttribute("data-okf-editing", "true");
      nameCell.setAttribute("data-okf-key-editing", "true");
      if (rt.refreshButton) rt.refreshButton.disabled = true;
      control.disabled = true;
      status.removeAttribute("data-visible");
      status.removeAttribute("data-state");
      status.textContent = "Saving frontmatter key…";
      consumePendingFrontmatterEdit();
      host.postMessage({
        type: "previewFrontmatterSave",
        documentId: context.documentId,
        revision: context.revision,
        requestId: context.requestId,
        editId,
        fieldName: name,
        newFieldName,
        fieldValue: value,
        ...(state.flushingEditors ? { flush: true } : {}),
        ...rt.scroll.frontmatterPinFields(nameCell),
        ...rt.scroll.anchorField(),
      });
    };
    control.addEventListener("keydown", (event) => {
      if (rt.textControls.keepUndoInControl(event)) return;
      if (event.key === "Escape") {
        event.preventDefault?.();
        cancelled = true;
        closeFrontmatterEditor("Escape in key editor");
      } else if (event.key === "Enter") {
        event.preventDefault?.();
        saveKey();
      }
    });
    control.addEventListener("blur", (event) => {
      const relatedTarget = event.relatedTarget as Element | null;
      if (relatedTarget?.closest?.("[data-okf-frontmatter-menu]")) return;
      saveKey();
    });
    editor.appendChild(control);
    editor.appendChild(datalist);
    editor.appendChild(status);
    displayElement?.setAttribute("hidden", "");
    nameCell.setAttribute("data-okf-editing", "true");
    nameCell.setAttribute("data-okf-key-editing", "true");
    rt.scroll.beginEditAnchor(nameCell);
    nameCell.appendChild(editor);
    const edit: FrontmatterEdit = {
      valueCell: nameCell,
      displayElement,
      editor,
      control,
      status,
      fieldName: name,
      fieldValue: value,
      cancel: () => { cancelled = true; },
      save: () => saveKey(),
    };
    state.activeFrontmatterEdit = edit;
    if (rt.refreshButton) rt.refreshButton.disabled = true;
    createFrontmatterMenu(rt, edit, nameCell, properties);
    rt.textControls.focusTextControlAtLastContent(control);
  }

  function openFrontmatterEditor(row: Element, options?: { newField?: boolean; toggleBoolean?: boolean }): void {
    openFrontmatterValueEditor(rt, row, options);
  }

  // @implements_req SwRS-MDOKFSTUDIO-FMEDIT-019
  function receiveFrontmatterResult(message: Parameters<FrontmatterEditor["receiveFrontmatterResult"]>[0]): void {
    const edit = state.activeFrontmatterEdit;
    if (!edit || message.editId !== edit.editId) return;
    edit.plainSavePending = false;
    const afterResult = edit.afterResult;
    edit.afterResult = undefined;
    if (message.saved === true) {
      edit.status.removeAttribute("data-visible");
      edit.status.removeAttribute("data-state");
      edit.status.textContent = "Saved. Refreshing preview…";
      afterResult?.();
      return;
    }
    clearPendingFrontmatterEdit();
    edit.status.textContent = typeof message.error === "string"
      ? message.error
      : "The frontmatter edit could not be applied.";
    edit.status.setAttribute("data-state", "error");
    edit.status.setAttribute("data-visible", "true");
    edit.saving = false;
    edit.control.disabled = false;
    if (edit.setNullButton) edit.setNullButton.disabled = false;
    edit.setDisabled?.(false);
    // A navigation waiting for this refused save now saves the typed text again, as a flush.
    afterResult?.();
  }

  // @implements_req SwRS-MDOKFSTUDIO-FMEDIT-001
  function setFrontmatterEditCells(enabled: boolean): void {
    document.querySelectorAll?.("[data-okf-edit-cell]").forEach((cell) => {
      if (enabled) {
        cell.setAttribute("tabindex", "0");
      } else {
        cell.removeAttribute("tabindex");
      }
    });
  }

  // @implements_req SwRS-MDOKFSTUDIO-FMEDIT-067
  // Saves the open frontmatter editor as a flush (typed text is kept whatever it holds).
  function flushFrontmatterEditor(): boolean {
    const frontmatterEdit = state.activeFrontmatterEdit;
    if (!frontmatterEdit || frontmatterEdit.saving || typeof frontmatterEdit.save !== "function") return false;
    state.flushingEditors = true;
    try {
      frontmatterEdit.save();
    } finally {
      state.flushingEditors = false;
    }
    const after = openEdit();
    return Boolean(after?.saving || after?.editId);
  }

  return {
    openFrontmatterEditor,
    openFrontmatterKeyEditor,
    closeFrontmatterEditor,
    applyPropertiesMarkup,
    receiveFrontmatterResult,
    setFrontmatterEditCells,
    postFrontmatterAction,
    consumePendingFrontmatterEdit,
    resumePendingFrontmatterEdit,
    flushFrontmatterEditor,
    bindKeys() {
      // Escape cancels the open frontmatter edit from anywhere inside the properties section, for
      // example the field picker or a header cell, as it does inside the field control itself.
      document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        const edit = state.activeFrontmatterEdit;
        if (!edit || edit.saving || edit.control?.disabled) return;
        const target = event.target as Element | null;
        if (!target || typeof target.closest !== "function" || !target.closest("[data-okf-properties]")) return;
        event.preventDefault?.();
        edit.cancel?.();
        closeFrontmatterEditor("Escape in properties");
      });
    },
  };
}
