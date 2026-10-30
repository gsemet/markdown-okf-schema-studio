---
type: StRS
id: StRS-MDOKFSTUDIO-PALETTE-015
uuid: 81906b3b-6930-49c4-a729-8cb3aa5ae697
title: A writer runs any palette command from an accessible slash menu
description: When a writer types a slash at the start of a line or after a space
  in a block text box, or in a table cell editor, the Studio SHALL open a menu
  of the commands of the palette for the current mode, narrow them as the writer
  types, run the chosen command from the keyboard or the mouse, and keep the
  menu visible next to the caret inside the pane and announced to assistive
  technology.
project: markdown-okf-schema-studio
scope: palette-slash
req_lifecycle: approved
status: stable
approved_by: gaetan@xeberon.net
approved_at: '2026-10-28T00:00:00Z'
verified:
  by: human:gaetan@xeberon.net
  at: '2026-10-28T00:00:00Z'
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I get a command menu from the slash without it getting
  in the way of ordinary text such as paths, URLs and code, type a few letters
  after the slash and press Enter to run a command without leaving the keyboard,
  see the menu where I type with a screen reader telling me what it offers, and
  in a table cell am offered only commands that can live in a cell.
derived_by:
- SwRS-MDOKFSTUDIO-PALETTE-039
- SwRS-MDOKFSTUDIO-PALETTE-052
- SwRS-MDOKFSTUDIO-PALETTE-232
- SwRS-MDOKFSTUDIO-PALETTE-238
- SwRS-MDOKFSTUDIO-PALETTE-240
- SwRS-MDOKFSTUDIO-PALETTE-242
- SwRS-MDOKFSTUDIO-PALETTE-252
- SwRS-MDOKFSTUDIO-PALETTE-256
- SwRS-MDOKFSTUDIO-PALETTE-263
- SwRS-MDOKFSTUDIO-TABLE-085
default_owner_email: gaetan@xeberon.net
---

## A writer runs any palette command from an accessible slash menu

### Normative behavior

When a writer types a slash at the start of a line or after a space in a block text box, or in a table cell editor, the Studio SHALL open a menu of the commands of the palette for the current mode, narrow them as the writer types, run the chosen command from the keyboard or the mouse, and keep the menu visible next to the caret inside the pane and announced to assistive technology.

### Preserved stakeholder intent

Writers expect the slash menu to appear only where they mean a command, and not for a slash inside a word, an address, code or a paste.

As a writer, I get a command menu from the slash without it getting in the way of ordinary text such as paths, URLs and code, type a few letters after the slash and press Enter to run a command without leaving the keyboard, see the menu where I type with a screen reader telling me what it offers, and in a table cell am offered only commands that can live in a cell.

### Rationale and constraints

- A slash followed by a space, or a second slash, ends the command and stays plain text.
- The menu closes when the writer leaves the text, moves the caret out of the command or presses Escape; the typed text stays.
- Commands can be found by their name or by short alternative names.
- A loose match never swallows the Enter or Tab key the writer meant as text.
- A command is run as its palette button is, in one undoable step.
- In forced-colours mode the highlighted command stays readable.
- The cell menu lists only the commands that make sense in a table cell and follows the palette mode like the block menu does.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-PALETTE-039](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-039.md): A palette action edits in one undo step or leaves the text unchanged and says why
  - [SwRS-MDOKFSTUDIO-PALETTE-052](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-052.md): Bulleted list toggles a dash prefix, from the slash menu only
  - [SwRS-MDOKFSTUDIO-PALETTE-232](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-232.md): A slash opens the slash menu only where a command is meant
  - [SwRS-MDOKFSTUDIO-PALETTE-238](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-238.md): The slash menu lists the palette commands of the mode and scope
  - [SwRS-MDOKFSTUDIO-PALETTE-240](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-240.md): The slash query ranks matches and leaves loose matches to the text
  - [SwRS-MDOKFSTUDIO-PALETTE-242](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-242.md): Keys and clicks drive the slash menu and run the lit command
  - [SwRS-MDOKFSTUDIO-PALETTE-252](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-252.md): The slash menu is an announced listbox of text-only rows
  - [SwRS-MDOKFSTUDIO-PALETTE-256](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-256.md): The slash menu stays next to the caret inside the viewport
  - [SwRS-MDOKFSTUDIO-PALETTE-263](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-263.md): Slash commands have short alternative names
  - [SwRS-MDOKFSTUDIO-TABLE-085](../../swrs/table-editing/SwRS-MDOKFSTUDIO-TABLE-085.md): The table bar's cell group formats the cell text
<!-- okf:links:end -->
