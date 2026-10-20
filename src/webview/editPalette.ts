import type { EditAction, EditActionMode, EditActionRegistry } from "./editActions";
import type { TextEdit } from "./textEditing";

/** The text box the palette edits (a textarea; only these members are read). */
export interface EditPaletteControl {
  value: string;
  selectionStart: number;
  selectionEnd: number;
  focus(options?: { preventScroll?: boolean }): void;
}

export interface EditPaletteDeps {
  actions: EditActionRegistry;
  getControl(): EditPaletteControl;
  /** Runs an edit as one native, undoable step in the control (and autosaves). */
  applyTextEdit(edit: TextEdit): void;
  /** Opens the small panel of an action that has one (the Link button). */
  openPanel?(action: EditAction): void;
  mode: EditActionMode;
  /** Called once when the user picks another mode in the select (not by `setMode`). */
  onModeChange?(mode: EditActionMode): void;
  /** Focus left the editor frame from the select: the caller runs the normal final save. */
  onLeave?(): void;
  /** True for a node inside the editor frame (the select's blur then keeps the editor open). */
  isInsideFrame?(node: unknown): boolean;
  /** Cmd/Ctrl+Enter on the select: the caller finishes the edit like the text box does. */
  onDone?(): void;
  /** Tooltip text of the keyboard path to the select, for example "Cmd+Shift+M". */
  modeShortcut?: string;
  /** Shows Cmd instead of Ctrl in the tooltips. */
  apple?: boolean;
}

export interface EditPalette {
  element: HTMLElement;
  /** Rebuilds the buttons from the registry and the current mode. */
  refresh(): void;
  /** Moves the focus to the mode select (keyboard path); Enter or Escape there goes back. */
  focusModeSelect(): void;
  /** Shows the buttons of another mode and updates the select; does not call `onModeChange`. */
  setMode(mode: EditActionMode): void;
  /** Removes the palette; the caller owns the text box and its listeners. */
  destroy(): void;
  /**
   * Escape closes the open popover; with the size grid open the arrows and Enter drive it.
   * Reports whether the key was consumed.
   */
  handleKey(event: {
    key?: string;
    shiftKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
    ctrlKey?: boolean;
    isComposing?: boolean;
    preventDefault?: () => void;
    stopPropagation?: () => void;
  }): boolean;
  /** Closes the open popover (if any) and reports whether there was one. */
  closePopover(): boolean;
}

/**
 * The edition palette: a pill-shaped bar of edit actions shown above an open block editor. It is
 * data-driven from the action registry, so a new registered action shows up as a new button.
 * Every control keeps the focus in the text box (mousedown is cancelled), so clicking never
 * commits the editor. Injected into the page script with `.toString()`: the body must not use
 * anything defined outside it.
 */
export function createEditPalette(document: Document, deps: EditPaletteDeps): EditPalette {
  const MODE_RANK: Record<string, number> = { strict: 0, gfm: 1, myst: 2 };
  const svg = (paths: string): string =>
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' + paths + '"></path></svg>';
  const glyph = (kind: string, text: string): string =>
    '<span class="sphinx-preview-edit-palette-glyph" data-glyph="' + kind + '" aria-hidden="true">'
    + text + "</span>";
  const caret =
    '<svg class="sphinx-preview-edit-palette-caret" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 10l5 5 5-5"></path></svg>';
  const icons: Record<string, string> = {
    heading: svg("M6 4v16M18 4v16M6 12h12") + caret,
    bold: glyph("bold", "B"),
    italic: glyph("italic", "I"),
    strikethrough: glyph("strikethrough", "S"),
    code: svg("M8 7l-5 5 5 5M16 7l5 5-5 5M14 5l-4 14") + caret,
    quote: svg("M5 11h4v6H5zM5 11c0-3 1-5 4-6M14 11h4v6h-4zM14 11c0-3 1-5 4-6"),
    link: svg("M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"),
    rule: svg("M3 12h18M8 7h8M8 17h8"),
    todo: svg("M5 4v17M5 5h12l-2 4 2 4H5"),
    table: svg("M4 5h16v14H4zM4 10h16M4 14.5h16M10 5v14M15 5v14"),
    emoji: svg("M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8.5 14a4.5 4.5 0 0 0 7 0M9 9.5v.5M15 9.5v.5"),
  };

  const root = document.createElement("div");
  root.className = "sphinx-preview-edit-palette";
  root.setAttribute("role", "toolbar");
  root.setAttribute("aria-label", "Edition palette");
  root.setAttribute("data-sphinx-edit-palette", "true");
  root.addEventListener("click", (event) => event.stopPropagation?.());
  // A press on the bar's padding, gaps or rounded edge must not blur the text box either.
  const keepFocus = (event: { preventDefault?: () => void }): void => event.preventDefault?.();
  root.addEventListener("mousedown", keepFocus);

  let openMenu: HTMLElement | undefined;
  let openButton: HTMLElement | undefined;
  // Size grid state (the highlighted rectangle) and emoji picker state of the open popover.
  let gridState: { rows: number; cols: number; max: { rows: number; cols: number }; show(): void } | undefined;
  let gridAction: EditAction | undefined;
  let emojiField: HTMLInputElement | undefined;
  // True while a control inside the popover (the filter or an emoji button) has the focus.
  let menuFocused = false;
  // True while the popover removes itself: blur events from that removal are not a departure.
  let closing = false;
  // True while a Shift+click insertion runs: the popover stays open through the text box's input.
  let holding = false;
  let mode: EditActionMode = deps.mode;
  let buttons: HTMLElement[] = [];

  // The mode select starts the bar. Unlike the buttons it must receive the press itself (a
  // cancelled mousedown would keep the native list from opening); focus moving to it stays inside
  // the editor frame, so the blur of the text box does not save.
  const modeSelect = document.createElement("select");
  modeSelect.className = "sphinx-preview-edit-palette-mode";
  modeSelect.setAttribute("aria-label", "Palette buttons");
  modeSelect.setAttribute("title", "Palette buttons" + (deps.modeShortcut ? " (" + deps.modeShortcut + ")" : ""));
  modeSelect.setAttribute("data-edit-palette-mode-select", "true");
  const MODE_LABELS: Array<[EditActionMode, string]> = [
    ["strict", "Strict Markdown"],
    ["gfm", "GitHub (GFM)"],
    ["myst", "MyST (includes GFM)"],
  ];
  for (const [value, label] of MODE_LABELS) {
    const option = document.createElement("option");
    option.setAttribute("value", value);
    option.textContent = label;
    modeSelect.appendChild(option);
  }
  modeSelect.addEventListener("mousedown", (event) => event.stopPropagation?.());
  // A native list gives no event when it closes without a change. Focus entering the select
  // starts "closed"; each click then toggles the list, so the click that closes it hands the
  // focus back to the text box (otherwise the editor would be stuck with the focus in the select).
  let listOpen = false;
  const backToText = (): void => deps.getControl().focus({ preventScroll: true });
  modeSelect.addEventListener("focus", () => { listOpen = false; });
  modeSelect.addEventListener("click", () => {
    if (listOpen) {
      listOpen = false;
      backToText();
    } else {
      listOpen = true;
    }
  });
  modeSelect.addEventListener("blur", (event?: { relatedTarget?: unknown }) => {
    listOpen = false;
    const next = event?.relatedTarget;
    if (next && deps.isInsideFrame?.(next)) return;
    deps.onLeave?.();
  });
  modeSelect.addEventListener("keydown", (event: {
    key?: string;
    metaKey?: boolean;
    ctrlKey?: boolean;
    isComposing?: boolean;
    preventDefault?: () => void;
    stopPropagation?: () => void;
  }) => {
    if (event.isComposing) return;
    if (event.key === "Escape") {
      // First Escape returns to the text box; a second one there cancels the editor.
      event.preventDefault?.();
      event.stopPropagation?.();
      listOpen = false;
      backToText();
    } else if (event.key === "Enter") {
      event.preventDefault?.();
      event.stopPropagation?.();
      listOpen = false;
      if (event.metaKey || event.ctrlKey) deps.onDone?.();
      else backToText();
    }
  });
  modeSelect.addEventListener("change", () => {
    const chosen = String(modeSelect.value);
    if (!MODE_LABELS.some(([value]) => value === chosen)) {
      modeSelect.value = mode;
      return;
    }
    listOpen = false;
    if (chosen === mode) return;
    setMode(chosen as EditActionMode);
    deps.onModeChange?.(mode);
    deps.getControl().focus({ preventScroll: true });
  });
  root.appendChild(modeSelect);

  /**
   * Closes the open popover. When the focus was inside it (the emoji filter or a button) the focus
   * goes back to the text box, so the editor never ends up with no focused control; `refocus` is
   * false only when the whole editor is being torn down.
   */
  function closePopover(refocus = true): boolean {
    if (!openMenu) return false;
    const hadFocus = menuFocused;
    closing = true;
    try {
      openMenu.remove();
    } finally {
      closing = false;
    }
    openButton?.setAttribute("aria-expanded", "false");
    openMenu = undefined;
    openButton = undefined;
    gridState = undefined;
    gridAction = undefined;
    emojiField = undefined;
    menuFocused = false;
    if (hadFocus && refocus) deps.getControl().focus({ preventScroll: true });
    return true;
  }

  function run(action: EditAction, arg?: string): void {
    const control = deps.getControl();
    const edit = action.apply({
      value: String(control.value ?? ""),
      selectionStart: Number(control.selectionStart),
      selectionEnd: Number(control.selectionEnd),
      scope: "block",
      ...(arg === undefined ? {} : { arg }),
    });
    if (edit) deps.applyTextEdit(edit);
    else control.focus({ preventScroll: true });
  }

  /** Focus left the popover for something outside the editor frame: the normal final save. */
  function popoverBlur(event?: { relatedTarget?: unknown }): void {
    menuFocused = false;
    if (closing) return;
    const next = event?.relatedTarget;
    if (next && deps.isInsideFrame?.(next)) return;
    deps.onLeave?.();
  }

  function trackFocus(control: HTMLElement): void {
    control.addEventListener("focus", () => { menuFocused = true; });
    control.addEventListener("blur", popoverBlur);
  }

  /** The `rows` x `cols` size grid: hover (or the arrow keys) highlight from the top-left cell. */
  function buildGrid(menu: HTMLElement, action: EditAction): void {
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
    gridState = state;
    gridAction = action;
  }

  /** The emoji picker: a filter field and the categories as grids of buttons. */
  function buildEmoji(menu: HTMLElement, action: EditAction): void {
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
      holding = true;
      try {
        run(action, char);
      } finally {
        holding = false;
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
    emojiField = field;
  }

  function openPopover(action: EditAction, button: HTMLElement): void {
    closePopover();
    const menu = document.createElement("div");
    menu.className = "sphinx-preview-edit-palette-menu";
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", action.label);
    menu.setAttribute("data-edit-popover", String(action.popover));
    // The emoji filter has to receive the press itself to take the caret; everything else keeps
    // the focus where it is.
    menu.addEventListener("mousedown", (event: {
      target?: unknown;
      preventDefault?: () => void;
      stopPropagation?: () => void;
    }) => {
      const tag = String((event.target as { tagName?: string } | undefined)?.tagName ?? "").toUpperCase();
      // Stopping the event keeps the bar's own mousedown (which cancels it) from reaching the field.
      if (tag === "INPUT") event.stopPropagation?.();
      else event.preventDefault?.();
    });
    if (action.popover === "grid" && action.grid) {
      buildGrid(menu, action);
    } else if (action.popover === "emoji" && action.emoji) {
      buildEmoji(menu, action);
    } else {
      for (const option of action.options ?? []) {
        const item = document.createElement("button");
        item.setAttribute("type", "button");
        item.setAttribute("role", "menuitem");
        item.setAttribute("data-edit-option", option.value);
        item.textContent = option.label;
        item.addEventListener("mousedown", keepFocus);
        item.addEventListener("click", (event) => {
          event.preventDefault?.();
          event.stopPropagation?.();
          closePopover();
          run(action, option.value);
        });
        menu.appendChild(item);
      }
    }
    root.appendChild(menu);
    // Under its button, pulled back left when it would leave the bar's width.
    const left = button.offsetLeft;
    if (typeof left === "number" && Number.isFinite(left)) {
      const room = root.clientWidth - menu.offsetWidth;
      const at = Number.isFinite(room) && room > 0 ? Math.min(left, room) : left;
      menu.style.setProperty("inset-inline-start", Math.max(0, at) + "px");
    }
    button.setAttribute("aria-expanded", "true");
    openMenu = menu;
    openButton = button;
  }

  function tooltip(action: EditAction): string {
    const shortcut = deps.actions.shortcutLabel(action, deps.apple === true);
    return (action.title ?? action.label) + (shortcut ? " (" + shortcut + ")" : "");
  }

  function setMode(next: EditActionMode): void {
    mode = next;
    build();
  }

  function build(): void {
    closePopover();
    for (const old of buttons) old.remove();
    buttons = [];
    modeSelect.value = mode;
    root.setAttribute("data-palette-mode", mode);
    const rank = MODE_RANK[mode] ?? 0;
    let previousGroup = "";
    for (const action of deps.actions.actions) {
      if (!action.scopes.includes("block")) continue;
      // Modes are additive: an action listed for a lower mode shows in every higher one.
      if (!action.modes.some((candidate) => (MODE_RANK[candidate] ?? 0) <= rank)) continue;
      const button = document.createElement("button");
      button.setAttribute("type", "button");
      button.setAttribute("tabindex", "-1");
      button.setAttribute("aria-label", action.label);
      const text = tooltip(action);
      button.setAttribute("title", text);
      button.setAttribute("data-edit-action", action.id);
      button.setAttribute("data-edit-group", action.group);
      if (previousGroup && previousGroup !== action.group) {
        button.setAttribute("data-edit-group-start", "true");
      }
      previousGroup = action.group;
      button.innerHTML = icons[action.icon] ?? "";
      if (action.popover) {
        button.setAttribute("aria-haspopup", "menu");
        button.setAttribute("aria-expanded", "false");
      }
      button.addEventListener("mousedown", keepFocus);
      button.addEventListener("click", (event) => {
        event.preventDefault?.();
        event.stopPropagation?.();
        if (action.popover) {
          if (openButton === button) {
            closePopover();
          } else {
            openPopover(action, button);
            // The emoji picker takes the focus for its filter; every other popover leaves it in
            // the text box.
            if (emojiField) {
              emojiField.focus({ preventScroll: true });
              menuFocused = true;
            } else deps.getControl().focus({ preventScroll: true });
          }
          return;
        }
        closePopover();
        if (action.panel) {
          deps.openPanel?.(action);
          return;
        }
        run(action);
      });
      root.appendChild(button);
      buttons.push(button);
    }
  }

  build();

  return {
    element: root,
    refresh: build,
    setMode,
    focusModeSelect() {
      closePopover();
      modeSelect.focus({ preventScroll: true });
    },
    destroy() {
      closePopover(false);
      root.remove();
    },
    handleKey(event) {
      if (event.isComposing || !openMenu) return false;
      if (event.key === "Escape") {
        event.preventDefault?.();
        event.stopPropagation?.();
        closePopover();
        return true;
      }
      // The size grid is driven from the text box: arrows move the highlighted rectangle and
      // Enter inserts it. Anything else (typing, modifiers) falls through and closes nothing.
      const grid = gridState;
      const action = gridAction;
      if (!grid || !action || event.altKey || event.metaKey || event.ctrlKey) return false;
      const arrow = event.key === "ArrowRight" || event.key === "ArrowLeft"
        || event.key === "ArrowDown" || event.key === "ArrowUp";
      if (arrow) {
        event.preventDefault?.();
        event.stopPropagation?.();
        if (grid.rows === 0) {
          grid.rows = 1;
          grid.cols = 1;
        } else if (event.key === "ArrowRight") {
          grid.cols = Math.min(grid.max.cols, grid.cols + 1);
        } else if (event.key === "ArrowLeft") {
          grid.cols = Math.max(1, grid.cols - 1);
        } else if (event.key === "ArrowDown") {
          grid.rows = Math.min(grid.max.rows, grid.rows + 1);
        } else {
          grid.rows = Math.max(1, grid.rows - 1);
        }
        grid.show();
        return true;
      }
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault?.();
        event.stopPropagation?.();
        // Enter before any highlight chooses nothing; the grid stays open for an arrow or Escape.
        if (grid.rows > 0) {
          const size = grid.rows + "x" + grid.cols;
          closePopover();
          run(action, size);
        }
        return true;
      }
      return false;
    },
    closePopover: () => (holding ? false : closePopover()),
  };
}
