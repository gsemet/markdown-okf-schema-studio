/**
 * The types of the edition palette (`editPalette.ts`): the text box it edits, the dependencies its
 * caller provides, the entries of the `/` command menu, and the palette's own interface.
 */

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
  /** Says why an action made no edit (`EditAction.explain`), for example in the editor's status line. */
  notify?(message: string): void;
  /** Asks the host for the entries of a `hostList` action; `done` is called once, maybe late. */
  requestList?(kind: "targets" | "citations", done: (result: EditPaletteChoiceList) => void): void;
  /**
   * Asks the host for a native dialog (a `hostDialog` action). `done` gets the chosen value, or
   * `undefined` when the dialog was cancelled or failed. The caller keeps the editor open while it
   * is shown.
   */
  pickHost?(kind: "document" | "image", done: (value: string | undefined) => void): void;
  /** Opens the small panel of an action that has one (the Link button), or the named one. */
  openPanel?(action: EditAction, panel?: string, focus?: "caption"): void;
  /** True when the caret is inside existing syntax of this kind (see `panelWhenInside`). */
  caretInside?(kind: "figure"): boolean;
  mode: EditActionMode;
  /**
   * Where the palette lives. "block" (default): the bar above a block editor, with the mode
   * select. "cell": only the actions allowed in a table cell, as a group inside the table bar
   * (no mode select; the caller owns the surrounding bar).
   */
  scope?: "block" | "cell";
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

/** One line of the `/` command menu: an action of the palette, or a ready-made variant of it. */
export interface EditPaletteMenuEntry {
  /** Unique within one list: the action id, or `<id>:<arg>` for a variant. */
  key: string;
  /** The registered action it runs. */
  id: string;
  label: string;
  /** The palette group of the action (`inline`, `block`, `insert`, `annotation`, `github`, `myst`). */
  group: string;
  /** Static icon markup of the palette button (never user text). */
  icon: string;
  /** The shortcut as shown in a tooltip, or "". */
  shortcut: string;
  /** Short names the completion also matches. */
  aliases: string[];
  /** The ready-made argument of a variant entry. */
  arg?: string;
}

export interface EditPalette {
  element: HTMLElement;
  /**
   * What the `/` menu lists: the same actions as the buttons of the current mode and scope
   * (hidden caret-dependent buttons excluded), plus the variants the actions declare.
   */
  menuEntries(): EditPaletteMenuEntry[];
  /**
   * Runs a menu entry in place of `range` (the typed `/query`): one native edit that removes the
   * range and applies the action when the action is a plain edit; for an action with a popover,
   * panel or dialog the range is removed and the action then opens exactly as its button does.
   */
  runMenuEntry(key: string, range: { start: number; end: number }): void;
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
