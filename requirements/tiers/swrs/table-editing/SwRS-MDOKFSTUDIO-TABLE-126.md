---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-126
uuid: aae98259-4bd0-4ccd-b043-93ab59ed2e1b
title: The cell editor is revealed in the table's scroll box
description: When the editor moves to a cell of a table wider than the pane, the
  extension SHALL scroll the table's sideways scroll box by the smallest amount
  that brings the cell and its editor inside it, without scrolling the page.
project: markdown-okf-schema-studio
scope: table-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TABLE-006
scenarios:
- id: S1
  title: Tab in a table wider than the pane
annotation_exemption: false
exemption_reason:
derived_by: []
supersedes:
- SwRS-MDOKFSTUDIO-TABLE-035
implemented_in_files:
- src/page/features/tableCellEditor.ts
tested_in_files:
- test/page/runtimeTableCellEditorReveal.test.ts
default_owner_email: gaetan@xeberon.net
---

## The cell editor is revealed in the table's scroll box

### Normative behavior

When the editor moves to or opens in a cell of a table that scrolls sideways in its own box, the extension SHALL bring that cell and its editor into the visible part of the box, instantly and by the smallest amount, with a 16 px margin and without scrolling the page, and again after a layout pass that resizes the box.

### Scenario S1 (nominal): Tab in a table wider than the pane

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

### Related requirements

- SwRS-MDOKFSTUDIO-LAYOUT-023: the edited table keeps its Auto breakout.
- SwRS-MDOKFSTUDIO-TABLE-006: the room of the cell editor.

### Verification notes

- Method: test/page/runtimeTableCellEditor.test.ts (the table box scrolled to a cell right of it, left of it across the wrap and with Shift+Tab, a visible cell, a target wider than the box, a click on a partly hidden cell, a layout pass that resizes the box under an open editor).
- Method: test/integration/realInput/markers.ts and real-window scenario scenarioWideTableTab in test/integration/realInput/wideTableTab.ts, assertion only (Tab in a table wider than the pane: real Tab and Shift+Tab presses through the row and across the wrap, and from the last cell of a table scrolled to its end, in Margin and Auto width).
- Criteria: the table scrollLeft after each move (unit) and, in the real window, the editor rect inside the webview viewport and no horizontal page scroll after every key; the reveal runs at the end of renderTableCellEditor and again after every Auto width layout pass; the reopen after a re-render (Tab in the last cell, a structural button of the table bar) goes through the same source-reply open path and has no dedicated test; the scroll assertions bite on macOS only, because headless Chromium on Linux moves the caret natively.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TABLE-006](../../strs/table-editing/StRS-MDOKFSTUDIO-TABLE-006.md): Tab, arrows and editing keys work in a table cell
- Supersedes:
  - [SwRS-MDOKFSTUDIO-TABLE-035](SwRS-MDOKFSTUDIO-TABLE-035.md): Tab and the arrow keys move through the table cells
<!-- okf:links:end -->
