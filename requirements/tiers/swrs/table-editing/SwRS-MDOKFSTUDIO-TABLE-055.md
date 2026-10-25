---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-055
uuid: f1de537a-f436-425e-b0f5-0a52400f00bf
title: Row and column buttons add and remove rows and columns
description: When the writer presses a row or column button of the table bar,
  the extension SHALL insert an empty row or column after the selected one or
  delete the selected body row or column, store the text typed in the current
  cell, select the new or nearest remaining row or column and keep the editor
  open at the new position, with Row − and Col − disabled where the table model
  refuses the deletion.
project: markdown-okf-schema-studio
scope: table-editing
lifecycle: draft
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
---

## Row and column buttons add and remove rows and columns

### Normative behavior

When the writer presses a row or column button of the table bar, the extension SHALL insert an empty row or column after the selected one or delete the selected body row or column, store the text typed in the current cell, select the new or nearest remaining row or column and keep the editor open at the new position, with Row − and Col − disabled where the table model refuses the deletion.

### Scenario (nominal): Row + inserts an empty row

| Input | Outcome |
| --- | --- |
| Editor in the first body row of a table with two body rows, Row + | An empty body row sits between the first and the second body row, the editor is in the same column of that new row and the status reads "Row 2 of 3" followed by the column |
| Editor in the header row, Row + | The new row is the first body row and is selected |

### Scenario (nominal): Row − deletes the selected row

| Input | Outcome |
| --- | --- |
| Three body rows, editor in the second, Row − | Two body rows remain and the editor is on the row that took the deleted row's place |
| Editor in the last of two body rows, Row − | The previous body row is selected |

### Scenario (nominal): Col + and Col − insert and delete a column

| Input | Outcome |
| --- | --- |
| Three-column table, editor in the first column, Col + | A column of empty cells sits between the first and second columns, its delimiter cell is "---" and the editor is in the new column of the same row |
| Editor in the last column, Col + | The new column is the last one and is selected |
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

- GIVEN "new" typed in the selected cell and Row + pressed
- WHEN the editor is rebuilt
- THEN the editor is open in the new row, and a later save carries "new" in the original cell

### Scenario (boundary): Not saved by the button itself

- GIVEN a row added with no further typing
- WHEN the autosave timer is not pending
- THEN no previewEditSave is posted until the next autosave, cell switch or commit, and Escape then drops the added row

### Scenario (boundary): A column button rewrites the table in the canonical style

| Input | Outcome |
| --- | --- |
| A table written with padded columns and an indent, whose delimiter row has alignment colons, Col + pressed, the table saved | Every line is rewritten as "\| a \| b \|" with single spaces and outer pipes, the padding and the indentation are gone and the colons of the other columns' delimiter cells are kept |
| The same table with only Row + pressed, the table saved | The other lines are kept verbatim |

### Scenario (boundary): Rendering the cell editor closes the open panels

| Input | Outcome |
| --- | --- |
| Emoji picker open from the cell bar, Col + pressed | The picker is closed |
| Link panel open from the cell bar, Tab pressed | The panel is closed and the editor is in the next cell |
| The cell editor is rendered again after a row or column button or a move to another cell | The open popover or panel of the cell formatting group and the slash menu are closed |

### Known issues

- Known issue: A column operation breaks the one-line-diff guarantee of the other edits: the table's own padding, indentation and outer-pipe style are lost, and nothing in the bar tells the writer.
- Known issue: renderTableCellEditor closes the popover, the link panel and the slash menu every time the editor is rendered: after a row or column button and after every move to another cell, so the writer has to open them again.

### Related requirements

- SwRS-MDOKFSTUDIO-TABLE-048: the table bar that holds the buttons and the position status.

### Verification notes

- Method: test/page/runtimeTableCellEditor.test.ts (table cell editing exposes row and column operations and saves the edited table, typed text carried through Row + and Col +; table header cannot be deleted from the cell toolbar; table toolbar cannot delete the last body row; scenarios Row +, Row −, columns, disabled buttons, typed text kept). The scenario "Not saved by the button itself" is read from the click handler of addAction and is not asserted.
- Method: test/page/modules/markdownTable.test.ts (inserting and deleting table rows and columns preserves the remaining cells; deleting the first body row of a compact table removes exactly one line; inserting a column re-serializes the table with one more column; table tools cannot delete the header, final body row, or final column; scenarios Row +, Row −, columns, model refusals, canonical style). The disabled state of Col − is read from tableCellEditor.ts and has no test.
- Method: test/page/fmtableReqTable.requirements.test.ts (rendering the cell editor again closes the emoji picker, the link panel and the slash menu; scenario open panels closed).
- Criteria: The row count and the selected row index after the press, the cell counts per row and the selected column index, the remaining rows and the selected index returned by deleteRow and deleteColumn; the disabled attribute of the button and an unchanged model; the saved table contains the typed text and the new row or column; all lines of the saved text are in the canonical form after a column operation (serialize in src/page/modules/markdownTable.ts, columnsChanged); no popover, panel or slash menu is open after the render.
