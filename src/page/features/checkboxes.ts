/**
 * Task list checkboxes (`input.myst-checkbox`). In a writable preview a click toggles the box at
 * once and asks the host to edit the source; the host's result confirms it, or reverts the box and
 * shows why. Read-only previews disable the boxes.
 */

import type { PreviewRuntimeContext } from "../../core/protocol/bootContext";
import type { HostMessageRouter } from "../hostMessages";
import type { PageHostApi } from "../pageHost";

const CHECKBOX_SELECTOR = "input.myst-checkbox";

/** How long the reason of a refused toggle stays visible next to its box. */
const REFUSAL_VISIBLE_MS = 6000;

/** An open editor that a toggle would race (its status line says why the toggle waits). */
export interface BlockingEdit {
  readonly status: Element;
}

/** What the checkbox feature needs from the page. */
export interface CheckboxDeps {
  readonly host: PageHostApi;
  readonly context: PreviewRuntimeContext;
  /** False in read-only previews (no trusted workspace). */
  readonly editingEnabled: boolean;
  /** The open block or frontmatter editor, if any. */
  openEdit(): BlockingEdit | undefined;
  /** A new number for an edit id. */
  nextEditSequence(): number;
  /** The scroll anchor fields every edit message carries. */
  anchorField(): Record<string, unknown>;
}

/** The checkbox feature of a page. */
export interface Checkboxes {
  /** Disables the boxes of the content in a read-only preview. */
  initialize(): void;
  /** Forgets the toggles still waiting for the host (the content was replaced). */
  clearPending(): void;
  /** Handles clicks on boxes; registered before the block click handlers, so a box never edits its block. */
  bindClicks(): void;
}

/** The checkbox feature; handles `previewCheckboxResult`. */
export function installCheckboxes(document: Document, router: HostMessageRouter, deps: CheckboxDeps): Checkboxes {
  const { host, context } = deps;
  const checkboxEditingEnabled = deps.editingEnabled;
  const pendingCheckboxToggles = new Map<string, { checkbox: HTMLInputElement; checked: boolean }>();
  const refusals = new WeakMap<Element, { note: Element; timer: number }>();

  // @implements_req SwRS-MDOKFSTUDIO-GFM-021
  /** Shows the reason of a refused toggle next to its box for a short time (and as its tooltip). */
  function showRefusal(checkbox: HTMLInputElement, reason: string): void {
    checkbox.setAttribute("title", reason);
    const previous = refusals.get(checkbox);
    if (previous) {
      window.clearTimeout(previous.timer);
      previous.note.remove();
    }
    const note = document.createElement("span");
    note.className = "myst-checkbox-refusal";
    note.setAttribute("role", "status");
    note.textContent = reason;
    checkbox.insertAdjacentElement("afterend", note);
    refusals.set(checkbox, { note, timer: window.setTimeout(() => note.remove(), REFUSAL_VISIBLE_MS) });
  }

  // @implements_req SwRS-MDOKFSTUDIO-TRUST-005
  function initializeCheckboxes(): void {
    document.querySelectorAll?.<HTMLInputElement>(CHECKBOX_SELECTOR).forEach((checkbox) => {
      if (checkboxEditingEnabled) return;
      checkbox.disabled = true;
      checkbox.setAttribute("title", context.readOnlyReason ?? "Editing is not available in this preview.");
    });
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-041
  // @implements_req SwRS-MDOKFSTUDIO-GFM-021
  function toggleCheckbox(checkbox: HTMLInputElement, event: Event): void {
    const line = Number(checkbox.getAttribute("data-myst-checkbox-line"));
    const column = Number(checkbox.getAttribute("data-myst-checkbox-column"));
    if (
      !checkboxEditingEnabled
      || !Number.isSafeInteger(line) || line < 1
      || !Number.isSafeInteger(column) || column < 0
      || checkbox.getAttribute("aria-busy") === "true"
    ) {
      event.preventDefault?.();
      return;
    }
    const pendingEdit = deps.openEdit();
    if (pendingEdit) {
      // Toggling now would race the open editor's save and be rejected as stale.
      event.preventDefault?.();
      pendingEdit.status.textContent = "Save or cancel this edit before toggling a checkbox.";
      pendingEdit.status.setAttribute?.("data-visible", "true");
      return;
    }
    // The browser has already flipped the box; the host confirms or the result reverts it.
    const checked = checkbox.checked === true;
    const editId = "checkbox-" + context.requestId + "-" + deps.nextEditSequence();
    checkbox.setAttribute("aria-busy", "true");
    pendingCheckboxToggles.set(editId, { checkbox, checked });
    host.postMessage({
      type: "previewCheckboxToggle",
      documentId: context.documentId,
      revision: context.revision,
      requestId: context.requestId,
      editId,
      line,
      endLine: line,
      column,
      checked,
      ...deps.anchorField(),
    });
  }

  router.on("previewCheckboxResult", (message) => {
    const pending = pendingCheckboxToggles.get(message.editId);
    if (!pending) return;
    pendingCheckboxToggles.delete(message.editId);
    pending.checkbox.removeAttribute("aria-busy");
    if (message.saved === true) return;
    pending.checkbox.checked = !pending.checked;
    if (typeof message.error === "string") showRefusal(pending.checkbox, message.error);
  });
  return {
    initialize: initializeCheckboxes,
    clearPending: () => pendingCheckboxToggles.clear(),
    bindClicks() {
      document.addEventListener("click", (event) => {
        const checkbox = event.target instanceof Element
          ? event.target.closest<HTMLInputElement>(CHECKBOX_SELECTOR) : undefined;
        if (!checkbox) return;
        event.stopImmediatePropagation?.();
        toggleCheckbox(checkbox, event);
      });
    },
  };
}
