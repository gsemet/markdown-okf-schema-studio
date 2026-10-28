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
req_lifecycle: proposed
status: stable
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
- SwRS-MDOKFSTUDIO-PALETTE-004
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
- SwRS-MDOKFSTUDIO-PALETTE-265
- SwRS-MDOKFSTUDIO-PALETTE-266
- SwRS-MDOKFSTUDIO-TABLE-111
default_owner_email: gaetan@xeberon.net
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

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-PALETTE-001](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-001.md): The palette mode decides the button sets, in registry order
  - [SwRS-MDOKFSTUDIO-PALETTE-002](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-002.md): Every edit bar button shows the slide-in tooltip and the rule button a dashes icon
  - [SwRS-MDOKFSTUDIO-PALETTE-003](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-003.md): The Table of contents action inserts a \[TOC\] marker
  - [SwRS-MDOKFSTUDIO-PALETTE-004](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-004.md): Files dropped from the Explorer become links or images at the drop point
  - [SwRS-MDOKFSTUDIO-PALETTE-021](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-021.md): The palette is a toolbar above the editor that sticks over a tall editor
  - [SwRS-MDOKFSTUDIO-PALETTE-039](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-039.md): A palette action edits in one undo step or leaves the text unchanged and says why
  - [SwRS-MDOKFSTUDIO-PALETTE-043](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-043.md): The Heading list sets the heading level of the touched lines
  - [SwRS-MDOKFSTUDIO-PALETTE-045](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-045.md): Bold and Italic toggle their shared asterisk markers
  - [SwRS-MDOKFSTUDIO-PALETTE-048](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-048.md): Strikethrough toggles a double tilde pair
  - [SwRS-MDOKFSTUDIO-PALETTE-049](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-049.md): Blockquote prefixes the touched lines or removes one quote level
  - [SwRS-MDOKFSTUDIO-PALETTE-050](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-050.md): Horizontal rule puts three dashes between blank lines
  - [SwRS-MDOKFSTUDIO-PALETTE-052](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-052.md): Bulleted list toggles a dash prefix, from the slash menu only
  - [SwRS-MDOKFSTUDIO-PALETTE-053](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-053.md): Numbered list numbers the touched non-blank lines
  - [SwRS-MDOKFSTUDIO-PALETTE-054](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-054.md): The Code block list wraps lines in a fence of a highlighted language
  - [SwRS-MDOKFSTUDIO-PALETTE-058](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-058.md): The Colour picker wraps the selection in a safe colour span
  - [SwRS-MDOKFSTUDIO-PALETTE-072](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-072.md): The Emoji picker filters and inserts one pictograph
  - [SwRS-MDOKFSTUDIO-PALETTE-083](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-083.md): Cmd or Ctrl with B, I or K runs Bold, Italic or Link on the platform's command key
  - [SwRS-MDOKFSTUDIO-PALETTE-086](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-086.md): Cmd or Ctrl with the slash key matches the TODO shortcut on every platform
  - [SwRS-MDOKFSTUDIO-PALETTE-089](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-089.md): The Link button opens a labelled link panel prefilled from the selection
  - [SwRS-MDOKFSTUDIO-PALETTE-092](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-092.md): The link panel writes a safe inline Markdown link
  - [SwRS-MDOKFSTUDIO-PALETTE-109](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-109.md): The Image button inserts or replaces an image reference
  - [SwRS-MDOKFSTUDIO-PALETTE-114](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-114.md): Thread inserts an empty comment thread after the block with the author and the date
  - [SwRS-MDOKFSTUDIO-PALETTE-115](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-115.md): Alert inserts a GitHub alert and offers its type list
  - [SwRS-MDOKFSTUDIO-PALETTE-123](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-123.md): Checkbox toggles a task list box on the touched lines
  - [SwRS-MDOKFSTUDIO-PALETTE-124](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-124.md): Collapsible wraps the touched lines in a details element with a summary
  - [SwRS-MDOKFSTUDIO-PALETTE-125](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-125.md): Footnote adds a numbered reference and an empty definition at the end
  - [SwRS-MDOKFSTUDIO-PALETTE-126](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-126.md): Key wraps the selection in kbd tags, removes them, or inserts a sample
  - [SwRS-MDOKFSTUDIO-PALETTE-127](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-127.md): Admonition wraps lines in a colon fence of a chosen type
  - [SwRS-MDOKFSTUDIO-PALETTE-130](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-130.md): Custom writes a titled admonition with a class
  - [SwRS-MDOKFSTUDIO-PALETTE-132](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-132.md): Definition list makes the selection a term with a definition
  - [SwRS-MDOKFSTUDIO-PALETTE-133](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-133.md): Math wraps the selection in an inline, display or aligned equation
  - [SwRS-MDOKFSTUDIO-PALETTE-135](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-135.md): Subscript and Superscript wrap the selection in a role
  - [SwRS-MDOKFSTUDIO-PALETTE-136](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-136.md): Label writes one label line above the block
  - [SwRS-MDOKFSTUDIO-PALETTE-137](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-137.md): Dropdown writes a note admonition with the dropdown class
  - [SwRS-MDOKFSTUDIO-PALETTE-138](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-138.md): Key (MyST) wraps the selection in the kbd role
  - [SwRS-MDOKFSTUDIO-PALETTE-150](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-150.md): Figure writes a figure directive for a picked image
  - [SwRS-MDOKFSTUDIO-PALETTE-153](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-153.md): The figure form edits the options of a figure and checks them
  - [SwRS-MDOKFSTUDIO-PALETTE-160](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-160.md): Apply rewrites the figure directive in one minimal edit
  - [SwRS-MDOKFSTUDIO-PALETTE-213](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-213.md): Pasted rich text is converted by the host and replaces the selection in one step
  - [SwRS-MDOKFSTUDIO-PALETTE-238](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-238.md): The slash menu lists the palette commands of the mode and scope
  - [SwRS-MDOKFSTUDIO-PALETTE-242](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-242.md): Keys and clicks drive the slash menu and run the lit command
  - [SwRS-MDOKFSTUDIO-PALETTE-263](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-263.md): Slash commands have short alternative names
  - [SwRS-MDOKFSTUDIO-PALETTE-264](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-264.md): A pasted URL becomes a link, an autolink or an image in the block text box
  - [SwRS-MDOKFSTUDIO-PALETTE-265](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-265.md): The Full palette mode adds Vega-Lite and Vega chart commands
  - [SwRS-MDOKFSTUDIO-PALETTE-266](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-266.md): Cmd or Ctrl with the slash key toggles a plain HTML comment on the touched lines
  - [SwRS-MDOKFSTUDIO-TABLE-111](../../swrs/table-editing/SwRS-MDOKFSTUDIO-TABLE-111.md): Column alignment sets the colons of the caret's column
<!-- okf:links:end -->
