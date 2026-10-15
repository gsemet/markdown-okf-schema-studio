# Changelog

## Unreleased

- PlantUML rendering now times out after 30 s, caps stderr at 64 KiB, kills the whole process
  group on cancel or timeout, and no longer crashes the extension host when the process exits
  before reading its input.
- Inline code is now a subtle pill: a tint and hairline border derived from the text colour, 4px
  radius, slightly smaller monospace, wrapping with padding on every line and never growing the
  line height. It scales in headings, follows link colours and stays compact in tables.
- The preview theme button now also offers a light "Cream" theme (warm paper background, warm
  near-black text, clay links, darker-cream code blocks); the loop is current, dark, white, cream.
  All text and background pairs meet WCAG AA 4.5:1.
- Bare `http://`, `https://` and `www.` URLs in prose, lists and table cells now render as links
  (GFM autolink-literal rules: trailing punctuation stays outside, balanced parentheses stay in;
  `www.` links open as `https://`). Code, math, existing links and emails are untouched, the links
  use the same navigation policy as Markdown links, and editing still shows the raw URL text.
- The inline editor of the document's first block and the "Start writing" button of an empty
  document no longer stick to the top edge of the preview: the first-block editor gets a 56 px top
  margin so its frame clears the floating toolbar (the owner asked for 20–40 px; 24 px left a wide
  frame under the toolbar) and the button gets a 24 px margin. In edit mode on an empty document,
  pressing Enter in the preview opens the new-block editor like "Start writing" (Cmd/Ctrl+Enter
  saves, Esc cancels).
- Fixed the missing insertion point (+) after a plain Markdown image paragraph: a lone image is
  now a source-mapped block, so a block can be inserted after it, also at the end of the document.
  Figure directives already offered it; tests now pin insertion after every figure shape.
- Fixed three keyboard bugs in the inline block and table-cell editors: ArrowUp/ArrowDown inside a
  wrapped paragraph now move the caret between visual lines and only leave the block (or cell) from
  the first or last visual line; typing `*`, `_`, a backtick or `~` over a selection wraps it (and
  keeps it selected, so a second press wraps again) as one undoable step; and undo/redo shortcuts
  keep working in every inline field without reaching the VS Code document.
- Changed the table-cell editor to match the block editor: same editor font, size and line height,
  compact Done and Cancel buttons under the field inside the cell (the cell grows vertically, columns
  keep their width), and the arrow keys now move cell to cell (Left/Right at the text edges, Up/Down
  on the first/last line) before falling back to block-to-block navigation. The table toolbar status
  is now vertically centred with its buttons.
- Fixed Home and End in the inline block editor and table-cell editor: they now move the caret to
  the start or end of the edited text (Shift extends the selection) instead of scrolling the
  preview or shifting a wide table on macOS.
- Changed the inline block editor: `Revert` is now `Cancel`, Escape cancels (in blocks and table
  cells) instead of keeping the text, Cmd/Ctrl+Enter still finishes, the status line shares one row
  with the Done and Cancel buttons, and the editor text is one size smaller.
- Fixed frontmatter values ending in `...` or `---` closing the block early, which dropped keys and
  made properties-table edits corrupt the file. Edits that would lose or duplicate a key are now
  refused.
- Fixed GitHub alerts (`> [!NOTE]`) rendering as plain blockquotes in CRLF documents.
- Fixed schema fields named like `Object.prototype` members (`constructor`, `toString`) being
  treated as present.

## 0.1.0 - 2026-09-25

- Completed the focused Task 07 validation campaign for the active-file Sphinx/MyST preview.
- Added the reproducible `just release-check` campaign recipe.
- Recorded the automated hard-gate, stock-preview, security, package, and accessibility evidence.
- Release decision: `NO RELEASE` because current-window rendering and VoiceOver speech output remain
  unverified in the available macOS automation environment.
