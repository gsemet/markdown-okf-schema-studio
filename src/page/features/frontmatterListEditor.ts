/**
 * The list editor of a frontmatter value that is a list: one text input per item, with a drag
 * handle (and Up/Down on it), a remove button, Enter for a new item and Backspace on an empty one,
 * an Add item button and, for link fields, the known link targets as suggestions with a warning on
 * an unknown one. The value editor (`./frontmatterValueEditor.ts`) owns the save.
 */

import type { PageRuntime } from "./pageRuntime";

/** What the value editor needs from its list editor. */
export interface FrontmatterListEditor {
  /** The items as typed. */
  read(): string[];
  /** Disables or enables every item control, the Add item button and Set to null. */
  setDisabled(disabled: boolean): void;
  /** Focuses the first item, or Add item when the list is empty. */
  focus(): void;
  /** True while an item is dragged (a focus change then does not save). */
  dragging(): boolean;
}

/** The parts of the value editor the list editor is built into and works with. */
export interface FrontmatterListEditorParts {
  /** The editor's control: the group element the list editor fills. */
  control: HTMLElement;
  /** The properties row of the field (its link suggestions). */
  row: Element;
  value: unknown[];
  setNullButton: HTMLButtonElement | undefined;
  /** The status line of the editor (created after the list editor). */
  status(): HTMLElement;
  /** Saves the value (Cmd/Ctrl+Enter, Enter on the empty last item). */
  saveValue(): void;
}

/** Builds the list editor into `parts.control`. */
export function buildFrontmatterListEditor(rt: PageRuntime, parts: FrontmatterListEditorParts): FrontmatterListEditor {
  const { document, context, state } = rt;
  const { control, row, value, setNullButton } = parts;
  let listDragInProgress = false;
  control.className = "okf-list-editor";
  control.setAttribute("role", "group");
  control.addEventListener("click", (event) => event.stopPropagation?.());
  const itemList = document.createElement("div");
  itemList.className = "okf-list-editor-items";
  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "okf-list-editor-add";
  addButton.textContent = "+ Add item";
  addButton.setAttribute("aria-label", "Add list item");
  addButton.setAttribute("title", "Add list item");
  const itemRows = (): HTMLElement[] => Array.from(
    (itemList.children || (itemList as { childElements?: HTMLCollection }).childElements || []) as ArrayLike<Element>) as HTMLElement[];
  const itemInput = (itemRow: Element | undefined): HTMLInputElement | null | undefined =>
    itemRow?.querySelector?.<HTMLInputElement>("[data-okf-list-item-input]");
  let linkStems: Set<string> | undefined;
  let linkDatalistId = "";
  let linkDatalist: HTMLDataListElement | undefined;
  try {
    const parsedStems: unknown = JSON.parse(row.getAttribute("data-okf-link-suggestions") || "null");
    if (Array.isArray(parsedStems)) {
      const stems = parsedStems.filter((stem): stem is string => typeof stem === "string");
      if (stems.length > 0) {
        linkStems = new Set(stems);
        linkDatalistId = "okf-frontmatter-link-options-" + context.requestId + "-" + (++state.editSequence);
        linkDatalist = document.createElement("datalist");
        linkDatalist.setAttribute("id", linkDatalistId);
        for (const stem of stems) {
          const option = document.createElement("option");
          option.value = stem;
          option.setAttribute("value", stem);
          linkDatalist.appendChild(option);
        }
      }
    }
  } catch {
    linkStems = undefined;
  }
  // Marks unknown link targets without blocking the save.
  const refreshLinkWarning = (current: HTMLInputElement): void => {
    if (!linkStems) return;
    const stems = linkStems;
    let unknown: HTMLInputElement | undefined;
    itemRows().forEach((itemRow) => {
      const candidate = itemInput(itemRow);
      if (!candidate) return;
      const isUnknown = candidate.value !== "" && !stems.has(candidate.value);
      if (isUnknown) {
        candidate.setAttribute("aria-invalid", "true");
        if (candidate === current || !unknown) unknown = candidate;
      } else {
        candidate.removeAttribute("aria-invalid");
      }
    });
    const status = parts.status();
    if (unknown) {
      status.textContent = 'No Markdown file named "' + unknown.value + '.md" was found. It will be saved as typed.';
      status.setAttribute("data-state", "warning");
      status.setAttribute("data-visible", "true");
    } else if (status.getAttribute("data-state") === "warning") {
      status.removeAttribute("data-state");
      status.removeAttribute("data-visible");
      status.textContent = "";
    }
  };
  const refreshItemLabels = (): void => {
    itemRows().forEach((itemRow, index) => {
      const input = itemInput(itemRow);
      if (input) input.setAttribute("aria-label", "List item " + (index + 1));
    });
  };
  const moveItem = (itemRow: HTMLElement, direction: number): void => {
    const rows = itemRows();
    const index = rows.indexOf(itemRow);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= rows.length) return;
    if (direction < 0) {
      itemList.insertBefore(itemRow, rows[targetIndex]!);
    } else {
      itemList.insertBefore(rows[targetIndex]!, itemRow);
    }
    refreshItemLabels();
    itemInput(itemRow)?.focus?.();
  };
  let draggedRow: HTMLElement | undefined;
  let dropRow: HTMLElement | undefined;
  let dropBefore = false;
  const clearDropIndicator = (): void => {
    itemRows().forEach((itemRow) => itemRow.removeAttribute("data-okf-list-drop"));
    dropRow = undefined;
  };
  const updateDropIndicator = (event: DragEvent, targetRow?: HTMLElement): void => {
    if (!draggedRow) return;
    event.preventDefault?.();
    event.stopPropagation?.();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    clearDropIndicator();
    if (targetRow === draggedRow) return;
    const rows = itemRows();
    if (!targetRow) {
      const candidates = rows.filter((candidate) => candidate !== draggedRow);
      targetRow = candidates.find((candidate) => {
        const rectangle = candidate.getBoundingClientRect();
        return event.clientY < rectangle.top + rectangle.height / 2;
      }) || candidates[candidates.length - 1];
    }
    if (!targetRow) return;
    const rectangle = targetRow.getBoundingClientRect();
    dropBefore = typeof event.clientY === "number"
      ? event.clientY < rectangle.top + rectangle.height / 2
      : rows.indexOf(draggedRow) > rows.indexOf(targetRow);
    dropRow = targetRow;
    dropRow.setAttribute("data-okf-list-drop", dropBefore ? "before" : "after");
  };
  const finishDrag = (): void => {
    draggedRow?.removeAttribute("data-okf-list-dragging");
    draggedRow = undefined;
    listDragInProgress = false;
    clearDropIndicator();
  };
  const dropItem = (event: DragEvent, targetRow?: HTMLElement): void => {
    if (!draggedRow) return;
    updateDropIndicator(event, targetRow);
    const movedRow = draggedRow;
    if (dropRow) {
      const rows = itemRows();
      const reference = dropBefore ? dropRow : rows[rows.indexOf(dropRow) + 1];
      if (reference !== movedRow) itemList.insertBefore(movedRow, reference || null);
      refreshItemLabels();
    }
    finishDrag();
    itemInput(movedRow)?.focus?.();
  };
  control.addEventListener("dragover", (event) => updateDropIndicator(event));
  control.addEventListener("drop", (event) => dropItem(event));
  control.addEventListener("dragleave", (event) => {
    if (!event.relatedTarget || !control.contains?.(event.relatedTarget as Node)) {
      clearDropIndicator();
    }
  });
  // Moves focus to the previous item (caret at its end), else the next item, else the add button.
  // It runs before the row is removed, so the editor never sees focus leave it.
  const focusNeighbour = (itemRow: HTMLElement): void => {
    const rows = itemRows();
    const index = rows.indexOf(itemRow);
    const neighbour = rows[index - 1] || rows[index + 1];
    const target: HTMLInputElement | HTMLButtonElement = itemInput(neighbour) || addButton;
    target.focus?.();
    if (neighbour && target !== addButton && rows[index - 1]) {
      const input = target as HTMLInputElement;
      input.setSelectionRange?.(input.value.length, input.value.length);
    }
  };
  const appendItem = (itemValue: string): HTMLElement => {
    const itemRow = document.createElement("div");
    itemRow.className = "okf-list-editor-item";
    itemRow.setAttribute("data-okf-list-item", "true");
    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "okf-list-editor-handle";
    handle.setAttribute("aria-label", "Move list item");
    handle.setAttribute("title", "Drag to move list item");
    handle.setAttribute("draggable", "true");
    const input = document.createElement("input");
    input.type = "text";
    input.className = "okf-list-editor-input";
    input.setAttribute("data-okf-list-item-input", "true");
    input.value = itemValue;
    if (linkDatalistId) {
      input.setAttribute("list", linkDatalistId);
      input.addEventListener("input", () => refreshLinkWarning(input));
    }
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "okf-list-editor-remove";
    removeButton.setAttribute("aria-label", "Remove list item");
    removeButton.setAttribute("title", "Remove list item");
    removeButton.addEventListener("mousedown", (event) => {
      event.preventDefault?.();
    });
    handle.addEventListener("keydown", (event) => {
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault?.();
        moveItem(itemRow, event.key === "ArrowUp" ? -1 : 1);
      }
    });
    handle.addEventListener("dragstart", (event) => {
      draggedRow = itemRow;
      listDragInProgress = true;
      itemRow.setAttribute("data-okf-list-dragging", "true");
      event.dataTransfer?.setData?.("text/plain", "list-item");
      event.dataTransfer?.setDragImage?.(itemRow, 12, 12);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    });
    itemRow.addEventListener("dragover", (event) => updateDropIndicator(event, itemRow));
    itemRow.addEventListener("drop", (event) => dropItem(event, itemRow));
    handle.addEventListener("dragend", () => {
      finishDrag();
      input.focus?.();
    });
    removeButton.addEventListener("click", (event) => {
      event.stopPropagation?.();
      const rows = itemRows();
      const index = rows.indexOf(itemRow);
      const remainingRows = rows.filter((candidate) => candidate !== itemRow);
      const focusRow = remainingRows[Math.min(index, remainingRows.length - 1)];
      const focusTarget = itemInput(focusRow) || addButton;
      focusTarget?.focus?.();
      itemRow.remove?.();
      refreshItemLabels();
    });
    input.addEventListener("keydown", (event) => {
      if (event.isComposing) return;
      if (rt.textControls.keepUndoInControl(event)) return;
      if (event.key === "Enter") {
        if (event.shiftKey || event.altKey) return;
        event.preventDefault?.();
        if (event.metaKey || event.ctrlKey) {
          parts.saveValue();
          return;
        }
        const rows = itemRows();
        const index = rows.indexOf(itemRow);
        if (input.value.trim() === "" && index === rows.length - 1) {
          focusNeighbour(itemRow);
          itemRow.remove?.();
          refreshItemLabels();
          parts.saveValue();
          return;
        }
        const newRow = appendItem("");
        itemList.insertBefore(newRow, rows[index + 1] || null);
        refreshItemLabels();
        itemInput(newRow)?.focus?.();
      } else if (event.key === "Backspace" && input.value === "" && input.selectionStart === 0) {
        event.preventDefault?.();
        focusNeighbour(itemRow);
        itemRow.remove?.();
        refreshItemLabels();
      }
    });
    itemRow.appendChild(handle);
    itemRow.appendChild(input);
    itemRow.appendChild(removeButton);
    itemList.appendChild(itemRow);
    refreshItemLabels();
    return itemRow;
  };
  addButton.addEventListener("click", () => {
    appendItem("");
    const rows = itemRows();
    itemInput(rows[rows.length - 1])?.focus?.();
  });
  const initialItems = value.map((item) => item === null || item === undefined ? "" : String(item));
  initialItems.forEach((item) => appendItem(item));
  control.appendChild(itemList);
  if (linkDatalist) control.appendChild(linkDatalist);
  control.appendChild(addButton);
  if (setNullButton) control.appendChild(setNullButton);
  return {
    read: () => itemRows().map((itemRow) => itemInput(itemRow)?.value ?? ""),
    setDisabled(disabled) {
      itemRows().forEach((itemRow) => {
        itemRow.querySelectorAll?.<HTMLInputElement | HTMLButtonElement>("input, button").forEach((element) => {
          element.disabled = disabled;
        });
      });
      addButton.disabled = disabled;
      if (setNullButton) setNullButton.disabled = disabled;
    },
    focus() {
      const firstInput = itemInput(itemRows()[0]);
      (firstInput || addButton)?.focus?.();
    },
    dragging: () => listDragInProgress,
  };
}
