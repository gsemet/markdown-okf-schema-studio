---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-120
uuid: 103451e1-657d-4404-9056-8b26fcf645f7
title: A spreadsheet paste into a table cell fills the cells from that cell
description: When the writer pastes into a cell text box a text that holds a
  tab, the extension SHALL write its values into the cells from the open cell
  rightwards and downwards, add the missing columns at the right and the missing
  rows at the end, save the table in one edit and reopen the editor in that
  cell.
project: markdown-okf-schema-studio
scope: table-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TABLE-012
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/tableCellEditor.ts
- src/page/modules/tableGridPaste.ts
tested_in_files:
- test/integration/realInput/tableGridPaste.ts
- test/page/modules/tableGridPaste.test.ts
- test/page/runtimeTableCellPaste.test.ts
- test/visual/capture_table_grid_paste.py
- test/visual/tableGridPasteScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## A spreadsheet paste into a table cell fills the cells from that cell

### Normative behavior

When the writer pastes into a cell text box a text that holds a tab, the extension SHALL write its values into the cells from the open cell rightwards and downwards, add the missing columns at the right and the missing rows at the end, save the table in one edit and reopen the editor in that cell.

### Scenario (nominal): Two spreadsheet rows pasted into a cell
- GIVEN a table of three columns whose last row is "| Five | row five | erin |" with the cell "row five" open, and the clipboard holds "a\tb\tc\n1\t2\t3\n"
- WHEN the writer pastes
- THEN the row reads "| Five | a | b | c |" (one column is added at the right, with an empty header cell), a new last row reads "|  | 1 | 2 | 3 |", no tab character is written, the table is saved in one edit and the editor reopens in the second cell of the "Five" row showing "a"

### Scenario (nominal): A grid that fits the table
- GIVEN a table of two columns and two body rows, the first body cell open, and the clipboard holds "p\tq\nr\ts"
- WHEN the writer pastes
- THEN the four cells hold the four values, no row or column is added and no cell outside the grid changes

### Scenario (boundary): Start in the header row
- GIVEN the header cell of the first column open and a pasted grid of two lines
- WHEN the writer pastes
- THEN the first line fills the header row, the second line fills the first body row and the delimiter row is never written

### Scenario (boundary): Line endings, empty values and pipes
| Pasted text | Outcome |
| --- | --- |
| a final line break ("\n", "\r\n" or "\r") | not a row of its own |
| CRLF or lone CR between lines | a line break like "\n" |
| "a\t\tc" | the middle cell is empty |
| spaces around a value | trimmed |
| a value with a pipe | written \| by the usual cell writing (SwRS-MDOKFSTUDIO-TABLE-091) |
| a line shorter than the others | only its own values are written |

### Scenario (boundary): One undo step
- GIVEN a grid paste that adds a row and a column
- WHEN the writer undoes once in the source
- THEN the source holds the table as it was before the paste

### Scenario (refusal): A single value or a text without a tab
- GIVEN the clipboard holds "x", or "a\nb" (several lines, no tab)
- WHEN the writer pastes into the cell text box
- THEN the paste is native: it is not intercepted, nothing is saved by it and the line breaks of "a\nb" become spaces as before (SwRS-MDOKFSTUDIO-TABLE-091)

### Scenario (boundary): A list-table
- GIVEN a plain {list-table} opened in the cell editor and a pasted grid wider than its columns
- WHEN the writer pastes
- THEN its rows and columns are added and the table is saved as a list-table in one edit

### Related requirements
- SwRS-MDOKFSTUDIO-TABLE-091: a pasted text without a tab stays a native paste, whose line breaks become spaces; a pasted text with a tab is a grid paste.
- SwRS-MDOKFSTUDIO-TABLE-055: the row and column insertion the grid paste adds its missing rows and columns with.

### Verification notes
- Method: test/page/modules/tableGridPaste.test.ts (the grid read from the text and written into the model: fitting grid, added column and row, header start, pipe, list-table).
- Method: test/page/runtimeTableCellPaste.test.ts (the paste event of the cell text box: default prevented, one final save, pending navigation to the start cell; a single value and a multi-line text without a tab are left to the native paste).
- Method: test/integration/realInput/tableGridPaste.ts (a real paste of spreadsheet cells, no tab in the source, one undo) and the visual scenario table-editing/v32-grid-paste-light-900.
- Criteria: The serialized table after the paste, the single final save, and the source after one undo.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TABLE-012](../../strs/table-editing/StRS-MDOKFSTUDIO-TABLE-012.md): Tables and cell text are formatted, inserted, aligned and captioned
<!-- okf:links:end -->
