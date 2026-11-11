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
  can take it, and bring that cell and its editor into the visible part of the
  table's sideways scroll box without scrolling the page, and the cell left
  SHALL show the text just typed in it, rendered as inline Markdown, without
  waiting for a re-render, and the cell editor of the last cell of the table
  SHALL show a hint that Tab adds a row.
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
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/tableCellEditor.ts
- src/page/features/textControls.ts
- src/page/modules/tableTabRow.ts
tested_in_files:
- test/integration/realInput/markers.ts
- test/integration/realInput/tableStaleRender.ts
- test/integration/realInput/tableTabRow.ts
- test/page/cellInlineMarkdown.test.ts
- test/page/runtimeBlockEditor.test.ts
- test/page/runtimeTableCellEditor.test.ts
- test/page/runtimeTableCellStale.test.ts
- test/page/runtimeTableCellTabRow.test.ts
- test/visual/capture_edit_checks.py
- test/visual/capture_table_tab_hint.py
- test/visual/tableTabHintScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## Tab and the arrow keys move through the table cells

### Normative behavior

When the writer presses Tab, Shift+Tab or an arrow key at the edge of the text in a cell text box, the extension SHALL move the editor to the next, previous or neighbouring rendered cell, with the caret at the end of its text (at the start for the cell to the right and the cell below), and leave the key to the browser or hand it to block-to-block navigation when no cell can take it, and bring that cell and its editor into the visible part of the table's sideways scroll box without scrolling the page, and the cell left SHALL show the text just typed in it, rendered as inline Markdown, without waiting for a re-render, and, in the last cell of the last rendered row of the table (the cell where Tab adds a row), the cell editor SHALL show the hint Tab: new row in its actions row before Done and Cancel, described to the text box with `aria-describedby`.

### Scenario (nominal): Tab along a row and across rows

- GIVEN a two-column table with a header row and two body rows, the editor in the first header cell
- WHEN the writer presses Tab four times
- THEN the editor visits the second header cell, the first and second cell of the first body row, and the first cell of the second body row, each with the caret at the end of its text, with the same edit session and no final save

### Scenario (nominal): Tab in the last cell adds a row

- GIVEN the editor in the last cell of a table with two body rows, with text typed in it
- WHEN the writer presses Tab
- THEN a final previewEditSave with an extra empty row at the end and the typed text is posted, and after the re-render the editor opens in the first cell of the new row, which remembers that Tab added its row for that session only (see SwRS-MDOKFSTUDIO-TABLE-025)

### Scenario (nominal): The last cell shows the Tab hint

- GIVEN a table with two body rows, the editor in its first body cell
- WHEN the writer clicks the last cell of the last row, then presses Shift+Tab
- THEN the editor of the last cell shows the text Tab: new row (marked `data-sphinx-preview-table-cell-hint`) in its actions row, its text box names the hint with `aria-describedby`; the editor of every other cell shows no hint and no `aria-describedby`; the hint follows the editor when it moves (Tab, Shift+Tab, an arrow key, a click) and, in a narrow pane, wraps without widening the cell beyond the room of SwRS-MDOKFSTUDIO-TABLE-006 or hiding Done and Cancel

### Scenario (nominal): The cell left shows its new text

- GIVEN the editor in a cell whose text was typed or changed (the first cell of a row just added, or a cell with an older rendering), the cell holding no re-rendered content
- WHEN the writer presses Tab, Shift+Tab or an arrow key that moves the editor to another cell
- THEN the cell left shows the text just typed, with its inline Markdown (code, strong, emphasis, strikethrough, links, line breaks) rendered, and not the content it showed when the editor opened in it (empty for a new row); a cell whose text was not changed keeps its rendering; no render is requested and no final save is posted

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

### Scenario (nominal): Tab in a table wider than the pane

- GIVEN a ten-column table wider than the pane, which scrolls sideways in its own box, and the editor in the first body cell
- WHEN the writer presses Tab through the row and across the wrap to the next row, then Shift+Tab back
- THEN after each key the table box scrolls sideways, instantly and by the smallest amount, so that the cell and its editor lie inside the box with a 16 px margin; the page does not scroll

| Input | Outcome |
| --- | --- |
| Tab or Shift+Tab to a cell already inside the table box | The table does not scroll |
| Tab to a cell whose cell and editor together are wider than the box less both margins | The table scrolls so that their start lies 16 px inside the left edge of the box |
| Click on a cell partly hidden by the box edge | The editor opens in that cell and the table scrolls by the hidden part plus the margin |
| Editor reopened after a re-render (Tab in the last cell, a structural button of the table bar) | The table scrolls to the reopened cell the same way |
| A layout pass resizes the table box under an open editor (a pane resize, a toolbar change; the edited table keeps its Auto breakout, SwRS-MDOKFSTUDIO-LAYOUT-023) | The table scrolls again so that the cell and its editor lie inside the new box |

### Scenario (boundary): A table inside a quote or an admonition

| Input | Outcome |
| --- | --- |
| Tab in the last cell of a pipe table inside a blockquote, a GFM alert or a MyST admonition | The row is added with the container prefix and, once the page renders the saved text, the editor reopens in the same table, found by its rank among the tables of the container, not in the first one (see SwRS-MDOKFSTUDIO-TABLE-121) |

### Related requirements

- SwRS-MDOKFSTUDIO-TABLE-048: the table bar above the table that shows the position of the selected cell after each move.
- SwRS-MDOKFSTUDIO-TABLE-025: Escape or Cancel in a row that Tab added, while it is still empty, removes it.

### Verification notes

- Method: test/page/runtimeTableCellEditor.test.ts (Tab and Shift+Tab, Tab in the last cell, Shift+Tab in the first header cell, arrow keys in every direction, native arrows with a selection, modifiers, IME or a caret inside a multi-line cell, arrow without a matching model cell, block navigation fallback for ArrowUp, Home and End, the table box scrolled to a cell right of it, left of it across the wrap and with Shift+Tab, a visible cell, a target wider than the box, a click on a partly hidden cell, a layout pass that resizes the box under an open editor; scenarios Tab along a row, Tab in the last cell, the cell left shows its new text (a new row, a changed cell, each of the four arrow keys), Shift+Tab, ArrowLeft and ArrowRight, ArrowUp and ArrowDown, keys that stay native, no cell in the arrow direction, Home and End, Tab in a table wider than the pane).
- Method: test/page/cellInlineMarkdown.test.ts (the inline Markdown the cell left shows: marks, link allowlist with `javascript:`, `data:` and protocol-relative `//host` targets left without href, backslash escapes, `<br>`, no emphasis inside a word such as `snake_case_name` or around spaces such as `2 * 3 * 4`, HTML never parsed).
- Method: test/integration/realInput/markers.ts and real-window scenario scenarioTableTab (id table-editing/r05-tab-adds-row) in test/integration/realInput/editorWidgets.ts (Tab along a row, Tab in the last cell, the first cell of the new row shows the text typed after Tab).
- Method: test/integration/realInput/markers.ts and real-window scenario scenarioWideTableTab in test/integration/realInput/wideTableTab.ts, assertion only (Tab in a table wider than the pane: real Tab and Shift+Tab presses through the row and across the wrap, and from the last cell of a table scrolled to its end, in Margin and Auto width).
- Method: test/page/runtimeTableCellTabRow.test.ts (the Tab hint in the last cell only, none in the first cell or the last column of another row, `aria-describedby`, the hint after Tab into the last cell and gone after Shift+Tab out of it; createTabHint and isTabNewRowCell in src/page/modules/tableTabRow.ts).
- Method: visual scenarios table-editing/v30 and v31 (check_table_tab_hint in test/visual/capture_table_tab_hint.py: no hint in the first body cell; in the last cell the text, `aria-describedby`, and the hint, Done and Cancel inside the editor, the table's box and the viewport, light at 900 px and dark at 360 px).
- Method: test/integration/realInput/tableTabRow.ts (real-window scenario scenarioTableTabRow, id table-tab-row: the hint is visible after a click on the last cell).
- Method: test/page/runtimeBlockEditor.test.ts (a table cell arrow inside a wrapped cell does not move to another cell; keys that stay native, wrapped cell row).
- Method: test/page/runtimeEditorFlush.test.ts (Ctrl+Tab pass-through; Shift+Tab and held modifiers, Ctrl+Tab row).
- Method: visual scenario table-editing/v02 (step arrowdown, ArrowDown only) and check_cell_end_key in test/visual/capture_edit_checks.py on scenario table-editing/v01 (Home and End); the scroll assertions bite on macOS only, because headless Chromium on Linux moves the caret natively.
- Criteria: The text box parent, value and selection range after each key, one previewEditOpen only for the moves inside the table; not prevented and no message posted for every native case; one extra row in editedText and the editor reopened in column 0 of the new row. In a wide table: the table scrollLeft after each move (unit) and, in the real window, the editor rect inside the webview viewport and no horizontal page scroll after every key. The cleared pending navigation is read from tabThroughTableCells and has no dedicated test; the reveal runs at the end of renderTableCellEditor and is asserted for three cases: a click on a visible cell (no scroll), a click on a partly hidden cell, and an editor that opens in a hidden cell on its source reply; the reveal runs again after every Auto width layout pass, asserted for a box that is resized under an open editor; the reopen after a re-render (Tab in the last cell, a structural button of the table bar) goes through the same source-reply open path and has no dedicated test; Shift+Ctrl+Tab has no test; the other block-navigation directions follow the same branch and are not asserted separately.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TABLE-006](../../strs/table-editing/StRS-MDOKFSTUDIO-TABLE-006.md): Tab, arrows and editing keys work in a table cell
- Depends on:
  - [SwRS-MDOKFSTUDIO-BLOCK-058](../block-editing/SwRS-MDOKFSTUDIO-BLOCK-058.md): Every host source edit is one undo step, renders once and reports a failed apply
<!-- okf:links:end -->
