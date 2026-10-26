# Changelog

## Unreleased

- A final editor save captures the block or table position before showing its saving status,
  so a status-induced layout change cannot replace the position visible when Save was requested.
- Opening or closing comments above the reading line keeps the text in place, including when
  the browser emits a scroll event before the layout adjustment finishes.
- The edition palette's mode selector follows the forced preview theme instead of the VS Code
  dropdown colours. Toolbar tooltips stay opaque on disabled Back, Next and zoom controls, and
  long theme labels stay next to their button rather than shifting left on hover.
- Sticky headings and table of contents: the pinned heading band no longer lists a collapsed
  (zero-height) heading as a parent, nor headings inside admonitions and the properties table, which
  the table of contents leaves out too; the fold button of a table-of-contents entry is named "Unfold"
  while its section is folded; the editor-selection outline goes to the block that contains the cursor
  line instead of the block whose first line is nearest.
- Links and history in the preview: a link to a missing or blocked file keeps its text and colour and
  is followed by a small warning icon whose tooltip names the problem (for example "File not found:
  docs/guid.md"); link tooltips are refreshed when the preview regains focus; Back and Next within the
  same document scroll even when the preview does not follow the editor, and a Back or Next whose
  document cannot be opened no longer moves the history position; a file name with a literal `%` is
  reachable (`100%25.md`) and an escaped percent is no longer decoded twice.
- Open Preview to Side now works from a Studio Open With tab: it previews that tab's file instead of
  asking for a Markdown file.
- A failed load of the render engine at start-up is no longer remembered: the first render tries the
  load again.
- Removed the setting `markdownOkfSchemaStudio.preview.doubleClickToSwitchToEditor`: it had no
  visible effect, because a single click in the preview already reveals the matching source line (and
  still does). If it is set in your `settings.json`, VS Code shows an unknown-setting hint; delete
  the line.
- Table editing in edit mode: Col + and Col − keep the padding, the indentation and the outer pipes
  of every line instead of rewriting the table; an unescaped pipe inside a code span now splits a cell
  in the editor as it does in the preview (write `\|` to keep it in the cell, which is what the editor
  writes when you type one); the table bar draws one rule per button group and its rule before the cell
  formatting group wraps together with the group.
- In edit mode, each body row of a Markdown pipe table or a MyST `{list-table}` now shows the grab
  handle of the frontmatter list editor. Drag it onto another row to move the row, or focus it and
  press Alt+Up or Alt+Down. A move is one edit (one undo), the header rows stay in place, and the
  handle sits just left of the table, outside it and centred on its row; a table that leaves no
  room there is pushed right, so the handle is never clipped. A list-table row moves as a whole item (its nested cell lines
  included) and the `:header-rows:` stay fixed. Captioned and HTML tables show no handle.
- A hidden `.partial` file left in a folder by a pasted image whose save was cut off (crash, closed
  window) is now removed at the next image paste into that folder once it is older than 10
  minutes. Only files with the extension's exact naming are touched.
- For contributors: the source is organised in layers (`src/core`, `src/host-api`, `src/page`,
  `src/node-services`, `src/session`, `src/host-vscode`), and `just check` now enforces their import
  boundaries (dependency-cruiser) and a file-size ratchet (800 lines per file in `src/`, 1 500 in
  `test/`; larger files may only shrink). Settings, palette actions and MyST directives each have
  one registry; the `package.json` settings schema is generated from the settings registry
  (`just generate-settings`) and `just check` fails when it was edited by hand. See "Architecture"
  in CONTRIBUTING.md.
- The Python build and documentation tools now require Python 3.11 or later (was 3.10), so the
  docs dependencies can move to Pillow 13 and a current `certifi`, which fix the reported security
  advisories. `uv` picks a matching interpreter automatically.
- When the page uses MyST syntax that its `conf.py` does not enable (a missing extension such as
  `dollarmath` or `colon_fence`), the preview now says so: a discreet one-line banner at the top
  counts the warnings, with an **Open Problems** button and a close button. Closed, it stays closed
  for that document until VS Code restarts and comes back when the warnings change. It never covers
  the floating toolbar and moves no content. Until now these warnings were only in the Problems
  view and as editor squiggles.
- A pasted image now goes on a paragraph of its own, with a blank line before and after it (like
  GitHub and Obsidian), instead of being glued to the end of the text line. Pasted in the middle of
  a line, it splits the paragraph there.
- An image written inside a paragraph (`Text ![logo](logo.png) more text`) now sits in its line of
  text, centred on it, instead of looking like a picture above the paragraph. An image alone in its
  paragraph stays a centred figure.
- The preview is faster on long documents and keeps what you are doing. Typing never reloads the
  page, unchanged blocks and Mermaid diagrams stay in place while the changed ones update, and
  scrolling does much less work per frame. An inline editor that is open in the preview now stays
  open, with its text and caret, when you save the file, switch the colour theme or a diagram
  finishes drawing: the preview catches up when you close the editor. A change made in the text
  editor above or below the block you edit no longer closes it; a change inside that block shows an
  explicit error in the editor instead of losing your text.
- New starting points for a workspace that has not chosen yet: the preview opens in the cream
  theme, the floating toolbar is collapsed to its first row (the chevron shows rows 2 and 3) and
  the edition palette offers the GFM buttons (`editing.defaultPaletteMode` now defaults to `gfm`).
  If you already picked a theme, expanded the toolbar or chose a palette mode in a workspace, that
  choice is kept; a palette mode you set in your settings is kept too. In the Settings UI the
  settings are now grouped in five categories, most used first: Preview, Editing, Frontmatter,
  Comments and PlantUML. No setting was renamed.
- The preview now has light, short animations: block, table cell and frontmatter editors, the
  edition palette, the table bar, the `/` menu and the palette menus fade in softly when you open
  them, a block fades back in when its editor closes, and a theme switch from the toolbar fades the
  colours. After a change made outside the preview (another tool or an agent writing the file, a
  file changed on disk) or an undo or redo, the blocks that changed glow briefly; typing in the
  active text editor does not glow. Nothing moves the
  layout, nothing animates when the page loads or follows the editor's scrolling, and the
  system's "reduce motion" setting turns every animation off.
- PlantUML diagrams now render out of the box: the preview draws them with the PlantUML engine
  bundled with the extension, without Java, without the `plantuml` command and without any
  network access, also in Restricted Mode. They follow the light or dark preview theme. The
  built-in engine loads no URL and no standard library (such diagrams show a message saying so)
  and lays out class-like diagrams with PlantUML's Smetana engine, so a few layouts differ from
  the JAR. The new setting `markdownOkfSchemaStudio.plantuml.useJar` (off by default) switches back
  to Java with `plantuml.jarPath`, or to `plantuml` on PATH, in trusted workspaces. **If you had set
  `plantuml.jarPath`, the preview now uses the built-in engine until you tick `useJar`.**
- PlantUML diagrams can live in their own files: `{uml} path/to/diagram.puml` (as in
  sphinxcontrib-plantuml) and `{plantuml} path.puml` without a body render that file, read with the
  same rules as `{include}`. Local `!include`, `!include_many`, `!include_once` and `!includesub`
  files work with the built-in engine too, nested includes resolve next to the including file, and
  the preview redraws a diagram when one of its files changes. In Restricted Mode only files in the
  document's folder and below are read. A missing file, a path outside the workspace or an include
  cycle shows a message instead of the diagram.
- For contributors: the real VS Code window tests now pass on macOS when the test window was
  launched behind another app. Each test window (the three window suites and the reload campaign)
  is first brought to the front, and the run waits until VS Code reports it focused. Before, a
  window macOS had left in the background failed every undo step ("one undo to restore …"),
  on any VS Code version. On a locked screen, or without the macOS Automation permission for
  System Events, the run now fails at once and says why. `STUDIO_VSCODE_EXECUTABLE` runs the
  tests against another VS Code build. The `/` menu scenario waits for the page to settle and for
  the caret in its text box before typing, and joins the stress plan.
- `Ctrl+A` (`Cmd+A` on macOS) in a text box of the preview (a frontmatter value, a block or table
  cell editor) now always selects that box's text. Pressed right after clicking into the box, it
  could select the whole source document in the text editor and close the frontmatter editor.
- Tab, Enter, Escape and the arrow keys that a preview editor (block, table cell, frontmatter)
  acts on now stay in the preview. VS Code no longer also runs its own shortcut for a key the
  editor has already used; keys the editor does not use, such as `Ctrl+Tab`, still reach VS Code.
- For contributors: pull request CI now runs only the simulated tests (static checks and the
  Playwright visual tests); the real VS Code window tests (integration and stress) are a manual
  job, started with `gh workflow run ci.yml --ref <branch> -f heavy=true`. New real-window tests
  cover incoming-change bars, review threads (create, reply, resolve), image paste and the
  read-only preview in Restricted Mode.
- For contributors: the linked-file refresh test now waits until the preview reports that the
  linked file is watched before saving it, and a timeout prints what each watcher of the file
  reported (armed or why not, events seen). `just ci-stress` repeats it as `linked-target-save`.
- For contributors: the real VS Code window screenshots now come from one registry
  (`test/shared/captureRegistry.ts`) and one shared writer, so every capture has a stable
  `<group>/rNN-<slug>` id, a folder per feature group inside its run folder, a "locks" sentence and
  an entry in the run manifest and the product-owner gallery. Several real-window runs can now
  run at the same time (own user-data and extensions directories, debugging port and evidence
  folders per run). Four captures were taken at a more telling moment (the TODO wrapper
  after `Ctrl+/`, the open language list, the open link panel, the open field picker before
  Escape) and the frontmatter ones are cropped to the preview.
- MyST `{list-table}` directives now render like pipe tables, with their title, `:header-rows:`
  (any number, including none), `:widths:` and `:align:`, and a click on one opens the whole
  directive for editing. New List table and Pipe table buttons (palette and `/` menu) convert the
  table at the caret between pipe, `{list-table}` and simple HTML tables, never to HTML, in one
  undo step; the table bar also gets a List table button. A conversion that would lose content (a
  list-table cell with several lines or block content, a title, a label or several header rows
  going to a pipe table) shows a message and changes nothing.
- New inline comment threads: a `<!-- THREAD` comment with `Author (YYYY-MM-DD HH:MM):` headers and
  indented messages shows in the preview as a green chip with a speech bubble. Click it to read the
  messages in a box, reply (your name and the time are added) or delete the thread; the rest of the
  file is left byte for byte as it was. Start one from the Thread button or `/thread`. The
  `preview.showComments` setting hides thread chips with the gray ones.
- MyST `{grid}` and `{toctree}` now render in the preview instead of showing a "not available"
  placeholder. A grid lays out its `grid-item` and `grid-item-card` blocks (title, header, body,
  footer, and a link that makes the whole card clickable) in the number of columns given by its
  `1 1 2 2` argument, and falls back to fewer columns as the pane narrows; it works with ``` and
  `:::` fences, nested. A toctree lists the documents it names as links that open in the preview,
  labelled with each document's first heading (or the file name, or your `Title <target>`), with
  `:caption:` as a heading, `:hidden:` hiding the list, `:glob:` patterns listing matching files in
  order, and a missing target shown with a warning style.
- With the caret inside an existing Markdown link, the link button (or Cmd/Ctrl+K) now opens the
  panel pre-filled with the link's text and URL, and Save replaces that link (its title is kept);
  one undo restores it. A reference-style link (`[text][ref]`) is read from its definition when it
  is in the same block and saved as an inline link, otherwise the panel starts empty. The Image
  button with the caret inside an image replaces its file and keeps its alt text and title.
- Pasting rich text (Google Docs, Word, a web page, a VS Code copy) into a block editor now inserts
  it as Markdown: headings, bold, italic, strikethrough, links, nested lists, inline and fenced
  code, quotes, simple tables and images (as links). One undo removes the paste, and
  Cmd/Ctrl+Shift+V still pastes plain text.
- HTML comments now show as a chip labelled "comment" instead of a bare `<!--`, including
  comments written one after the other on a line. A new Comments button in the floating toolbar
  hides and shows the gray chips in both preview and edit mode, and remembers the choice per
  workspace. The open comment box, the comment compose box and the thread box now have square
  corners.
- A MyST `{code-block}` now keeps its code left-aligned like a plain fenced block, and its
  `:caption:` is a title bar joined to the top of the block (left-aligned, monospace, same width
  and border) instead of a centred italic line below it. Line numbers, emphasized lines and the
  copy button work as before.
- Hebrew and Arabic paragraphs, headings, list items, quotes and table cells are now right-aligned
  in the preview, like on GitHub; left-to-right text is unchanged.
- The edit bar (format buttons or table row and column buttons) now stays in view while you edit a
  tall block or table: it sits just above the block without covering its text, and when you
  scroll so the top of the block is out of view it stays at the top of the viewport (below the
  preview controls) until the block ends. It also stays visible in narrow panes (360 and 460 px),
  where it wraps onto several rows inside the pane. The text and the cursor never move.
- A linked file changed on disk (by a save, git or another tool) now refreshes its excerpt and
  title in the preview reliably on Linux too: the file's folder is watched directly instead of
  only through VS Code's workspace watcher, which could miss the change.
- Long words and bare URLs now wrap inside their paragraph, list item, quote or table cell instead
  of widening the page and making it scroll horizontally.
- An invalid Mermaid diagram now shows one error line, however many times the theme changes, with
  a collapsed "Show the parser error" section giving the reason (line, expected token).
- The green bar of blocks changed since the last commit no longer touches the text or follows the
  rounded corners of code blocks: every bar now sits in one column at the left margin of the page,
  with square ends and the full height of its block, whatever the indentation. Nothing moves.
- The current section in the table of contents keeps its bar and tint but now has square corners.
- Text you type in an open editor (a paragraph, a table cell or a property) is no longer lost when
  you follow a link to another file, go Back or Next, or switch editor tab right after typing:
  the editor is saved and closed first, and the preview then switches. A property value that
  is not valid YAML, does not fit the schema or is not a number is written as typed in that case,
  and the preview then shows the validation error.
- A leading properties table no longer keeps its Description toggle under the floating toolbar
  when the page loads slowly: the table gives up the toolbar's width once its layout settles.
- Saving a linked file in the editor now refreshes its excerpt and title in the previews that
  link to it right away, instead of waiting for the file watcher (which could miss the write).
- Closing a locked preview no longer makes the next Quick Open from your own locked group open
  the file in a new empty editor group.
- GitHub `[!CAUTION]` alerts and MyST `caution` callouts are now red with a stop-sign (octagon)
  icon, like on GitHub, instead of the Warning amber with a triangle.
- New slash menu: typing `/` at a line start or after a space in a block text box (paragraph,
  insertion point, Start writing, table cell) opens a command menu at the caret with completion
  (`/h2`, `/table`, `/note`). It lists the palette's commands for the current mode, runs them like
  their palette buttons, and closes on Escape, a second `/`, a space or leaving the text box.
  It also offers Bulleted and Numbered list (menu only), ranks MyST commands first in MyST mode,
  and keeps Enter and Tab as plain keys when only a loose match exists.
- The floating toolbar now has three rows: Refresh, Anchor, Edit and a new chevron button on the
  first row; Back, Next, Zoom - and Zoom + on the second; Theme, Width, TOC and Diff on the third.
  The chevron button collapses rows 2 and 3 (hidden from the Tab key too) and the choice is
  remembered per workspace.
- Full width mode now uses the same 16 px side margins as a table that breaks out of the column
  in Auto mode, instead of up to 78 px of empty space on each side.
- The gap above the first element is now the same 40 px everywhere: a title, text, picture, table,
  properties table, an empty document (Start writing), in read and edit mode. The floating
  toolbar no longer adds extra space: an open first-block editor gives up the width the toolbar
  covers instead (only a pane of 480 px or less still pushes it below the toolbar).
- The edit palette now sits on top of the edit box, outside its border, instead of inside it. It
  sticks to the top of the viewport while you scroll a tall edit box (below the sticky heading
  band and the floating toolbar), and goes away with the box. The text stays where it was.
- The palette mode select now reads "MyST" instead of "MyST (includes GFM)" (the setting values
  are unchanged).
- Review comments follow the text: when you edit the document, threads move with their lines, and
  a moved or reloaded document looks for each quote again (nearby first, then everywhere; only a
  clear match counts, otherwise the thread is listed as orphaned and stays in the file). Moved
  lines are saved to the comments file when you save the document, never while typing. Renaming
  a document renames its comments file too (an existing one is never overwritten).
- Review comments: the thread popover has **Resolve** / **Reopen** and **Delete** (it asks "Delete
  thread?" with Yes and No in the popover). Threads whose text can no longer be found are listed
  in an "Orphaned comments" box at the end of the preview, with their quote, and stay in the file
  untouched. The popover shows the reason when a change is refused; read-only previews offer
  neither button. A thread whose text moved is placed only when its quote (12 characters or more)
  occurs exactly once; otherwise it is listed as orphaned.
- Review comments: select text in the preview and press the "Comment" button that appears next to
  it (or Cmd/Ctrl+Alt+M) to start a comment thread; open a thread to reply. Comments are saved in
  `<name>.comments.json` next to the document, created if needed, with the author from the new
  `comments.authorName` setting, else your Git `user.name`, else your system user name. Nothing is
  written in read-only previews (untrusted workspaces), and an invalid file is never overwritten.
- Review comments: when `notes.comments.json` sits next to `notes.md`, the preview highlights the
  quoted text of each comment thread (or marks its block with a badge when the text is not found),
  also in edit mode. Clicking a highlight opens a popover with the thread: author, date, the
  plain-text comments and whether it is resolved. Documents without such a file behave as before.
- In edit mode, with blocks selected, Alt+Up and Alt+Down (or the up and down arrows of the "+" bar
  under the last selected block) move the whole selection past the block beside it in one undo
  step, and the selection and the focus follow it. Nothing moves at the ends of the document, and
  without a selection Alt+Up and Alt+Down still move the single focused block.
- In edit mode, with blocks selected (Shift+click or Shift+Up/Down), Cmd/Ctrl+C copies their exact
  Markdown to the clipboard and Cmd/Ctrl+X cuts them in one undo step, together with one blank
  line so no gap or glued blocks are left. Cmd/Ctrl+V on a selection, or on a focused "+" bar,
  inserts the clipboard text as new blocks after it, also in one undo step. Blocks from an
  included file and the frontmatter are refused with a message; text boxes keep their own keys.
- In edit mode, Shift+click on a block selects every body block from the block you last clicked
  or opened to that one, and Shift+Up or Shift+Down grows or shrinks the selection. Selected
  blocks get an outline and a screen reader announces "3 blocks selected". Escape or a plain
  click clears it, and so does any change to the document. The properties table and blocks that
  come from an included file are never selected, and an include ends a range. Text selection by
  dragging, and everything in preview mode, work as before.
- Pasting an image (a screenshot) into an open block editor saves it next to the document as
  `image.png`, then `image-1.png`, `image-2.png` and so on, and inserts `![image.png](image.png)`
  with the alt text selected. Text on the clipboard still wins over an image. Only png, jpeg, gif
  and webp up to 10 MB are accepted, and nothing is saved in a read-only preview, for an unsaved
  document or outside the workspace.
- In edit mode the "+" bar under each body block also shows an up and a down arrow. A click swaps
  the block above the bar with its neighbour in one edit (one undo step) and keeps the moved block
  where it was on screen, so repeated clicks keep moving it. A list or a code block moves as one
  block. The arrows are disabled at the ends and for blocks that come from an included file, and
  a move is refused, with a message, when a comment or a link definition sits between the blocks.
  Alt+Up and Alt+Down move the focused block (or the block whose bar button has the focus); in the
  text box, Cmd+Alt (Ctrl+Alt elsewhere) + Up or Down saves the edit, moves the block and reopens
  the editor with the caret where it was. Option/Alt+arrow alone keeps word navigation.
- Editing a table cell shows the formatting buttons that make sense in a cell (bold, italic,
  strikethrough, link, emoji, colour, keys, sub/superscript, as the palette mode allows) in the
  row and column bar, after a separator, with the same shortcuts (Cmd/Ctrl+B, +I, +K). Block
  buttons never appear there. Text inserted in a cell gets its `|` escaped and its line breaks
  replaced by spaces, so a link or a colour cannot split the table.
- The edition palette gets a Colour button in every mode. Its picker has Text and Background tabs,
  16 swatches, a hex field (Enter applies, invalid values are refused) and Remove. It wraps the
  selection in `<span style="color:#hex">` or `background-color`, and changes, extends or removes
  the span the selection is in. Only colours the preview keeps (hex, `rgb()`, `rgba()`) are
  written, also in table cells. With the caret in a colour code (`#rgb`, `#rrggbb`, `rgb(…)`), a
  swatch button shows that colour and opens the picker to replace the code in place.
- Text and background colours set with `<span style="color: #c00; background-color: rgb(…)">` now
  render coloured. Only hex (`#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`) and `rgb()`/`rgba()` values
  are kept; named colours, `var()`, `url()`, `!important` and other properties are still removed.
- Edit mode shows an Edit figure button over a hovered figure. It opens the block editor with a
  form above the text box: Source (with Browse), Alt text, Caption, Legend, Width, Align and Name.
  Apply rewrites the `{figure}` directive as one undo step and keeps every option the form does
  not edit, in its order. The Figure button does the same when the caret is inside a `{figure}`,
  and on a Markdown image alone in its paragraph it converts the image to a figure. A width needs
  a number with px, %, em or rem.
- The edition palette gets an Image button in every mode and a Figure button in MyST mode. Both
  open the system file dialog in the document's folder. Image writes `![name](path)` with the
  name selected; Figure writes `:::{figure} path`, `:alt: name` and an empty caption line (the
  selected lines become the caption). The path is relative with `/` separators, in `<…>` when it
  has spaces or parentheses. The block editor stays open while the dialog is shown; Cancel changes
  nothing. Files outside the workspace folders, on another drive, or that are not png, jpeg, gif,
  webp or svg are refused, and so is a read-only or untrusted preview.
- The edition palette gets six more MyST buttons. Reference lists the `(label)=` names of the
  document (with the heading or text after each) and writes `` {ref}`label` ``; with text
  selected it writes `` {ref}`text <label>` ``. Document link opens the system file dialog and
  writes `` {doc}`../path/file` `` relative to the document, without the extension. Citation
  lists the keys of the workspace `.bib` files (at most 20 files and 2 MB, node_modules and build
  folders skipped, a few seconds at most) and writes `` {cite}`key` ``. Dropdown writes a
  collapsible `:class: dropdown` note, Table with caption wraps the table at the caret in
  `:::{table} Caption`, and Key (MyST) wraps the selection in `` {kbd}`…` ``.
- The edition palette gets six MyST buttons, shown in MyST mode only. Admonition opens a list
  (Note, Tip, Important, Warning, Caution, Danger, Attention, Error, Hint, See also, Custom) and
  wraps the current lines in a `:::{type}` fence, one colon longer than any fence inside; Custom
  writes a titled block with a `:class:`. Definition list writes `Term` and `: Definition`, Math
  offers inline `$…$`, display `$$` and aligned `\begin{align}`, Subscript and Superscript wrap
  the selection in `{sub}` and `{sup}`, and Label puts `(label-name)=` above the block.
- The preview shows MyST figure size and alignment (`:width:` in px, %, em or rem; `:align:` left,
  center or right, on `{figure}` and `{image}`), and a `(name)=` label now shows a faint anchor
  icon in the left margin of the labelled block, with the tooltip "Anchor: name"; `{ref}` links to
  it jump there. `\begin{align}` blocks in `$$` and `{math}` already render with KaTeX.
- In edit mode, clicking a label's anchor icon opens a small field with its name. Enter renames the
  `(name)=` line as one undo step, Escape cancels, and a status line says how many `{ref}` uses of
  the old name remain (they are not rewritten). The rename is refused while another edit is open,
  in a read-only preview, or when the label is no longer on that line.
- The edition palette gets five more GitHub (GFM) buttons, also shown in MyST mode. Collapsible
  wraps the lines in `<details><summary>`, Footnote adds `[^n]` at the caret and an empty `[^n]: `
  at the end, Mermaid inserts a flowchart fence, Column alignment (Left, Center, Right) rewrites
  only that column's delimiter cell of the table at the caret, and Key wraps the selection in
  `<kbd>`. The preview now renders raw `<details>`/`<summary>` and `<kbd>`.
- The edition palette gets three GitHub buttons, shown in the GitHub (GFM) and MyST modes. Alert
  writes `> [!NOTE]` and quotes the current lines, then a list of types (Note, Tip, Important,
  Warning, Caution) opens at the caret to change it; Escape keeps Note. Checkbox toggles `- [ ]`
  on the current lines. HTML table converts the Markdown table at the caret to an HTML `<table>`
  with its text and alignment, or inserts a new 2 × 2 one. Each is one undo step.
- The edition palette gets a Table button and an Emoji button. Table opens a 9 x 9 grid: the cells
  from the top left to the pointer light up with their size (for example 3 × 4) and one click
  inserts that pipe table on its own lines, header row first, with the first header cell selected.
  Emoji opens a picker with about 150 emoji in six categories and a filter on English names; it
  inserts the character at the caret (Shift+click keeps the picker open). Both close with Escape.
- A select at the start of the edition palette chooses its buttons: Strict Markdown, GitHub (GFM)
  or MyST. The choice is remembered per workspace and the new setting
  `editing.defaultPaletteMode` (default MyST) gives the starting mode; rendering is unchanged.
- The block editor gets a Link button and Cmd/Ctrl+K. A small panel with Text and URL fields opens
  under the palette, prefilled from the selection (a selected URL fills the URL, a selected link is
  <!-- TODO: read back); Enter inserts `[text](url)` as one undo step and Escape returns to the text box. -->
- An edition palette now sits above the text box of an open block editor, also when you insert a
  new block: heading level (Paragraph, H1 to H5), bold, italic, strikethrough, code block with a
  language list, blockquote, horizontal rule and TODO. Buttons never close the editor, each is one
  undo step, and the tooltips show the shortcut of your platform.
- In the block editor, Cmd/Ctrl+B toggles **bold**, Cmd/Ctrl+I toggles *italic* and Ctrl+/ (Cmd+/)
  toggles a `<!-- TODO: … -->` comment around the current line or the selected lines. Each is one
  undo step.
- Tables and figures narrower than the text column are now centred in every width mode. In Auto,
  a wide table or figure takes the width it needs, up to the space left of the table of contents,
  and is centred on that space. Code blocks keep their behaviour.
- For a document in a Sphinx project, the preview now warns when the document uses MyST syntax
  that needs an extension missing from `myst_enable_extensions` in the nearest `conf.py`
  (for example `:::` fences without `colon_fence`). One warning per extension names the first
  line, in the preview status area and in the Problems panel (with a squiggle on that line).
  Editing, creating or deleting a `conf.py` updates open previews without reopening them.
  Nothing is warned without a `conf.py` or when its lists cannot be read as plain strings,
  and the rendering itself does not change.
- Blocks you changed since the last Git commit, unsaved edits included, now show a green bar on
  their left, like the editor gutter. Files that are not in Git show nothing. The Diff button at
  the end of the second toolbar row shows or hides the marks (remembered per workspace). The new
  `preview.showIncomingChanges` setting (default on) turns the marks, and the button, off.
- A comment or TODO chip now opens into a box with the comment text when you click it (or press
  Enter or Space on it) and closes again on a second click; what is open stays open while you type.
  The new `preview.showComments` setting (default on) hides the gray comment chips, at once and in
  open previews. TODO chips always show.
- HTML comments now show as a small gray `<!--` chip where they sit, and the word TODO, or a
  `<!-- TODO ... -->` comment, as a green chip. The chip's tooltip holds the comment text. Tool
  comments (`markdownlint-*`, `prettier-ignore`, `toc`, `cspell:`, `vale`) stay hidden.
- A TOC button on the second toolbar row shows a column on the right, below the toolbar, with the
  h1 to h4 headings of the document; clicking an entry scrolls to the heading. It is off by default,
  remembered per workspace and hidden on panes narrower than 760 px. Entries with sub-entries fold
  with a twisty, and the entry of the section you are reading is highlighted and kept in view.
- Back and Next buttons at the start of the second toolbar row return to the place before a followed
  link and forward again, across documents and in-page anchors; external links are not recorded,
  and each preview panel keeps its own history.
- A Width button on the second toolbar row cycles Margin (the `maxContentWidth` column), Auto (wide
  tables, figures, images and code blocks break out to the pane width) and Full width, remembered
  per workspace.
- Every preview now starts its first element 40 px below the top, whatever it is (text, heading,
  table, properties, image, empty page); an open first-block editor only moves lower to clear the
  toolbar.
- The preview toolbar has a second row with Zoom - and Zoom + (70 % to 200 %, 10 % steps); the text
  and the column scale together, and the zoom is remembered per workspace.
- In edit mode, clicking an image inside a link (Cmd/Ctrl+click still follows it) or a raw
  `<img>` block now edits it, and ArrowUp from the first block no longer closes the editor.
- `~~text~~` now renders struck through in the preview, like on GitHub.
- Editing a block that comes from an included file now opens the `{include}` directive in the
  host document instead of unrelated lines.
- Pointing at any code block shows a copy button at its top right; one click copies the raw code and
  the icon turns into a check mark for a moment.
- Every setting now explains what it does and what each value changes, in a grouped order; the
  scroll and PlantUML jar path descriptions are corrected.

## 0.3.1 - 2026-10-15

- Linked-file metadata in the properties table refreshes reliably when a linked target is saved,
  even if the per-target file watcher is not armed yet.
- Releases deploy GitHub Pages together with the VS Code Marketplace publication.
- The UI fixes for Windows from 0.3.0, which was never published, ship in this release.

## 0.2.1 - 2026-10-15

- Release and GitHub Pages deployments now run from version tags matching the package version.

- When VS Code restores several preview panels after a reload, every panel stays interactive:
  only the newest follows the active editor, the others become fixed previews of their document.
  The remembered collapsed-descriptions state is now bounded to the 200 most recent documents and
  stored under one key (existing entries are migrated).
- Editing a block in the preview no longer breaks after the preview reloads: the edit lock is
  released when a new page loads or when the preview closes.
  Saving an unchanged buffer no longer re-renders the preview, and saves, PlantUML diagrams and
  link updates wait for an open block edit to finish instead of closing it.
- Documents with very many includes (more than 2000 expansions or 10 Mi characters of included
  text per render) now show one warning and the includes beyond the budget appear as placeholders instead of freezing
  the editor; repeated includes of the same file are read and parsed once per render.
- Long editing sessions no longer accumulate memory from schema validation: resolved schemas and
  their compiled validators are reused until a schema file changes.
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

## 0.1.1 - 2026-10-15

- Published the extension to the VS Code Marketplace and added its canonical install link.
- Added manual recovery paths for Marketplace releases and GitHub Pages deployments.

## 0.1.0 - 2026-09-25

- Completed the focused Task 07 validation campaign for the active-file Sphinx/MyST preview.
- Added the reproducible `just release-check` campaign recipe.
- Recorded the automated hard-gate, stock-preview, security, package, and accessibility evidence.
- Release decision: `NO RELEASE` because current-window rendering and VoiceOver speech output remain
  unverified in the available macOS automation environment.
