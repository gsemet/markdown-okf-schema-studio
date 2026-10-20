# Markdown OKF-Schema Studio

![Markdown OKF-Schema Studio logo](images/logo.png)

[![CI](https://github.com/gsemet/markdown-okf-schema-studio/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/gsemet/markdown-okf-schema-studio/actions/workflows/ci.yml) [![Latest release](https://img.shields.io/github/v/release/gsemet/markdown-okf-schema-studio?display_name=tag&sort=semver)](https://github.com/gsemet/markdown-okf-schema-studio/releases) [![License](https://img.shields.io/github/license/gsemet/markdown-okf-schema-studio)](LICENSE)

[VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=GaetanSemet.markdown-okf-schema-studio) | [Screenshot report/gallery](https://gsemet.github.io/markdown-okf-schema-studio/gallery.html) | [Reports index](https://gsemet.github.io/markdown-okf-schema-studio/reports/)

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

- **MyST rendering:** directives, admonitions, tables, math, Mermaid, PlantUML, images, media,
  anchors, and permitted external links render in the preview.
- **OpenKnowledge Format and OKF-Schema properties:** frontmatter field can be shown as a schema-aware properties table,
  with validation diagnostics, enum controls, typed scalar editors,
  and YAML editors for arrays and objects.
- **Inline editing:** click a rendered block to edit its source Markdown. Save with Done
  or Cmd/Ctrl+Enter; Cancel or Escape restores the original block. Tables and frontmatter support
  keyboard navigation, row creation, and focused field editing.
  In a block text box, Cmd/Ctrl+B toggles bold, Cmd/Ctrl+I toggles italic, and Ctrl+/ (or Cmd+/)
  toggles a `<!-- TODO: … -->` comment on the current or selected lines; each is one undo step.
  An edition palette above the text box adds headings, strikethrough, code blocks with a language,
  blockquotes and horizontal rules; in GitHub (GFM) and MyST mode it also adds GitHub alerts with a
  type list, task-list checkboxes and HTML tables.
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

Checkboxes in task lists, paragraphs, and table cells are editable in place. In an untrusted
workspace they remain read-only until the workspace is trusted.

## Preview Themes

The theme button in the floating preview toolbar cycles through the current VS Code theme, dark,
white, and cream. Cream is a warm, low-glare paper palette with clay-coloured links. The choice is
remembered per workspace. These three captures use the same document, viewport, and scroll state.

| Dark | White | Cream |
| --- | --- | --- |
| [![Handbook title and admonitions in the dark preview theme](images/readme/theme-dark.png)](images/readme/theme-dark.png) | [![Handbook title and admonitions in the white preview theme](images/readme/theme-white.png)](images/readme/theme-white.png) | [![Handbook title and admonitions in the cream preview theme](images/readme/theme-cream.png)](images/readme/theme-cream.png) |

## Wide Tables and Figures

With the Width button on Auto, the text stays in a comfortable narrow column while a table or a
figure wider than the column breaks out of it, takes the width it needs (up to the space left of
the table of contents) and is centred. Narrower tables and figures are centred in the column.
The capture uses the cream theme.

[![Cream preview in Auto width: a narrow text column with a wide table and a wide figure breaking out of it, centred](images/readme/margin-break-cream.png)](images/readme/margin-break-cream.png)

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

## Linked-File Annotations

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
The file is only read, never run: if a list is computed rather than written as plain strings, or
there is no `conf.py`, nothing is reported. The preview itself renders the same either way.

## Settings

The preview settings are available under **Markdown OKF-Schema Studio** in VS Code settings.

- `preview.maxContentWidth` (default 960): width of the text column in pixels; `0` is full width.
  The Width button on the second toolbar row switches between Margin (this column), Auto (tables,
  figures, images and code blocks wider than the column break out, centred, up to the free pane width;
  narrower tables and figures are centred) and Full width;
  with the setting at `0` all three look the same. The choice is remembered per workspace.
  The TOC button next to it shows or hides a column of h1-h4 headings on the right (off by default,
  remembered per workspace, hidden on panes narrower than 760 px); click an entry to scroll there,
  fold sections with the twisty; the current section is highlighted.
- `preview.stickyHeadingDepth` (default 3): heading levels pinned at the top while scrolling (1-6).
- `preview.showComments` (default on): show HTML comments as gray chips; click one (or press Enter
  or Space on it) to open the comment text in a box under the line. Off hides the gray chips in
  open previews at once. TODO chips always show.
- `preview.showIncomingChanges` (default on): mark blocks changed since the last Git commit
  (unsaved edits included) with a green bar on the left, like the editor gutter. Needs the built-in
  Git extension; files that are not in Git, and untrusted workspaces, show nothing. Off turns the
  marks, and their toolbar toggle, off.
- `preview.incrementalUpdates` (default on): update changed parts in place; off reloads the page.
- `preview.scrollPreviewWithEditor` (default on): editor scrolling moves the preview; the toolbar
  anchor button overrides it per panel.
- `preview.scrollEditorWithPreview` (default on): preview scrolling and clicks reveal the source.
- `preview.markEditorSelection` (default off): mark the cursor's source line in the preview.
- `preview.doubleClickToSwitchToEditor` (default off): double-click rendered content to reveal its
  source; needs `scrollEditorWithPreview`.
- `editing.defaultPaletteMode` (default `myst`): buttons the edition palette shows in a workspace
  that has not chosen yet: `strict` (plain Markdown), `gfm` (strict plus GitHub Flavored Markdown)
  or `myst` (GFM plus MyST). The select at the start of the palette changes it and the choice is
  remembered per workspace; it changes the buttons only, never the rendering.
- `frontmatter.propertiesTable` (default on): show the properties table above the preview.
- `frontmatter.strictAdditionalProperties` (default off): warn on fields the OKF schema omits.
- `frontmatter.bundleRoot` and `frontmatter.projectRoot` (default empty): roots for `x-okf-link`
  values; relative paths resolve from the first workspace folder. Empty bundle root: the schema
  folder's parent if it holds the document and an `index.md` or `log.md`; empty project root: the
  git root inside the workspace; otherwise such links cannot be resolved.
- `frontmatter.allowOutsideWorkspaceLinks` (default off): resolve document-relative links that
  leave the workspace.
- `plantuml.jarPath` (default empty): path to `plantuml.jar`, relative to the workspace folder;
  empty uses `plantuml` from PATH.

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, validation, packaging, and release
evidence procedures.
