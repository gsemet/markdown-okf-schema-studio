---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-025
uuid: 588bd515-8e56-4c1a-a65e-3efc0dda9533
title: Escape cancels the open cell edit only, except during a composition
description: When the writer presses Escape in a cell editor outside an IME
  composition, the extension SHALL close the editor and drop the text typed in
  that cell only, keep the text of the cells left earlier in the session with
  Tab, an arrow key or a click, show in the preview what the buffer holds,
  remove a row that Tab added in that session when every cell of it is empty,
  and, during an input-method composition, leave the editor open and post
  nothing.
project: markdown-okf-schema-studio
scope: table-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TABLE-001
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-053
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/blockEditor.ts
- src/page/features/editMode.ts
- src/page/features/tableCellEditor.ts
- src/page/modules/tableTabRow.ts
tested_in_files:
- test/integration/realInput/markers.ts
- test/integration/realInput/tableEscape.ts
- test/integration/realInput/tableTabRow.ts
- test/page/runtimeTableCellEditor.test.ts
- test/page/runtimeTableCellEscape.test.ts
- test/page/runtimeTableCellTabRow.test.ts
- test/visual/capture_table_escape.py
default_owner_email: gaetan@xeberon.net
---

## Escape cancels the open cell edit only, except during a composition

### Normative behavior

When the writer presses Escape in a cell editor outside an IME composition, the extension SHALL close the editor and drop the text typed in that cell only: with no cell left earlier in the session holding typed text, the table is restored as before the session and no final save is sent; with such a cell, the open cell returns to its opening text, the table is saved with the text of the cells left (Tab, arrow key or click) and the preview shows what the buffer holds. When Escape or Cancel is pressed in a row that Tab added in the session that opened in it, and every cell of that row is empty once the open cell is back to its opening text (spaces trimmed), the row SHALL be removed and the table saved in one edit (one final save, one undo step). The mark lives for that session only: after Done, Enter, a click outside or a final save, a later Escape in that row is as above, and a row added with the Row below button is never marked. During an input-method composition, the editor stays open and nothing is posted.

### Scenario (nominal): Escape after typing
- GIVEN a cell edited and not yet autosaved
- WHEN the writer presses Escape
- THEN the editor closes, the rendered cell is as before and no final previewEditSave is ever posted

### Scenario (nominal): Escape after a cell left with Tab, an arrow key or a click
- GIVEN text typed in a cell, then Tab, an arrow key or a click to another cell, and text typed in that cell
- WHEN the writer presses Escape in the second cell
- THEN the editor closes, the buffer holds the text of the first cell and the original text of the second, and the preview shows both as the buffer holds them

### Scenario (boundary): Escape in an unchanged cell after a cell left
- GIVEN text typed in a cell and left with Tab, and nothing typed in the next cell
- WHEN the writer presses Escape
- THEN the text of the first cell stays in the buffer

### Scenario (nominal): Cancel button after a cell left
- GIVEN text typed in a cell, then Tab to another cell, and text typed in that cell
- WHEN the writer clicks the Cancel button of the cell editor
- THEN it behaves as Escape: the buffer holds the text of the first cell and the original text of the second, and no previewEditCancel is posted

### Scenario (boundary): Escape after leaving an untouched cell
- GIVEN Tab out of a cell where nothing was typed, then text typed in the next cell
- WHEN the writer presses Escape
- THEN the whole session is cancelled as before: no final save is posted

### Scenario (nominal): Escape on an empty row added by Tab
- GIVEN the editor in the last cell of a table, Tab pressed there, and the editor reopened in the first cell of the new empty row
- WHEN the writer presses Escape
- THEN one final previewEditSave is posted whose text is the table without the new row (the table before the Tab, except the text typed in the cell where Tab was pressed), no previewEditCancel is posted and the editor closes; one undo from the source gives the empty row back and a second one undoes the Tab

### Scenario (nominal): Cancel on an empty row added by Tab
- GIVEN the editor reopened in the empty row that Tab added
- WHEN the writer clicks the Cancel button
- THEN it does the same as Escape: the row is removed with one final save

### Scenario (boundary): Escape on a row added by Tab after typing in it
- GIVEN the editor reopened in the row that Tab added, and text typed in its first cell only
- WHEN the writer presses Escape
- THEN the typed text is dropped (the open cell returns to its opening text), the row is empty and is removed

### Scenario (boundary): A row added by Tab with a cell left holding text
- GIVEN the editor reopened in the row that Tab added, text typed in its first cell, then Tab to its second cell
- WHEN the writer presses Escape
- THEN the row stays with the text of its first cell, as in the scenarios above

### Scenario (boundary): A row added with the Row below button
- GIVEN the editor reopened in the row that the Row below button added
- WHEN the writer presses Escape
- THEN the row is not removed: no final save without it is posted

### Scenario (boundary): Blur after Escape
- GIVEN the editor closed by Escape
- WHEN the focus then moves elsewhere
- THEN nothing is sent

### Scenario (nominal): Escape with the focus outside the cell editor
- GIVEN a cell editor open and the focus on another element of the page
- WHEN Escape is pressed while the key target and the active element are outside the cell editor
- THEN the edit is cancelled as if Escape had been pressed in the text box

### Scenario (boundary): Key inside the editor
- GIVEN Escape pressed in the cell text box
- WHEN the document-level handler sees the key
- THEN it does nothing, the text box handler having cancelled once

### Scenario (refusal): Escape during a composition
- GIVEN an IME composition in progress in the cell text box
- WHEN Escape is pressed (event marked as composing)
- THEN the editor stays open and nothing is posted

### Scenario (boundary): Escape after the composition
- GIVEN the composition ended
- WHEN Escape is pressed
- THEN the edit is cancelled

### Related requirements
- SwRS-MDOKFSTUDIO-TABLE-035: Tab in the last cell adds the row whose reopened editor carries the mark, and the last cell shows the hint Tab: new row.
- SwRS-MDOKFSTUDIO-TABLE-013: one edit session across cells; the cells left keep their text.
- SwRS-MDOKFSTUDIO-TABLE-035: the cell left shows the text just typed, which Escape in the next cell keeps.
- SwRS-MDOKFSTUDIO-BLOCK-053: the block editor equivalent of the cancel; the cell has its own listener.

### Verification notes
- Method: test/page/runtimeTableCellEditor.test.ts ("Escape in a changed table cell cancels and never saves a final table" for Escape after typing and the blur after it; "Escape cancels a table cell even when focus is outside the cell editor" for the focus outside and the key inside, with the document-level handler in bindKeys of src/page/features/tableCellEditor.ts; "Escape during IME composition neither cancels nor saves a table cell" for the composition scenarios).
- Method: test/page/runtimeTableCellEscape.test.ts (Escape after Tab, ArrowRight and a click, the Cancel button after a cell left, Escape after leaving an untouched cell, after two cells left, with the focus outside the cell editor, and in an untouched cell, in each case a final save holding the cells left and not the open cell's text) with the cancel branch cancelTableCellEdit of src/page/features/tableCellEditor.ts.
- Method: test/page/runtimeTableCellTabRow.test.ts (Escape and Cancel in the empty row that Tab added, with and without text typed in its first cell, one final save with the table before the Tab; a cell of the row left holding text keeps the row; a row added with the Row below button is not removed) with the mark `tabAddedRow` set by resumePendingBlockNavigation in src/page/features/editMode.ts from the `addedRow` flag of the pending navigation (remembered by tabThroughTableCells), and the removal branch of cancelTableCellEdit in src/page/features/tableCellEditor.ts.
- Method: test/integration/realInput/tableTabRow.ts (real-window scenario scenarioTableTabRow, id table-tab-row: click the last cell, Tab, Escape; the buffer equals the buffer before the Tab; two undos from the source give the empty row back, then undo the Tab).
- Method: test/integration/realInput/tableEscape.ts (real-window scenario scenarioTableEscapeKeepsCellsLeft, QA replay 271-c2-1: type, Tab, Escape, then type, click, Escape; the buffer line and the shown cells agree).
- Method: test/integration/realInput/textEditing.ts, markers in test/integration/realInput/markers.ts (real-window scenario scenarioEscapeCancels, id table-editing/r04-escape-cancels-cell: Escape after typing).
- Method: visual scenarios table-editing/v02 to v05, v24 and v25 (check_cell_escape_keeps_cells_left in test/visual/capture_table_escape.py, run by check_preview_edit_mode: text typed in a cell, ArrowDown, Escape; the last save is final and holds the text of the cell left, no previewEditCancel is posted, and the editor closes once the host renders the page).
- Criteria: No message with final true after Escape and an unchanged source in the real-window scenario. With a cell left earlier in the session, the last save is final and holds the text of that cell and not the open cell's typed text; no previewEditCancel is posted. Exactly one cancel per key press in the two focus scenarios. No message and an open editor in the composition scenario.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TABLE-001](../../strs/table-editing/StRS-MDOKFSTUDIO-TABLE-001.md): A writer edits a table cell in place and never loses the text
- Depends on:
  - [SwRS-MDOKFSTUDIO-BLOCK-053](../block-editing/SwRS-MDOKFSTUDIO-BLOCK-053.md): Cancel and Escape restore the saved text
<!-- okf:links:end -->
