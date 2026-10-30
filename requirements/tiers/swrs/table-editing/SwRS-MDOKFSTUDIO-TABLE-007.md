---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-007
uuid: 3300dbba-2fff-4668-9df9-4634c64e9f01
title: Table column handle reorders columns in edit mode
description: When the writer drags the handle above a column of a pipe table or
  a list-table in edit mode onto another column, or presses Alt+Left or
  Alt+Right on that handle, the extension SHALL move that column to the new
  position in every row as one source edit.
project: markdown-okf-schema-studio
scope: table-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TABLE-002
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/tableRowMove.ts
- src/page/modules/listTableMove.ts
- src/page/modules/markdownTable.ts
tested_in_files:
- test/integration/tableMoves.ts
- test/page/modules/tableColumnMove.test.ts
- test/page/runtimeTableRowMove.test.ts
default_owner_email: gaetan@xeberon.net
---

## Table column handle reorders columns in edit mode

### Normative behavior

When the writer drags the handle above a column of a pipe table or a list-table in edit mode onto another column, or presses Alt+Left or Alt+Right on that handle, the extension SHALL move that column to the new position in every row as one source edit.

### Scenario (nominal): Dragging the handle of a column

| Input | Outcome |
| --- | --- |
| Edit mode on, a pipe table of three columns, the handle of the first column dropped on the right half of a cell of the third column | The column sits after the third: every line of the table (header, delimiter row and body rows) has its cells in the new order, each cell keeping its own spacing, and the alignment colons of the delimiter row travel with their column; the document gets one text edit and the text outside the table is unchanged |
| The same drag dropped on the left half of a cell of the third column | The column sits before the third column |
| While the pointer is held over a column | The dragged column is dimmed and a line on the left or the right of the column under the pointer shows where it would land, until the drop or the end of the drag |
| Dropped on the half of the next column that leaves the column in place, or on the column itself | Nothing is requested from the host and the document is not edited |
| The pointer is held anywhere over the columns of the table or over the strip of the handles above the table (over another column's handle too) | The marker shows on the nearest gap: the line on the left of the column when the pointer is on its left half, on the right on its right half; it follows the pointer from column to column and a drop there moves the column |
| The pointer leaves the table and its handle strip | No marker shows; a drop there requests nothing and the document is not edited |

### Scenario (nominal): Keyboard move with Alt+Left and Alt+Right

| Input | Outcome |
| --- | --- |
| Focus on the handle of the second column, Alt+Right | The column swaps with the third as one edit, and after the render the focus is on the handle of the column at its new place |
| Alt+Left on the handle of the first column, or Alt+Right on that of the last | Nothing happens |
| Alt+Right repeated before the render of the previous move arrived | The repeat is ignored: the cells on the page are stale until the render arrives |

### Scenario (nominal): The handle above its column

| Input | Outcome |
| --- | --- |
| Edit mode on, a pipe table or a `{list-table}` of at least two columns | Each column shows the handle of the frontmatter list editor, turned (named "Move table column"), just above the table, outside its cells and horizontally centred on the column, header or not; a table of one body row has these handles too |
| The bar of an open cell editor above the table | The bar leaves the room of the handles between it and the table |
| The page is resized, the zoom changes or a table scrolls sideways | The handles follow the header cells |
| Edit mode switched off | The handles are gone |
| A click on a handle | No cell editor opens |

### Scenario (nominal): Moving a column of a `{list-table}`

| Input | Outcome |
| --- | --- |
| A `{list-table}` with `:header-rows: 1` and three columns, the handle of the first column dropped after the third | In every item (header rows included) the first cell, with the continuation lines under it, now follows the third; the first cell of each item always carries the item marker `* -` and the others `  -`; an empty cell stays an empty item |
| A `:widths:` option with one number per column | The numbers move with the column |
| The directive line, the title, the other options, the indentation, the fence style, the blank lines between items and the line endings | Unchanged |
| Rows that do not all have the same number of cells, or an item that is not a list of cells | The move is refused and the document is not edited |

### Scenario (nominal): A cell editor of the table is open

| Input | Outcome |
| --- | --- |
| A cell editor of the pipe table is open (its source has arrived) and a column handle is dragged or Alt+Left or Alt+Right is pressed on it | The text of the open cell is part of the table that moves; the column is moved in the editor's model and the editor is saved and closed as one edit, with no request for the table source |
| The cell editor has not received the source of its table yet | The drag is cancelled and the key is ignored |

### Scenario (refusal): Tables and states without a column move

| Input | Outcome |
| --- | --- |
| A table inside a figure that is not a `{list-table}` (a `{table}` with a caption), an HTML table, a table of an included file, the properties table, a table of one column | No handle is shown |
| A drag or a key while a block editor, a frontmatter editor or a cell editor of another table is open, or while a move waits for its render | The drag is cancelled or the key is ignored and nothing is requested |
| The host answers the request for the source with an error, or the source is no table that can be read as columns, or the move is refused by the table model (an index outside the table, the same place) | No edit is saved and the page tells the host the move is closed |

### Known issues

- Known issue: A column handle only appears for a pipe table or a `{list-table}` written directly in the document, as the row handle; a captioned `{table}` and an HTML table cannot be reordered with it.
- Known issue: The alignment colons of a pipe table travel with the column, but a pipe table converted to a list-table does not keep any alignment, so a conversion followed by a move cannot give them back.
- Known issue: The handles are placed for a left-to-right page.

### Related requirements

- SwRS-MDOKFSTUDIO-TABLE-002: the handle of a body row, whose drag, key, refusal and conversion rules this requirement repeats for the columns.
- SwRS-MDOKFSTUDIO-TABLE-094: the serialization that keeps the unchanged lines and cells of a table as written.

### Verification notes

- Method: test/integration/tableMoves.ts (real VS Code window: a real mouse drag of a column handle of a pipe table and of a list-table, held over the handle strip (not under the floating toolbar in the 1400x900 window, see SwRS-MDOKFSTUDIO-TOOLBAR-001) and the middle of a column: marker on the nearest gap, none outside the table, a release outside leaves the document as it was, a release in the strip moves the column).
- Method: test/page/runtimeTableRowMove.test.ts (a column drag over the handle strip shows the marker on the nearest gap, none beyond the strip or beside the table, and a drop in the strip moves the column).
- Method: test/page/modules/tableColumnMove.test.ts (a pipe column moves with its colons, padding and outer pipes as written; the model refuses an index outside the table or the same place; a list-table column moves with continuation lines, empty and nested cells, indentation, fence and line endings, and the `:widths:` numbers; ragged rows and non-list-tables refused; the same grid after a conversion).
- Method: test/page/runtimeTableRowMove.test.ts (column handles above the columns of a pipe table and a list-table, outside the cells, none for a captioned table or a one-column table; a drag moves with one save and no cell editor; a drop in place requests nothing; Alt+Left and Alt+Right; refused or unreadable source; a click on a handle; a move while a cell editor is open).
- Method: test/integration/tableMoves.ts (real VS Code window: real mouse drag and Alt+Left of a column of a pipe table and of a list-table, the handles above their header cells, and a column dragged while a cell editor is open).
- Criteria: the saved text equals the source with the cells of every line reordered; one `previewEditSave` per move; each handle rectangle lies above the header row and its centre is within 2 px of the column's centre.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TABLE-002](../../strs/table-editing/StRS-MDOKFSTUDIO-TABLE-002.md): A table row or column moves by its handle in edit mode
<!-- okf:links:end -->
