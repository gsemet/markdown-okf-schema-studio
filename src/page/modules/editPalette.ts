import { PALETTE_MODES } from "../../core/configuration/settingsRegistry";
import { PALETTE_ICONS } from "../../core/palette/paletteIcons";
import type { EditAction, EditActionMode } from "./editActions";
import {
  buildChoices,
  buildColor,
  buildEmoji,
  buildGrid,
  type PalettePopoverContext,
  type PalettePopoverState,
} from "./editPalettePopovers";
import type { EditPalette, EditPaletteDeps, EditPaletteMenuEntry } from "./editPaletteTypes";

export type {
  EditPalette,
  EditPaletteChoiceList,
  EditPaletteControl,
  EditPaletteDeps,
  EditPaletteMenuEntry,
} from "./editPaletteTypes";

// @implements_req SwRS-MDOKFSTUDIO-PALETTE-001
// @implements_req SwRS-MDOKFSTUDIO-PALETTE-002
// @implements_req SwRS-MDOKFSTUDIO-PALETTE-017
// @implements_req SwRS-MDOKFSTUDIO-LIFE-169
// @implements_req SwRS-MDOKFSTUDIO-PALETTE-031
// @implements_req SwRS-MDOKFSTUDIO-PALETTE-036
// @implements_req SwRS-MDOKFSTUDIO-PALETTE-039
// @implements_req SwRS-MDOKFSTUDIO-PALETTE-069
// @implements_req SwRS-MDOKFSTUDIO-PALETTE-078
// @implements_req SwRS-MDOKFSTUDIO-PALETTE-083
// @implements_req SwRS-MDOKFSTUDIO-PALETTE-109
// @implements_req SwRS-MDOKFSTUDIO-PALETTE-115
// @implements_req SwRS-MDOKFSTUDIO-PALETTE-148
// @implements_req SwRS-MDOKFSTUDIO-PALETTE-150
// @implements_req SwRS-MDOKFSTUDIO-PALETTE-238
// @implements_req SwRS-MDOKFSTUDIO-PALETTE-242

/**
 * The edition palette: a pill-shaped bar of edit actions shown above an open block editor. It is
 * data-driven from the action registry, so a new registered action shows up as a new button, with
 * the icon its descriptor names (`PALETTE_ICONS`). Every control keeps the focus in the text box
 * (mousedown is cancelled), so clicking never commits the editor.
 */
export function createEditPalette(document: Document, deps: EditPaletteDeps): EditPalette {
  // Modes are additive: a mode lists the actions of its rank and below (strict 0, gfm 1, myst 2).
  const MODE_RANK: Record<string, number> = Object.fromEntries(PALETTE_MODES.map((name, rank) => [name, rank]));
  const icons: Readonly<Record<string, string>> = PALETTE_ICONS;

  const scope: "block" | "cell" = deps.scope === "cell" ? "cell" : "block";
  const root = document.createElement("div");
  if (scope === "cell") {
    root.className = "sphinx-preview-edit-palette sphinx-preview-edit-palette-in-bar";
    root.setAttribute("role", "group");
    root.setAttribute("aria-label", "Cell formatting");
    root.setAttribute("data-sphinx-edit-palette", "cell");
  } else {
    root.className = "sphinx-preview-edit-palette";
    root.setAttribute("role", "toolbar");
    root.setAttribute("aria-label", "Edition palette");
    root.setAttribute("data-sphinx-edit-palette", "true");
  }
  root.addEventListener("click", (event) => event.stopPropagation?.());
  // A press on the bar's padding, gaps or rounded edge must not blur the text box either.
  const keepFocus = (event: { preventDefault?: () => void }): void => event.preventDefault?.();
  root.addEventListener("mousedown", keepFocus);

  let openMenu: HTMLElement | undefined;
  let openButton: HTMLElement | undefined;
  // Size grid state (the highlighted rectangle), emoji picker state of the open popover, and
  // whether a Shift+click insertion runs (the popover stays open through the text box's input).
  const popover: PalettePopoverState = {
    gridState: undefined,
    gridAction: undefined,
    emojiField: undefined,
    holding: false,
  };
  // True while a control inside the popover (the filter or an emoji button) has the focus.
  let menuFocused = false;
  // True while the popover removes itself: blur events from that removal are not a departure.
  let closing = false;
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
    ["myst", "MyST"],
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
  if (scope === "block") root.appendChild(modeSelect);

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
    popover.gridState = undefined;
    popover.gridAction = undefined;
    popover.emojiField = undefined;
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
      scope,
      ...(arg === undefined ? {} : { arg }),
    });
    if (edit) deps.applyTextEdit(edit);
    else {
      control.focus({ preventScroll: true });
      explainRefusal(action, arg);
    }
  }

  function explainRefusal(action: EditAction, arg?: string): void {
    const control = deps.getControl();
    const reason = action.explain?.({
      value: String(control.value ?? ""),
      selectionStart: Number(control.selectionStart),
      selectionEnd: Number(control.selectionEnd),
      scope,
      ...(arg === undefined ? {} : { arg }),
    });
    if (reason) deps.notify?.(reason);
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

  function contextOf(arg?: string) {
    const control = deps.getControl();
    return {
      value: String(control.value ?? ""),
      selectionStart: Number(control.selectionStart),
      selectionEnd: Number(control.selectionEnd),
      scope,
      ...(arg === undefined ? {} : { arg }),
    };
  }

  // What the popover builders (editPalettePopovers.ts) share with the palette.
  const popoverContext: PalettePopoverContext = {
    document,
    deps,
    popover,
    keepFocus,
    closePopover,
    run,
    trackFocus,
    contextOf,
    buttons: () => buttons,
    openMenu: () => openMenu,
  };

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
      buildGrid(popoverContext, menu, action);
    } else if (action.popover === "emoji" && action.emoji) {
      buildEmoji(popoverContext, menu, action);
    } else if (action.popover === "choices" && action.hostList) {
      startChoices = buildChoices(popoverContext, menu, action);
    } else if (action.popover === "color" && action.colors) {
      buildColor(popoverContext, menu, action);
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

  /** The actions the current mode and scope show (additive modes), in registry order. */
  function visibleActions(): EditAction[] {
    const rank = MODE_RANK[mode] ?? 0;
    return deps.actions.actions.filter((action) =>
      action.scopes.includes(scope)
      // Modes are additive: an action listed for a lower mode shows in every higher one.
      && action.modes.some((candidate) => (MODE_RANK[candidate] ?? 0) <= rank));
  }

  /** What a click on the action's button does; the `/` menu runs the same path. */
  function activate(action: EditAction, button: HTMLElement | undefined): void {
    if (action.popover && button) {
      if (openButton === button) {
        closePopover();
      } else {
        if (action.popoverAtCaret) {
          // The action runs first (the alert is written), then the list changes its type.
          // The text box's input event must not close the list that is about to open.
          closePopover();
          popover.holding = true;
          try {
            run(action);
          } finally {
            popover.holding = false;
          }
        }
        openPopover(action, button);
        // The emoji picker takes the focus for its filter; every other popover leaves it in
        // the text box.
        if (popover.emojiField) {
          popover.emojiField.focus({ preventScroll: true });
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
        else {
          run(action, value);
          // A figure just inserted: its form opens at once, on the caption (the caret is in it).
          if (action.panelWhenInside && deps.caretInside?.(action.panelWhenInside)) {
            deps.openPanel?.(action, action.panelWhenInside, "caption");
          }
        }
      });
      return;
    }
    run(action);
  }

  function menuEntries(): EditPaletteMenuEntry[] {
    const ctx = contextOf();
    const entries: EditPaletteMenuEntry[] = [];
    for (const action of visibleActions()) {
      if (action.available && !action.available(ctx)) continue;
      const base = {
        id: action.id,
        group: action.group,
        icon: icons[action.icon] ?? "",
        shortcut: deps.actions.shortcutLabel(action, deps.apple === true),
      };
      const slash = action.slash;
      if (!slash?.variantsOnly) {
        entries.push({ ...base, key: action.id, label: action.label, aliases: slash?.aliases ?? [] });
      }
      for (const variant of slash?.variants ?? []) {
        entries.push({
          ...base,
          key: action.id + ":" + variant.arg,
          label: variant.label,
          aliases: variant.aliases ?? [],
          arg: variant.arg,
          shortcut: "",
        });
      }
    }
    return entries;
  }

  function runMenuEntry(key: string, range: { start: number; end: number }): void {
    const entry = menuEntries().find((candidate) => candidate.key === key);
    const action = entry ? deps.actions.byId.get(entry.id) : undefined;
    if (!entry || !action) return;
    closePopover();
    const control = deps.getControl();
    const value = String(control.value ?? "");
    const start = Math.max(0, Math.min(range.start, value.length));
    const end = Math.max(start, Math.min(range.end, value.length));
    const removed = value.slice(0, start) + value.slice(end);
    const gone = end - start;
    const plain = !action.popover && !action.panel && !action.panelWhenInside && !action.hostDialog;
    if (plain || entry.arg !== undefined) {
      // One native step: the edit the action makes on the text without the query, written as a
      // single replacement over the original text, so one undo brings the "/query" back.
      const edit = action.apply({
        value: removed,
        selectionStart: start,
        selectionEnd: start,
        scope,
        ...(entry.arg === undefined ? {} : { arg: entry.arg }),
      });
      if (!edit) {
        deps.applyTextEdit({ start, end, text: "", selectionStart: start, selectionEnd: start });
        control.focus({ preventScroll: true });
        const reason = action.explain?.({
          value: removed,
          selectionStart: start,
          selectionEnd: start,
          scope,
          ...(entry.arg === undefined ? {} : { arg: entry.arg }),
        });
        if (reason) deps.notify?.(reason);
        return;
      }
      // Positions of the text without the query, mapped back onto the original text.
      const back = (position: number, after: boolean): number =>
        position > start || (after && position === start) ? position + gone : position;
      const from = Math.min(start, back(edit.start, false));
      const to = Math.max(end, back(edit.end, true));
      const result = removed.slice(0, edit.start) + edit.text + removed.slice(edit.end);
      const tailLength = value.length - to;
      deps.applyTextEdit({
        start: from,
        end: to,
        text: result.slice(from, result.length - tailLength),
        selectionStart: edit.selectionStart,
        selectionEnd: edit.selectionEnd,
      });
      return;
    }
    // Popover, panel or dialog: remove the query, then do what the button does.
    deps.applyTextEdit({ start, end, text: "", selectionStart: start, selectionEnd: start });
    activate(action, buttons.find((button) => button.getAttribute("data-edit-action") === action.id));
  }

  function build(): void {
    closePopover();
    for (const old of buttons) old.remove();
    buttons = [];
    caretButtons = [];
    modeSelect.value = mode;
    root.setAttribute("data-palette-mode", mode);
    let previousGroup = "";
    // Menu-only actions (the `/` menu's lists) have no button.
    for (const action of visibleActions().filter((candidate) => !candidate.slash?.menuOnly)) {
      const button = document.createElement("button");
      button.setAttribute("type", "button");
      button.setAttribute("tabindex", "-1");
      button.setAttribute("aria-label", action.label);
      const text = tooltip(action);
      button.setAttribute("title", text);
      button.setAttribute("data-tooltip", text);
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
        activate(action, button);
      });
      root.appendChild(button);
      buttons.push(button);
    }
    updateAvailability();
  }

  build();

  return {
    element: root,
    menuEntries,
    runMenuEntry,
    refresh: build,
    setMode,
    focusModeSelect() {
      if (scope !== "block") return;
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
      const grid = popover.gridState;
      const action = popover.gridAction;
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
    closePopover: () => (popover.holding ? false : closePopover()),
    updateAvailability,
  };
}
