---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-035
uuid: 29595628-befc-4f4a-9e3b-1c957c0fa553
title: Tab and the arrow keys move through the table cells
description: When the writer presses Tab, Shift+Tab or an arrow key at the edge
  of the text in a cell text box, the extension SHALL move the editor to the
  next, previous or neighbouring rendered cell, with the caret at the end of its
  text (at the start for the cell to the right and the cell below), and leave
  the key to the browser or hand it to block-to-block navigation when no cell
  can take it.
project: markdown-okf-schema-studio
scope: table-editing
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TABLE-006
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-058
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/tableCellEditor.ts
- src/page/features/textControls.ts
tested_in_files:
- test/integration/realInput/markers.ts
- test/page/runtimeBlockEditor.test.ts
- test/page/runtimeTableCellEditor.test.ts
- test/visual/capture_edit_checks.py
default_owner_email: gaetan@xeberon.net
---

## Tab and the arrow keys move through the table cells

### Normative behavior

When the writer presses Tab, Shift+Tab or an arrow key at the edge of the text in a cell text box, the extension SHALL move the editor to the next, previous or neighbouring rendered cell, with the caret at the end of its text (at the start for the cell to the right and the cell below), and leave the key to the browser or hand it to block-to-block navigation when no cell can take it.

### Scenario (nominal): Tab along a row and across rows

- GIVEN a two-column table with a header row and two body rows, the editor in the first header cell
- WHEN the writer presses Tab four times
- THEN the editor visits the second header cell, the first and second cell of the first body row, and the first cell of the second body row, each with the caret at the end of its text, with the same edit session and no final save

### Scenario (nominal): Tab in the last cell adds a row

- GIVEN the editor in the last cell of a table with two body rows, with text typed in it
- WHEN the writer presses Tab
- THEN a final previewEditSave with an extra empty row at the end and the typed text is posted, and after the re-render the editor opens in the first cell of the new row

### Scenario (refusal): Final save cannot be posted

- GIVEN a final save that cannot be posted
- WHEN the writer presses Tab in the last cell
- THEN the pending navigation is cleared

### Scenario (boundary): Shift+Tab and held modifiers

| Input | Outcome |
| --- | --- |
| Shift+Tab in the first cell of the first body row of a two-column table | The editor moves to the second header cell with the caret at the end of its text |
| Shift+Tab in the second header cell | The editor moves to the first header cell |
| Shift+Tab in the first header cell | The editor stays in that cell and the key is prevented |
| Ctrl+Tab in a cell (Tab with Cmd, Ctrl or Alt is not handled by the cell editor) | The editor does not move |
| Shift+Ctrl+Tab in a cell | The editor does not move |

### Scenario (nominal): ArrowLeft and ArrowRight at the edges of the text

- GIVEN the editor in the first body cell with the caret at the end of its text
- WHEN the writer presses ArrowRight, then ArrowLeft at the start of the second cell
- THEN the editor moves to the second cell with the caret at its start, then back to the first cell with the caret at its end; the moved-from cell text is autosaved, with no final save

### Scenario (nominal): ArrowUp and ArrowDown at the first and last line

- GIVEN the editor in the first body cell of a table with two body rows
- WHEN the writer presses ArrowDown at the end of the text, then ArrowUp at the start of the next cell
- THEN the editor moves to the cell below with the caret at its start, then back up with the caret at the end of the upper cell

### Scenario (boundary): Keys that stay native

| Input | Outcome |
| --- | --- |
| Caret in the middle of the text, ArrowRight | The key stays native and the caret moves within the text |
| Cell text wrapped over several visual lines, caret on the middle line, ArrowUp or ArrowDown | The caret moves between the visual lines; the editor leaves the cell only from the first or the last visual line |
| All of the text selected, or Shift, Alt, Cmd or Ctrl held, caret at an edge, an arrow key | The key is not prevented and the editor stays in its cell |
| IME composition in progress, caret at an edge, an arrow key | The editor stays in its cell |
| Rendered table with a third column in the row below that the Markdown model lacks, editor at the end of the text in the second column, ArrowRight | The key is not prevented and the editor stays in its cell |
| The same table with a matching third cell in the model, ArrowRight | The editor moves to that cell |
| End pressed with Cmd, Ctrl or Alt, or during an IME composition | The cell editor leaves it to the browser |

### Scenario (boundary): No cell in the arrow direction

- GIVEN the editor in the first header cell with the caret at the start and a block above the table
- WHEN the writer presses ArrowUp
- THEN the key is consumed and the page posts a previewEditOpen for the block above

The same hand-over to the next block applies with the editor in the last column of the last row when the writer presses ArrowRight at the end of the text, then ArrowDown at the last line.

### Scenario (nominal): Home and End in a wide table

- GIVEN the editor in the far-right cell of a sixteen-column table wider than the pane
- WHEN the writer presses End
- THEN the caret goes to the end of the cell text, the default action is prevented, and neither the page nor the table scrolls

Home moves the caret to the start of the text, and Shift extends the selection.

### Related requirements

- SwRS-MDOKFSTUDIO-TABLE-048: the table bar above the table that shows the position of the selected cell after each move.

### Verification notes

- Method: test/page/runtimeTableCellEditor.test.ts (Tab and Shift+Tab, Tab in the last cell, Shift+Tab in the first header cell, arrow keys in every direction, native arrows with a selection, modifiers, IME or a caret inside a multi-line cell, arrow without a matching model cell, block navigation fallback for ArrowUp, Home and End; scenarios Tab along a row, Tab in the last cell, Shift+Tab, ArrowLeft and ArrowRight, ArrowUp and ArrowDown, keys that stay native, no cell in the arrow direction, Home and End).
- Method: test/integration/realInput/markers.ts and real-window scenario scenarioTableTab (id table-editing/r05-tab-adds-row) in test/integration/realInput/editorWidgets.ts (Tab along a row, Tab in the last cell).
- Method: test/page/runtimeBlockEditor.test.ts (a table cell arrow inside a wrapped cell does not move to another cell; keys that stay native, wrapped cell row).
- Method: test/page/runtimeEditorFlush.test.ts (Ctrl+Tab pass-through; Shift+Tab and held modifiers, Ctrl+Tab row).
- Method: visual scenario table-editing/v02 (step arrowdown, ArrowDown only) and check_cell_end_key in test/visual/capture_edit_checks.py on scenario table-editing/v01 (Home and End); the scroll assertions bite on macOS only, because headless Chromium on Linux moves the caret natively.
- Criteria: The text box parent, value and selection range after each key, one previewEditOpen only for the moves inside the table; not prevented and no message posted for every native case; one extra row in editedText and the editor reopened in column 0 of the new row. The cleared pending navigation is read from tabThroughTableCells and has no dedicated test; Shift+Ctrl+Tab has no test; the other block-navigation directions follow the same branch and are not asserted separately.
