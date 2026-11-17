---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-123
uuid: f1eceb8b-9471-401b-9f76-692e10554f11
title: Tab and the arrow keys move between table cells
description: When the writer presses Tab, Shift+Tab or an arrow key at the edge
  of the text in a cell text box, the extension SHALL move the editor to the
  next, previous or neighbouring rendered cell with the caret at the end of its
  text (at the start for the cell to the right and the cell below), and SHALL
  leave the key to the browser or hand it to block-to-block navigation when no
  cell can take it.
project: markdown-okf-schema-studio
scope: table-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TABLE-006
annotation_exemption: false
exemption_reason:
derived_by: []
supersedes:
- SwRS-MDOKFSTUDIO-TABLE-035
implemented_in_files:
- src/page/features/tableCellEditor.ts
- src/page/features/textControls.ts
tested_in_files:
- test/integration/realInput/editorWidgets.ts
- test/page/runtimeBlockEditor.test.ts
- test/page/runtimeTableCellEditor.test.ts
- test/visual/capture_edit_checks.py
default_owner_email: gaetan@xeberon.net
---

## Tab and the arrow keys move between table cells

### Normative behavior

When the writer presses Tab, Shift+Tab or an arrow key at the edge of the text in a cell text box, the extension SHALL move the editor to the next, previous or neighbouring rendered cell, with the caret at the end of its text (at the start for the cell to the right and the cell below), and leave the key to the browser or hand it to block-to-block navigation when no cell can take it.

### Scenario (nominal): Tab along a row and across rows

- GIVEN a two-column table with a header row and two body rows, the editor in the first header cell
- WHEN the writer presses Tab four times
- THEN the editor visits the second header cell, the first and second cell of the first body row, and the first cell of the second body row, each with the caret at the end of its text, with the same edit session and no final save

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
- SwRS-MDOKFSTUDIO-TABLE-124: Tab in the last cell adds a row.
- SwRS-MDOKFSTUDIO-TABLE-125: the cell left shows its typed text.
- SwRS-MDOKFSTUDIO-TABLE-126: the cell is revealed in the table box.

### Verification notes

- Method: test/page/runtimeTableCellEditor.test.ts (Tab and Shift+Tab, Tab in the last cell, Shift+Tab in the first header cell, arrow keys in every direction, native arrows with a selection, modifiers, IME or a caret inside a multi-line cell, arrow without a matching model cell, block navigation fallback for ArrowUp, Home and End, the table box scrolled to a cell right of it, left of it across the wrap and with Shift+Tab, a visible cell, a target wider than the box, a click on a partly hidden cell, a layout pass that resizes the box under an open editor; scenarios Tab along a row, Shift+Tab, ArrowLeft and ArrowRight, ArrowUp and ArrowDown, keys that stay native, no cell in the arrow direction, Home and End).
- Method: test/page/runtimeBlockEditor.test.ts (a table cell arrow inside a wrapped cell does not move to another cell; keys that stay native, wrapped cell row).
- Method: test/page/runtimeEditorFlush.test.ts (Ctrl+Tab pass-through; Shift+Tab and held modifiers, Ctrl+Tab row).
- Method: visual scenario table-editing/v02 (step arrowdown, ArrowDown only) and check_cell_end_key in test/visual/capture_edit_checks.py on scenario table-editing/v01 (Home and End); the scroll assertions bite on macOS only, because headless Chromium on Linux moves the caret natively.
- Criteria: The text box parent, value and selection range after each key, one previewEditOpen only for the moves inside the table; not prevented and no message posted for every native case. Shift+Ctrl+Tab has no test; the other block-navigation directions follow the same branch and are not asserted separately.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TABLE-006](../../strs/table-editing/StRS-MDOKFSTUDIO-TABLE-006.md): Tab, arrows and editing keys work in a table cell
- Supersedes:
  - [SwRS-MDOKFSTUDIO-TABLE-035](SwRS-MDOKFSTUDIO-TABLE-035.md): Tab and the arrow keys move through the table cells
<!-- okf:links:end -->
