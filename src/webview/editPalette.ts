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
  mode: EditActionMode;
  /** Shows Cmd instead of Ctrl in the tooltips. */
  apple?: boolean;
}

export interface EditPalette {
  element: HTMLElement;
  /** Rebuilds the buttons from the registry and the current mode. */
  refresh(): void;
  /** Removes the palette; the caller owns the text box and its listeners. */
  destroy(): void;
  /** Closes the open popover on Escape and reports whether it consumed the key. */
  handleKey(event: {
    key?: string;
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
    rule: svg("M3 12h18M8 7h8M8 17h8"),
    todo: svg("M5 4v17M5 5h12l-2 4 2 4H5"),
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

  function closePopover(): boolean {
    if (!openMenu) return false;
    openMenu.remove();
    openButton?.setAttribute("aria-expanded", "false");
    openMenu = undefined;
    openButton = undefined;
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

  function openPopover(action: EditAction, button: HTMLElement): void {
    closePopover();
    const menu = document.createElement("div");
    menu.className = "sphinx-preview-edit-palette-menu";
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", action.label);
    menu.setAttribute("data-edit-popover", String(action.popover));
    menu.addEventListener("mousedown", keepFocus);
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

  function build(): void {
    closePopover();
    root.textContent = "";
    const mode = MODE_RANK[deps.mode] ?? 0;
    let previousGroup = "";
    for (const action of deps.actions.actions) {
      if (!action.scopes.includes("block")) continue;
      // Modes are additive: an action listed for a lower mode shows in every higher one.
      if (!action.modes.some((candidate) => (MODE_RANK[candidate] ?? 0) <= mode)) continue;
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
          if (openButton === button) closePopover();
          else openPopover(action, button);
          deps.getControl().focus({ preventScroll: true });
          return;
        }
        closePopover();
        run(action);
      });
      root.appendChild(button);
    }
  }

  build();

  return {
    element: root,
    refresh: build,
    destroy() {
      closePopover();
      root.remove();
    },
    handleKey(event) {
      if (event.key !== "Escape" || event.isComposing || !openMenu) return false;
      event.preventDefault?.();
      event.stopPropagation?.();
      closePopover();
      return true;
    },
    closePopover,
  };
}
