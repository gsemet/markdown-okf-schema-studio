/**
 * The palette action registry: the descriptor of every edit action of the edition palette and of
 * the `/` command menu, in display order. A descriptor is pure data (id, label, icon, group, modes,
 * scopes, shortcut, popover, slash menu entries); the page binds each id to its handler, the code
 * that computes the edit (`src/page/modules/editActions.ts`), and the type system requires one
 * handler per descriptor. The palette and the `/` menu are built from the bound list. Pure module:
 * no host API, no DOM, no Node built-ins.
 */

import type { PaletteMode } from "../configuration/settingsRegistry";
import { EMOJI_CATEGORIES, type EmojiCategory } from "./emoji";
import type { PaletteIcon } from "./paletteIcons";

export type { EmojiCategory, EmojiEntry } from "./emoji";

/** A palette mode (additive, see {@link PaletteActionDescriptor}). */
export type EditActionMode = PaletteMode;

/** Where the text box of an action lives: a block editor or a table cell editor. */
export type EditActionScope = "block" | "cell";

/** Keyboard binding of an action. `anyShift` lets layouts that type the key with Shift match. */
export interface EditActionShortcut {
  /** `KeyboardEvent.code` values accepted for the key (layout independent). */
  codes: string[];
  /** `KeyboardEvent.key` values accepted when the code differs (for example "/" on AZERTY). */
  keys?: string[];
  /** The shortcut also matches with Shift held. */
  anyShift?: boolean;
  /**
   * `primary` needs the platform's command key (Cmd on macOS, Ctrl elsewhere); `any` accepts
   * either Cmd or Ctrl. Defaults to `primary`.
   */
  modifier?: "primary" | "any";
}

/** One entry of an action's popover. */
export interface EditActionOption {
  /** The argument the action receives (`ctx.arg`). */
  value: string;
  /** The text shown. */
  label: string;
}

/**
 * Data of the `/` command menu, next to the action it belongs to. `aliases` are short names the
 * completion also matches (`/hr` finds the horizontal rule). `variants` are extra entries that run
 * the action with a ready-made argument, as if the palette popover had been opened and the option
 * chosen (`/h2`, `/warning`); `variantsOnly` lists only the variants, not the action itself.
 */
export interface EditActionSlash {
  /** Short names the completion also matches. */
  aliases?: string[];
  /** Entries that run the action with a ready-made argument. */
  variants?: Array<{ label: string; arg: string; aliases?: string[] }>;
  /** List only the variants, not the action itself. */
  variantsOnly?: boolean;
  /** Listed by the `/` menu only: no palette button (and no shortcut). */
  menuOnly?: boolean;
}

/**
 * The data of one palette action: what the palette and the `/` menu show and how they open it.
 * The palette renders `label`, `icon` and `group`; a shortcut and the palette button run the same
 * handler. Modes are additive: an action listed for `strict` shows in every mode, `gfm` in GFM,
 * MyST and Full, `myst` in MyST and Full, `full` in Full only.
 */
export interface PaletteActionDescriptor {
  /** The button's accessible name and the `/` menu entry. */
  label: string;
  /** The icon of the button and of the `/` menu entry (see `PALETTE_ICONS`). */
  icon: PaletteIcon;
  /** The palette group (`inline`, `block`, `insert`, `annotation`, `github`, `myst`, `full`). */
  group: string;
  /** The modes that list the action (additive, see the interface comment). */
  modes: EditActionMode[];
  /** The text boxes that offer the action. */
  scopes: EditActionScope[];
  /** Keyboard binding. */
  shortcut?: EditActionShortcut;
  /** Tooltip text without the shortcut; defaults to `label`. */
  title?: string;
  /** Name of the popover the palette opens to pick `ctx.arg`; absent for one-click actions. */
  popover?: string;
  /** What the popover lists: `value` becomes `ctx.arg`, `label` is shown. */
  options?: EditActionOption[];
  /** Popover `grid`: the size picker (`ctx.arg` becomes "<rows>x<columns>"). */
  grid?: { rows: number; cols: number };
  /** Popover `emoji`: the picker's categories (`ctx.arg` becomes the chosen character). */
  emoji?: EmojiCategory[];
  /**
   * Name of the small panel the palette button and the shortcut open instead of running the edit
   * directly; the panel collects the values and the page then runs the edit.
   */
  panel?: string;
  /**
   * With the caret inside syntax that already exists (`figure`: a `{figure}` directive or a lone
   * Markdown image), the button opens the panel of that name instead of running its own action.
   */
  panelWhenInside?: "figure";
  /**
   * The button and the shortcut first run the edit without an argument, then open the popover at
   * the caret; choosing an option runs it again with it (the Alert button inserts the alert, then
   * the dropdown changes its type).
   */
  popoverAtCaret?: boolean;
  /**
   * The button opens a filterable list the host fills (`targets`: labels of the document,
   * `citations`: keys of the workspace `.bib` files); the chosen value becomes `ctx.arg`.
   */
  hostList?: "targets" | "citations";
  /**
   * The button asks the host for a native open dialog (`document`: a Markdown file, `image`: an
   * image file); the answer, a path relative to the document, is `ctx.arg`.
   */
  hostDialog?: "document" | "image";
  /** Popover `color`: the swatches offered, as colours the sanitizer keeps. */
  colors?: string[];
  /** How the `/` menu offers the action (see `EditActionSlash`); absent: listed under its label. */
  slash?: EditActionSlash;
}

/** The GitHub alert types, as written in `> [!TYPE]`. */
export const ALERT_TYPES = ["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"];

/** The admonition types the Admonition action offers (plus a custom title). */
export const ADMONITION_TYPES = [
  "note", "tip", "important", "warning", "caution", "danger", "attention", "error", "hint", "seealso",
];

/** The table column alignments of the Column alignment action. */
export const COLUMN_ALIGNMENTS = ["left", "center", "right"];

const ALERT_OPTIONS: EditActionOption[] = ALERT_TYPES.map((type) => ({
  value: type,
  label: type.charAt(0) + type.slice(1).toLowerCase(),
}));

const ADMONITION_OPTIONS: EditActionOption[] = [
  ...ADMONITION_TYPES.map((type) => ({
    value: type,
    label: type === "seealso" ? "See also" : type.charAt(0).toUpperCase() + type.slice(1),
  })),
  { value: "custom", label: "Custom\u2026" },
];

const COLOUR_SWATCHES = [
  "#e53935", "#fb8c00", "#fdd835", "#43a047", "#00897b", "#1e88e5", "#8e24aa", "#757575",
  "#ffcdd2", "#ffe0b2", "#fff9c4", "#c8e6c9", "#b2dfdb", "#bbdefb", "#e1bee7", "#e0e0e0",
];

const HEADING_OPTIONS: EditActionOption[] = [
  { value: "0", label: "Paragraph" },
  ...[1, 2, 3, 4, 5].map((level) => ({ value: String(level), label: "Heading " + level })),
];

// @implements_req SwRS-MDOKFSTUDIO-PALETTE-238
// `/` menu variants: the options of the popovers that are worth a direct entry.
const HEADING_SLASH = [
  ...[1, 2, 3, 4, 5].map((level) => ({
    label: "Heading " + level,
    arg: String(level),
    aliases: level === 1 ? ["h1", "title", "heading1"] : ["h" + level, "heading" + level],
  })),
  { label: "Paragraph", arg: "0", aliases: ["text", "plain", "p"] },
];
const ALERT_SLASH = ALERT_OPTIONS.map((option) => ({
  label: option.label + " alert",
  arg: option.value,
  aliases: [option.label.toLowerCase(), "callout", "github"],
}));
const ADMONITION_SLASH = ADMONITION_OPTIONS.map((option) => ({
  label: option.value === "custom" ? "Custom admonition" : option.label + " admonition",
  arg: option.value,
  aliases: [option.value === "seealso" ? "see also" : option.value, "callout", "admonition"],
}));

// @implements_req SwRS-MDOKFSTUDIO-PALETTE-263
// @implements_req SwRS-MDOKFSTUDIO-PALETTE-001
/**
 * Every palette action, by id, in display order (palette buttons and `/` menu entries follow this
 * order). Add an action here and its handler in `src/page/modules/editActions.ts`.
 */
export const PALETTE_ACTIONS = {
  // @implements_req SwRS-MDOKFSTUDIO-PALETTE-043
  heading: {
    slash: { variantsOnly: true, variants: HEADING_SLASH },
    label: "Heading",
    title: "Heading level",
    icon: "heading",
    group: "block",
    modes: ["strict"],
    scopes: ["block"],
    popover: "heading",
    options: HEADING_OPTIONS,
  },
  bold: {
    slash: { aliases: ["strong", "b"] },
    label: "Bold",
    icon: "bold",
    group: "inline",
    modes: ["strict"],
    scopes: ["block", "cell"],
    shortcut: { codes: ["KeyB"], keys: ["b"] },
  },
  italic: {
    slash: { aliases: ["emphasis", "em", "i"] },
    label: "Italic",
    icon: "italic",
    group: "inline",
    modes: ["strict"],
    scopes: ["block", "cell"],
    shortcut: { codes: ["KeyI"], keys: ["i"] },
  },
  strikethrough: {
    slash: { aliases: ["strike", "del", "delete"] },
    label: "Strikethrough",
    icon: "strikethrough",
    group: "inline",
    modes: ["strict"],
    scopes: ["block", "cell"],
  },
  color: {
    slash: { aliases: ["color", "highlight", "background"] },
    label: "Colour",
    title: "Colour the text or its background",
    icon: "color",
    group: "inline",
    modes: ["strict"],
    scopes: ["block", "cell"],
    popover: "color",
    colors: COLOUR_SWATCHES,
  },
  colorCode: {
    label: "Colour code",
    title: "Change this colour code",
    icon: "colorCode",
    group: "inline",
    modes: ["strict"],
    scopes: ["block", "cell"],
    popover: "color",
    colors: COLOUR_SWATCHES,
  },
  link: {
    slash: { aliases: ["url", "hyperlink"] },
    label: "Link",
    title: "Link",
    icon: "link",
    group: "inline",
    modes: ["strict"],
    scopes: ["block", "cell"],
    shortcut: { codes: ["KeyK"], keys: ["k"] },
    panel: "link",
  },
  image: {
    slash: { aliases: ["img", "picture", "photo"] },
    label: "Image",
    title: "Image (pick a file next to the document)",
    icon: "image",
    group: "inline",
    modes: ["strict"],
    scopes: ["block"],
    hostDialog: "image",
  },
  codeFence: {
    slash: { aliases: ["code", "fence", "snippet", "pre"] },
    label: "Code block",
    title: "Code block (choose a language)",
    icon: "code",
    group: "block",
    modes: ["strict"],
    scopes: ["block"],
    popover: "language",
  },
  // @implements_req SwRS-MDOKFSTUDIO-PALETTE-052
  bulletList: {
    slash: { menuOnly: true, aliases: ["bullet", "bullets", "ul", "unordered", "list", "-", "*"] },
    label: "Bulleted list",
    icon: "bulletList",
    group: "block",
    modes: ["strict"],
    scopes: ["block"],
  },
  numberedList: {
    slash: { menuOnly: true, aliases: ["numbered", "ol", "ordered", "list", "1."] },
    label: "Numbered list",
    icon: "numberedList",
    group: "block",
    modes: ["strict"],
    scopes: ["block"],
  },
  quote: {
    slash: { aliases: ["quote", "citation", "bq"] },
    label: "Blockquote",
    icon: "quote",
    group: "block",
    modes: ["strict"],
    scopes: ["block"],
  },
  rule: {
    slash: { aliases: ["hr", "divider", "line", "separator"] },
    label: "Horizontal rule",
    icon: "rule",
    group: "block",
    modes: ["strict"],
    scopes: ["block"],
  },
  // @implements_req SwRS-MDOKFSTUDIO-PALETTE-003
  toc: {
    slash: { aliases: ["toc", "contents", "table of contents", "outline", "summary"] },
    label: "Table of contents",
    title: "Table of contents ([TOC])",
    icon: "toc",
    group: "block",
    modes: ["strict"],
    scopes: ["block"],
  },
  // @implements_req SwRS-MDOKFSTUDIO-TABLE-106
  table: {
    slash: { aliases: ["grid", "tbl"] },
    label: "Table",
    title: "Table (choose a size)",
    icon: "table",
    group: "block",
    modes: ["strict"],
    scopes: ["block"],
    popover: "grid",
    grid: { rows: 9, cols: 9 },
  },
  emoji: {
    slash: { aliases: ["smiley", "emoticon", "face"] },
    label: "Emoji",
    title: "Emoji",
    icon: "emoji",
    group: "insert",
    modes: ["strict"],
    scopes: ["block", "cell"],
    popover: "emoji",
    emoji: EMOJI_CATEGORIES,
  },
  todo: {
    slash: { aliases: ["todo", "fixme", "task"] },
    label: "TODO",
    title: "Toggle TODO comment",
    icon: "todo",
    group: "annotation",
    modes: ["strict"],
    scopes: ["block"],
    shortcut: { codes: ["Slash"], keys: ["/"], anyShift: true, modifier: "any" },
  },
  thread: {
    slash: { aliases: ["thread", "discussion", "comment"] },
    label: "Thread",
    title: "Insert a comment thread",
    icon: "thread",
    group: "annotation",
    modes: ["strict"],
    scopes: ["block"],
  },
  alert: {
    slash: { aliases: ["callout", "github"], variants: ALERT_SLASH },
    label: "Alert",
    title: "GitHub alert (choose a type)",
    icon: "alert",
    group: "github",
    modes: ["gfm"],
    scopes: ["block"],
    popover: "alert",
    popoverAtCaret: true,
    options: ALERT_OPTIONS,
  },
  checkbox: {
    slash: { aliases: ["todo", "task", "checklist", "tasklist"] },
    label: "Checkbox",
    title: "Toggle checkbox",
    icon: "checkbox",
    group: "github",
    modes: ["gfm"],
    scopes: ["block"],
  },
  htmlTable: {
    slash: { aliases: ["table", "html"] },
    label: "HTML table",
    title: "HTML table (converts the table at the caret)",
    icon: "htmlTable",
    group: "github",
    modes: ["gfm"],
    scopes: ["block"],
  },
  details: {
    slash: { aliases: ["collapse", "toggle", "spoiler", "accordion"] },
    label: "Collapsible",
    title: "Collapsible section (details)",
    icon: "details",
    group: "github",
    modes: ["gfm"],
    scopes: ["block"],
  },
  footnote: {
    slash: { aliases: ["fn", "endnote"] },
    label: "Footnote",
    title: "Footnote",
    icon: "footnote",
    group: "github",
    modes: ["gfm"],
    scopes: ["block"],
  },
  // @implements_req SwRS-MDOKFSTUDIO-DIAG-017
  mermaid: {
    slash: { aliases: ["diagram", "chart", "graph", "flowchart"] },
    label: "Mermaid",
    title: "Mermaid diagram",
    icon: "mermaid",
    group: "github",
    modes: ["gfm"],
    scopes: ["block"],
  },
  // @implements_req SwRS-MDOKFSTUDIO-TABLE-111
  columnAlign: {
    slash: { aliases: ["align", "left", "center", "right"] },
    label: "Column alignment",
    title: "Table column alignment (choose)",
    icon: "columnAlign",
    group: "github",
    modes: ["gfm"],
    scopes: ["block"],
    popover: "align",
    options: [
      { value: "left", label: "Left" },
      { value: "center", label: "Center" },
      { value: "right", label: "Right" },
    ],
  },
  kbd: {
    slash: { aliases: ["kbd", "key", "keyboard", "shortcut"] },
    label: "Key",
    title: "Keyboard key (kbd)",
    icon: "kbd",
    group: "github",
    modes: ["gfm"],
    scopes: ["block", "cell"],
  },
  // @implements_req SwRS-MDOKFSTUDIO-PALETTE-127
  admonition: {
    slash: { aliases: ["callout"], variants: ADMONITION_SLASH },
    label: "Admonition",
    title: "Admonition (choose a type)",
    icon: "admonition",
    group: "myst",
    modes: ["myst"],
    scopes: ["block"],
    popover: "admonition",
    options: ADMONITION_OPTIONS,
  },
  deflist: {
    slash: { aliases: ["definition", "dl", "glossary"] },
    label: "Definition list",
    title: "Definition list",
    icon: "deflist",
    group: "myst",
    modes: ["myst"],
    scopes: ["block"],
  },
  // @implements_req SwRS-MDOKFSTUDIO-PALETTE-133
  math: {
    slash: { aliases: ["equation", "latex", "formula", "katex"] },
    label: "Math",
    title: "Math (choose inline, display or aligned)",
    icon: "math",
    group: "myst",
    modes: ["myst"],
    scopes: ["block"],
    popover: "math",
    options: [
      { value: "inline", label: "Inline $\u2026$" },
      { value: "display", label: "Display $$" },
      { value: "aligned", label: "Aligned equations" },
    ],
  },
  sub: {
    slash: { aliases: ["subscript"] },
    label: "Subscript",
    title: "Subscript",
    icon: "sub",
    group: "myst",
    modes: ["myst"],
    scopes: ["block", "cell"],
  },
  sup: {
    slash: { aliases: ["superscript", "power", "exponent"] },
    label: "Superscript",
    title: "Superscript",
    icon: "sup",
    group: "myst",
    modes: ["myst"],
    scopes: ["block", "cell"],
  },
  label: {
    slash: { aliases: ["anchor", "target"] },
    label: "Label",
    title: "Label (anchor for {ref})",
    icon: "label",
    group: "myst",
    modes: ["myst"],
    scopes: ["block"],
  },
  ref: {
    slash: { aliases: ["reference", "xref", "crossref"] },
    label: "Reference",
    title: "Reference to a label ({ref})",
    icon: "ref",
    group: "myst",
    modes: ["myst"],
    scopes: ["block"],
    popover: "choices",
    hostList: "targets",
  },
  doc: {
    slash: { aliases: ["document", "file", "page"] },
    label: "Document link",
    title: "Link to another document ({doc})",
    icon: "doc",
    group: "myst",
    modes: ["myst"],
    scopes: ["block"],
    hostDialog: "document",
  },
  cite: {
    slash: { aliases: ["cite", "citation", "bibtex", "bibliography"] },
    label: "Citation",
    title: "Citation from the workspace .bib files ({cite})",
    icon: "cite",
    group: "myst",
    modes: ["myst"],
    scopes: ["block"],
    popover: "choices",
    hostList: "citations",
  },
  dropdown: {
    slash: { aliases: ["details", "collapse"] },
    label: "Dropdown",
    title: "Dropdown (collapsible admonition)",
    icon: "dropdown",
    group: "myst",
    modes: ["myst"],
    scopes: ["block"],
  },
  tableCaption: {
    slash: { aliases: ["table", "caption", "list-table"] },
    label: "Table with caption",
    title: "Table with caption (wraps the table at the caret)",
    icon: "tableCaption",
    group: "myst",
    modes: ["myst"],
    scopes: ["block"],
  },
  listTable: {
    slash: { aliases: ["list-table", "table", "convert"] },
    label: "List table",
    title: "Convert the pipe or HTML table at the caret to a {list-table}",
    icon: "listTable",
    group: "myst",
    modes: ["myst"],
    scopes: ["block"],
  },
  pipeTable: {
    slash: { aliases: ["pipe", "table", "convert"] },
    label: "Pipe table",
    title: "Convert the {list-table} or HTML table at the caret to a Markdown pipe table",
    icon: "pipeTable",
    group: "myst",
    modes: ["myst"],
    scopes: ["block"],
  },
  figure: {
    slash: { aliases: ["fig", "image", "picture"] },
    label: "Figure",
    title: "Figure (pick an image file; with the caret in a figure, edit it)",
    icon: "figure",
    group: "myst",
    modes: ["myst"],
    scopes: ["block"],
    hostDialog: "image",
    panelWhenInside: "figure",
  },
  roleKbd: {
    slash: { aliases: ["key", "kbd", "keyboard"] },
    label: "Key (MyST)",
    title: "Keyboard key ({kbd} role)",
    icon: "kbd",
    group: "myst",
    modes: ["myst"],
    scopes: ["block", "cell"],
  },
  // @implements_req SwRS-MDOKFSTUDIO-PALETTE-265
  vegaLite: {
    slash: { aliases: ["chart", "vega-lite", "vegalite", "plot", "graph"] },
    label: "Vega-Lite chart",
    title: "Vega-Lite chart",
    icon: "chart",
    group: "full",
    modes: ["full"],
    scopes: ["block"],
  },
  // @implements_req SwRS-MDOKFSTUDIO-PALETTE-265
  vega: {
    slash: { aliases: ["vega", "chart", "plot"] },
    label: "Vega chart",
    title: "Vega chart",
    icon: "chart",
    group: "full",
    modes: ["full"],
    scopes: ["block"],
  },
} satisfies Record<string, PaletteActionDescriptor>;

/** The id of a registered palette action. */
export type PaletteActionId = keyof typeof PALETTE_ACTIONS;

/** Every palette action id, in display order. */
export const PALETTE_ACTION_IDS = Object.keys(PALETTE_ACTIONS) as PaletteActionId[];
