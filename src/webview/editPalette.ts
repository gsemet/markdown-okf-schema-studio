import type { EditAction, EditActionMode, EditActionRegistry } from "./editActions";
import type { CaretRect } from "./caretRect";
import type { TextEdit } from "./textEditing";

/** The text box the palette edits (a textarea; only these members are read). */
export interface EditPaletteControl {
  value: string;
  selectionStart: number;
  selectionEnd: number;
  focus(options?: { preventScroll?: boolean }): void;
}

/** What the host answers to a list request: the entries of a filterable popover. */
export interface EditPaletteChoiceList {
  items: Array<{ value: string; label: string; detail?: string }>;
  truncated?: boolean;
  /** Why the list could not be read; shown in place of the entries. */
  error?: string;
}

export interface EditPaletteDeps {
  actions: EditActionRegistry;
  getControl(): EditPaletteControl;
  /**
   * Where the caret is on screen (viewport coordinates), for the dropdowns that open at the caret
   * (the Alert type list). Absent or `undefined`: the dropdown opens under its button.
   */
  getCaretRect?(): CaretRect | undefined;
  /** Runs an edit as one native, undoable step in the control (and autosaves). */
  applyTextEdit(edit: TextEdit): void;
  /** Asks the host for the entries of a `hostList` action; `done` is called once, maybe late. */
  requestList?(kind: "targets" | "citations", done: (result: EditPaletteChoiceList) => void): void;
  /**
   * Asks the host for a native dialog (a `hostDialog` action). `done` gets the chosen value, or
   * `undefined` when the dialog was cancelled or failed. The caller keeps the editor open while it
   * is shown.
   */
  pickHost?(kind: "document" | "image", done: (value: string | undefined) => void): void;
  /** Opens the small panel of an action that has one (the Link button), or the named one. */
  openPanel?(action: EditAction, panel?: string): void;
  /** True when the caret is inside existing syntax of this kind (see `panelWhenInside`). */
  caretInside?(kind: "figure"): boolean;
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
  /**
   * Shows or hides the buttons that depend on the caret (the colour-code swatch) for the text
   * box's current selection; the page calls it as the caret moves.
   */
  updateAvailability(): void;
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
    alert: svg("M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5v5.5M12 16v.5") + caret,
    checkbox: svg("M5 5h14v14H5zM8.5 12l2.5 2.5 4.5-5"),
    htmlTable: svg("M4 5h16v14H4zM4 10h16M9 12.5l-1.7 1.7L9 16M15 12.5l1.7 1.7L15 16"),
    details: svg("M5 5l4 4 4-4M5 14h14M5 19h10"),
    footnote: svg("M5 9h8M9 5v10M5 19h14M16 5.5l1.5-1v5"),
    mermaid: svg("M4 5h6v4H4zM14 15h6v4h-6zM7 9v3a2 2 0 0 0 2 2h5"),
    columnAlign: svg("M4 6h16M4 10h10M4 14h16M4 18h10") + caret,
    admonition: svg("M4 5h16v14H4zM4 9h16M8 13h8M8 16h5") + caret,
    deflist: svg("M4 6h7M7 10h13M4 15h7M7 19h13"),
    math: glyph("math", "\u03a3") + caret,
    sub: glyph("sub", "x\u2082"),
    sup: glyph("sup", "x\u00b2"),
    label: svg("M4 5h9l7 7-7 7H4zM8 10v.5"),
    kbd: svg("M3 7h18v10H3zM7 11h.5M11 11h.5M15 11h.5M8 14h8"),
    ref: svg("M9 8H7a4 4 0 0 0 0 8h2M15 8h2a4 4 0 0 1 0 8h-2M8 12h8") + caret,
    image: svg("M4 5h16v14H4zM4 16l5-5 4 4 2-2 5 5M15 9.5v.5"),
    figure: svg("M4 4h16v11H4zM4 15l4.5-4.5 3.5 3.5 2-2 6 3M7 19h10"),
    doc: svg("M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6"),
    cite: glyph("cite", "\u201c") + caret,
    dropdown: svg("M4 5h16v14H4zM8 10l4 4 4-4"),
    tableCaption: svg("M4 4h16M4 8h16v12H4zM4 13h16M10 8v12"),
    table: svg("M4 5h16v14H4zM4 10h16M4 14.5h16M10 5v14M15 5v14"),
    color: svg("M7 15l5-10 5 10M9 11h6M5 20h14") + caret,
    colorCode: "",
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
  // Dropdown that opens at the caret (Alert): its option buttons and the one the arrow keys lit.
  let caretOptions: HTMLElement[] = [];
  let caretAction: EditAction | undefined;
  let caretIndex = -1;
  let mode: EditActionMode = deps.mode;
  let buttons: HTMLElement[] = [];
  // The action behind each button, for the ones whose visibility follows the caret.
  let caretButtons: Array<{ button: HTMLElement; action: EditAction; swatch?: HTMLElement }> = [];

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
    caretOptions = [];
    caretAction = undefined;
    caretIndex = -1;
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

  /**
   * A filterable list the host fills: "Loading..." first, then one button per entry. The filter
   * matches the value and the detail; Enter picks the first match, Escape closes (the shared
   * handlers). An answer that arrives after the popover closed is dropped.
   */
  function buildChoices(menu: HTMLElement, action: EditAction): () => void {
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
      emojiField = field;
      return () => undefined;
    }
    emojiField = field;
    // Started once the popover is open, so an answer in the same turn still finds it.
    return () => ask(kind, (result) => {
      if (openMenu !== menu) return;
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

  function contextOf(arg?: string) {
    const control = deps.getControl();
    return {
      value: String(control.value ?? ""),
      selectionStart: Number(control.selectionStart),
      selectionEnd: Number(control.selectionEnd),
      scope: "block" as const,
      ...(arg === undefined ? {} : { arg }),
    };
  }

  /**
   * The colour picker: Text and Background tabs, 16 swatches, a hex field and Remove. A swatch
   * applies at once; the hex field validates as the user types and Enter applies it. For the
   * colour-code swatch (an action that has `current`) there are no tabs and no Remove: the picker
   * starts on the code's value and replaces the code in place. The hex field takes the focus when
   * clicked (the T22 blur relaxation keeps that from saving); everything else keeps it in the text.
   */
  function buildColor(menu: HTMLElement, action: EditAction): void {
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

  /** Shows the caret-dependent buttons only where their action says so; shows the code swatch. */
  function updateAvailability(): void {
    if (caretButtons.length === 0) return;
    const ctx = contextOf();
    for (const entry of caretButtons) {
      const shown = entry.action.available ? entry.action.available(ctx) : true;
      if (shown) {
        entry.button.removeAttribute("hidden");
        const colour = entry.action.current?.(ctx);
        if (colour !== undefined && entry.swatch) entry.swatch.style.setProperty("background-color", colour);
      } else {
        entry.button.setAttribute("hidden", "true");
        // The caret left the code the open picker was for.
        if (openButton === entry.button) closePopover();
      }
    }
  }

  function openPopover(action: EditAction, button: HTMLElement): void {
    closePopover();
    const menu = document.createElement("div");
    menu.className = "sphinx-preview-edit-palette-menu";
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", action.label);
    menu.setAttribute("data-edit-popover", String(action.popover));
    let startChoices: (() => void) | undefined;
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
    } else if (action.popover === "choices" && action.hostList) {
      startChoices = buildChoices(menu, action);
    } else if (action.popover === "color" && action.colors) {
      buildColor(menu, action);
    } else {
      for (const option of action.options ?? []) {
        const item = document.createElement("button");
        item.setAttribute("type", "button");
        item.setAttribute("role", "menuitem");
        item.setAttribute("data-edit-option", option.value);
        item.textContent = option.label;
        item.setAttribute("tabindex", "-1");
        item.addEventListener("mousedown", keepFocus);
        item.addEventListener("click", (event) => {
          event.preventDefault?.();
          event.stopPropagation?.();
          closePopover();
          run(action, option.value);
        });
        // Should an option ever hold the focus, Escape hands it back and leaving the frame saves.
        trackFocus(item);
        item.addEventListener("keydown", (event: {
          key?: string;
          isComposing?: boolean;
          preventDefault?: () => void;
          stopPropagation?: () => void;
        }) => {
          if (event.isComposing || event.key !== "Escape") return;
          event.preventDefault?.();
          event.stopPropagation?.();
          closePopover();
          deps.getControl().focus({ preventScroll: true });
        });
        menu.appendChild(item);
        if (action.popoverAtCaret) caretOptions.push(item);
      }
      if (action.popoverAtCaret) caretAction = action;
    }
    root.appendChild(menu);
    // A caret dropdown sits under the caret (in the bar's coordinates); every other popover under
    // its button. Both are pulled back left when they would leave the bar's width.
    const caretRect = action.popoverAtCaret ? deps.getCaretRect?.() : undefined;
    const barRect = caretRect ? root.getBoundingClientRect?.() : undefined;
    const left = caretRect && barRect ? caretRect.left - barRect.left : button.offsetLeft;
    if (typeof left === "number" && Number.isFinite(left)) {
      // The bar is as wide as its buttons; a dropdown at the caret may use the whole frame.
      const bound = caretRect ? (root.parentElement?.clientWidth || root.clientWidth) : root.clientWidth;
      const room = bound - menu.offsetWidth;
      const at = Number.isFinite(room) && room > 0 ? Math.min(left, room) : left;
      menu.style.setProperty("inset-inline-start", Math.max(0, at) + "px");
    }
    if (caretRect && barRect && Number.isFinite(caretRect.bottom - barRect.top)) {
      menu.style.setProperty("inset-block-start", Math.round(caretRect.bottom - barRect.top + 2) + "px");
      menu.setAttribute("data-edit-popover-at", "caret");
    }
    button.setAttribute("aria-expanded", "true");
    openMenu = menu;
    openButton = button;
    startChoices?.();
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
    caretButtons = [];
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
      if (action.available) {
        // The swatch is built as an element (not from the icon text), so it can be coloured later.
        const swatch = document.createElement("span");
        swatch.className = "sphinx-preview-edit-palette-swatch";
        swatch.setAttribute("aria-hidden", "true");
        button.appendChild(swatch);
        caretButtons.push({ button, action, swatch });
      }
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
            if (action.popoverAtCaret) {
              // The action runs first (the alert is written), then the list changes its type.
              // The text box's input event must not close the list that is about to open.
              closePopover();
              holding = true;
              try {
                run(action);
              } finally {
                holding = false;
              }
            }
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
        if (action.panelWhenInside && deps.caretInside?.(action.panelWhenInside)) {
          deps.openPanel?.(action, action.panelWhenInside);
          return;
        }
        if (action.hostDialog) {
          // The host shows its own dialog; the page keeps the editor open until it answers.
          const kind = action.hostDialog;
          if (!deps.pickHost) return;
          deps.pickHost(kind, (value) => {
            if (value === undefined) deps.getControl().focus({ preventScroll: true });
            else run(action, value);
          });
          return;
        }
        run(action);
      });
      root.appendChild(button);
      buttons.push(button);
    }
    updateAvailability();
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
        const atCaret = caretAction !== undefined;
        closePopover();
        // A dropdown dismissed without a choice always leaves the focus in the text box.
        if (atCaret) deps.getControl().focus({ preventScroll: true });
        return true;
      }
      const choices = caretOptions;
      const listed = caretAction;
      if (listed && choices.length > 0 && !event.altKey && !event.metaKey && !event.ctrlKey) {
        const vertical = event.key === "ArrowDown" || event.key === "ArrowUp";
        if (vertical) {
          event.preventDefault?.();
          event.stopPropagation?.();
          const step = event.key === "ArrowDown" ? 1 : -1;
          caretIndex = caretIndex < 0
            ? (step > 0 ? 0 : choices.length - 1)
            : (caretIndex + step + choices.length) % choices.length;
          choices.forEach((choice, index) => {
            if (index === caretIndex) choice.setAttribute("data-active", "true");
            else choice.removeAttribute("data-active");
          });
          return true;
        }
        if (event.key === "Enter" && !event.shiftKey && caretIndex >= 0) {
          event.preventDefault?.();
          event.stopPropagation?.();
          const chosen = choices[caretIndex].getAttribute("data-edit-option");
          closePopover();
          if (chosen !== null) run(listed, chosen);
          return true;
        }
        // Moving the caret elsewhere ends the dropdown: it would no longer be at the alert.
        if (["ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"].includes(String(event.key))) {
          closePopover();
          return false;
        }
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
    updateAvailability,
  };
}
