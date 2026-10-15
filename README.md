# Markdown OKF-Schema Studio

[![CI](https://github.com/gsemet/markdown-okf-schema-studio/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/gsemet/markdown-okf-schema-studio/actions/workflows/ci.yml) [![Latest release](https://img.shields.io/github/v/release/gsemet/markdown-okf-schema-studio?display_name=tag&sort=semver)](https://github.com/gsemet/markdown-okf-schema-studio/releases) [![License](https://img.shields.io/github/license/gsemet/markdown-okf-schema-studio)](LICENSE)

[VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=GaetanSemet.markdown-okf-schema-studio) | [Screenshot report/gallery](https://gsemet.github.io/markdown-okf-schema-studio/gallery.html) | [Reports index](https://gsemet.github.io/markdown-okf-schema-studio/reports/)

Markdown OKF-Schema Studio is a Beautiful Markdown editor for VS Code
that supports several popular Markdown flavors and extension:
- [CommonMark](https://commonmark.org/)
- [GitHub Flavored Markdown (GFM)](https://github.github.com/gfm/)
- [Sphinx MyST](https://myst-parser.readthedocs.io/)
- [OKF](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
- [OKF-Schema](https://okf-schema.readthedocs.io/en/latest/)

## Install

- Run **Markdown OKF-Schema Studio: Open Preview to Side** from the Command Palette.

or

- Use **Open With...** on a Markdown tab and select **Markdown OKF-Schema Studio**.

or

- Open a Markdown file and select **Markdown OKF-Schema Studio - Markdown OKF-Schema Studio** from the editor title bar.

## What This Extension Adds

- **MyST rendering:** directives, admonitions, tables, math, Mermaid, PlantUML, images, media,
  anchors, and permitted external links render in the preview.
- **OKF-Schema properties:** frontmatter is shown as a schema-aware properties table,
  with validation diagnostics, enum controls, typed scalar editors,
  and YAML editors for arrays and objects.
- **Inline editing:** click a rendered block to edit its source Markdown. Save with Done
  or Cmd/Ctrl+Enter; Cancel or Escape restores the original block. Tables and frontmatter support
  keyboard navigation, row creation, and focused field editing.
- **Linked evidence:** [`x-okf-link`](https://okf-schema.readthedocs.io/en/latest/reference/okfreq-frontmatter.html)
  annotations can show target metadata and source line numbers for implementation
  and test evidence.
  Saved target files refresh their displayed metadata.
- **Source navigation:** relative links, heading fragments,
  through VS Code and select the corresponding source location.
- **Scroll synchronization:** the preview and source editor can follow one another, preserve the
  current reading position while rendering, and show configurable sticky headings.
- **Safe edition:** wrapping and non-destructive editing operation are applied
  to the raw source, for instance to avoid rewrapping
  the entire document unnecessarily.

Checkboxes in task lists, paragraphs, and table cells are editable in place. In an untrusted
workspace they remain read-only until the workspace is trusted.

## Preview Themes

The theme button in the floating preview toolbar cycles through four looks: the current VS Code
theme, dark, white, and cream (a warm, light, low-glare paper palette with clay-coloured links).
The choice is remembered per workspace.

## See It In Use

These captures are real Studio views from the end-to-end campaign, showing an edited paragraph,
the edit hover affordance, and a white-background preview with nested MyST admonitions,
a Mermaid flowchart, and a local SVG.

![A paragraph edited in the Studio side preview and committed to the Markdown buffer](images/01-paragraph-blur-commit.png)

![The Studio edit affordance revealed by hovering over rendered content](images/21-edit-hover.png)

![White Studio preview with nested MyST admonitions, a Mermaid flowchart, and an SVG fleet diagram](images/38-edit-mode-remembered.png)

## Linked-File Annotations

Schema `x-okf-link` annotations can display metadata from the resolved target file:

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

## Settings

The preview settings are available under **Markdown OKF-Schema Studio** in VS Code settings.

- `scrollPreviewWithEditor` and `scrollEditorWithPreview` control each scroll direction and default
  to `true`.
- `markEditorSelection` and `doubleClickToSwitchToEditor` are independent and default to `false`.
- `incrementalUpdates` keeps the page in place while the document changes and defaults to `true`.
- `maxContentWidth` and `stickyHeadingDepth` control the reading layout.
- Frontmatter settings control the properties table, strict additional-property warnings, and
  workspace-bound link resolution.

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, validation, packaging, and release
evidence procedures.
