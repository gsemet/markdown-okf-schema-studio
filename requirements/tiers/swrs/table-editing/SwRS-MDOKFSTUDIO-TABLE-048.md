---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-048
uuid: 5427b163-8476-4fde-a707-2f02712c049e
title: A labelled table bar above the table tells the position and holds the
  buttons
description: When a cell editor opens in a table, the extension SHALL create
  once a toolbar named "Table row and column actions" in the page flow directly
  above the table, showing five labelled operation buttons and a status with the
  position of the selected cell, keep it while the editor moves between cells of
  that table, and remove it when the editor closes.
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
- src/core/preview/styles/editModeStyles.ts
- src/page/features/tableCellEditor.ts
tested_in_files:
- test/core/preview/fmtableReq.requirements.test.ts
- test/core/preview/previewStyles.test.ts
- test/integration/realInput.markers.ts
- test/page/runtimeTableCellEditor.test.ts
- test/visual/capture_edit_checks.py
- test/visual/scenarioDefinitions2.ts
---

## A labelled table bar above the table tells the position and holds the buttons

### Normative behavior

When a cell editor opens in a table, the extension SHALL create once a toolbar named "Table row and column actions" in the page flow directly above the table, showing five labelled operation buttons and a status with the position of the selected cell, keep it while the editor moves between cells of that table, and remove it when the editor closes.

### Scenario (nominal): Bar above the table

- GIVEN a cell editor opened in a table
- WHEN the page is inspected
- THEN a toolbar named "Table row and column actions" is the previous sibling of the table in the page flow, with no floating coordinates, and its bottom is not below the top of the table

### Scenario (boundary): Placement and lifetime

| Input | Outcome |
| --- | --- |
| A table that is the only child of a div wrapper that has no source-line attribute, a cell editor opens | The bar is placed before the wrapper |
| A table without a parent | The bar falls back to the body (read from the code, untested) |
| The editor moves to the next cell with Tab | The same bar element is still in place and only its status changes |
| The editor is closed by Escape or by a save | No table bar is left |

### Scenario (nominal): Five labelled operation buttons

- GIVEN a cell editor open
- WHEN the bar is inspected
- THEN it holds five buttons marked as table operations, in that order, each with an svg icon, a title and a label, and the buttons that follow the separator belong to the cell formatting group and are not table operations

| Visible label | Accessible name, title and tooltip name |
| --- | --- |
| Row + | Insert row after selected row |
| Row − | Delete selected row |
| Col + | Insert column after selected column |
| Col − | Delete selected column |
| List table | Convert to list-table |

### Scenario (boundary): Groups and rules

| Input | Outcome |
| --- | --- |
| The group attributes of the five buttons are read | The buttons carry the groups row, row, column, column and table |
| The styles are read | The rule style applies to the first button of the column group and of the table group: a thin rule before Col + and before List table |
| The styles are read for Row +, Row − and Col − | No rule is drawn before them |
| The cell formatting group wraps onto a second line of the bar | Its rule is the first element of the group, so it starts the second line instead of ending the first |

### Scenario (nominal): Status of the selected cell

| Input | Outcome |
| --- | --- |
| Two-column table with two body rows, editor in the header's first cell | The status reads "Header · column 1 of 2" |
| The editor in the second cell of the first body row | The status reads "Row 1 of 2 · column 2 of 2" |
| A column added with Col +, the status read | It counts the new column count and the new selected column |
| The editor moves to another cell | The status is updated at every cell switch |
| The status has no text | It is not displayed and takes no room on the bar line |
| The status has text (the position of the cell) | It is displayed |

### Scenario (boundary): Status centring

| Input | Outcome |
| --- | --- |
| Cell editor open in a sixteen-column table at 900 px; the vertical centres of the status and of the first operation button are compared | They differ by at most 2 px |
| A status that wraps onto its own line in a narrow pane | The centring is not required |

### Scenario (boundary): Narrow pane

| Input | Outcome |
| --- | --- |
| Cell editor open in a 460 px pane | The bar and its cell formatting group wrap onto several lines: no button of the cell group lies outside the bar and the bar is not wider than the viewport |
| Cell editor open in a 360 px pane | The bar and its group wrap inside the pane without overlap, which follows from the wrapping style and is not covered by any scenario |

### Related requirements

- SwRS-MDOKFSTUDIO-TABLE-055: the row and column buttons of the bar.
- SwRS-MDOKFSTUDIO-TABLE-035: the cell moves that update the status.

### Verification notes

- Method: test/page/runtimeTableCellEditor.test.ts (table toolbar sits in the flow above the table with text labels and a position status; table editing switches cells without losing changes and finalizes before leaving the table; table cell editing exposes row and column operations and saves the edited table; scenarios bar above the table, placement and lifetime, five buttons, groups (group attributes), status).
- Method: test/integration/realInput.markers.ts and real-window scenario scenarioTableToolbar (id table-editing/r06-cell-bar-in-flow) in test/integration/realInput.test.ts (bar above the table); visual scenarios table-editing/v02 to v05 (a bar directly above the table that covers no cell) and table-editing/v24 and v25 (360 px: one rule per group, the rule of the cell group level with the group's first line).
- Method: test/visual/capture_edit_checks.py: check_cell_bar_formatting (five operations; narrow pane at 460 px on table-editing/v03 and v05) and check_cell_editor_chrome (status centring, on table-editing/v01 to v05).
- Method: test/core/preview/previewStyles.test.ts (status centring style) and test/core/preview/fmtableReq.requirements.test.ts (the table bar status takes no room when it is empty).
- Criteria: The toolbar role and name, its position before the table, and in the visual check a bottom edge not below the table top; five elements with data-sphinx-table-operation, each with an icon and a title; the exact status strings, T being the number of body rows of the model; a centre difference of at most 2 px, or a status below the button row; no cell group button outside the bar and no horizontal overflow at 460 px. The tooltip display and position are not asserted for this bar. The rule style is a style rule in src/core/preview/styles/editModeStyles.ts selecting the first button of the column group and of the table group (adjacent-sibling selectors); the style test in previewStyles.test.ts reads that selector and the flex rule of the wrapper that holds the cell group's separator (editPaletteStyles.ts); the wrapping itself is shown by the visual scenarios. Scenarios table-editing/v24 and v25 (360 px) reach the branch of the check that expects wrapping at 400 px or less; the check also reads the computed rule of each operation button and the position of the cell group's separator against its first button. The descriptions of visual scenarios table-editing/v02 to v05 in test/visual/scenarioIds.ts still say "four-action row and column bar", which is stale: the bar has five operations and the check asserts five.
