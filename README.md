# Markdown OKF-Schema Studio

Markdown OKF-Schema Studio is a schema-aware Markdown editor and live MyST preview for OKF
bundles, running inside VS Code. It is an opt-in editor: VS Code's normal Markdown editor and
preview remain available.

## Install

1. Download a `markdown-okf-schema-studio.vsix` file from the project release or your team's
   distribution.
2. Open the Extensions view in VS Code, select the **...** menu, choose **Install from VSIX...**,
   and select the file.
3. Reload VS Code when prompted.

The same installation can be started from a terminal when the VS Code `code` command is
available:

```text
code --install-extension markdown-okf-schema-studio.vsix --force
```

## Open A Preview

Open a Markdown file in a trusted workspace, then choose any of these entry points:

- Select the book icon in the Markdown editor title bar.
- Right-click a `.md` file in Explorer and choose **Open Preview to Side**.
- Run **Markdown OKF-Schema Studio: Open Preview to Side** from the Command Palette.
- Press `Cmd+K Shift+V` on macOS or `Ctrl+K Shift+V` elsewhere.
- Use **Open With...** on a Markdown tab and select **Markdown OKF-Schema Studio**.

The side preview follows the active Markdown editor. Its tab is named `Studio · <file name>` and
the preview group locks while it is following the document; unlock the group when you want files
to open there.

## What It Adds

- **MyST rendering:** directives, admonitions, tables, math, Mermaid, PlantUML, images, media,
  anchors, and permitted external links render in the preview.
- **OKF properties:** frontmatter is shown as a schema-aware properties table, with validation
  diagnostics, enum controls, typed scalar editors, and YAML editors for arrays and objects.
- **Inline editing:** click a rendered block to edit its source Markdown. Save with Done,
  Escape, or Cmd/Ctrl+Enter; Revert restores the original block. Tables and frontmatter support
  keyboard navigation, row creation, and focused field editing.
- **Linked evidence:** `x-okf-link` annotations can show target metadata and source line numbers
  for implementation and test evidence. Saved target files refresh their displayed metadata.
- **Source navigation:** relative links, wikilinks, heading fragments, and `#L42` fragments open
  through VS Code and select the corresponding source location.
- **Scroll synchronization:** the preview and source editor can follow one another, preserve the
  current reading position while rendering, and show configurable sticky headings.
- **Safe previews:** documents stay inside the workspace, local resources are checked before
  loading, and preview HTML is passed through a restrictive webview policy.

Checkboxes in task lists, paragraphs, and table cells are editable in place. In an untrusted
workspace they remain read-only until the workspace is trusted.

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
