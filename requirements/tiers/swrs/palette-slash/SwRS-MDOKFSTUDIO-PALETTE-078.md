---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-078
uuid: fb00c5fb-20a2-44ab-9583-2427aa3071f1
title: The Table button opens a 9 by 9 size grid and inserts a table of the
  chosen size
description: When the writer presses Table, the extension SHALL open a popover
  with a 9 by 9 grid of 81 cells, each named by its row and column, and a label
  that reads Table size until a cell is lit, and insert the table of the size
  the writer chooses by pointer or by keyboard as one undoable step, returning
  the focus to the text box.
project: markdown-okf-schema-studio
scope: palette-slash
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-007
depends_on:
- SwRS-MDOKFSTUDIO-PALETTE-031
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/editPalette.ts
- src/page/modules/editPalettePopovers.ts
tested_in_files:
- test/page/modules/editPalette.test.ts
- test/page/runtimeEditPalette.test.ts
default_owner_email: gaetan@xeberon.net
---

## The Table button opens a 9 by 9 size grid and inserts a table of the chosen size

### Normative behavior

When the writer presses Table, the extension SHALL open a popover with a 9 by 9 grid of 81 cells, each named by its row and column, and a label that reads Table size until a cell is lit, and insert the table of the size the writer chooses by pointer or by keyboard as one undoable step, returning the focus to the text box.

### Scenario (nominal): Opening

- GIVEN an open block editor
- WHEN the writer presses Table
- THEN the grid shows 81 cells and the label reads Table size

### Scenario (nominal): Hovering lights the rectangle

- GIVEN the grid open
- WHEN the pointer is over the cell of row 3 and column 4
- THEN the cells from the top left cell to that cell are lit, 12 of the 81 cells, and the label reads 3 × 4

### Scenario (nominal): Cell click

- GIVEN the grid open
- WHEN the writer clicks the cell of row 3 and column 4
- THEN the table of SwRS-MDOKFSTUDIO-TABLE-106 is inserted in one undo step, the grid closes, the focus returns to the text box and the editor stays open

### Scenario (nominal): Arrows and Enter

- GIVEN the grid open and no cell lit
- WHEN the writer presses ArrowRight twice, ArrowDown and Enter in the text box
- THEN the first arrow lights 1 by 1, the next ones grow it to 2 by 2 and a table of that size is inserted

### Scenario (refusal): Choice without a cell

| Input | Outcome |
| --- | --- |
| The grid is open and the writer clicks the label | Nothing is inserted and the grid stays open |
| The grid is open, no cell is lit and the writer presses Enter | Nothing is chosen and the grid stays open |

### Scenario (boundary): Pointer, range and cell editor

| Input | Outcome |
| --- | --- |
| The pointer moves from a cell onto the label while a rectangle is lit | The lit rectangle does not change |
| The arrow keys press against the edge | The lit rectangle never leaves the range 1 to 9 on either axis |
| An open table cell editor | The formatting group offers no Table button (see SwRS-MDOKFSTUDIO-TABLE-106) |

### Related requirements

- SwRS-MDOKFSTUDIO-PALETTE-031: the popover opens inside the frame, one at a time, and Escape closes the grid first.
- SwRS-MDOKFSTUDIO-TABLE-106: the table that the Table action inserts.

### Verification notes

- Method: test/page/modules/editPalette.test.ts (T24: the Table button opens a 9 x 9 grid of 81 cells; hovering lights the rectangle from the top left and shows rows x columns; one click on a cell inserts the table, closes the grid and returns focus; a click that is not on a cell inserts nothing and keeps the grid; arrows move the highlight from the text box and Enter inserts; scenarios opening, hovering, cell click, arrows and Enter, choice without a cell, pointer and range)
- Method: test/page/runtimeEditPalette.test.ts (T24: the Table button opens the grid and hovering lights rows x columns and shows the size; one click on a grid cell inserts the table as one undo step and keeps the editor open; Escape closes the grid first, arrows and Enter drive it from the text box; scenarios opening, hovering, cell click, arrows and Enter)
- Method: visual scenarios palette-slash/v01-palette-popups-light-900 and palette-slash/v17-palette-wraps-narrow-dark-360 (3 by 4 lights 12 of 81 cells; scenario hovering lights the rectangle)
- Criteria: Each cell has the role menuitem and the accessible name rows times columns; the label has aria-live polite; a cell is lit when its row and column are both at or below the hovered ones; a hover over a non-cell element leaves the state unchanged; the action receives the argument rows x columns, for example 3x4; a click that is on no cell inserts nothing and leaves the grid open.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-007](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-007.md): A writer inserts links, images, figures, tables, colours and emoji through pickers
- Depends on:
  - [SwRS-MDOKFSTUDIO-PALETTE-031](SwRS-MDOKFSTUDIO-PALETTE-031.md): Palette popovers open in the frame, one at a time, and Escape or typing closes them
<!-- okf:links:end -->
