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
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I format and insert Markdown from buttons or keyboard
  shortcuts without typing the syntax, of GitHub-style and of Sphinx and MyST
  documents, take any such edit back with a single undo, and am never left with
  half-written markup.
derived_by:
- SwRS-MDOKFSTUDIO-PALETTE-001
- SwRS-MDOKFSTUDIO-PALETTE-002
- SwRS-MDOKFSTUDIO-PALETTE-003
- SwRS-MDOKFSTUDIO-PALETTE-021
- SwRS-MDOKFSTUDIO-PALETTE-039
- SwRS-MDOKFSTUDIO-PALETTE-043
- SwRS-MDOKFSTUDIO-PALETTE-045
- SwRS-MDOKFSTUDIO-PALETTE-048
- SwRS-MDOKFSTUDIO-PALETTE-049
- SwRS-MDOKFSTUDIO-PALETTE-050
- SwRS-MDOKFSTUDIO-PALETTE-052
- SwRS-MDOKFSTUDIO-PALETTE-053
- SwRS-MDOKFSTUDIO-PALETTE-054
- SwRS-MDOKFSTUDIO-PALETTE-058
- SwRS-MDOKFSTUDIO-PALETTE-072
- SwRS-MDOKFSTUDIO-PALETTE-083
- SwRS-MDOKFSTUDIO-PALETTE-086
- SwRS-MDOKFSTUDIO-PALETTE-089
- SwRS-MDOKFSTUDIO-PALETTE-092
- SwRS-MDOKFSTUDIO-PALETTE-109
- SwRS-MDOKFSTUDIO-PALETTE-114
- SwRS-MDOKFSTUDIO-PALETTE-115
- SwRS-MDOKFSTUDIO-PALETTE-123
- SwRS-MDOKFSTUDIO-PALETTE-124
- SwRS-MDOKFSTUDIO-PALETTE-125
- SwRS-MDOKFSTUDIO-PALETTE-126
- SwRS-MDOKFSTUDIO-PALETTE-127
- SwRS-MDOKFSTUDIO-PALETTE-130
- SwRS-MDOKFSTUDIO-PALETTE-132
- SwRS-MDOKFSTUDIO-PALETTE-133
- SwRS-MDOKFSTUDIO-PALETTE-135
- SwRS-MDOKFSTUDIO-PALETTE-136
- SwRS-MDOKFSTUDIO-PALETTE-137
- SwRS-MDOKFSTUDIO-PALETTE-138
- SwRS-MDOKFSTUDIO-PALETTE-150
- SwRS-MDOKFSTUDIO-PALETTE-153
- SwRS-MDOKFSTUDIO-PALETTE-160
- SwRS-MDOKFSTUDIO-PALETTE-213
- SwRS-MDOKFSTUDIO-PALETTE-238
- SwRS-MDOKFSTUDIO-PALETTE-242
- SwRS-MDOKFSTUDIO-PALETTE-263
- SwRS-MDOKFSTUDIO-PALETTE-264
- SwRS-MDOKFSTUDIO-TABLE-111
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
