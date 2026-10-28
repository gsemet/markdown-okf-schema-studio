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
lifecycle: approved
approved_by: gaetan@xeberon.net
approved_on: 2026-10-28
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
