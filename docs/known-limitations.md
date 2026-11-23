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
- live comparison against another document or a rendered diff: the side preview opens next to a text diff (title
  button, command, following and scroll with the file's side) and shows the real file, never the diff; it does
  not follow the multi-file diff editor nor the merge editor (3-way merge), because the VS Code API gives them
  no tab input class: open the file in a text editor or in the single-file diff instead;
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
activates the extension, which then starts only its registrations and the one-time restore of the
editor association (version 1.11.0 settings); the preview engine, the watchers and the diagnostics start with the first Studio preview.
Other files do not activate it.

Fenced `diff` and `patch` blocks are supported as visualization-only rendered code. Their literal
text and leading `+` or `-` markers are preserved; the preview does not calculate a comparison,
offer per-line navigation, or change the separate native source/version diff experience.

## Opening Files

A Markdown file opens as text; Studio opens only when you choose it (Open With, the Open Preview to
Side button) or when you associate `*.md` with Studio in `workbench.editorAssociations`. With that
association these limits apply, measured on VS Code 1.143 on Windows:

- A jump to a line (a search result, Quick Open `file.md:40`, a link) opens Studio at the top of the
  file, and the side preview marks nothing: VS Code opens the custom editor and drops the selection.
- A jump to a file that is already open as text keeps that text tab and opens a Studio tab beside it.
- The side preview marks the line of every move VS Code reports as a command with one selection, not
  only a search result or a link: Go to Symbol and Find next can mark it too if VS Code reports
  them as a command (not verified: the real-window trial recorded no selection change for Go Back or
  an API selection).
- Jumping to the very same line within one second of a line Studio itself opens (**Open as Text**, a
  link followed in the side preview) is read as Studio's own selection and marks nothing.
- A jump on a diff side marks the line of the real file by line number: a diff that adds or removes
  lines before the target can mark a line that is not the one you clicked on.
- **Open as Text** on a document with unsaved changes asks to save first.

## Installation Boundary

The VSIX is installed into a VS Code profile, not into one workspace. The default install command is
`just vscode-markdown-okf-schema-studio-install`; a named profile is selected with
`just vscode-markdown-okf-schema-studio-install "Profile Name"`. The recipe cannot reload an already-open
window. After an update, reload the current window and exercise the command on a real Markdown file.
When the `code` CLI is unavailable, use the reported VSIX path with **Install from VSIX...** in the
Extensions view.
