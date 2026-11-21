# Known Limitations

## Release Validation Blockers

Task 07 ends with `NO RELEASE` because two required observations were unavailable in this execution
environment:

- The installed VSIX was installed in the default profile and the current VS Code window was
  reloaded, but macOS display capture failed with `could not create image from display`. System
  Events exposed zero Code windows, so the rendered current-window panel could not be inspected.
- VoiceOver speech output was not executed. The VoiceOver launch agent reported `state = not
  running`, and Chromium semantic accessibility checks cannot establish what macOS VoiceOver says.

The automated extension-host and browser checks remain useful development evidence, but they do not
close those release-specific manual checks.

## Product Boundary

The extension is an opt-in preview of a Markdown document in this workspace, with in-place editing. The side
panel follows the active editor; the optional **Open With...** editor stays on its selected file.
It does not claim:

- full P01-P24 stock-preview parity;
- multiple simultaneous MyST previews;
- live comparison against another document or native source/version diff editor integration;
- rendered-block editing or an Obsidian-like editor;
- book-wide preview, bibliography regeneration, or non-HTML Sphinx builders; or
- marketplace publication.

In the live preview, raw HTML table styles accept a sanitized subset: text and background colors
plus linear gradients on table elements. Arbitrary inline CSS and `<style>` blocks remain blocked.

Notebook outputs referenced from MyST, such as `![](#tbl:data-cars)` inside a
`{table}` directive, require the notebook/project build context. The active-file
preview displays a warning placeholder for these references; it does not execute
notebooks or hydrate their outputs. File includes are read only through the preview's
resource policy, which depends on trust. In a trusted workspace, an include may point to any
file inside the workspace folder. In Restricted Mode (untrusted workspace) or for a standalone
file, the preview stays editable but its reads are narrowed: the resource root is the folder of
the document, so an include inside that folder (subfolders included) is read and shown, and an
include outside it is refused with a warning. Schema files are not looked up, the PlantUML Java
engine is off and the citation list of the palette is disabled with its reason.

In Restricted Mode (or for a standalone file) the preview still shows images (png, jpg, jpeg, gif,
webp, svg) from the folder of the document and from the workspace folder, but not from a workspace
folder that is your home folder or above, and never from a dot-directory. The rule goes by the file
extension, not by the element that loads it.

`{code-cell}` input renders with its line-numbering and line-emphasis options, but the active-file
preview does not execute it. Its output is replaced by a warning placeholder and requires a full
notebook/project build.

Standalone, balanced fake context tags with lowercase simple names containing letters, digits, hyphens,
or underscores render as inert admonition-like panels. Standard HTML names remain ordinary HTML, so
`<fullcycle-model-allocation>`, `<context>`, and `<model_allocation>` are supported while `<div>`,
`<details>`, `<summary>`, `<table>`, and `<script>` are not reinterpreted. Titles are shown literally
and the body uses normal Markdown parsing, including a fenced code block immediately after the opening
tag. Attributes, self-closing tags, malformed boundaries, declarations, and complex XML are not
interpreted; use a fenced `xml` block when the document contains real XML.

In the VS Code Agents window, only local agent sessions are supported: the preview is editable for
files of a session whose working folder is on this machine. Remote or cloud agent sessions, whose
folders are not local `file` folders, are not supported.

The stock Markdown preview and its `markdown.*` settings remain separate. Opening a Markdown file
activates the extension, which then starts only its registrations, the editor association
migration and the opening watcher; the preview engine, the watchers and the diagnostics start with the first Studio preview.
Other files do not activate it.

Fenced `diff` and `patch` blocks are supported as visualization-only rendered code. Their literal
text and leading `+` or `-` markers are preserved; the preview does not calculate a comparison,
offer per-line navigation, or change the separate native source/version diff experience.

## Opening Files

Studio opens a Markdown file in place of a text editor that VS Code already showed, so what the
settings `open.searchResultsInStudio` and `open.markdownFilesInStudio` promise has these limits,
measured on VS Code 1.147.0 on Windows:

- The raw text can flash: a first opening shows the text editor for about 70 ms, then an empty
  group for about 370 ms, before Studio.
- A Studio tab that is pinned or is a preview tab does not move to a line when a search result or
  Quick Open `file.md:40` targets it: the line and the marker are lost, the Studio tab stays where it is.
- **Open as Text** on a document with unsaved changes asks to save first.
- **Open With... > Text Editor** is replaced by Studio while `open.markdownFilesInStudio` is on. Use
  **Open as Text** or **Reopen Editor With... > Text Editor**, which stay text.
- The first Markdown file you open, the one that activates the extension, can open as text: the
  watcher cannot tell it from a tab restored with the window. Reopen it, or open any later file.

## Installation Boundary

The VSIX is installed into a VS Code profile, not into one workspace. The default install command is
`just vscode-markdown-okf-schema-studio-install`; a named profile is selected with
`just vscode-markdown-okf-schema-studio-install "Profile Name"`. The recipe cannot reload an already-open
window. After an update, reload the current window and exercise the command on a real Markdown file.
When the `code` CLI is unavailable, use the reported VSIX path with **Install from VSIX...** in the
Extensions view.
