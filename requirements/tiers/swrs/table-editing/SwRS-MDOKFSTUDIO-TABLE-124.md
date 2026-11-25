---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-124
uuid: 609ced12-d233-4571-b3a8-8981f3c3272e
title: Tab in the last cell adds a row and shows the hint
description: 'When the writer presses Tab in the last cell of the last row of a table,
  the extension SHALL post a final save with an extra empty row and open the editor
  in its first cell, and the cell editor of that last cell SHALL show the hint Tab:
  new row before Done and Cancel.'
project: markdown-okf-schema-studio
scope: table-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TABLE-006
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-058
scenarios:
- id: S1
  title: Tab in the last cell adds a row
- id: S2
  title: The last cell shows the Tab hint
- id: S3
  title: Final save cannot be posted
- id: S4
  title: A table inside a quote or an admonition
annotation_exemption: false
exemption_reason:
derived_by: []
supersedes:
- SwRS-MDOKFSTUDIO-TABLE-035
implemented_in_files:
- src/page/features/tableCellEditor.ts
- src/page/modules/tableTabRow.ts
tested_in_files:
- test/integration/realInput/tableTabRow.ts
- test/page/runtimeTableCellTabRow.test.ts
- test/visual/capture_table_tab_hint.py
- test/visual/tableTabHintScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## Tab in the last cell adds a row and shows the hint

### Normative behavior

When the writer presses Tab in the last cell of the last rendered row of a table, the extension SHALL post a final save with an extra empty row at the end and the typed text and, after the re-render, open the editor in the first cell of the new row; and in that last cell, the cell editor SHALL show the hint Tab: new row in its actions row before Done and Cancel, described to the text box with `aria-describedby`.

### Scenario S1 (nominal): Tab in the last cell adds a row

- GIVEN the editor in the last cell of a table with two body rows, with text typed in it
- WHEN the writer presses Tab
- THEN a final previewEditSave with an extra empty row at the end and the typed text is posted, and after the re-render the editor opens in the first cell of the new row, which remembers that Tab added its row for that session only (see SwRS-MDOKFSTUDIO-TABLE-025)

### Scenario S2 (nominal): The last cell shows the Tab hint

- GIVEN a table with two body rows, the editor in its first body cell
- WHEN the writer clicks the last cell of the last row, then presses Shift+Tab
- THEN the editor of the last cell shows the text Tab: new row (marked `data-sphinx-preview-table-cell-hint`) in its actions row, its text box names the hint with `aria-describedby`; the editor of every other cell shows no hint and no `aria-describedby`; the hint follows the editor when it moves (Tab, Shift+Tab, an arrow key, a click) and, in a narrow pane, wraps without widening the cell beyond the room of SwRS-MDOKFSTUDIO-TABLE-006 or hiding Done and Cancel

### Scenario S3 (refusal): Final save cannot be posted

- GIVEN a final save that cannot be posted
- WHEN the writer presses Tab in the last cell
- THEN the pending navigation is cleared

### Scenario S4 (boundary): A table inside a quote or an admonition

| Input | Outcome |
| --- | --- |
| Tab in the last cell of a pipe table inside a blockquote, a GFM alert or a MyST admonition | The row is added with the container prefix and, once the page renders the saved text, the editor reopens in the same table, found by its rank among the tables of the container, not in the first one (see SwRS-MDOKFSTUDIO-TABLE-121) |

### Related requirements

- SwRS-MDOKFSTUDIO-TABLE-123: Tab and the arrow keys move between cells.
- SwRS-MDOKFSTUDIO-TABLE-025: Escape or Cancel in a row that Tab added, while it is still empty, removes it.
- SwRS-MDOKFSTUDIO-TABLE-121: a table inside a quote or an admonition.

### Verification notes

- Method: test/page/runtimeTableCellEditor.test.ts (Tab in the last cell adds a row; the pending navigation cleared when the final save cannot be posted).
- Method: test/integration/realInput/markers.ts and real-window scenario scenarioTableTab (id table-editing/r05-tab-adds-row) in test/integration/realInput/editorWidgets.ts (Tab along a row, Tab in the last cell, the first cell of the new row shows the text typed after Tab).
- Method: test/page/runtimeTableCellTabRow.test.ts (the Tab hint in the last cell only, none in the first cell or the last column of another row, `aria-describedby`, the hint after Tab into the last cell and gone after Shift+Tab out of it; createTabHint and isTabNewRowCell in src/page/modules/tableTabRow.ts).
- Method: visual scenarios table-editing/v30 and v31 (check_table_tab_hint in test/visual/capture_table_tab_hint.py: no hint in the first body cell; in the last cell the text, `aria-describedby`, and the hint, Done and Cancel inside the editor, the table's box and the viewport, light at 900 px and dark at 360 px).
- Method: test/integration/realInput/tableTabRow.ts (real-window scenario scenarioTableTabRow, id table-tab-row: the hint is visible after a click on the last cell).
- Criteria: one extra row in editedText and the editor reopened in column 0 of the new row; the hint text, its `data-sphinx-preview-table-cell-hint` mark and `aria-describedby` on the last cell only. The cleared pending navigation is read from tabThroughTableCells and has no dedicated test.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TABLE-006](../../strs/table-editing/StRS-MDOKFSTUDIO-TABLE-006.md): Tab, arrows and editing keys work in a table cell
- Depends on:
  - [SwRS-MDOKFSTUDIO-BLOCK-058](../block-editing/SwRS-MDOKFSTUDIO-BLOCK-058.md): Every host source edit is one undo step, renders once and reports a failed apply
- Supersedes:
  - [SwRS-MDOKFSTUDIO-TABLE-035](SwRS-MDOKFSTUDIO-TABLE-035.md): Tab and the arrow keys move through the table cells
<!-- okf:links:end -->
