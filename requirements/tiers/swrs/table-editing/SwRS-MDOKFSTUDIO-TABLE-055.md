---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-055
uuid: f1de537a-f436-425e-b0f5-0a52400f00bf
title: Row and column buttons add and remove rows and columns
description: "When the writer presses a row or column button of the table bar, the
  extension SHALL insert an empty row or column before (Row above, Col left) or after
  (Row below, Col right) the selected one, or delete the selected body row or column,
  store the text typed in the current cell, keep the text of every other cell and
  the style of every line, select the new or nearest remaining row or column, save
  the table and reopen the editor at the new position once the page rendered it again,
  with Row above disabled in the header row and Row − and Col − disabled where the
  table model refuses the deletion, offer the same buttons on a plain list-table (one
  header row, one-line cells, no title, label or option other than header-rows) and
  write its changed grid back as a list-table, change only the lines the operation
  concerns (a column operation keeps the padding, the indentation and the outer pipes
  of every line), and close the popover, link panel and slash menu of the cell it
  leaves."
project: markdown-okf-schema-studio
scope: table-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TABLE-008
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/tableCellEditor.ts
- src/page/modules/markdownTable.ts
- src/page/modules/tableStructure.ts
tested_in_files:
- test/page/fmtableReqTable.requirements.test.ts
- test/page/modules/markdownTable.test.ts
- test/page/runtimeTableCellEditor.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-TABLE-003
- SwRS-MDOKFSTUDIO-TABLE-004
- SwRS-MDOKFSTUDIO-TABLE-005
---

## Row and column buttons add and remove rows and columns

### Normative behavior

When the writer presses a row or column button of the table bar, the extension SHALL insert an empty row or column before (Row above, Col left) or after (Row below, Col right) the selected one, or delete the selected body row or column, store the text typed in the current cell, keep the text of every other cell and the style of every line, select the new or nearest remaining row or column, save the table and reopen the editor at the new position once the page rendered it again, with Row above disabled in the header row and Row − and Col − disabled where the table model refuses the deletion, offer the same buttons on a plain list-table (one header row, one-line cells, no title, label or option other than header-rows) and write its changed grid back as a list-table, change only the lines the operation concerns (a column operation keeps the padding, the indentation and the outer pipes of every line), and close the popover, link panel and slash menu of the cell it leaves.

### Scenario (nominal): Row below inserts an empty row

| Input | Outcome |
| --- | --- |
| Editor in the first body row of a table with two body rows, Row below | An empty body row sits between the first and the second body row, the editor is in the same column of that new row and the status reads "Row 2 of 3" followed by the column |
| Editor in the header row, Row below | The new row is the first body row and is selected |

### Scenario (nominal): Row − deletes the selected row

| Input | Outcome |
| --- | --- |
| Three body rows, editor in the second, Row − | Two body rows remain and the editor is on the row that took the deleted row's place |
| Editor in the last of two body rows, Row − | The previous body row is selected |

### Scenario (nominal): Col right and Col − insert and delete a column

| Input | Outcome |
| --- | --- |
| Three-column table, editor in the first column, Col right | A column of empty cells sits between the first and second columns, its delimiter cell is "---" and the editor is in the new column of the same row |
| Editor in the last column, Col right | The new column is the last one and is selected |
| Three-column table, editor in the second column, Col − | Every row loses its second cell and the editor is in the column that took its place |
| Editor in the last column, Col − | The previous column is selected |

### Scenario (refusal): Disabled buttons and model refusals

| Input | Outcome |
| --- | --- |
| Editor in the header row, the bar inspected | Row − is disabled |
| Table with one body row and the editor in it, the bar inspected | Row − is disabled, and deleteRow on the model returns no row and removes nothing |
| Table of one column and the editor in it, the bar inspected | Col − is disabled (read from tableCellEditor.ts, untested) |
| deleteColumn called on the one-column model | It returns no column and removes nothing |

### Scenario (nominal): Typed text kept

- GIVEN "new" typed in the selected cell and Row below pressed
- WHEN the table is saved
- THEN the saved text carries "new" in the original cell, and the editor reopens in the new row

### Scenario (nominal): Saved by the button itself

- GIVEN a row added with no further typing
- WHEN Row below is pressed
- THEN a final previewEditSave is posted at once, the page renders the new table and reopens the editor in the new row (no editor stays in a cell of the rendered table that shows another cell's text)

### Scenario (boundary): A column button keeps the style of every line

| Input | Outcome |
| --- | --- |
| An indented table with padded columns and alignment colons, Col right pressed, the table saved | Every line keeps its indentation, its padding and its outer pipes; the new cell is as wide as the cell on its left, its delimiter cell is dashes of that width, and the other cells are kept verbatim |
| A compact table "\|A\|B\|", Col − pressed on the first column | Every line loses its first cell and keeps its outer pipes and its absence of spaces |
| A table without outer pipes, Col − pressed on the last column | The pipe before the removed cell goes with it; the lines stay parseable |
| A row that cannot be edited in place (the result would not split into the expected cells) | That line alone is written in the canonical form "\| a \| b \|", keeping its indentation |
| Col right then Col − on the same position | The table is back to its original text |
| The same table with only Row below pressed, the table saved | The other lines are kept verbatim |

### Scenario (boundary): The open panels belong to the cell they were opened in

| Input | Outcome |
| --- | --- |
| Emoji picker open from the cell bar, Col right pressed | The picker is closed |
| Link panel open from the cell bar, Tab pressed | The panel is closed and the editor is in the next cell |
| The cell editor is rendered for another cell after a row or column button or a move | The open popover or panel of the cell formatting group and the slash menu are closed, because they act on the text selected in the cell that was left |

### Scenario (nominal): Row above on a body row

| Input | Outcome |
| --- | --- |
| Editor in the second body row, "qq" typed in the cell, Row above | A final previewEditSave carries an empty body row above that row and "qq" in the original cell; the page reopens the editor in the new row, in the same column |

### Scenario (refusal): Header row

| Input | Outcome |
| --- | --- |
| Editor in the header row, the bar inspected | Row above is disabled and nothing is saved |

### Scenario (nominal): Col left on a column

| Input | Outcome |
| --- | --- |
| Editor in the header cell "B" of a two-column table, Col left | A final previewEditSave carries a table whose header reads "A", an empty cell, "B", whose delimiter row has a third "---" cell and whose body rows gain an empty cell at the same place; the title "B" is kept; the page reopens the editor in the new column of the same row |

### Scenario (boundary): Style kept

| Input | Outcome |
| --- | --- |
| An indented, padded table, Col left on its first column | Every line keeps its indentation, padding and outer pipes, as for Col right (see SwRS-MDOKFSTUDIO-TABLE-055) |

### Scenario (nominal): Buttons on a list-table

| Input | Outcome |
| --- | --- |
| A cell of ```{list-table} with ":header-rows: 1", Col left | The cell editor opens, and the saved text is the list-table with an empty first cell added to every row (`* -` followed by the other cells) |
| The same list-table, a cell edited and committed with no button | Only the cell changes in the saved list-table |
| The same list-table, nothing changed | The text is saved as it was, character for character |

### Scenario (refusal): Not a plain list-table

| Input | Outcome |
| --- | --- |
| A list-table with a title, a label, ":widths:", no ":header-rows: 1", several-line cells or indentation | The whole block opens in the raw Markdown editor, as before |
| A plain list-table open in the cell editor | List table (the conversion button) is disabled |

### Related requirements

- SwRS-MDOKFSTUDIO-TABLE-048: the table bar that holds the buttons and the position status.

### Verification notes

- Method: test/page/runtimeTableCellEditor.test.ts (Row below, Row − and Col right, Col − on the tab helper table; Col right on a padded, indented table keeps the style of every line; table cell editing exposes row and column operations and saves the edited table, typed text carried through Row below and Col +; table header cannot be deleted from the cell toolbar; table toolbar cannot delete the last body row; scenarios Row +, Row −, columns, disabled buttons, typed text kept). The scenario "Not saved by the button itself" is read from the click handler of addAction and is not asserted.
- Method: test/page/modules/markdownTable.test.ts (a column operation keeps the padding, indentation and outer pipes of every line; inserting and deleting table rows and columns preserves the remaining cells; deleting the first body row of a compact table removes exactly one line; inserting a column re-serializes the table with one more column; table tools cannot delete the header, final body row, or final column; scenarios Row +, Row −, columns, model refusals, canonical style). The disabled state of Col − is read from tableCellEditor.ts and has no test.
- Method: test/page/fmtableReqTable.requirements.test.ts (rendering the cell editor again closes the emoji picker, the link panel and the slash menu; scenario open panels closed).
- Method: test/page/runtimeTableCellEditor.test.ts (Row above inserts an empty row above the selected one and keeps its text; Row above is off in the header row), and the real-window scenario in test/integration/tableStructureReal.ts.
- Method: test/page/runtimeTableCellEditor.test.ts (Col left inserts an empty column to the left and leaves the title of the selected column), and the real-window scenario in test/integration/tableStructureReal.ts.
- Method: test/page/runtimeTableCellEditor.test.ts (a plain {list-table} opens the cell editor and its buttons write a list-table), test/page/fmtableReqTable.requirements.test.ts (a list-table with options opens the raw editor), and the real-window scenario in test/integration/tableStructureReal.ts.
- Criteria: The row count and the selected row index after the press, the cell counts per row and the selected column index, the remaining rows and the selected index returned by deleteRow and deleteColumn; the disabled attribute of the button and an unchanged model; the saved table contains the typed text and the new row or column; the lines of the saved text keep their padding, indentation and outer pipes after a column operation (serialize in src/page/modules/markdownTable.ts, columnOrigins); no popover, panel or slash menu is open after the render.
- Criteria: the saved text, the pending navigation row and column, the disabled attribute of the button.
- Criteria: the cells of each saved line, the pending navigation row and column.
- Criteria: the saved list-table text, the presence of the cell editor, the disabled button.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TABLE-008](../../strs/table-editing/StRS-MDOKFSTUDIO-TABLE-008.md): A table bar locates the writer and edits rows and columns
- Supersedes:
  - [SwRS-MDOKFSTUDIO-TABLE-003](SwRS-MDOKFSTUDIO-TABLE-003.md): Row above inserts an empty row above the selected body row
  - [SwRS-MDOKFSTUDIO-TABLE-004](SwRS-MDOKFSTUDIO-TABLE-004.md): Col left inserts an empty column to the left of the selected column
  - [SwRS-MDOKFSTUDIO-TABLE-005](SwRS-MDOKFSTUDIO-TABLE-005.md): The row and column buttons also edit a plain list-table
<!-- okf:links:end -->
