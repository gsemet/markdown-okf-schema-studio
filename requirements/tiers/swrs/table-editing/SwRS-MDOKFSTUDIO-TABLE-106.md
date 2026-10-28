---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-106
uuid: ba0a58cd-426c-4217-9f71-3a3410cc1527
title: The Table action inserts a pipe table of the chosen size on its own lines
description: When the writer runs the Table action with a size of R x C, 1 to 9
  each, in a block editor, the extension SHALL insert after the end of the
  selection a pipe table of C columns with a header row of cells "Column 1" to
  "Column C", a --- delimiter row and R minus 1 empty body rows, add only the
  blank lines needed to set it apart, leave the selection untouched and select
  the first header cell, and insert nothing for a missing, malformed or
  out-of-range size.
project: markdown-okf-schema-studio
scope: table-editing
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TABLE-012
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/palette/paletteActions.ts
- src/page/modules/tableEditActions.ts
tested_in_files:
- test/page/modules/editActions.test.ts
- test/page/modules/slashMenu.test.ts
- test/page/modules/tableInsertAfterTable.test.ts
default_owner_email: gaetan@xeberon.net
---

## The Table action inserts a pipe table of the chosen size on its own lines

### Normative behavior

When the writer runs the Table action with a size of R x C, 1 to 9 each, in a block editor, the extension SHALL insert after the end of the selection a pipe table of C columns with a header row of cells "Column 1" to "Column C", a --- delimiter row and R minus 1 empty body rows, add only the blank lines needed to set it apart, leave the selection untouched and select the first header cell, and insert nothing for a missing, malformed or out-of-range size.

### Scenario (nominal): 3 rows and 4 columns
- GIVEN an empty block and the size 3x4
- WHEN the action runs
- THEN the table has 4 header cells, a delimiter row of 4 --- cells and 2 empty body rows, and "Column 1" is selected

### Scenario (boundary): Size limits
| Size | Outcome |
| --- | --- |
| 1x1 | a header and its delimiter row only |
| 9x9 | 9 columns and 8 empty body rows |
| 1x9 | a table is inserted |

### Scenario (nominal): In the middle of a paragraph
- GIVEN the caret inside a paragraph
- WHEN the action runs
- THEN the paragraph is split and the table sits on its own lines between its two parts

### Scenario (boundary): Caret inside a table
- GIVEN the caret in a row of a pipe table, a {list-table} or an HTML table
- WHEN the action runs
- THEN the new table goes on its own lines after the last line of that table and the existing table stays whole

### Scenario (boundary): After a line break, a blank line or a selection
- GIVEN the caret after a line break, or after a blank line, or with text selected
- WHEN the action runs
- THEN only the missing blank lines are added and a selection stays where it is, with the table after it

### Scenario (refusal): Missing, malformed or out-of-range size
| Size | Outcome |
| --- | --- |
| none | no edit is produced |
| "3" | no edit is produced |
| "0x3" | no edit is produced |
| "3x10" | no edit is produced |
| "axb" | no edit is produced |

### Scenario (boundary): Where the Table action is offered
| Palette mode or editor | Outcome |
| --- | --- |
| a block editor | Table is offered |
| a cell editor open, cell formatting group | Table is not offered (the scopes of the action are ["block"]) |
| a cell editor open, its slash menu | Table is not among the entries, while Emoji is |
| strict mode | Table |
| GFM mode | Table, HTML table and Column alignment; Table with caption, List table and Pipe table are not offered |
| MyST mode | all six: Table, HTML table, Column alignment, Table with caption, List table and Pipe table |

### Related requirements
- SwRS-MDOKFSTUDIO-TABLE-111: Column alignment, offered in the same modes.
- SwRS-MDOKFSTUDIO-TABLE-115: Table with caption, offered in MyST mode.
- SwRS-MDOKFSTUDIO-TABLE-117: HTML table, offered in GFM and MyST modes.

### Verification notes
- Method: test/page/modules/tableInsertAfterTable.test.ts (the caret in a pipe table, a list-table or an HTML table: the table goes after it); test/page/modules/editActions.test.ts (3x4, size limits 1x1 and 9x9, the first header cell selection, middle of a paragraph, after a line break or a blank line, selection kept, refused sizes, and the block-only scope: the table action is for blocks only; emoji is for blocks and cells). The mode rows other than Table with caption are read from the descriptors in src/core/palette/paletteActions.ts and the additive mode rule in src/page/modules/editPalette.ts and have no test (untested); the mode filtering of the palette in general belongs to the palette-slash scope.
- Method: test/page/modules/slashMenu.test.ts (P11: the table cell palette lists only the actions allowed in a cell; cell scope row).
- Method: test/page/modules/markdownTable.test.ts (T24: the table inserted by the palette parses back with its header and empty rows).
- Method: test/page/runtimeEditPalette.test.ts (T24: one click on a grid cell inserts the table as one undo step and keeps the editor open).
- Criteria: The inserted text, the edit start and end with the expected blank lines, the selection range, an undefined edit for every refused size, and the scopes of the action. The grid popover is specified by the palette-slash scope.
