# Features and Inline Editing

Markdown OKF-Schema Studio is a visual Markdown editor for VS Code that supports several popular
Markdown flavours and extensions:

- [CommonMark](https://commonmark.org/)
- [GitHub Flavored Markdown (GFM)](https://github.github.com/gfm/)
- [Sphinx MyST](https://myst-parser.readthedocs.io/)
- [OKF](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
- [OKF-Schema](https://github.com/gsemet/okf-schema)

| Titled and nested MyST admonitions | Mermaid diagrams and captioned MyST figures |
| --- | --- |
| [![A titled tip containing a nested warning admonition](../../images/readme/myst-admonitions.png)](../../images/38-edit-mode-remembered.png) | [![A Mermaid flowchart followed by a MyST figure with a local SVG and caption](../../images/readme/myst-diagrams-and-figure.png)](../../images/38-edit-mode-remembered.png) |

| Schema-aware properties | Direct metadata editing | Inline Markdown editing |
| --- | --- | --- |
| [![JSON Schema-aware OKF properties table](../../images/readme/schema-properties.png)](../../images/readme/schema-properties.png) | [![Editing an OKF frontmatter property in place](../../images/readme/edit-frontmatter.png)](../../images/readme/edit-frontmatter.png) | [![Edit affordance on rendered Markdown](../../images/readme/inline-editing.png)](../../images/readme/inline-editing.png) |

| Version notes, a card and tabs (cream) | Version notes, a card and tabs (dark) |
| --- | --- |
| [![Version notes, a card with header and footer, and a tab set on the cream page](../../images/readme/myst-cards-tabs-cream.png)](../../images/readme/myst-cards-tabs-cream.png) | [![The same version notes, card and tab set on the dark page](../../images/readme/myst-cards-tabs-dark.png)](../../images/readme/myst-cards-tabs-dark.png) |

- **MyST cards, tabs and version notes:** a standalone `{card}` shows its `:header:` and `:footer:`
  options (or the `^^^` and `+++` separators), a `:link:` and `:class-card:` names, like a
  `{grid-item-card}`. A `{tab-set}` of `{tab-item}`s shows a tab bar and one panel at a time: click
  a tab or use the Left and Right arrow keys, Home and End; `:selected:` picks the first tab shown
  and tabs with the same `:sync:` key follow each other in the sets of one `:sync-group:`. In edit
  mode a click on a tab only selects it, and a click on the shown panel edits that `{tab-item}`.
  `{versionadded}`, `{versionchanged}` and `{deprecated}` are titled "Added in version X",
  "Changed in version X" and "Deprecated since version X".
- **MyST rendering:** directives, admonitions, `{grid}` cards (columns follow the pane width) and
  `{toctree}` lists of links to the documents they name, tables, math (including `align`
environments),
  Mermaid, PlantUML, images and figures with their `:width:` and `:align:`, media, `(label)=`
  anchors (shown as a small icon; in edit mode a click on it renames the label), and permitted
  external links render in the preview.
- **OpenKnowledge Format and OKF-Schema properties:** frontmatter field can be shown as a
  schema-aware properties table,
  with validation diagnostics, enum controls, typed scalar editors,
  and YAML editors for arrays and objects.
- **Inline editing:** click a rendered block to edit its source Markdown. Save with Done
  or Cmd/Ctrl+Enter; Cancel or Escape restores the original block. Tables and frontmatter support
  keyboard navigation, row creation, and focused field editing.
  The "+" bar under a body block also has up and down arrows that swap the block above the bar
  with its neighbour in one undo step; blocks from an included file are not moved.
  The "+" bar and its arrows show on one block at a time: the one that moved last, by keyboard
  selection or mouse hover; moving the mouse hides the keyboard selection ring.
  Alt+Up/Down moves the focused block; Cmd/Ctrl+Alt+Up/Down does it from the block text box.
  In a block text box, Cmd/Ctrl+B toggles bold, Cmd/Ctrl+I toggles italic, and Ctrl+/ (or Cmd+/)
  toggles a `<!-- TODO: … -->` comment on the current or selected lines; each is one undo step.
  In edit mode an opened comment chip is titled with the syntax that produced it, in code font:
  `<!-- -->` for a comment and `<!-- TODO -->` for a comment whose text starts with TODO, in any case,
  with or without a colon, on one line or several. Read mode keeps the words Comment and TODO.
  README-style HTML renders like on GitHub: `<div align>` and `<p align>` (left, center, right,
  justify), `<br>`, `<img>` with `src`, `alt`, `width` and `height`, a logo or badge inside
  `<a>`, `<picture>` with `<source media="(prefers-color-scheme: dark)" srcset>`, `<details>` and
  `<summary>`, `<kbd>`, `<sub>` and `<sup>`. Markdown after a blank line inside an HTML block is
  rendered as Markdown. A picture follows the preview theme (light image on the cream and white
  pages, dark image on the dark page), not your operating system. Scripts, event handlers, `style`
  and `class` attributes and script links are never kept. In edit mode each such block (`div`,
  `p`, `picture`) is framed like an admonition and titled with its literal opening tag, for example
  `<div align="center">`; a click edits the raw source of that block and nothing outside it.
  A paragraph that holds only `[TOC]` or `[[_TOC_]]` (any case; the markers of GitLab, Typora and
  Markdown Preview Enhanced), or a MyST `{contents}` directive, renders as the table of contents of
  the document: the headings as a nested list of links, each one scrolling to its heading. Limit
  the depth with `:depth: 2` and keep only the current section with `:local:`, both on
  `{contents}`; the bracket markers take no option. The list is generated and never written to the
  file; only the marker is saved, and the list follows the headings as you edit them. It lists the
  headings of the document itself, not those of an `{include}`, and a repeated heading text gets
  the usual `-1`, `-2` suffix. In edit mode the block is framed like an admonition and titled with
  the literal marker (`[TOC]`, `[[_TOC_]]` or `{contents}`) in code font instead of showing the
  list, and a click edits the marker line. The Table of contents button of the edition palette
  (also `/toc` in the slash menu) inserts
  `[TOC]` after the current line.
  In a block or table-cell text box the VS Code keys apply: Cmd/Ctrl+Z undoes and
  Cmd+Shift+Z (Ctrl+Shift+Z or Ctrl+Y) redoes the last change, as many times as you need;
  Cmd/Ctrl+A selects the whole text of the text box; Cmd/Ctrl+Shift+K deletes the current line or
  the selected lines. They are the commands "Undo in the Edited Text Box", "Redo in the Edited Text
  Box", "Select All in the Edited Text Box" and "Delete Line in the Edited Text Box" (key
  bindings only, none in the Command Palette) while a text box is open in the focused preview, so
  rebinding them in Keyboard Shortcuts changes the keys.
  The Thread button (or `/thread`) inserts an inline comment thread after the block: a
  `<!-- THREAD` comment holding `Author (YYYY-MM-DD HH:MM):` headers, each followed by the indented
  text of the message. In the preview it is a green chip with a speech bubble; click it to read the
  messages, type a reply (Cmd/Ctrl+Enter or Reply) or delete the whole thread. A reply is appended
  with your name (`comments.authorName`, else your Git `user.name`) and the local time and changes
  nothing else in the file; one undo step each.
  Keyboard only: with edit mode on and no editor open, Up and Down select a block (the first press
  takes the block nearest the top of the pane) and move the selection, Enter opens the selected
  block, Escape cancels the editor and Cmd/Ctrl+Enter saves it; either way the block stays selected,
  so Up, Down and Enter carry on from it. After you leave the window or the tab and come back, the
  selection is restored (the same block, else the one nearest the top), and a click on the margin
  of the page keeps Up and Down working; the page itself never shows a focus ring.
  Block selection: Shift+click selects the blocks between the last clicked block and the one you
  click, Shift+Up/Down extends or shrinks the selection, Escape or a click clears it.
  With a selection, Cmd/Ctrl+C copies its exact Markdown, Cmd/Ctrl+X cuts it (one undo step), and
  Cmd/Ctrl+V pastes the clipboard text as new blocks after the selection or after the block of a
  focused "+" bar (one undo step).
  Alt+Up/Down (or the arrows of the selection's last block) moves the whole selection (one undo
  step), and the selection follows.
  Every palette button shows a tooltip with its name and shortcut when you hover or focus it, sliding
  in like the floating toolbar's. A horizontal rule is easy to hit: a click up to 12 px above or below
  its line opens its editor.
  An edition palette above the text box adds headings, bold, italic, strikethrough, inline code,
  links (Cmd/Ctrl+K opens a link panel with text and target, pre-filled when the caret is in a
  link), tables from a size grid, emoji from a picker, text and background colours
  (a Colour picker with 16 swatches and a hex field; a swatch button appears when the caret is in a
  colour code), code blocks with a language,
  blockquotes, horizontal rules and images picked from a file dialog (or pasted: a screenshot on the
  clipboard is saved next to the document as `image.png`, `image-1.png`, … and inserted as a
  paragraph of its own, with a blank line before and after it, and its alt text selected; Enter keeps it and moves the caret just after the image). An image
  written inside a paragraph is drawn in its line of text; an image alone in its paragraph is a
  centred figure. Pasting rich text (from Google Docs, Word, a web page or VS Code) into a
  block editor inserts it as Markdown (headings, bold, italic, strikethrough, links, lists, code,
  quotes, simple tables, images as links) in one undo step; Cmd/Ctrl+Shift+V pastes plain text.
  Pasting a web address (`http:`, `https:` or `mailto:`, copied as plain text) into a block editor
  makes a link: over selected text it gives `[text](url)`, on its own it gives `<url>`, and an image
  address (`.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp`) gives `![](url)` (`![text](url)` over
  selected text). Cmd/Ctrl+Shift+V pastes the address as it is. Inside code, inside the target of a
  link and for any other scheme the paste is left as plain text. Only the pasted span changes.
  A select at its start (Cmd/Ctrl+Shift+M) chooses the Strict, GFM, MyST or Full button set for the
  workspace (GFM until you choose, or the `editing.defaultPaletteMode` setting).
  The palette sits just above the text box, never over its text; when you scroll so the top of the
  box is out of view, it stays at the top of the viewport (below the preview controls) until the
  box ends, in narrow panes too, where it wraps inside the pane. The table toolbar of a cell
  editor does the same above its table.
  In GitHub (GFM) and MyST mode it also adds GitHub alerts with a
  type list, task-list checkboxes, HTML tables, collapsible sections, footnotes, Mermaid diagrams,
  table column alignment and `<kbd>` keys; MyST mode adds admonitions with a type list,
  definition lists, math (inline, display, aligned), subscript, superscript, `(name)=` labels,
  `{ref}` and `{doc}` references, `{cite}` citations from the workspace `.bib` files, dropdowns,
  tables with a caption, figures and `{kbd}` keys; Full mode adds, on top of MyST, the
  [Vega-Lite and Vega chart](charts.md) commands. In edit mode, hovering a figure shows Edit figure
  (or press Figure with the caret in a `{figure}`): a form edits the source (with Browse), alt text,
  caption, legend, width, alignment and name, and leaves every other option as it was. Figure on a plain paragraph picks an image, writes the
  `{figure}` and opens the same form at once on the caption; Escape keeps the figure as inserted.
  Editing a table cell adds the inline buttons (bold, italic, link, colour, emoji and so on) to the
  row and column bar.
  MyST `{list-table}` directives render with their title, `:header-rows:`, `:widths:` and
  `:align:`, styled like a pipe table. The table bar has a List table button that turns the pipe
  table into a `{list-table}`; in MyST mode, with the caret in a pipe, `{list-table}` or simple
  HTML table, the List table and Pipe table buttons (also `/list-table` and `/pipe` in the slash
  menu) convert it to the other form in one undo step. A conversion that would lose content (a
  list-table cell with several lines or block content, a title, a label or several header rows to a
  pipe table) shows a message and changes nothing; column alignment colons and `:widths:` are
  dropped. Conversion never writes HTML. A click on a cell of a `{list-table}` opens the whole
  directive in the raw Markdown editor, in place of the table.
  In edit mode a pipe table or a `{list-table}` shows a handle left of each body row and a handle
  above each column (outside the cells, the same mark as the list editor of the properties). Drag
  a handle onto another row or column, or focus it and press Alt+Up and Alt+Down (Alt+Left and
  Alt+Right for a column), to move it: the header rows stay in place, the move is one edit and one
  undo, and it works while a cell of the table is open too (the text typed in the cell moves with
  its row or column). In a list-table the cells and the `:widths:` numbers of a moved column move
  together and the `* -` and `  -` markers keep their places.
  Typing `/` at a line start opens a Notion-style command menu with completion
  (see [Slash Menu](slash-menu.md)).
- **Linked evidence:**
  [`x-okf-link`](https://okf-schema.readthedocs.io/en/latest/reference/okfreq-frontmatter.html)
  annotations can show target metadata and source line numbers for implementation
  and test evidence.
  Saved target files refresh their displayed metadata.
- **Source navigation:** relative links, heading fragments,
  and linked files open through VS Code and select the corresponding source location.
- **Scroll synchronization:** the preview and source editor can follow one another, preserve the
  current reading position while rendering, and show configurable sticky headings.
- **Safe edition:** wrapping and non-destructive editing operation are applied
  to the raw source, for instance to avoid rewrapping
  the entire document unnecessarily.
- **Review comments:** threads stored in `<name>.comments.json` next to the document are
  highlighted in the preview and open in a popover; select text to start a thread and reply to
  existing ones (see [Review Comments](review-comments.md)).

Checkboxes in task lists, paragraphs, and table cells are editable in place. In an untrusted
workspace they remain read-only until the workspace is trusted.

An inline block editor that is open in the preview keeps its text and caret while you save the
file, switch the colour theme or a diagram finishes drawing; the preview shows the newer render
when you close the editor. A change made in the text editor outside the block you edit leaves the
editor open; a change inside that block shows an error in the editor, and your text stays there to
copy.

## See It In Use

These captures are real Studio views from the end-to-end campaign. The fleet-dispatch document
shows Markdown source beside nested MyST admonitions, a Mermaid flowchart, and a captioned SVG
figure. The second capture shows the edit hover affordance.

[![Fleet-dispatch Markdown source beside a white Studio preview with nested MyST admonitions, a Mermaid flowchart, and a captioned SVG figure](../../images/38-edit-mode-remembered.png)](../../images/38-edit-mode-remembered.png)

[![The Studio edit affordance revealed by hovering over rendered content](../../images/21-edit-hover.png)](../../images/21-edit-hover.png)
