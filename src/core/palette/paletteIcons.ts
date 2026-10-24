/**
 * The icons of the edition palette and the `/` menu: static markup, never user text, keyed by the
 * `icon` of a palette action (`PaletteActionDescriptor.icon`). Pure data: no host API, no DOM, no
 * Node built-ins.
 */

/** An outline icon from SVG path data. */
const svg = (paths: string): string =>
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' + paths + '"></path></svg>';
/** A text glyph (B, I, S, Σ, …) styled by the palette stylesheet. */
const glyph = (kind: string, text: string): string =>
  '<span class="sphinx-preview-edit-palette-glyph" data-glyph="' + kind + '" aria-hidden="true">'
  + text + "</span>";
/** The small caret of the buttons that open a popover. */
const caret =
  '<svg class="sphinx-preview-edit-palette-caret" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 10l5 5 5-5"></path></svg>';
/** The icon markup of every palette icon name. */
export const PALETTE_ICONS = {
  heading: svg("M6 4v16M18 4v16M6 12h12") + caret,
  bold: glyph("bold", "B"),
  italic: glyph("italic", "I"),
  strikethrough: glyph("strikethrough", "S"),
  code: svg("M8 7l-5 5 5 5M16 7l5 5-5 5M14 5l-4 14") + caret,
  bulletList: svg("M9 6h11M9 12h11M9 18h11M4.5 6h.5M4.5 12h.5M4.5 18h.5"),
  numberedList: svg("M10 6h10M10 12h10M10 18h10M4 5l1.5-1v5M4 14h3l-3 4h3"),
  quote: svg("M5 11h4v6H5zM5 11c0-3 1-5 4-6M14 11h4v6h-4zM14 11c0-3 1-5 4-6"),
  link: svg("M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"),
  rule: svg("M3 12h18M8 7h8M8 17h8"),
  todo: svg("M5 4v17M5 5h12l-2 4 2 4H5"),
  thread: svg("M4 4h16v12H10l-5 4v-4H4z"),
  alert: svg("M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5v5.5M12 16v.5") + caret,
  checkbox: svg("M5 5h14v14H5zM8.5 12l2.5 2.5 4.5-5"),
  listTable: svg("M4 5h16v14H4zM4 10h16M9 5v14M6 7.5h.01M6 14.5h.01M12 14.5h6"),
  pipeTable: svg("M4 5h16v14H4zM4 10h16M10 5v14M15 5v14"),
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
} as const satisfies Record<string, string>;

/** The name of a palette icon. */
export type PaletteIcon = keyof typeof PALETTE_ICONS;
