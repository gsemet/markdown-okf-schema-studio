/**
 * Task list checkboxes (`input.myst-checkbox`) and radio choice options (`.myst-radio`). In a
 * writable preview a click toggles the box, or selects the option, at once and asks the host to edit
 * the source; the host's result confirms it, or reverts the control and shows why. Read-only
 * previews disable both. A radio group is one tab stop (roving tabindex): the arrow keys move the
 * focus between its options, Space and Enter select the focused option.
 */

import type { PreviewRuntimeContext } from "../../core/protocol/bootContext";
import type { HostMessageRouter } from "../hostMessages";
import type { PageHostApi } from "../pageHost";

const CHECKBOX_SELECTOR = "input.myst-checkbox";
const RADIO_SELECTOR = ".myst-radio";

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
  /** Disables the boxes and radio options of the content in a read-only preview. */
  initialize(): void;
  /** Forgets the toggles still waiting for the host (the content was replaced). */
  clearPending(): void;
  /**
   * Called before the content is replaced: when a radio option has the focus, returns what puts
   * the focus back on the option of the same source line and column in the new content.
   */
  keepRadioFocus(): (() => void) | undefined;
  /**
   * Handles clicks on boxes and radio options, and the keys of a focused radio option; registered
   * before the block handlers, so a box or an option never edits or reveals its block.
   */
  bindClicks(): void;
}

/** A toggle waiting for the host: its control, and how to settle it once the result arrives. */
interface PendingToggle {
  readonly control: Element;
  settle(saved: boolean): void;
}

/** The source position a control carries (its marker's line and column), or undefined. */
function sourcePosition(control: Element, kind: "checkbox" | "radio"): { line: number; column: number } | undefined {
  const line = Number(control.getAttribute(`data-myst-${kind}-line`));
  const column = Number(control.getAttribute(`data-myst-${kind}-column`));
  return Number.isSafeInteger(line) && line >= 1 && Number.isSafeInteger(column) && column >= 0
    ? { line, column } : undefined;
}

/** The checkbox feature; handles `previewCheckboxResult` (the answer to toggles and radio choices). */
export function installCheckboxes(document: Document, router: HostMessageRouter, deps: CheckboxDeps): Checkboxes {
  const { host, context } = deps;
  const checkboxEditingEnabled = deps.editingEnabled;
  const pendingToggles = new Map<string, PendingToggle>();
  const refusals = new WeakMap<Element, { note: Element; timer: number }>();

  // @implements_req SwRS-MDOKFSTUDIO-GFM-021
  /** Shows the reason of a refused toggle next to its box for a short time (and as its tooltip). */
  function showRefusal(control: Element, reason: string): void {
    control.setAttribute("title", reason);
    const previous = refusals.get(control);
    if (previous) {
      window.clearTimeout(previous.timer);
      previous.note.remove();
    }
    const note = document.createElement("span");
    note.className = "myst-checkbox-refusal";
    note.setAttribute("role", "status");
    note.textContent = reason;
    control.insertAdjacentElement("afterend", note);
    refusals.set(control, { note, timer: window.setTimeout(() => note.remove(), REFUSAL_VISIBLE_MS) });
  }

  // @implements_req SwRS-MDOKFSTUDIO-TRUST-005
  // @implements_req SwRS-MDOKFSTUDIO-GFM-039
  function initializeCheckboxes(): void {
    if (checkboxEditingEnabled) return;
    const reason = context.readOnlyReason ?? "Editing is not available in this preview.";
    document.querySelectorAll?.<HTMLInputElement>(CHECKBOX_SELECTOR).forEach((checkbox) => {
      checkbox.disabled = true;
      checkbox.setAttribute("title", reason);
    });
    document.querySelectorAll?.(RADIO_SELECTOR).forEach((radio) => {
      radio.setAttribute("aria-disabled", "true");
      radio.setAttribute("title", reason);
    });
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-041
  // @implements_req SwRS-MDOKFSTUDIO-GFM-039
  /**
   * The page guards of every toggle: editing enabled, a valid source position, no toggle of the
   * control still waiting, no open editor. A refused click is prevented (the browser undoes it).
   */
  function mayToggle(event: Event, valid: boolean, busy: boolean, action: string): boolean {
    if (!checkboxEditingEnabled || !valid || busy) {
      event.preventDefault?.();
      return false;
    }
    // Toggling now would race the open editor's save and be rejected as stale.
    return !refuseForOpenEdit(event, action);
  }

  /** With an editor open: prevents `event` and says on its status line why. True when refused. */
  function refuseForOpenEdit(event: Event, action: string): boolean {
    const pendingEdit = deps.openEdit();
    if (!pendingEdit) return false;
    event.preventDefault?.();
    pendingEdit.status.textContent = `Save or cancel this edit before ${action}.`;
    pendingEdit.status.setAttribute?.("data-visible", "true");
    return true;
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-041
  // @implements_req SwRS-MDOKFSTUDIO-GFM-039
  /**
   * The press on a radio option, before the browser moves the focus: with an editor open, the
   * focus stays in it (no blur, so no commit, and the caret is kept). The click that follows is
   * refused by the click guard. Task checkboxes keep only the click guard.
   */
  function guardPress(event: MouseEvent): void {
    if (!checkboxEditingEnabled) return;
    const target = event.target instanceof Element ? event.target : undefined;
    if (target?.closest(CHECKBOX_SELECTOR)) return;
    if (target?.closest(RADIO_SELECTOR)) refuseForOpenEdit(event, "choosing an option");
  }

  /** Sends one toggle request; `pending` settles it when the host answers. */
  function postToggle(
    position: { line: number; column: number },
    checked: boolean,
    extra: Record<string, unknown>,
    pending: PendingToggle,
  ): void {
    const editId = "checkbox-" + context.requestId + "-" + deps.nextEditSequence();
    pendingToggles.set(editId, pending);
    host.postMessage({
      type: "previewCheckboxToggle",
      documentId: context.documentId,
      revision: context.revision,
      requestId: context.requestId,
      editId,
      line: position.line,
      endLine: position.line,
      column: position.column,
      checked,
      ...extra,
      ...deps.anchorField(),
    });
  }

  // @implements_req SwRS-MDOKFSTUDIO-GFM-021
  function toggleCheckbox(checkbox: HTMLInputElement, event: Event): void {
    const position = sourcePosition(checkbox, "checkbox");
    if (!mayToggle(event, position !== undefined, checkbox.getAttribute("aria-busy") === "true", "toggling a checkbox")) return;
    // The browser has already flipped the box; the host confirms or the result reverts it.
    const checked = checkbox.checked === true;
    checkbox.setAttribute("aria-busy", "true");
    postToggle(position!, checked, {}, {
      control: checkbox,
      settle(saved) {
        checkbox.removeAttribute("aria-busy");
        if (!saved) checkbox.checked = !checked;
      },
    });
  }

  /** The options of the radio group of `radio`, in document order. */
  function radioOptions(radio: Element): Element[] {
    const group = radio.getAttribute("data-myst-radio-group");
    const options: Element[] = [];
    document.querySelectorAll?.(RADIO_SELECTOR).forEach((option) => {
      if (option.getAttribute("data-myst-radio-group") === group) options.push(option);
    });
    return options.includes(radio) ? options : [radio];
  }

  /** Shows `selected` as the one selected option of `options`, and makes it the group's tab stop. */
  function showSelection(options: readonly Element[], selected: Element): void {
    for (const option of options) {
      option.setAttribute("aria-checked", option === selected ? "true" : "false");
      option.setAttribute("tabindex", option === selected ? "0" : "-1");
    }
  }

  // @implements_req SwRS-MDOKFSTUDIO-GFM-039
  /**
   * Selects a radio option: the page shows it at once and asks the host to move the `x` of the group.
   * The only selected option is left alone (nothing to write); with two selected options in the
   * source, any click normalises the group.
   */
  function selectRadio(radio: Element, event: Event): void {
    const options = radioOptions(radio);
    const selected = options.filter((option) => option.getAttribute("aria-checked") === "true");
    if (selected.length === 1 && selected[0] === radio) return;
    const positions = options.map((option) => sourcePosition(option, "radio"));
    const valid = options.length >= 2 && positions.every((position) => position !== undefined);
    const busy = options.some((option) => option.getAttribute("aria-busy") === "true");
    if (!mayToggle(event, valid, busy, "choosing an option")) return;
    const previous = options.map((option) => ({
      option, checked: option.getAttribute("aria-checked"), tabindex: option.getAttribute("tabindex"),
    }));
    showSelection(options, radio);
    options.forEach((option) => option.setAttribute("aria-busy", "true"));
    postToggle(positions[options.indexOf(radio)]!, true, { radioGroup: positions }, {
      control: radio,
      settle(saved) {
        for (const { option, checked, tabindex } of previous) {
          option.removeAttribute("aria-busy");
          if (saved) continue;
          option.setAttribute("aria-checked", checked ?? "false");
          option.setAttribute("tabindex", tabindex ?? "-1");
        }
      },
    });
  }

  /** The option the arrow, Home or End key moves the focus to, or undefined for another key. */
  function focusTarget(options: readonly Element[], radio: Element, key: string): Element | undefined {
    const index = options.indexOf(radio);
    if (key === "Home") return options[0];
    if (key === "End") return options[options.length - 1];
    const step = key === "ArrowDown" || key === "ArrowRight" ? 1 : key === "ArrowUp" || key === "ArrowLeft" ? -1 : 0;
    return step === 0 ? undefined : options[(index + step + options.length) % options.length];
  }

  // @implements_req SwRS-MDOKFSTUDIO-GFM-039
  /** The keys of a focused radio option: the arrows only move the focus, Space and Enter select. */
  function handleRadioKey(event: KeyboardEvent): void {
    const radio = event.target instanceof Element ? event.target.closest(RADIO_SELECTOR) : undefined;
    if (!radio || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing) return;
    const select = event.key === " " || event.key === "Enter";
    const options = radioOptions(radio);
    const next = select ? undefined : focusTarget(options, radio, event.key);
    if (!select && !next) return;
    // The key is the group's: no page scroll, block selection, block editor or source reveal.
    event.preventDefault?.();
    event.stopPropagation?.();
    event.stopImmediatePropagation?.();
    if (select) {
      selectRadio(radio, event);
      return;
    }
    for (const option of options) option.setAttribute("tabindex", option === next ? "0" : "-1");
    (next as HTMLElement).focus?.();
  }

  // @implements_req SwRS-MDOKFSTUDIO-GFM-039
  function keepRadioFocus(): (() => void) | undefined {
    const active = document.activeElement;
    const radio = active instanceof Element ? active.closest(RADIO_SELECTOR) : null;
    const position = radio ? sourcePosition(radio, "radio") : undefined;
    if (!position) return undefined;
    return () => {
      let match: Element | undefined;
      document.querySelectorAll?.(RADIO_SELECTOR).forEach((option) => {
        const at = sourcePosition(option, "radio");
        if (!match && at?.line === position.line && at.column === position.column) match = option;
      });
      (match as HTMLElement | undefined)?.focus?.({ preventScroll: true });
    };
  }

  router.on("previewCheckboxResult", (message) => {
    const pending = pendingToggles.get(message.editId);
    if (!pending) return;
    pendingToggles.delete(message.editId);
    const saved = message.saved === true;
    pending.settle(saved);
    if (!saved && typeof message.error === "string") showRefusal(pending.control, message.error);
  });
  return {
    initialize: initializeCheckboxes,
    clearPending: () => pendingToggles.clear(),
    keepRadioFocus,
    bindClicks() {
      document.addEventListener("click", (event) => {
        const target = event.target instanceof Element ? event.target : undefined;
        const checkbox = target?.closest<HTMLInputElement>(CHECKBOX_SELECTOR);
        const radio = checkbox ? undefined : target?.closest(RADIO_SELECTOR);
        if (!checkbox && !radio) return;
        event.stopImmediatePropagation?.();
        if (checkbox) toggleCheckbox(checkbox, event);
        else selectRadio(radio!, event);
      });
      // Capture phase: runs before the focus moves and before the page's block press handlers.
      document.addEventListener("mousedown", guardPress, true);
      // Capture phase: the group's keys run before the page's block and selection keys.
      document.addEventListener("keydown", handleRadioKey, true);
    },
  };
}
