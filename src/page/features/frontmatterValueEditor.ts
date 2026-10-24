/**
 * The value editor of a frontmatter field, opened in its cell of the properties table: a select for
 * a schema enum, a list editor for a list (see `./frontmatterListEditor.ts`), a YAML text box for
 * structured or unknown values, a one-line text box for text, a checkbox, or a number, date or time
 * input. Enter or a blur saves (`previewFrontmatterSave`), Escape cancels, Set to null writes null.
 */

import { createFrontmatterMenu } from "./frontmatterMenu";
import { buildFrontmatterListEditor, type FrontmatterListEditor } from "./frontmatterListEditor";
import type { FrontmatterControl, FrontmatterEdit, PageRuntime } from "./pageRuntime";

/** Opens the value editor of a properties row (nothing when an editor is open or the row is read-only). */
export function openFrontmatterValueEditor(rt: PageRuntime, row: Element,
  options?: { newField?: boolean; toggleBoolean?: boolean }): void {
  const { document, context, host, state } = rt;
  const { editorTrace, traceFocus } = rt.diagnostics;
  if (state.activeBlockEdit || state.activeFrontmatterEdit || row.getAttribute("data-okf-editable") !== "true") return;
  const valueCell = row.querySelector?.("[data-okf-value-cell]");
  if (!valueCell) return;
  const name = row.getAttribute("data-okf-field");
  const declaredType = row.getAttribute("data-okf-type") || "unknown";
  const schemaFound = row.getAttribute("data-okf-schema-found") === "true";
  if (!name) return;
  let value: unknown;
  let enums: unknown = [];
  try {
    value = JSON.parse(row.getAttribute("data-okf-value") || "null");
    enums = JSON.parse(row.getAttribute("data-okf-enums") || "[]");
  } catch {
    return;
  }
  const useListEditor = Array.isArray(value);
  const structuredValue = useListEditor
    || (value !== null && typeof value === "object");
  // A key that was just added as a custom key holds an empty string: it is edited as one line
  // of text, like a text field, and saved as a plain YAML scalar when that is safe.
  const newCustomKey = Boolean(options && options.newField) && value === ""
    && declaredType === "unknown" && /\bokf-unknown\b/u.test(row.getAttribute("class") || "");
  const fieldType = newCustomKey ? "text" : declaredType;
  const useYamlEditor = !newCustomKey && !useListEditor
    && (!schemaFound || fieldType === "list" || fieldType === "unknown" || structuredValue);
  const useListEditorValue = useListEditor;
  const useTextarea = useYamlEditor || fieldType === "text";
  const nullable = row.getAttribute("data-okf-nullable") === "true";
  const displayElement = valueCell.querySelector?.("[data-okf-value-display]");
  const editor = document.createElement("div");
  editor.className = "sphinx-preview-frontmatter-editor sphinx-preview-frontmatter-value-editor";
  editor.setAttribute("data-okf-frontmatter-editor", "true");
  const control = (schemaFound && fieldType === "enum"
    ? document.createElement("select")
    : useListEditorValue
      ? document.createElement("div")
    : useTextarea
      ? document.createElement("textarea")
      : document.createElement("input")) as HTMLElement as FrontmatterControl;
  control.setAttribute("aria-label", "Frontmatter " + name);
  let listEditor: FrontmatterListEditor | undefined;
  const readListValue = (): string[] => listEditor ? listEditor.read() : [];
  const setListEditorDisabled = (disabled: boolean): void => listEditor?.setDisabled(disabled);
  let checkboxValueLabel: HTMLElement | undefined;
  let setNullButton: HTMLButtonElement | undefined;
  if (nullable) {
    setNullButton = document.createElement("button");
    setNullButton.type = "button";
    setNullButton.className = useListEditorValue ? "okf-list-editor-null" : "okf-frontmatter-null";
    setNullButton.textContent = "Set to null";
    setNullButton.setAttribute("aria-label", "Set " + name + " value to null");
    setNullButton.setAttribute("title", "Set " + name + " value to null");
    setNullButton.setAttribute("data-okf-set-null", "true");
    if (useListEditorValue) {
      setNullButton.setAttribute("data-okf-list-set-null", "true");
    }
  }
  if (useListEditorValue) {
    listEditor = buildFrontmatterListEditor(rt, {
      control,
      row,
      value: value as unknown[],
      setNullButton,
      status: () => status,
      saveValue: () => saveValue(),
    });
  }
  if (schemaFound && fieldType === "enum") {
    const enumValues = Array.isArray(enums)
      ? enums.filter((enumValue): enumValue is string => typeof enumValue === "string")
      : [];
    const hasSelectedEnumValue = enumValues.includes(value as string);
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "Choose a value...";
    empty.disabled = true;
    empty.selected = !hasSelectedEnumValue;
    control.appendChild(empty);
    control.setAttribute("data-okf-empty-select", hasSelectedEnumValue ? "false" : "true");
    for (const enumValue of enumValues) {
      const option = document.createElement("option");
      option.value = enumValue;
      option.textContent = enumValue;
      option.selected = enumValue === value;
      control.appendChild(option);
    }
  } else if (useYamlEditor) {
    control.value = row.getAttribute("data-okf-value-yaml") || "";
    // A field that was just added holds an empty string, shown as "" in YAML. Start empty so
    // that the first typed text is the value, not text appended after the quotes.
    if (options && options.newField && control.value === '""\n') control.value = "";
    control.setAttribute("spellcheck", "false");
    control.rows = Math.max(1, Math.min(20, control.value.split(/\r?\n/u).length));
  } else if (fieldType === "text") {
    control.value = value === null || value === undefined ? "" : String(value);
    control.setAttribute("data-okf-text-value", "true");
    control.rows = 1;
    control.setAttribute("aria-keyshortcuts", "Enter Shift+Enter");
    control.setAttribute("title", "Enter saves · Shift+Enter adds a line");
  } else if (fieldType === "checkbox") {
    control.type = "checkbox";
    control.className = "okf-value-checkbox";
    control.checked = value === true;
    checkboxValueLabel = document.createElement("span");
    checkboxValueLabel.className = "okf-boolean-value";
    checkboxValueLabel.textContent = String(control.checked);
  } else {
    control.type = fieldType === "number" ? "number"
      : fieldType === "date" ? "date"
        : fieldType === "time" ? "time"
          : "text";
    if (fieldType === "number") control.step = "any";
    control.value = value === null || value === undefined ? "" : String(value);
  }
  const status = document.createElement("p");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  let cancelled = false;
  const initialYaml = useYamlEditor && options && options.newField
    ? control.value
    : row.getAttribute("data-okf-value-yaml") || "";
  const edit: FrontmatterEdit = {
    row,
    valueCell,
    displayElement,
    editor,
    control,
    status,
    editId: "",
    saving: false,
    fieldName: name,
    fieldValue: value,
    setNullButton,
    setDisabled: setListEditorDisabled,
    cancel: () => { cancelled = true; },
  };
  const resizeTextarea = control.tagName === "TEXTAREA"
    ? (): void => {
      control.style.height = "auto";
      control.style.height = control.scrollHeight + "px";
    }
    : undefined;
  if (resizeTextarea) {
    control.addEventListener("input", resizeTextarea);
    edit.resizeTextarea = resizeTextarea;
  }
  edit.save = () => saveValue();
  const saveValue = (forcedValue?: unknown): void => {
    if (cancelled || edit.saving || control.disabled) return;
    if (forcedValue === undefined && fieldType === "text" && !useYamlEditor && !useListEditorValue
      && control.tagName === "TEXTAREA" && (typeof value !== "string" || !value.endsWith("\n"))) {
      control.value = String(control.value).replace(/(?:\r?\n)+$/u, "");
    }
    let fieldValue = forcedValue === undefined
      ? useListEditorValue ? readListValue()
        : useYamlEditor ? control.value
        : fieldType === "checkbox" ? control.checked
        : fieldType === "number" ? Number(control.value)
          : control.value
      : forcedValue;
    if (fieldType === "number" && forcedValue !== null && (!control.value || !Number.isFinite(fieldValue))) {
      // A flush keeps the typed text as it is: the host writes it and the preview shows the problem.
      if (state.flushingEditors) {
        fieldValue = control.value;
      } else {
        status.textContent = "Enter a valid number.";
        status.setAttribute("data-state", "error");
        status.setAttribute("data-visible", "true");
        return;
      }
    }
    const unchanged = useYamlEditor
      ? control.value === initialYaml
      : JSON.stringify(fieldValue) === JSON.stringify(value);
    if (unchanged) {
      cancelled = true;
      rt.frontmatter.closeFrontmatterEditor("save of an unchanged value");
      return;
    }
    const editId = context.requestId + "-field-" + (++state.editSequence);
    edit.editId = editId;
    edit.saving = true;
    // A plain save (Enter, blur) can be refused; a navigation waits for its result (CR 025).
    edit.plainSavePending = !state.flushingEditors;
    state.activeFrontmatterEdit = edit;
    valueCell.setAttribute("data-okf-editing", "true");
    if (rt.refreshButton) rt.refreshButton.disabled = true;
    control.disabled = true;
    if (setNullButton) setNullButton.disabled = true;
    setListEditorDisabled(true);
    status.removeAttribute("data-visible");
    status.removeAttribute("data-state");
    status.textContent = "Saving frontmatter…";
    rt.frontmatter.consumePendingFrontmatterEdit();
    host.postMessage({
      type: "previewFrontmatterSave",
      documentId: context.documentId,
      revision: context.revision,
      requestId: context.requestId,
      editId,
      fieldName: name,
      ...(useYamlEditor ? { fieldValueFormat: "yaml" } : {}),
      ...(state.flushingEditors ? { flush: true } : {}),
      ...(newCustomKey ? { fieldValueStyle: "plain" } : {}),
      fieldValue,
      ...rt.scroll.frontmatterPinFields(valueCell),
      ...rt.scroll.anchorField(),
    });
  };
  setNullButton?.addEventListener("click", (event) => {
    event.stopPropagation?.();
    saveValue(null);
  });
  control.addEventListener("keydown", (event) => {
    if (rt.textControls.keepUndoInControl(event)) return;
    if (event.key === "Escape") {
      event.preventDefault?.();
      cancelled = true;
      rt.frontmatter.closeFrontmatterEditor("Escape in value editor");
    } else if (!useListEditorValue && event.key === "Enter" && !event.isComposing) {
      const commitShortcut = event.metaKey || event.ctrlKey;
      const isTextField = control.tagName === "TEXTAREA" && fieldType === "text" && !useYamlEditor;
      const multiline = String(control.value).includes("\n");
      if (control.tagName !== "TEXTAREA"
        || commitShortcut
        || (isTextField && !multiline && !event.shiftKey && !event.altKey)) {
        event.preventDefault?.();
        saveValue();
      }
    }
  });
  if (fieldType === "checkbox") {
    control.addEventListener("click", (event) => event.stopPropagation?.());
    control.addEventListener("change", () => {
      if (checkboxValueLabel) checkboxValueLabel.textContent = String(control.checked);
      saveValue();
    });
  }
  if (useListEditorValue) {
    editor.addEventListener("focusout", (event) => {
      if (listEditor?.dragging()) return;
      const relatedTarget = event.relatedTarget as Element | null;
      if (relatedTarget && (
        relatedTarget === editor
        || editor.contains?.(relatedTarget)
        || relatedTarget.closest?.("[data-okf-frontmatter-menu]")
      )) return;
      saveValue();
    });
  } else {
    control.addEventListener("blur", (event) => {
      const relatedTarget = event.relatedTarget as Element | null;
      editorTrace.record("frontmatter control blur", "field=" + name + " related="
        + (relatedTarget && relatedTarget.tagName ? String(relatedTarget.tagName).toLowerCase() : "none") + " " + traceFocus());
      if ((setNullButton && relatedTarget === setNullButton)
        || relatedTarget?.closest?.("[data-okf-frontmatter-menu]")) return;
      saveValue();
    });
  }
  editor.appendChild(control);
  if (checkboxValueLabel) editor.appendChild(checkboxValueLabel);
  if (setNullButton && !useListEditorValue) editor.appendChild(setNullButton);
  editor.appendChild(status);
  valueCell.setAttribute("data-okf-editing", "true");
  rt.scroll.beginEditAnchor(valueCell);
  displayElement?.setAttribute("hidden", "");
  valueCell.appendChild(editor);
  state.activeFrontmatterEdit = edit;
  editorTrace.record("frontmatter editor opened", "field=" + name + " control=" + String(control.tagName).toLowerCase());
  if (rt.refreshButton) rt.refreshButton.disabled = true;
  createFrontmatterMenu(rt, edit, valueCell, valueCell.closest?.("[data-okf-properties]"));
  resizeTextarea?.();
  if (useListEditorValue) {
    listEditor?.focus();
  } else {
    rt.textControls.focusTextControlAtLastContent(control);
  }
  if (options && options.toggleBoolean && fieldType === "checkbox" && schemaFound) {
    control.checked = value !== true;
    if (checkboxValueLabel) checkboxValueLabel.textContent = String(control.checked);
    saveValue();
  }
}
