/**
 * The edit actions of the palette and the `/` menu: the descriptors of the palette registry bound
 * to their handlers, which live by subject in `inlineEditActions.ts`, `blockEditActions.ts`,
 * `linkEditActions.ts`, `tableEditActions.ts` and `colourEditActions.ts`, and the keyboard
 * shortcuts.
 */

import {
  type EditActionOption,
  type EditActionScope,
  PALETTE_ACTION_IDS,
  PALETTE_ACTIONS,
  type PaletteActionDescriptor,
  type PaletteActionId,
} from "../../core/palette/paletteActions";
import {
  insertAdmonition,
  insertAlert,
  insertCodeFence,
  insertDefinitionList,
  insertDetails,
  insertDropdown,
  insertFigure,
  insertFootnote,
  insertImage,
  insertMath,
  insertMermaid,
  insertVega,
  insertVegaLite,
  insertRule,
  insertToc,
  setHeading,
  toggleCheckbox,
  toggleList,
  toggleQuote,
} from "./blockEditActions";
import { createColourEditActions } from "./colourEditActions";
import { validSelection } from "./editActionHelpers";
import {
  insertEmoji,
  insertKbdRole,
  insertLabel,
  insertTargetRole,
  insertThread,
  roleArgument,
  toggleAsterisks,
  toggleKbd,
  toggleStrikethrough,
  toggleTodo,
  wrapRole,
} from "./inlineEditActions";
import { imageAltExit, imageDraft, linkDraft, linkEdit } from "./linkEditActions";
import type { MarkdownTableTools } from "./markdownTable";
import { createTableEditActions } from "./tableEditActions";
import type { TextEdit } from "./textEditing";

export type {
  EditActionMode,
  EditActionOption,
  EditActionScope,
  EditActionShortcut,
  EditActionSlash,
  EmojiCategory,
  EmojiEntry,
} from "../../core/palette/paletteActions";

/** What an action receives: the text box value, its selection and where the text box lives. */
export interface EditActionContext {
  value: string;
  selectionStart: number;
  selectionEnd: number;
  scope: EditActionScope;
  /** Optional argument chosen in the action's popover (for example a heading level). */
  arg?: string;
}

/**
 * The code of one palette action, bound by id to its descriptor (`PALETTE_ACTIONS` in
 * `src/core/palette/paletteActions.ts`): `apply` returns the edit to run as one native step.
 */
export interface PaletteActionHandler {
  /** Options computed by the page, replacing the descriptor's (the code block languages). */
  options?: EditActionOption[];
  /** Popover `color`: whether a typed colour is acceptable (the hex field's live validation). */
  validateColor?(value: string): boolean;
  /**
   * The button shows only while this is true for the text box (checked as the caret moves); a
   * hidden button is still in the bar.
   */
  available?(ctx: EditActionContext): boolean;
  /**
   * Why `apply` returned no edit, when the user should be told (a table conversion that would lose
   * content). The palette shows it through its `notify` hook. Absent or `undefined`: nothing to say.
   */
  explain?(ctx: EditActionContext): string | undefined;
  /**
   * The value the button stands for at the caret (the colour code under it): the button shows it
   * as a swatch and its popover starts on it, with no tabs, and replaces it in place.
   */
  current?(ctx: EditActionContext): string | undefined;
  apply(ctx: EditActionContext): TextEdit | undefined;
}

/** One handler per registered palette action. */
export type PaletteActionHandlers = { [K in PaletteActionId]: PaletteActionHandler };

/**
 * One registered editing operation: a descriptor of the palette registry and its handler. The
 * palette renders `label`, `icon` and `group`; a shortcut and the palette button run the same
 * `apply`.
 */
export interface EditAction extends PaletteActionDescriptor, PaletteActionHandler {
  id: string;
}

/** The subset of a keyboard event the shortcut matcher reads. */
export interface EditActionKeyEvent {
  key?: string;
  code?: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  isComposing?: boolean;
  getModifierState?: (name: string) => boolean;
}

/** What the link panel starts with, and the part of the text a link insertion replaces. */
export interface LinkDraft {
  text: string;
  url: string;
  start: number;
  end: number;
  /** The quoted title of an existing link (kept when the link is replaced); absent otherwise. */
  title?: string;
}

/** An existing Markdown image around the selection: what the image action replaces. */
export interface ImageDraft {
  alt: string;
  url: string;
  start: number;
  end: number;
  /** The quoted title (kept when the image is replaced); absent otherwise. */
  title?: string;
}

export interface EditActionRegistry {
  actions: EditAction[];
  byId: Map<string, EditAction>;
  /** The image around the selection or caret, or `undefined` outside any image. */
  imageDraft(ctx: EditActionContext): ImageDraft | undefined;
  /** The caret position after the image whose alt text holds the selection, or `undefined`. */
  imageAltExit(ctx: EditActionContext): number | undefined;
  /** The link panel's initial values for the selection (an existing link is read back). */
  linkDraft(ctx: EditActionContext): LinkDraft;
  /** The edit that writes `[text](url)` over the draft's range; see `linkDraft`. */
  linkEdit(ctx: EditActionContext, text: string, url: string): TextEdit;
  /**
   * The action bound to this key event, or `undefined` (composition and AltGr never match).
   * `mac` selects the primary modifier: Cmd on macOS, Ctrl elsewhere.
   */
  shortcutFor(event: EditActionKeyEvent, mac?: boolean): EditAction | undefined;
  /** The shortcut as shown in a tooltip ("Ctrl+B", "Cmd+B" on macOS), or "" without one. */
  shortcutLabel(action: EditAction, mac?: boolean): string;
}

/**
 * Action registry of the raw-Markdown block editor: the descriptors of the palette registry
 * (`src/core/palette/paletteActions.ts`) bound to their handlers, in the registry's order. A new
 * action is a descriptor there and a handler in `handlers` below (the type requires both).
 * `languages` are the fence languages the preview highlights; the code block
 * action offers them after "text". `tableTools` (the Markdown table parser and HTML writer) lets
 * the HTML table action convert the table under the caret; without it the action only inserts.
 * `isSafeColor` is the sanitizer's colour grammar (`isSafeOkfColor`): the colour actions write
 * nothing it would reject, and without it they refuse.
 */
export function createEditActions(
  languages: readonly string[] = [],
  tableTools?: MarkdownTableTools,
  isSafeColor?: (value: string) => boolean,
  threadAuthor?: string,
): EditActionRegistry {
  const { insertTable, htmlTable, convertTableAtCaret, tableKindAt, alignColumn, tableCaption } =
    createTableEditActions(tableTools);
  const { colourOk, applyColour, colourCodeAt, applyColourCode } = createColourEditActions(isSafeColor);

  // @implements_req SwRS-MDOKFSTUDIO-PALETTE-054
  // Eight hues at two intensities, whatever the theme: they are colours of the document.
  const LANGUAGE_OPTIONS: EditActionOption[] = [
    { value: "text", label: "text" },
    ...Array.from(new Set(languages))
      .filter((name) => name !== "text")
      .sort()
      .map((name) => ({ value: name, label: name })),
  ];

  // One handler per descriptor of the palette registry; the descriptors give the order.
  const handlers: PaletteActionHandlers = {
    heading: { apply: setHeading },
    bold: { apply: (ctx) => toggleAsterisks(ctx, 2) },
    italic: { apply: (ctx) => toggleAsterisks(ctx, 1) },
    strikethrough: { apply: toggleStrikethrough },
    color: {
      validateColor: (value) => colourOk(value.trim()),
      apply: applyColour,
    },
    colorCode: {
      validateColor: (value) => colourOk(value.trim()),
      available: (ctx) => colourCodeAt(ctx) !== undefined,
      current: (ctx) => colourCodeAt(ctx)?.text,
      apply: applyColourCode,
    },
    link: { apply: (ctx) => linkEdit(ctx, linkDraft(ctx).text, ctx.arg ?? "") },
    image: { apply: insertImage },
    codeFence: {
      options: LANGUAGE_OPTIONS,
      apply: insertCodeFence,
    },
    bulletList: { apply: (ctx) => toggleList(ctx, false) },
    numberedList: { apply: (ctx) => toggleList(ctx, true) },
    quote: { apply: toggleQuote },
    rule: { apply: insertRule },
    toc: { apply: insertToc },
    table: { apply: insertTable },
    emoji: { apply: insertEmoji },
    // @implements_req SwRS-MDOKFSTUDIO-REVIEW-160
    todo: { apply: toggleTodo },
    thread: { apply: (ctx) => insertThread(ctx, threadAuthor) },
    alert: { apply: insertAlert },
    checkbox: { apply: toggleCheckbox },
    htmlTable: { apply: htmlTable },
    details: { apply: insertDetails },
    footnote: { apply: insertFootnote },
    mermaid: { apply: insertMermaid },
    vegaLite: { apply: insertVegaLite },
    vega: { apply: insertVega },
    columnAlign: { apply: alignColumn },
    kbd: { apply: toggleKbd },
    admonition: { apply: insertAdmonition },
    deflist: { apply: insertDefinitionList },
    math: { apply: insertMath },
    sub: { apply: (ctx) => wrapRole(ctx, "sub") },
    sup: { apply: (ctx) => wrapRole(ctx, "sup") },
    label: { apply: insertLabel },
    ref: { apply: (ctx) => insertTargetRole(ctx, "ref", true) },
    doc: { apply: (ctx) => insertTargetRole(ctx, "doc", true) },
    // @implements_req SwRS-MDOKFSTUDIO-PALETTE-149
    cite: {
      apply: (ctx) => {
        if (!validSelection(ctx) || !roleArgument(ctx.arg) || /[\s,]/u.test(ctx.arg)) return undefined;
        const text = "{cite}`" + ctx.arg + "`";
        const caret = ctx.selectionStart + text.length;
        return { start: ctx.selectionStart, end: ctx.selectionEnd, text, selectionStart: caret, selectionEnd: caret };
      },
    },
    dropdown: { apply: insertDropdown },
    tableCaption: { apply: tableCaption },
    listTable: {
      available: (ctx) => {
        const kind = tableKindAt(ctx);
        return kind === "pipe" || kind === "html";
      },
      explain: (ctx) => convertTableAtCaret(ctx, "list-table").reason,
      apply: (ctx) => convertTableAtCaret(ctx, "list-table").edit,
    },
    pipeTable: {
      available: (ctx) => {
        const kind = tableKindAt(ctx);
        return kind === "list-table" || kind === "html";
      },
      explain: (ctx) => convertTableAtCaret(ctx, "pipe").reason,
      apply: (ctx) => convertTableAtCaret(ctx, "pipe").edit,
    },
    figure: { apply: insertFigure },
    roleKbd: { apply: insertKbdRole },
  };
  const actions: EditAction[] = PALETTE_ACTION_IDS.map((id): EditAction => ({
    id,
    ...(PALETTE_ACTIONS[id] as PaletteActionDescriptor),
    ...handlers[id],
  }));

  const byId = new Map<string, EditAction>();
  for (const action of actions) byId.set(action.id, action);

  // @implements_req SwRS-MDOKFSTUDIO-PALETTE-083
  function shortcutFor(event: EditActionKeyEvent, mac?: boolean): EditAction | undefined {
    if (event.isComposing) return undefined;
    // AltGr reports ctrlKey and altKey together: it types characters, it is not a shortcut.
    if (event.altKey || event.getModifierState?.("AltGraph") === true) return undefined;
    if (!event.metaKey && !event.ctrlKey) return undefined;
    const primary = mac === true ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
    const key = typeof event.key === "string" ? event.key.toLowerCase() : "";
    // The typed character wins, so Cmd+X on Dvorak (physical B key) stays cut. The physical code
    // is only a fallback on layouts whose key is not a Latin letter (Cyrillic, Greek).
    const latinLetter = /^[a-z]$/u.test(key);
    for (const action of actions) {
      const shortcut = action.shortcut;
      if (!shortcut) continue;
      if (shortcut.modifier === "any" ? false : !primary) continue;
      if (event.shiftKey && !shortcut.anyShift) continue;
      if (shortcut.keys?.includes(key)) return action;
      const letterShortcut = shortcut.keys?.every((candidate) => /^[a-z]$/u.test(candidate));
      if (latinLetter && letterShortcut) continue;
      if (typeof event.code === "string" && shortcut.codes.includes(event.code)) return action;
    }
    return undefined;
  }

  function shortcutLabel(action: EditAction, mac?: boolean): string {
    const shortcut = action.shortcut;
    if (!shortcut) return "";
    const key = shortcut.keys?.[0] ?? "";
    return (mac === true ? "Cmd" : "Ctrl") + "+" + key.toUpperCase();
  }

  return { actions, byId, imageAltExit, imageDraft, linkDraft, linkEdit, shortcutFor, shortcutLabel };
}
