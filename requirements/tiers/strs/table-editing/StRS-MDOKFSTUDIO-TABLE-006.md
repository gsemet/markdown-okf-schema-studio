---
type: StRS
id: StRS-MDOKFSTUDIO-TABLE-006
uuid: 0d072fe2-90a8-479f-ad45-4023386f8c80
title: Tab, arrows and editing keys work in a table cell
description: When a writer presses Tab, Shift+Tab or an arrow key in a table
  cell editor, the Studio SHALL move the editor to the next cell in that
  direction, with Tab in the last cell adding a row, and for Home, End, undo,
  redo, select all or a wrapping marker act on the text of that cell only.
project: markdown-okf-schema-studio
scope: table-editing
lifecycle: proposed
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I move through a table with the keyboard, cell by cell,
  and add a row by pressing Tab in the last cell; I use the keys I know in a
  cell and they edit the cell, not the page or the source document.
derived_by:
- SwRS-MDOKFSTUDIO-TABLE-035
- SwRS-MDOKFSTUDIO-TABLE-044
- SwRS-MDOKFSTUDIO-TABLE-045
- SwRS-MDOKFSTUDIO-TABLE-046
- SwRS-MDOKFSTUDIO-TABLE-047
default_owner_email: gaetan@xeberon.net
---

## Tab, arrows and editing keys work in a table cell

### Normative behavior

When a writer presses Tab, Shift+Tab or an arrow key in a table cell editor, the Studio SHALL move the editor to the next cell in that direction, with Tab in the last cell adding a row, and for Home, End, undo, redo, select all or a wrapping marker act on the text of that cell only.

### Preserved stakeholder intent

Writers expect the keyboard to be enough to fill a table.

As a writer, I move through a table with the keyboard, cell by cell, and add a row by pressing Tab in the last cell; I use the keys I know in a cell and they edit the cell, not the page or the source document.

### Rationale and constraints

- Tab and Shift+Tab wrap across rows, the header row included; the arrow keys leave the cell only at the edge of its text, so the caret still moves inside the text.
- With no cell in the arrow direction the key falls to block-to-block navigation: the neighbouring block opens for editing.
- The arrow keys stay native with a selection, with Shift, Alt, Cmd or Ctrl held and during an IME composition.
- Home and End move the caret to the start or end of the cell text and do not scroll the page or a wide table.
- Undo, redo, select all, wrapping a selection with a marker and keeping handled keys away from VS Code work in a cell as in any text box of the block editor, and are specified there (see SwRS-MDOKFSTUDIO-BLOCK-069); keys the editor does not use, such as Ctrl+Tab, still reach VS Code.
