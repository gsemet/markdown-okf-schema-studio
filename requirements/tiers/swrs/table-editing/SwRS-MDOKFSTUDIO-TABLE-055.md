---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-055
uuid: f1de537a-f436-425e-b0f5-0a52400f00bf
title: Row and column buttons add and remove rows and columns
description: When the writer presses a row or column button of the table bar,
  the extension SHALL insert an empty row or column after the selected one (Row
  below, Col right; Row above and Col left insert before it, see
  SwRS-MDOKFSTUDIO-TABLE-003 and SwRS-MDOKFSTUDIO-TABLE-004) or delete the
  selected body row or column, store the text typed in the current cell, select
  the new or nearest remaining row or column, save the table and reopen the
  editor at the new position once the page rendered it again, with Row − and Col
  − disabled where the table model refuses the deletion, change only the lines
  the operation concerns (a column operation keeps the padding, the indentation
  and the outer pipes of every line), and close the popover, link panel and
  slash menu of the cell it leaves.
project: markdown-okf-schema-studio
scope: table-editing
lifecycle: proposed
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
tested_in_files:
- test/page/fmtableReqTable.requirements.test.ts
- test/page/modules/markdownTable.test.ts
- test/page/runtimeTableCellEditor.test.ts
default_owner_email: gaetan@xeberon.net
---

## Row and column buttons add and remove rows and columns

### Normative behavior

When the writer presses a row or column button of the table bar, the extension SHALL insert an empty row or column after the selected one (Row below, Col right; Row above and Col left insert before it, see SwRS-MDOKFSTUDIO-TABLE-003 and SwRS-MDOKFSTUDIO-TABLE-004) or delete the selected body row or column, store the text typed in the current cell, select the new or nearest remaining row or column, save the table and reopen the editor at the new position once the page rendered it again, with Row − and Col − disabled where the table model refuses the deletion, change only the lines the operation concerns (a column operation keeps the padding, the indentation and the outer pipes of every line), and close the popover, link panel and slash menu of the cell it leaves.

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

### Related requirements

- SwRS-MDOKFSTUDIO-TABLE-048: the table bar that holds the buttons and the position status.

### Verification notes

- Method: test/page/runtimeTableCellEditor.test.ts (Row below, Row − and Col right, Col − on the tab helper table; Col right on a padded, indented table keeps the style of every line; table cell editing exposes row and column operations and saves the edited table, typed text carried through Row below and Col +; table header cannot be deleted from the cell toolbar; table toolbar cannot delete the last body row; scenarios Row +, Row −, columns, disabled buttons, typed text kept). The scenario "Not saved by the button itself" is read from the click handler of addAction and is not asserted.
- Method: test/page/modules/markdownTable.test.ts (a column operation keeps the padding, indentation and outer pipes of every line; inserting and deleting table rows and columns preserves the remaining cells; deleting the first body row of a compact table removes exactly one line; inserting a column re-serializes the table with one more column; table tools cannot delete the header, final body row, or final column; scenarios Row +, Row −, columns, model refusals, canonical style). The disabled state of Col − is read from tableCellEditor.ts and has no test.
- Method: test/page/fmtableReqTable.requirements.test.ts (rendering the cell editor again closes the emoji picker, the link panel and the slash menu; scenario open panels closed).
- Criteria: The row count and the selected row index after the press, the cell counts per row and the selected column index, the remaining rows and the selected index returned by deleteRow and deleteColumn; the disabled attribute of the button and an unchanged model; the saved table contains the typed text and the new row or column; the lines of the saved text keep their padding, indentation and outer pipes after a column operation (serialize in src/page/modules/markdownTable.ts, columnOrigins); no popover, panel or slash menu is open after the render.
