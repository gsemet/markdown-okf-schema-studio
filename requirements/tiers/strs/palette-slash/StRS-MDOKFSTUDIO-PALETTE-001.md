---
type: StRS
id: StRS-MDOKFSTUDIO-PALETTE-001
uuid: e1c6e2eb-734e-4a2e-84b8-b2208a944658
title: A writer formats and inserts Markdown, GFM and MyST constructs from the
  palette
description: When a writer edits a block in edit mode, the Studio SHALL offer an
  edition palette of buttons, in the GitHub Flavored Markdown and MyST modes
  with their constructs, that write Markdown formatting into the text in one
  undoable step, or leave the text unchanged and say why when the action cannot
  apply.
project: markdown-okf-schema-studio
scope: palette-slash
req_lifecycle: superseded
status: deprecated
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I format and insert Markdown from buttons or keyboard
  shortcuts without typing the syntax, of GitHub-style and of Sphinx and MyST
  documents, take any such edit back with a single undo, and am never left with
  half-written markup.
derived_by:
- SwRS-MDOKFSTUDIO-PALETTE-086
default_owner_email: gaetan@xeberon.net
superseded_by:
- StRS-MDOKFSTUDIO-PALETTE-019
- StRS-MDOKFSTUDIO-PALETTE-020
- StRS-MDOKFSTUDIO-PALETTE-021
---

## A writer formats and inserts Markdown, GFM and MyST constructs from the palette

### Normative behavior

When a writer edits a block in edit mode, the Studio SHALL offer an edition palette of buttons, in the GitHub Flavored Markdown and MyST modes with their constructs, that write Markdown formatting into the text in one undoable step, or leave the text unchanged and say why when the action cannot apply.

### Preserved stakeholder intent

Writers expect formatting buttons to act on the selection like in any editor, and to be told why when one cannot apply.

As a writer, I format and insert Markdown from buttons or keyboard shortcuts without typing the syntax, of GitHub-style and of Sphinx and MyST documents, take any such edit back with a single undo, and am never left with half-written markup.

### Rationale and constraints

- The buttons act on the selection or at the caret of the block text box; they only change the text, the preview renders it afterwards.
- The same actions are reachable from the slash menu and, for a few of them, from keyboard shortcuts.
- Which buttons are offered depends on the palette mode of the workspace.
- In the GitHub Flavored Markdown mode the buttons write alerts, task list boxes, collapsible sections, footnotes and keyboard keys; these buttons are also listed in the MyST mode, because the modes add up.
- In the MyST mode the buttons write admonitions, definition lists, math, subscripts, superscripts, labels, dropdowns, figures and keyboard keys; both the GitHub key button (HTML kbd element) and the MyST key button (kbd role) are offered, and nothing in the Studio tells which of the two to prefer.
- An invalid selection never produces an edit.
- A button, a slash command or a keyboard shortcut changes the text in one step that the undo key combination of the text box reverts; the edit is saved with the autosave of the editor like typing.
- The documented shortcuts are for bold, italic, link and TODO comment; the Studio runs the action and keeps the key away from the rest of VS Code.
- The command key is Cmd on macOS and Ctrl elsewhere; the typed letter wins over the physical key, so other keyboard layouts keep their cut, copy and paste.
- The tooltip of a button shows its shortcut.

### Superseded

This use case is split into three: the formatting buttons (StRS-MDOKFSTUDIO-PALETTE-019), the GitHub Flavored Markdown constructs (StRS-MDOKFSTUDIO-PALETTE-020) and the MyST constructs (StRS-MDOKFSTUDIO-PALETTE-021). The link panel is covered by StRS-MDOKFSTUDIO-PALETTE-007 and the link requirements it names.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-PALETTE-086](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-086.md): Cmd or Ctrl with the slash key matches the TODO shortcut on every platform
- Superseded by:
  - [StRS-MDOKFSTUDIO-PALETTE-019](StRS-MDOKFSTUDIO-PALETTE-019.md): A writer formats text with buttons and shortcuts
  - [StRS-MDOKFSTUDIO-PALETTE-020](StRS-MDOKFSTUDIO-PALETTE-020.md): A writer inserts GitHub Flavored Markdown constructs
  - [StRS-MDOKFSTUDIO-PALETTE-021](StRS-MDOKFSTUDIO-PALETTE-021.md): A writer inserts MyST constructs
<!-- okf:links:end -->
