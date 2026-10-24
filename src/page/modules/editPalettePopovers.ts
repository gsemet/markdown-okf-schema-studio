/**
 * The popovers of the edition palette: the size grid of the Table button, the emoji picker, the
 * filterable lists the host fills (references, citations) and the colour picker. Each builder
 * fills the popover element the palette opened; `PalettePopoverContext` is what it shares with
 * the palette (its state, its run and focus helpers).
 */

import type { EditAction } from "./editActions";
import type { EditPaletteDeps } from "./editPalette";

/** The state of the open popover the builders set and the palette reads (reset on close). */
export interface PalettePopoverState {
  /** Size grid state: the highlighted rectangle. */
  gridState: { rows: number; cols: number; max: { rows: number; cols: number }; show(): void } | undefined;
  gridAction: EditAction | undefined;
  /** The emoji picker's filter field. */
  emojiField: HTMLInputElement | undefined;
  /** True while a Shift+click insertion runs: the popover stays open through the text box's input. */
  holding: boolean;
}

/** What a popover builder gets from the palette. */
export interface PalettePopoverContext {
  readonly document: Document;
  readonly deps: EditPaletteDeps;
  readonly popover: PalettePopoverState;
  /** Cancels a press so the text box keeps the focus. */
  readonly keepFocus: (event: { preventDefault?: () => void }) => void;
  readonly closePopover: (refocus?: boolean) => boolean;
  /** Applies an action (with its argument) to the text box, or explains why it refuses. */
  readonly run: (action: EditAction, arg?: string) => void;
  /** Tracks the focus of a control inside the popover (a blur out of the editor saves). */
  readonly trackFocus: (control: HTMLElement) => void;
  /** The action context of the text box now. */
  readonly contextOf: (arg?: string) => {
    value: string;
    selectionStart: number;
    selectionEnd: number;
    scope: "block" | "cell";
    arg?: string;
  };
  /** The palette's buttons now. */
  readonly buttons: () => HTMLElement[];
  /** The open popover element, if any. */
  readonly openMenu: () => HTMLElement | undefined;
}

/** The `rows` x `cols` size grid: hover (or the arrow keys) highlight from the top-left cell. */
export function buildGrid(
  ctx: PalettePopoverContext,
  menu: HTMLElement,
  action: EditAction,
): void {
  const { document, popover, closePopover, run, buttons } = ctx;
  const max = action.grid ?? { rows: 9, cols: 9 };
  const cells: HTMLElement[] = [];
  const grid = document.createElement("div");
  grid.className = "sphinx-preview-edit-grid";
  grid.setAttribute("data-edit-grid", "true");
  grid.setAttribute("data-edit-grid-columns", String(max.cols));
  const label = document.createElement("div");
  label.className = "sphinx-preview-edit-grid-label";
  label.setAttribute("aria-live", "polite");
  label.textContent = "Table size";
  for (let row = 1; row <= max.rows; row += 1) {
    for (let col = 1; col <= max.cols; col += 1) {
      const cell = document.createElement("div");
      cell.className = "sphinx-preview-edit-grid-cell";
      cell.setAttribute("role", "menuitem");
      cell.setAttribute("aria-label", row + " \u00d7 " + col);
      cell.setAttribute("data-grid-row", String(row));
      cell.setAttribute("data-grid-col", String(col));
      grid.appendChild(cell);
      cells.push(cell);
    }
  }
  const state = {
    rows: 0,
    cols: 0,
    max,
    show(): void {
      for (const cell of cells) {
        const on = Number(cell.getAttribute("data-grid-row")) <= state.rows
          && Number(cell.getAttribute("data-grid-col")) <= state.cols;
        if (on) cell.setAttribute("data-grid-on", "true");
        else cell.removeAttribute("data-grid-on");
      }
      label.textContent = state.rows > 0 ? state.rows + " \u00d7 " + state.cols : "Table size";
    },
  };
  const cellOf = (event: { target?: unknown }): { rows: number; cols: number } | undefined => {
    const target = event.target as { getAttribute?: (name: string) => string | null } | undefined;
    const rows = Number(target?.getAttribute?.("data-grid-row"));
    const cols = Number(target?.getAttribute?.("data-grid-col"));
    return rows >= 1 && cols >= 1 ? { rows, cols } : undefined;
  };
  menu.addEventListener("mouseover", (event: { target?: unknown }) => {
    const hit = cellOf(event);
    if (!hit) return;
    state.rows = hit.rows;
    state.cols = hit.cols;
    state.show();
  });
  menu.addEventListener("click", (event: { target?: unknown; preventDefault?: () => void; stopPropagation?: () => void }) => {
    event.preventDefault?.();
    event.stopPropagation?.();
    const hit = cellOf(event);
    if (!hit) return;
    closePopover();
    run(action, hit.rows + "x" + hit.cols);
  });
  menu.appendChild(grid);
  menu.appendChild(label);
  popover.gridState = state;
  popover.gridAction = action;
}

/** The emoji picker: a filter field and the categories as grids of buttons(). */
export function buildEmoji(
  ctx: PalettePopoverContext,
  menu: HTMLElement,
  action: EditAction,
): void {
  const { document, deps, popover, keepFocus, closePopover, run, trackFocus } = ctx;
  const field = document.createElement("input");
  field.setAttribute("type", "text");
  field.className = "sphinx-preview-edit-emoji-filter";
  field.setAttribute("aria-label", "Filter emoji");
  field.setAttribute("placeholder", "Filter emoji");
  field.setAttribute("data-emoji-filter", "true");
  field.setAttribute("spellcheck", "false");
  field.setAttribute("autocomplete", "off");
  menu.appendChild(field);
  const scroller = document.createElement("div");
  scroller.className = "sphinx-preview-edit-emoji-list";
  menu.appendChild(scroller);
  const sections: Array<{ heading: HTMLElement; items: Array<{ button: HTMLElement; name: string; char: string }> }> = [];
  const items: Array<{ button: HTMLElement; name: string; char: string }> = [];
  const choose = (char: string, keepOpen: boolean): void => {
    if (!keepOpen) {
      closePopover();
      run(action, char);
      return;
    }
    // The insertion fires the text box's input event, which closes popovers; this one stays.
    popover.holding = true;
    try {
      run(action, char);
    } finally {
      popover.holding = false;
    }
  };
  for (const category of action.emoji ?? []) {
    const heading = document.createElement("div");
    heading.className = "sphinx-preview-edit-emoji-heading";
    heading.textContent = category.label;
    scroller.appendChild(heading);
    const grid = document.createElement("div");
    grid.className = "sphinx-preview-edit-emoji-grid";
    scroller.appendChild(grid);
    const section = { heading, items: [] as Array<{ button: HTMLElement; name: string; char: string }> };
    for (const entry of category.items) {
      const button = document.createElement("button");
      button.setAttribute("type", "button");
      button.setAttribute("tabindex", "-1");
      button.setAttribute("title", entry.name);
      button.setAttribute("aria-label", entry.name);
      button.setAttribute("data-emoji", entry.char);
      button.textContent = entry.char;
      button.addEventListener("mousedown", keepFocus);
      button.addEventListener("click", (event: { shiftKey?: boolean; preventDefault?: () => void; stopPropagation?: () => void }) => {
        event.preventDefault?.();
        event.stopPropagation?.();
        choose(entry.char, event.shiftKey === true);
      });
      trackFocus(button);
      grid.appendChild(button);
      const record = { button, name: entry.name.toLowerCase(), char: entry.char };
      section.items.push(record);
      items.push(record);
    }
    sections.push(section);
  }
  const visible = (): HTMLElement[] =>
    items.filter((item) => item.button.getAttribute("hidden") === null).map((item) => item.button);
  const filter = (): void => {
    const words = String(field.value).trim().toLowerCase().split(/\s+/u).filter((word) => word !== "");
    for (const item of items) {
      const match = words.every((word) => item.name.includes(word) || item.char === word);
      if (match) item.button.removeAttribute("hidden");
      else item.button.setAttribute("hidden", "true");
    }
    for (const section of sections) {
      const any = section.items.some((item) => item.button.getAttribute("hidden") === null);
      if (any) section.heading.removeAttribute("hidden");
      else section.heading.setAttribute("hidden", "true");
    }
  };
  field.addEventListener("input", filter);
  trackFocus(field);
  const keysOf = (self: HTMLElement) => (event: {
    key?: string;
    shiftKey?: boolean;
    metaKey?: boolean;
    ctrlKey?: boolean;
    isComposing?: boolean;
    preventDefault?: () => void;
    stopPropagation?: () => void;
  }): void => {
    if (event.isComposing) return;
    const fromField = self === field;
    const swallow = (): void => {
      event.preventDefault?.();
      event.stopPropagation?.();
    };
    if (event.key === "Escape") {
      // Back to the text box; the next Escape there cancels the editor.
      swallow();
      closePopover();
      return;
    }
    const shown = visible();
    if (fromField && event.key === "Enter") {
      swallow();
      if (event.metaKey || event.ctrlKey) {
        closePopover();
        deps.onDone?.();
        return;
      }
      const first = items.find((item) => item.button.getAttribute("hidden") === null);
      if (first) choose(first.char, event.shiftKey === true);
      return;
    }
    if (fromField && event.key === "ArrowDown") {
      swallow();
      shown[0]?.focus({ preventScroll: true });
      return;
    }
    if (!fromField) {
      const at = shown.indexOf(self);
      const columns = 8;
      const move = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1
        : event.key === "ArrowDown" ? columns : event.key === "ArrowUp" ? -columns : 0;
      if (move === 0 || at < 0) return;
      swallow();
      const next = at + move;
      if (next < 0) field.focus({ preventScroll: true });
      else if (next < shown.length) shown[next].focus({ preventScroll: true });
    }
  };
  field.addEventListener("keydown", keysOf(field));
  for (const item of items) item.button.addEventListener("keydown", keysOf(item.button));
  popover.emojiField = field;
}

/**
 * A filterable list the host fills: "Loading..." first, then one button per entry. The filter
 * matches the value and the detail; Enter picks the first match, Escape closes (the shared
 * handlers). An answer that arrives after the popover closed is dropped.
 */
export function buildChoices(
  ctx: PalettePopoverContext,
  menu: HTMLElement,
  action: EditAction,
): () => void {
  const { document, deps, popover, keepFocus, closePopover, run, trackFocus, openMenu } = ctx;
  const field = document.createElement("input");
  field.setAttribute("type", "text");
  field.className = "sphinx-preview-edit-emoji-filter";
  field.setAttribute("aria-label", "Filter " + action.label.toLowerCase());
  field.setAttribute("placeholder", "Filter");
  field.setAttribute("data-choice-filter", "true");
  field.setAttribute("spellcheck", "false");
  field.setAttribute("autocomplete", "off");
  menu.appendChild(field);
  const list = document.createElement("div");
  list.className = "sphinx-preview-edit-choice-list";
  menu.appendChild(list);
  const note = document.createElement("div");
  note.className = "sphinx-preview-edit-choice-note";
  note.setAttribute("role", "status");
  note.textContent = "Loading...";
  list.appendChild(note);
  let entries: Array<{ button: HTMLElement; text: string; value: string }> = [];
  const visible = (): Array<{ button: HTMLElement; text: string; value: string }> =>
    entries.filter((entry) => entry.button.getAttribute("hidden") === null);
  const choose = (value: string): void => {
    closePopover();
    run(action, value);
  };
  const filter = (): void => {
    const words = String(field.value).trim().toLowerCase().split(/\s+/u).filter((word) => word !== "");
    for (const entry of entries) {
      if (words.every((word) => entry.text.includes(word))) entry.button.removeAttribute("hidden");
      else entry.button.setAttribute("hidden", "true");
    }
  };
  field.addEventListener("input", filter);
  trackFocus(field);
  field.addEventListener("keydown", (event: {
    key?: string;
    metaKey?: boolean;
    ctrlKey?: boolean;
    isComposing?: boolean;
    preventDefault?: () => void;
    stopPropagation?: () => void;
  }) => {
    if (event.isComposing) return;
    if (event.key === "Escape") {
      event.preventDefault?.();
      event.stopPropagation?.();
      closePopover();
    } else if (event.key === "Enter") {
      event.preventDefault?.();
      event.stopPropagation?.();
      if (event.metaKey || event.ctrlKey) {
        closePopover();
        deps.onDone?.();
        return;
      }
      const first = visible()[0];
      if (first) choose(first.value);
    } else if (event.key === "ArrowDown") {
      event.preventDefault?.();
      event.stopPropagation?.();
      visible()[0]?.button.focus({ preventScroll: true });
    }
  });
  const kind = action.hostList;
  const ask = deps.requestList;
  if (!kind || !ask) {
    note.textContent = "The list is not available here.";
    popover.emojiField = field;
    return () => undefined;
  }
  popover.emojiField = field;
  // Started once the popover is open, so an answer in the same turn still finds it.
  return () => ask(kind, (result) => {
    if (openMenu() !== menu) return;
    note.remove();
    if (result.error || result.items.length === 0) {
      list.appendChild(note);
      note.textContent = result.error
        ? result.error
        : kind === "targets" ? "No label found. Add one with the Label button." : "No citation key found in the workspace .bib files.";
      return;
    }
    entries = result.items.map((item) => {
      const button = document.createElement("button");
      button.setAttribute("type", "button");
      button.setAttribute("tabindex", "-1");
      button.setAttribute("role", "menuitem");
      button.setAttribute("data-edit-option", item.value);
      button.textContent = item.detail ? item.label + " \u2014 " + item.detail : item.label;
      button.addEventListener("mousedown", keepFocus);
      button.addEventListener("click", (event: { preventDefault?: () => void; stopPropagation?: () => void }) => {
        event.preventDefault?.();
        event.stopPropagation?.();
        choose(item.value);
      });
      button.addEventListener("keydown", (event: { key?: string; isComposing?: boolean; preventDefault?: () => void; stopPropagation?: () => void }) => {
        if (event.isComposing) return;
        const shown = visible();
        const at = shown.findIndex((entry) => entry.button === button);
        if (event.key === "Escape") {
          event.preventDefault?.();
          event.stopPropagation?.();
          closePopover();
        } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault?.();
          event.stopPropagation?.();
          const next = at + (event.key === "ArrowDown" ? 1 : -1);
          if (next < 0) field.focus({ preventScroll: true });
          else shown[next]?.button.focus({ preventScroll: true });
        }
      });
      trackFocus(button);
      list.appendChild(button);
      return { button, text: (item.value + " " + (item.detail ?? "")).toLowerCase(), value: item.value };
    });
    if (result.truncated) {
      const more = document.createElement("div");
      more.className = "sphinx-preview-edit-choice-note";
      more.textContent = "More entries exist. Type to narrow the list.";
      list.appendChild(more);
    }
    filter();
  });
}

/**
 * The colour picker: Text and Background tabs, 16 swatches, a hex field and Remove. A swatch
 * applies at once; the hex field validates as the user types and Enter applies it. For the
 * colour-code swatch (an action that has `current`) there are no tabs and no Remove: the picker
 * starts on the code's value and replaces the code in place. The hex field takes the focus when
 * clicked (the T22 blur relaxation keeps that from saving); everything else keeps it in the text.
 */
export function buildColor(
  ctx: PalettePopoverContext,
  menu: HTMLElement,
  action: EditAction,
): void {
  const { document, deps, keepFocus, closePopover, run, trackFocus, contextOf } = ctx;
  const inPlace = typeof action.current === "function";
  let tab = "text";
  const tabs: HTMLElement[] = [];
  if (!inPlace) {
    const strip = document.createElement("div");
    strip.className = "sphinx-preview-edit-color-tabs";
    strip.setAttribute("role", "tablist");
    for (const [id, label] of [["text", "Text"], ["background", "Background"]]) {
      const button = document.createElement("button");
      button.setAttribute("type", "button");
      button.setAttribute("tabindex", "-1");
      button.setAttribute("role", "tab");
      button.setAttribute("data-color-tab", id);
      button.setAttribute("aria-selected", id === tab ? "true" : "false");
      button.textContent = label;
      button.addEventListener("mousedown", keepFocus);
      button.addEventListener("click", (event: { preventDefault?: () => void; stopPropagation?: () => void }) => {
        event.preventDefault?.();
        event.stopPropagation?.();
        tab = id;
        for (const other of tabs) {
          other.setAttribute("aria-selected", other.getAttribute("data-color-tab") === tab ? "true" : "false");
        }
      });
      tabs.push(button);
      strip.appendChild(button);
    }
    menu.appendChild(strip);
  }
  const apply = (colour: string): void => {
    closePopover();
    run(action, inPlace ? colour : tab + ":" + colour);
  };
  const grid = document.createElement("div");
  grid.className = "sphinx-preview-edit-color-grid";
  for (const colour of action.colors ?? []) {
    const swatch = document.createElement("button");
    swatch.setAttribute("type", "button");
    swatch.setAttribute("tabindex", "-1");
    swatch.setAttribute("title", colour);
    swatch.setAttribute("aria-label", colour);
    swatch.setAttribute("data-color-swatch", colour);
    swatch.style.setProperty("background-color", colour);
    swatch.addEventListener("mousedown", keepFocus);
    swatch.addEventListener("click", (event: { preventDefault?: () => void; stopPropagation?: () => void }) => {
      event.preventDefault?.();
      event.stopPropagation?.();
      apply(colour);
    });
    grid.appendChild(swatch);
  }
  menu.appendChild(grid);
  const field = document.createElement("input");
  field.setAttribute("type", "text");
  field.className = "sphinx-preview-edit-emoji-filter sphinx-preview-edit-color-hex";
  field.setAttribute("aria-label", "Colour code");
  field.setAttribute("placeholder", "#rrggbb");
  field.setAttribute("data-color-hex", "true");
  field.setAttribute("spellcheck", "false");
  field.setAttribute("autocomplete", "off");
  field.value = action.current?.(contextOf()) ?? "";
  const valid = (): boolean => action.validateColor?.(String(field.value)) === true;
  const check = (): void => {
    if (String(field.value).trim() === "" || valid()) field.removeAttribute("aria-invalid");
    else field.setAttribute("aria-invalid", "true");
  };
  field.addEventListener("input", check);
  trackFocus(field);
  field.addEventListener("keydown", (event: {
    key?: string;
    metaKey?: boolean;
    ctrlKey?: boolean;
    isComposing?: boolean;
    preventDefault?: () => void;
    stopPropagation?: () => void;
  }) => {
    if (event.isComposing) return;
    if (event.key === "Escape") {
      event.preventDefault?.();
      event.stopPropagation?.();
      closePopover();
    } else if (event.key === "Enter") {
      event.preventDefault?.();
      event.stopPropagation?.();
      if (event.metaKey || event.ctrlKey) {
        closePopover();
        deps.onDone?.();
      } else if (valid()) {
        apply(String(field.value).trim());
      } else {
        field.setAttribute("aria-invalid", "true");
      }
    }
  });
  menu.appendChild(field);
  if (!inPlace) {
    const remove = document.createElement("button");
    remove.setAttribute("type", "button");
    remove.setAttribute("tabindex", "-1");
    remove.className = "sphinx-preview-edit-color-remove";
    remove.setAttribute("data-color-remove", "true");
    remove.textContent = "Remove";
    remove.addEventListener("mousedown", keepFocus);
    remove.addEventListener("click", (event: { preventDefault?: () => void; stopPropagation?: () => void }) => {
      event.preventDefault?.();
      event.stopPropagation?.();
      closePopover();
      run(action, tab + ":");
    });
    menu.appendChild(remove);
  }
}
