/**
 * The field menu of an open frontmatter editor: Add field (a picker of the schema's missing fields,
 * or a custom key) and Remove field (disabled for a field the schema requires). Both post a
 * `previewFrontmatterSave` with a `frontmatterAction` through the frontmatter editor.
 */

import type { FrontmatterEdit, PageRuntime } from "./pageRuntime";

/** A field of the schema that the document does not have yet. */
interface AvailableField {
  name: string;
  defaultValue?: unknown;
  enums?: unknown[];
  fieldType?: string;
}

function availableFrontmatterFields(properties: Element | null | undefined): AvailableField[] {
  try {
    const fields: unknown = JSON.parse(properties?.getAttribute("data-okf-available-fields") || "[]");
    return Array.isArray(fields)
      ? fields.filter((field): field is AvailableField => field && typeof field.name === "string")
      : [];
  } catch {
    return [];
  }
}

function defaultFrontmatterFieldValue(field: AvailableField): unknown {
  if (Object.prototype.hasOwnProperty.call(field, "defaultValue")) return field.defaultValue;
  if (Array.isArray(field.enums) && field.enums.length > 0) return field.enums[0];
  if (field.fieldType === "checkbox") return false;
  if (field.fieldType === "number") return 0;
  if (field.fieldType === "list") return [];
  return "";
}

/** Builds the field menu of `edit` and appends it to its editor. */
export function createFrontmatterMenu(rt: PageRuntime, edit: FrontmatterEdit, anchor: Element,
  properties: Element | null | undefined): void {
  const { document } = rt;
  const postFrontmatterAction: PageRuntime["frontmatter"]["postFrontmatterAction"] = (...args) =>
    rt.frontmatter.postFrontmatterAction(...args);
  const menu = document.createElement("div");
  menu.className = "sphinx-preview-frontmatter-menu";
  menu.setAttribute("role", "toolbar");
  menu.setAttribute("aria-label", "Frontmatter field actions");
  menu.setAttribute("data-okf-frontmatter-menu", "true");
  const icons = {
    add: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 3.5h16v17H4z"></path><path d="M12 8v8M8 12h8"></path></svg>',
    remove: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 3.5h16v17H4z"></path><path d="M8 12h8"></path></svg>',
  };
  const appendMenuLabel = (button: HTMLElement, text: string): void => {
    const label = document.createElement("span");
    label.className = "sphinx-preview-frontmatter-menu-label";
    label.textContent = text;
    button.appendChild(label);
  };
  const createButton = (name: string, icon: string, operation: string, label: string): HTMLButtonElement => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", name);
    button.setAttribute("title", name);
    button.setAttribute("data-tooltip", name);
    button.setAttribute("data-okf-frontmatter-operation", operation);
    button.innerHTML = icon;
    appendMenuLabel(button, label);
    menu.appendChild(button);
    return button;
  };
  const addButton = createButton("Add frontmatter field", icons.add, "add", "Add field");
  const removeButton = createButton("Remove frontmatter field", icons.remove, "remove", "Remove field");
  const editedRow = anchor?.closest?.("tr[data-okf-field]");
  if (editedRow?.getAttribute("data-okf-required") === "true") {
    const requiredMessage = "Required by the schema; it cannot be removed";
    removeButton.disabled = true;
    removeButton.setAttribute("title", requiredMessage);
    removeButton.setAttribute("aria-label", requiredMessage);
    removeButton.setAttribute("data-tooltip", requiredMessage);
  }
  const picker = document.createElement("div");
  picker.className = "sphinx-preview-frontmatter-picker";
  picker.setAttribute("hidden", "");
  picker.setAttribute("role", "group");
  picker.setAttribute("aria-label", "Add frontmatter field");
  const fields = availableFrontmatterFields(properties);
  // A select of the schema's fields, or a text input for a free name; both read through `value`.
  const fieldControl: HTMLSelectElement | HTMLInputElement = fields.length > 0
    ? document.createElement("select")
    : document.createElement("input");
  fieldControl.setAttribute("aria-label", "Frontmatter field to add");
  if (fields.length > 0) {
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Choose a field...";
    placeholder.disabled = true;
    placeholder.selected = true;
    fieldControl.appendChild(placeholder);
    for (const field of fields) {
      const option = document.createElement("option");
      option.value = field.name;
      option.textContent = field.name;
      fieldControl.appendChild(option);
    }
    if (properties?.getAttribute?.("data-okf-additional-properties") !== "false") {
      const customOption = document.createElement("option");
      customOption.value = "__custom__";
      customOption.textContent = "Custom key…";
      fieldControl.appendChild(customOption);
    }
  } else {
    (fieldControl as HTMLInputElement).type = "text";
    fieldControl.setAttribute("placeholder", "New field name");
  }
  const confirm = document.createElement("button");
  confirm.type = "button";
  confirm.setAttribute("aria-label", "Add selected frontmatter field");
  confirm.setAttribute("title", "Add selected frontmatter field");
  confirm.setAttribute("data-tooltip", "Add selected frontmatter field");
  confirm.setAttribute("data-okf-frontmatter-operation", "confirm-add");
  confirm.innerHTML = icons.add;
  appendMenuLabel(confirm, "Add");
  confirm.disabled = true;
  const updateConfirmState = (): void => {
    confirm.disabled = !String(fieldControl.value || "").trim();
  };
  const addChosenField = (): void => {
    const fieldName = String(fieldControl.value || "").trim();
    if (!fieldName) return;
    const selected = fields.find((field) => field.name === fieldName);
    postFrontmatterAction(
      edit,
      "add",
      fieldName,
      selected ? defaultFrontmatterFieldValue(selected) : "",
      edit.fieldName,
    );
  };
  let customInput: HTMLInputElement | undefined;
  const showCustomError = (text: string): void => {
    edit.status.textContent = text;
    edit.status.setAttribute("data-state", "error");
    edit.status.setAttribute("data-visible", "true");
  };
  const addCustomKey = (): void => {
    const name = String(customInput!.value || "");
    if (name.length === 0 || name.trim().length === 0) {
      showCustomError("Enter a name for the new field.");
      return;
    }
    if (name !== name.trim()) {
      showCustomError("The field name cannot start or end with spaces.");
      return;
    }
    if (/[\r\n]/u.test(name)) {
      showCustomError("The field name cannot contain a line break.");
      return;
    }
    const exists = Array.from(document.querySelectorAll("tr[data-okf-field]"))
      .some((row) => row.getAttribute("data-okf-field") === name);
    if (exists) {
      showCustomError('The field "' + name + '" already exists.');
      return;
    }
    postFrontmatterAction(edit, "add", name, "", edit.fieldName);
  };
  const showCustomInput = (): void => {
    if (!customInput) {
      customInput = document.createElement("input");
      customInput.type = "text";
      customInput.setAttribute("aria-label", "New field name");
      customInput.setAttribute("placeholder", "New field name");
      customInput.setAttribute("data-okf-custom-key", "true");
      customInput.addEventListener("keydown", (event) => {
        if (rt.textControls.keepUndoInControl(event)) return;
        if (event.key !== "Enter") return;
        event.preventDefault?.();
        addCustomKey();
      });
      // Without `Element.after`, insert before the confirm button.
      if (fieldControl.after) fieldControl.after(customInput);
      else picker.insertBefore(customInput, confirm);
    }
    customInput.removeAttribute("hidden");
    customInput.focus?.({ preventScroll: true });
  };
  fieldControl.addEventListener("change", () => {
    updateConfirmState();
    if (fieldControl.value === "__custom__") {
      showCustomInput();
      return;
    }
    if (customInput) customInput.setAttribute("hidden", "");
    if (fields.length > 0) addChosenField();
  });
  fieldControl.addEventListener("input", updateConfirmState);
  if (fields.length > 0) {
    // A choice in the select adds the field at once, so the confirm button is not needed.
    // The menu stylesheet gives buttons an explicit display, which would override [hidden].
    confirm.hidden = true;
    confirm.style.display = "none";
  } else {
    fieldControl.addEventListener("keydown", (event) => {
      if ((event as KeyboardEvent).key !== "Enter") return;
      event.preventDefault?.();
      addChosenField();
    });
  }
  confirm.addEventListener("click", addChosenField);
  picker.appendChild(fieldControl);
  picker.appendChild(confirm);
  menu.appendChild(picker);
  addButton.addEventListener("click", () => {
    if (edit.saving) return;
    if (picker.getAttribute("hidden") === null) {
      picker.setAttribute("hidden", "");
    } else {
      picker.removeAttribute("hidden");
      fieldControl.focus?.({ preventScroll: true });
    }
  });
  removeButton.addEventListener("click", () => {
    postFrontmatterAction(edit, "remove", edit.fieldName, undefined);
  });
  edit.frontmatterMenu = menu;
  edit.frontmatterMenuPositionListener = undefined;
  edit.editor.appendChild(menu);
}
