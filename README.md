# Markdown OKF-Schema Studio

![Markdown OKF-Schema Studio logo](images/logo.png)

[![CI](https://github.com/gsemet/markdown-okf-schema-studio/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/gsemet/markdown-okf-schema-studio/actions/workflows/ci.yml) [![Latest release](https://img.shields.io/github/v/release/gsemet/markdown-okf-schema-studio?display_name=tag&sort=semver)](https://github.com/gsemet/markdown-okf-schema-studio/releases) [![License](https://img.shields.io/github/license/gsemet/markdown-okf-schema-studio)](LICENSE)

[VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=GaetanSemet.markdown-okf-schema-studio) | [Screenshot report/gallery](https://gsemet.github.io/markdown-okf-schema-studio/gallery.html) | [Reports index](https://gsemet.github.io/markdown-okf-schema-studio/reports/) | [Requirements](https://gsemet.github.io/markdown-okf-schema-studio/requirements.html)

Markdown OKF-Schema Studio is a visual Markdown editor for VS Code that supports several popular
Markdown flavours and extensions:

- [CommonMark](https://commonmark.org/)
- [GitHub Flavored Markdown (GFM)](https://github.github.com/gfm/)
- [Sphinx MyST](https://myst-parser.readthedocs.io/)
- [OKF](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
- [OKF-Schema](https://github.com/gsemet/okf-schema)

## What This Extension Adds

| Titled and nested MyST admonitions | Mermaid diagrams and captioned MyST figures |
| --- | --- |
| [![A titled tip containing a nested warning admonition](images/readme/myst-admonitions.png)](images/38-edit-mode-remembered.png) | [![A Mermaid flowchart followed by a MyST figure with a local SVG and caption](images/readme/myst-diagrams-and-figure.png)](images/38-edit-mode-remembered.png) |

| Schema-aware properties | Direct metadata editing | Inline Markdown editing |
| --- | --- | --- |
| [![JSON Schema-aware OKF properties table](images/readme/schema-properties.png)](images/readme/schema-properties.png) | [![Editing an OKF frontmatter property in place](images/readme/edit-frontmatter.png)](images/readme/edit-frontmatter.png) | [![Edit affordance on rendered Markdown](images/readme/inline-editing.png)](images/readme/inline-editing.png) |

- **MyST rendering:** directives, admonitions, `{grid}` cards (columns follow the pane width) and
  `{toctree}` lists of links to the documents they name, tables, math (including `align` environments),
  Mermaid, PlantUML, images and figures with their `:width:` and `:align:`, media, `(label)=`
  anchors (shown as a small icon; in edit mode a click on it renames the label), and permitted
  external links render in the preview.
- **OpenKnowledge Format and OKF-Schema properties:** frontmatter field can be shown as a schema-aware properties table,
  with validation diagnostics, enum controls, typed scalar editors,
  and YAML editors for arrays and objects.
- **Inline editing:** click a rendered block to edit its source Markdown. Save with Done
  or Cmd/Ctrl+Enter; Cancel or Escape restores the original block. Tables and frontmatter support
  keyboard navigation, row creation, and focused field editing.
  The "+" bar under a body block also has up and down arrows that swap the block above the bar
  with its neighbour in one undo step; blocks from an included file are not moved.
  Alt+Up/Down moves the focused block; Cmd/Ctrl+Alt+Up/Down does it from the block text box.
  In a block text box, Cmd/Ctrl+B toggles bold, Cmd/Ctrl+I toggles italic, and Ctrl+/ (or Cmd+/)
  toggles a `<!-- TODO: … -->` comment on the current or selected lines; each is one undo step.
  The Thread button (or `/thread`) inserts an inline comment thread after the block: a
  `<!-- THREAD` comment holding `Author (YYYY-MM-DD HH:MM):` headers, each followed by the indented
  text of the message. In the preview it is a green chip with a speech bubble; click it to read the
  messages, type a reply (Cmd/Ctrl+Enter or Reply) or delete the whole thread. A reply is appended
  with your name (`comments.authorName`, else your Git `user.name`) and the local time and changes
  nothing else in the file; one undo step each.
  Block selection: Shift+click selects the blocks between the last clicked block and the one you
  click, Shift+Up/Down extends or shrinks the selection, Escape or a click clears it.
  With a selection, Cmd/Ctrl+C copies its exact Markdown, Cmd/Ctrl+X cuts it (one undo step), and
  Cmd/Ctrl+V pastes the clipboard text as new blocks after the selection or after the block of a
  focused "+" bar (one undo step).
  Alt+Up/Down (or the arrows of the selection's last block) moves the whole selection (one undo
  step), and the selection follows.
  An edition palette above the text box adds headings, bold, italic, strikethrough, inline code,
  links (Cmd/Ctrl+K opens a link panel with text and target, pre-filled when the caret is in a
  link), tables from a size grid, emoji from a picker, text and background colours
  (a Colour picker with 16 swatches and a hex field; a swatch button appears when the caret is in a
  colour code), code blocks with a language,
  blockquotes, horizontal rules and images picked from a file dialog (or pasted: a screenshot on the
  clipboard is saved next to the document as `image.png`, `image-1.png`, … and inserted as a
  paragraph of its own, with a blank line before and after it, and its alt text selected). An image
  written inside a paragraph is drawn in its line of text; an image alone in its paragraph is a
  centred figure. Pasting rich text (from Google Docs, Word, a web page or VS Code) into a
  block editor inserts it as Markdown (headings, bold, italic, strikethrough, links, lists, code,
  quotes, simple tables, images as links) in one undo step; Cmd/Ctrl+Shift+V pastes plain text. A select at its start
  (Cmd/Ctrl+Shift+M) chooses the Strict, GFM or MyST button set for the workspace (GFM until you
  choose, or the `editing.defaultPaletteMode` setting).
  The palette sits just above the text box, never over its text; when you scroll so the top of the
  box is out of view, it stays at the top of the viewport (below the preview controls) until the
  box ends, in narrow panes too, where it wraps inside the pane. The table toolbar of a cell
  editor does the same above its table.
  In GitHub (GFM) and MyST mode it also adds GitHub alerts with a
  type list, task-list checkboxes, HTML tables, collapsible sections, footnotes, Mermaid diagrams,
  table column alignment and `<kbd>` keys; MyST mode adds admonitions with a type list,
  definition lists, math (inline, display, aligned), subscript, superscript, `(name)=` labels,
  `{ref}` and `{doc}` references, `{cite}` citations from the workspace `.bib` files, dropdowns,
  tables with a caption, figures and `{kbd}` keys. In edit mode, hovering a figure shows Edit figure
  (or press Figure with the caret in a `{figure}`): a form edits the source (with Browse), alt text,
  caption, legend, width, alignment and name, and leaves every other option as it was.
  Editing a table cell adds the inline buttons (bold, italic, link, colour, emoji and so on) to the
  row and column bar.
  MyST `{list-table}` directives render with their title, `:header-rows:`, `:widths:` and
  `:align:`, styled like a pipe table. The table bar has a List table button that turns the pipe
  table into a `{list-table}`; in MyST mode, with the caret in a pipe, `{list-table}` or simple
  HTML table, the List table and Pipe table buttons (also `/list-table` and `/pipe` in the slash
  menu) convert it to the other form in one undo step. A conversion that would lose content (a
  list-table cell with several lines or block content, a title, a label or several header rows to a
  pipe table) shows a message and changes nothing; column alignment colons and `:widths:` are
  dropped. Conversion never writes HTML.
  Typing `/` at a line start opens a Notion-style command menu with completion
  (see [Slash Menu](#slash-menu)).
- **Linked evidence:** [`x-okf-link`](https://okf-schema.readthedocs.io/en/latest/reference/okfreq-frontmatter.html)
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
  existing ones (see [Review Comments](#review-comments)).

Checkboxes in task lists, paragraphs, and table cells are editable in place. In an untrusted
workspace they remain read-only until the workspace is trusted.

An inline block editor that is open in the preview keeps its text and caret while you save the
file, switch the colour theme or a diagram finishes drawing; the preview shows the newer render
when you close the editor. A change made in the text editor outside the block you edit leaves the
editor open; a change inside that block shows an error in the editor, and your text stays there to
copy.

## Floating Toolbar

The floating toolbar at the top right of the preview has three rows:

1. **Actions:** Refresh, Anchor (link the preview scroll to the text editor), Edit (writable
   previews only), and a chevron button that hides or shows rows 2 and 3.
2. **Navigation:** Back, Next, Zoom out and Zoom in.
3. **View options:** Theme, Width, Table of contents, the incoming-changes (Diff) toggle and the
   Comments toggle (hides or shows the gray comment chips, in preview and in edit mode).

The chevron button collapses the toolbar to its first row when you want the most room for the
text, and expands it again. The choice is remembered per workspace; a new workspace starts with
the toolbar collapsed, so click the chevron to reach rows 2 and 3. Hidden rows are skipped by the
Tab key.

| Expanded | Collapsed |
| --- | --- |
| [![The floating toolbar expanded: three rows of buttons](images/readme/toolbar-expanded.png)](images/readme/toolbar-expanded.png) | [![The floating toolbar collapsed to its first row](images/readme/toolbar-collapsed.png)](images/readme/toolbar-collapsed.png) |

## Slash Menu

In a block text box (a paragraph editor, an insertion point, Start writing, a table cell), type `/`
at the start of a line or after a space to open a command menu at the caret. It lists the same
commands as the edition palette for the palette mode you chose (Strict, GFM or MyST), grouped by
category, each with its icon and shortcut. Keep typing to filter: `/h2`, `/table`, `/note`,
`/todo`, `/code`, `/image`, `/link`, `/math`, `/bullet`, `/numbered`. Names and short aliases
match, best match first; in MyST mode the MyST command wins over its GitHub twin (`/note` finds the
admonition). Bulleted and Numbered list exist only in this menu (the palette has no list button).
If the only matches are loose ones (letters inside a word), Enter and Tab stay plain keys unless you
moved the highlight, so a literal ` /ock` followed by Enter is never swallowed.

- **Up / Down** move through the list, **Enter** or **Tab** apply, a click applies too.
- **Escape** closes the menu and keeps what you typed; so does **Backspace** past the `/`.
- `//`, `/` followed by a space, a `/` inside a word or URL (`a/b`, `http://`), inside inline code
  or inside a fenced code block never open it.
- Choosing a command removes the `/query` and runs the command like its palette button: the same
  Markdown, the same caret, and for pickers (table size, link, image, colour, references) the same
  picker. Plain commands are one undo step that brings the `/query` back.
- The menu stays inside the window (it opens above the caret near the bottom), shows "No command"
  when nothing matches, and closes when you leave the text box or scroll the caret out of view.

[![The slash menu filtered by /tab in a GFM paragraph editor](images/readme/slash-menu.png)](images/readme/slash-menu.png)

## Preview Themes

The theme button on the third toolbar row cycles through the current VS Code theme, dark,
white, and cream. Cream is a warm, low-glare paper palette with clay-coloured links and the theme
a new workspace starts with. The choice is remembered per workspace. These three captures use the
same document, viewport, and scroll state.

| Dark | White | Cream |
| --- | --- | --- |
| [![Handbook title and admonitions in the dark preview theme](images/readme/theme-dark.png)](images/readme/theme-dark.png) | [![Handbook title and admonitions in the white preview theme](images/readme/theme-white.png)](images/readme/theme-white.png) | [![Handbook title and admonitions in the cream preview theme](images/readme/theme-cream.png)](images/readme/theme-cream.png) |

## Motion

The preview keeps its animations short (about 120 to 200 ms; the update glow fades over about half
a second) and never lets them move the text:

- Block, table cell and frontmatter editors, the edition palette, the table bar, the `/` menu and
  the palette menus fade in when you open them; a block fades back in when its editor closes.
- The theme button fades the colours from one theme to the next.
- After a change made outside the preview (another tool or an agent writing the file, a file
  changed on disk) or an undo or redo, the blocks that changed glow once with a light wash of the
  focus colour. Edits you make in the preview itself do not glow, and neither does typing in the
  active text editor nor a change spread over many places (a checkout, a reload of the file).

Nothing animates when the page loads, when it is refreshed in place or when it follows the
editor's scrolling. With your system's "reduce motion" accessibility setting on
(`prefers-reduced-motion: reduce`), every animation is off and changes appear at once.

## Wide Tables and Figures

With the Width button on Auto, the text stays in a comfortable narrow column while a table or a
figure wider than the column breaks out of it, takes the width it needs (up to the space left of
the table of contents) and is centred. Narrower tables and figures are centred in the column.
The capture uses the cream theme.

[![Cream preview in Auto width: a narrow text column with a wide table and a wide figure breaking out of it, centred](images/readme/margin-break-cream.png)](images/readme/margin-break-cream.png)

## PlantUML Diagrams

`plantuml` fences and `{plantuml}` directives are drawn by the PlantUML engine bundled with the
extension (the official JavaScript build, `@plantuml/core`). It needs no Java, starts no process
and sends nothing over the network, so it also works in Restricted Mode. The diagrams follow the
preview theme (light or dark), and the bundled `!theme` library and OpenIconic `<&icon>` sprites
are available. Layouts use PlantUML's own Smetana engine instead of Graphviz, so class or
component diagrams can be placed slightly differently than with the JAR.

A diagram can be written in the document or kept in its own file:

````markdown
```plantuml
@startuml
!include styles/common.puml
Alice -> Bob: hello
@enduml
```

```{uml} diagrams/flow.puml
```
````

`{uml} path.puml` is the sphinxcontrib-plantuml directive; `{plantuml} path.puml` without a body
does the same. Directive options such as `:caption:` are accepted but not shown. The extension reads
the file with the rules of `{include}`: a path relative to the document, inside the workspace (only
the document's folder and below in Restricted Mode), at most 5 MiB. A missing file or a path
outside those folders shows a message instead of the diagram.

Local `!include`, `!include_many`, `!include_once` and `!includesub` files are read the same way.
A top-level include is relative to the document (or to the `.puml` file of a `{uml}` diagram), a
nested include to the file that contains it. A diagram reads at most 64 files, 8 levels deep,
1 MiB of text in all, and an include cycle stops with a message. The preview draws a diagram again
when one of its files changes on disk.

The built-in engine loads no URL and no library: a diagram with a URL include (`!includeurl`,
`!include https://...`), the standard library (`!include <C4/C4_Context>`), `!includedef`,
`!import`, `!theme ... from` or emoji shows a message instead of a picture. For those, tick
`markdownOkfSchemaStudio.plantuml.useJar`: the preview then runs Java with `plantuml.jarPath`, or
the `plantuml` command from PATH when the path is empty, as before. The JAR runs only in a trusted
workspace, and it resolves `!include` lines itself.

If you already set `plantuml.jarPath`, the preview now uses the built-in engine until you tick
`plantuml.useJar`; your path is kept and used again as soon as you do.

## Review Comments

A file named like the document with `.comments.json` instead of its extension, for example
`notes.comments.json` next to `notes.md`, holds review comment threads. The preview highlights the
quoted text of every thread, in preview and in edit mode; when the quote cannot be found in the
block, a small badge marks the block instead. Click a highlight or a badge to read the thread in a
popover: author, date, the comments as plain text, and a "Resolved" note for closed threads
(dimmed). Code, diagrams, math and the properties table are never highlighted. A file that is not
valid is ignored with a warning and is never overwritten.

To start a thread, select text in the preview: a small **Comment** button appears next to the
selection (or press Cmd+Alt+M on macOS, Ctrl+Alt+M elsewhere). Write the comment in the box and
press **Save** (Cmd/Ctrl+Enter); Escape cancels. The thread is saved in the comments file, which is
created when it does not exist. A selection that spans several blocks is anchored from the first
block to the end of the last one. To answer, open a thread and use its reply box. The button is not
shown while a block editor is open, over code or the properties table, or in a read-only preview
(untrusted workspace), where adding comments is refused. The name stored with a comment is the
`comments.authorName` setting, else your Git `user.name`, else your operating system user name.

A thread popover also has **Resolve** (then **Reopen**) and **Delete**; Delete asks "Delete
thread?" with Yes and No in the popover, and deleting the last thread keeps the file with an empty
list. A thread whose block and quote can no longer be found is never dropped: it is listed under
**Orphaned comments** at the end of the preview, with its quote, and you can open it from there
to resolve or delete it. Read-only previews show neither button.

Threads follow the text. Edits move them in memory, and the moved lines are written to the comments
file when you save the document (never while typing, never creating a file). When the document is
opened or changed outside the editor, each quote is searched again, near its old place first; a
match that is not clear is not guessed, the thread becomes orphaned. Renaming a document renames
its comments file too, unless one with the new name exists.

```json
{
  "version": 1,
  "document": "notes.md",
  "threads": [
    {
      "id": "t1",
      "anchor": { "line": 3, "endLine": 3, "quote": "second paragraph", "prefix": "The ", "suffix": " has" },
      "resolved": false,
      "createdAt": "2026-10-21T10:00:00Z",
      "comments": [
        { "id": "c1", "author": "Ada", "createdAt": "2026-10-21T10:00:00Z", "body": "Why this?" }
      ]
    }
  ]
}
```

## See It In Use

These captures are real Studio views from the end-to-end campaign. The fleet-dispatch document
shows Markdown source beside nested MyST admonitions, a Mermaid flowchart, and a captioned SVG
figure. The second capture shows the edit hover affordance.

[![Fleet-dispatch Markdown source beside a white Studio preview with nested MyST admonitions, a Mermaid flowchart, and a captioned SVG figure](images/38-edit-mode-remembered.png)](images/38-edit-mode-remembered.png)

[![The Studio edit affordance revealed by hovering over rendered content](images/21-edit-hover.png)](images/21-edit-hover.png)

## Install

Install **Markdown OKF-Schema Studio** from the
[VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=GaetanSemet.markdown-okf-schema-studio),
or open the Extensions view in VS Code, search for `Markdown OKF-Schema Studio`, and select
**Install**.

### Open Studio

Use **Open With...** on a Markdown tab and select **Markdown OKF-Schema Studio**.

[![Studio opened as the custom editor for a Markdown file](images/readme/open-with-editor.png)](images/readme/open-with-editor.png)

For a side-by-side source and preview, select the book icon in the editor title bar or run
**Markdown OKF-Schema Studio: Open Preview to Side** from the Command Palette.

| Editor title action | Source and preview |
| --- | --- |
| [![Open Preview to Side action in the VS Code editor title](images/readme/open-preview-to-side.png)](images/readme/open-preview-to-side.png) | [![Markdown source beside the Studio preview](images/readme/preview-beside-editor.png)](images/readme/preview-beside-editor.png) |

Every image in this README opens at full size when selected.

## Open Kownledge Format

[Open Knowledge Format (OKF)](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
is an open standard for knowledge documents: readable Markdown content plus structured YAML
frontmatter. [OKF-Schema](https://github.com/gsemet/okf-schema) extends that model with JSON Schema
validation, so a bundle can define which frontmatter fields exist, which values are valid, and which
fields are required.

Studio makes that metadata comfortable to use. It turns frontmatter into a properties table, shows
schema descriptions and diagnostics beside each field, and lets you edit typed values without
manually navigating raw YAML. The Markdown body remains a live, editable MyST preview.

### Linked-File Annotations

OKF-Schema supports `x-okf-link` annotations in the JSON Schema that allows Studio to display metadata from the resolved target file:

```yaml
x-okf-link:
  resolution: filename-stem
  syntax: plain
  tooltip_shows_fields: [description]
  preview_shows_fields: [description]
```

`tooltip_shows_fields` adds named frontmatter fields to a link's hover tooltip.
`preview_shows_fields` displays their values beside the link. Missing fields are omitted; string,
number, and boolean fields are supported.

<!-- TODO: add frontmatter example here -->

For source and test evidence, enable the first matching marker's one-based line number:

```yaml
x-okf-link:
  resolution: project-relative
  syntax: plain
  basename_marker: '@implements_req'
  id_marker: id
  show_line_number: true
```

Use `@tests_req` for test evidence. `id_marker` selects the current document's identity field;
without it, marker matching uses the current document's filename stem.

## Sphinx Projects

When the Markdown file sits inside a Sphinx project (a `conf.py` in its folder or any folder up to
the workspace root; failing that, the single `conf.py` among `docs/`, `doc/`, `sphinx/`,
`source/` and `docs/source/` at the workspace root) that loads `myst_parser` or `myst_nb`, the preview compares the syntax you use
with `myst_enable_extensions`. Syntax whose extension is missing (`colon_fence`, `dollarmath`,
`amsmath`, `deflist`, `fieldlist`, `tasklist`, `strikethrough`, `substitution`, `attrs_inline`,
`html_image`, `html_admonition`) gets one warning per extension, with the first line using it.
The warnings are listed in the Problems view and underlined in the editor. When the page renders,
a one-line banner at the top of the preview counts them ("2 MyST syntax warnings from conf.py"),
with an **Open Problems** button and a close button. A closed banner stays closed for that document
until VS Code restarts, and comes back when the set of warnings changes. It takes no room in the
page, so showing or closing it moves nothing. In Restricted Mode the Problems view does not list
them: the banner shows them in its tooltip instead.
The file is only read, never run: if a list is computed rather than written as plain strings, or
there is no `conf.py`, nothing is reported. The preview itself renders the same either way.

## Settings

The settings are available under **Markdown OKF-Schema Studio** in VS Code settings, in five
categories: Preview, Editing, Frontmatter, Comments and PlantUML. A new workspace starts with the
cream preview theme, the floating toolbar collapsed to its first row and the GFM palette. The
theme and the toolbar state are built-in starting points, not settings; the palette follows
`editing.defaultPaletteMode`. A choice you make in the preview is remembered per workspace.

**Preview**

- `preview.maxContentWidth` (default 960): width of the text column in pixels; `0` is full width.
  The Width button on the third toolbar row switches between Margin (this column), Auto (tables,
  figures, images and code blocks wider than the column break out, centred, up to the free pane width;
  narrower tables and figures are centred) and Full width;
  with the setting at `0` all three look the same. The choice is remembered per workspace.
  The TOC button next to it shows or hides a column of h1-h4 headings on the right (off by default,
  remembered per workspace, hidden on panes narrower than 760 px); click an entry to scroll there,
  fold sections with the twisty; the current section is highlighted.
- `preview.stickyHeadingDepth` (default 3): heading levels pinned at the top while scrolling (1-6).
- `preview.incrementalUpdates` (default on): update changed parts in place; off reloads the page.
- `preview.showComments` (default on): show HTML comments as gray chips; click one (or press Enter
  or Space on it) to open the comment text in a box under the line. Each chip is labelled
  "comment". The Comments button of the toolbar hides and shows them in both preview and edit mode
  (remembered per workspace, shown by default). Off here hides the gray chips and the green thread chips in open
  previews at once and removes that button. TODO chips always show.
- `preview.showIncomingChanges` (default on): mark blocks changed since the last Git commit
  (unsaved edits included) with a green bar on the left, like the editor gutter. Needs the built-in
  Git extension; files that are not in Git, and untrusted workspaces, show nothing. Off turns the
  marks, and their toolbar toggle, off.
- `preview.scrollPreviewWithEditor` (default on): editor scrolling moves the preview; the toolbar
  anchor button overrides it per panel.
- `preview.scrollEditorWithPreview` (default on): preview scrolling and clicks reveal the source.
- `preview.markEditorSelection` (default off): mark the cursor's source line in the preview.
- `preview.doubleClickToSwitchToEditor` (default off): double-click rendered content to reveal its
  source; needs `scrollEditorWithPreview`.

**Editing**

- `editing.defaultPaletteMode` (default `gfm`): buttons the edition palette shows in a workspace
  that has not chosen yet: `strict` (plain Markdown), `gfm` (strict plus GitHub Flavored Markdown)
  or `myst` (GFM plus MyST). The select at the start of the palette changes it and the choice is
  remembered per workspace; it changes the buttons only, never the rendering.

**Frontmatter**

- `frontmatter.propertiesTable` (default on): show the properties table above the preview.
- `frontmatter.strictAdditionalProperties` (default off): warn on fields the OKF schema omits.
- `frontmatter.bundleRoot` and `frontmatter.projectRoot` (default empty): roots for `x-okf-link`
  values; relative paths resolve from the first workspace folder. Empty bundle root: the schema
  folder's parent if it holds the document and an `index.md` or `log.md`; empty project root: the
  git root inside the workspace; otherwise such links cannot be resolved.
- `frontmatter.allowOutsideWorkspaceLinks` (default off): resolve document-relative links that
  leave the workspace.

**Comments**

- `comments.authorName` (default empty): the name stored with the review comments you write in the
  preview. Empty uses your Git `user.name`, then your operating system user name.

**PlantUML**

- `plantuml.useJar` (default off): off, PlantUML diagrams are drawn by the built-in engine, with
  no Java and no network; on, by Java with `plantuml.jarPath` or by `plantuml` from PATH (trusted
  workspaces only). See [PlantUML Diagrams](#plantuml-diagrams).
- `plantuml.jarPath` (default empty): path to `plantuml.jar`, relative to the workspace folder;
  empty uses `plantuml` from PATH. Used only when `plantuml.useJar` is on.

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, validation, packaging, and release
evidence procedures.
