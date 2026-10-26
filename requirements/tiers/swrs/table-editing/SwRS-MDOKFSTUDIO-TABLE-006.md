---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-006
uuid: 3ee63d37-94e1-41e0-a234-0b04fa281277
title: The cell text box wraps and fits its text in the block editor font
description: When a cell editor is open, the extension SHALL style its text box
  with the same editor font family, font size and line height as the block
  editor, wrap the cell text inside the cell with the text box fitted to it, and
  place a Done button and a Cancel button under the text box inside the cell,
  compact and wrapping within the column, and in edit mode keep every table cell
  at least 8em wide and the cell being edited at least 300 px wide.
project: markdown-okf-schema-studio
scope: table-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TABLE-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/editModeStyles.ts
- src/page/features/blockEditor.ts
- src/page/features/tableCellEditor.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/integration/tableEmptyColumn.test.ts
- test/page/runtimeTableCellEditor.test.ts
- test/visual/capture_edit_checks.py
---

## The cell text box wraps and fits its text in the block editor font

### Normative behavior

When a cell editor is open, the extension SHALL style its text box with the same editor font family, font size and line height as the block editor, wrap the cell text inside the cell with the text box fitted to it, and place a Done button and a Cancel button under the text box inside the cell, compact and wrapping within the column.

### Scenario (nominal): Cell editor next to a block editor
| Pane width | Outcome |
| --- | --- |
| 900 px: a cell editor and, in another session, a block editor open in the same theme | the computed font family, font size and line height of each text box are equal |
| 460 px: the same cell editor | the three values are unchanged |

### Scenario (nominal): Long text wraps and the cell grows
- GIVEN a long cell text in a table of three columns, at 900 px and at 460 px
- WHEN the cell editor is open
- THEN the text wraps inside the cell, the text box shows no scrollbar and is as tall as its text, the row is taller, and every column keeps the width it had before the editor opened, except that the column of the edited cell grows to 300 px when it was narrower

### Scenario (boundary): Unbreakable text
- GIVEN a cell text with no space, longer than the cell
- WHEN the cell editor is open
- THEN the text wraps at any character (overflow-wrap anywhere) instead of widening the column

### Scenario (nominal): Window resize
- GIVEN a cell editor open with a long text
- WHEN the preview width changes
- THEN the text box height is recomputed from its scroll height

### Scenario (boundary): No editor open
- GIVEN no cell editor open
- WHEN the preview is resized
- THEN no text box is touched

### Scenario (nominal): Buttons in the cell
- GIVEN a cell editor open in a 900 px pane
- WHEN the cell is inspected
- THEN a Done button (accessible name "Done editing") and a Cancel button (accessible name "Cancel editing and restore the original text") are inside the cell, below the text box

### Scenario (nominal): Minimum cell width in edit mode
- GIVEN a table with a column added without a title (an empty header and empty cells), in edit mode
- WHEN no cell editor is open
- THEN every header and body cell is at least 8em wide, so the empty column can be clicked
- WHEN a cell editor opens in that column
- THEN the edited cell is at least 300 px wide, its editor and buttons are fully inside it, and the table scrolls horizontally instead of clipping the cell
- AND outside edit mode (reading view) no table cell has a minimum width

### Scenario (boundary): Wide table
- GIVEN a sixteen-column table wider than the pane and its far-right cell open
- WHEN the cell is inspected
- THEN the buttons wrap within their column and do not widen it

### Verification notes
- Method: visual check check_cell_editor_chrome in test/visual/capture_edit_checks.py, run on scenarios table-editing/v02 to v05 (900 and 460 px, light and dark): font equality, wrapping, column widths; scenarios table-editing/v01 (sixteen columns) and v02 to v05 (buttons).
- Method: test/core/preview/previewStyles.test.ts (the shared textarea rule with contain: inline-size in src/core/preview/styles/editModeStyles.ts).
- Method: test/page/runtimeTableCellEditor.test.ts ("the table cell field is re-fitted when the preview is resized" for the window resize; "the table cell editor has Done and Cancel but no status hint" for the buttons).
- Method: test/core/preview/previewStyles.test.ts ("in edit mode table cells keep a minimum width and the edited cell is wider": the 8em and 300 px rules are scoped to edit mode); visual check check_cell_editor_chrome asserts the edited cell is at least 300 px wide and the other columns keep their width.
- Method: real-window test test/integration/tableEmptyColumn.test.ts (cream preview theme on a dark VS Code theme): a column is added with the toolbar Col +, saved with Done, its empty header is opened; the empty column cells are measured at least 8em wide, the edited cell at least 300 px wide and the editor inside it (it fails on the old CSS: the column was 23 px wide).
- Criteria: The computed font family, size and line height of the cell text box equal those of the block editor rule; the style comes from the shared textarea rule. The visual check fails when the selected cell is more than 1 px wider or narrower than before the editor opened (a cell that was narrower than 300 px must be 300 px wide, an exception to the 1 px rule), or when the cell is shorter than before. The wrapping rule (pre-wrap, overflow-wrap anywhere, overflow hidden, height from scrollHeight) is read from the style and the field's resize function; no scenario asserts the absence of a scrollbar or the unbreakable-text boundary. The resizeTextarea hook of the active edit is called by the layout stabiliser and sets the height; the no-editor boundary is not tested. Both buttons are descendants of the cell editor region and below the text box. Wide tables themselves are specified in layout-width.
