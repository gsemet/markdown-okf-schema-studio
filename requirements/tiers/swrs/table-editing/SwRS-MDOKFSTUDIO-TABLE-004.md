---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-004
uuid: 7ad49a62-412c-43d5-8f63-218cf2d2f577
title: Col left inserts an empty column to the left of the selected column
description: When the writer presses Col left on the table bar, the extension
  SHALL insert an empty column to the left of the selected column, keep the text
  of every existing cell and the style of every line, save the table and reopen
  the cell editor in the new column.
project: markdown-okf-schema-studio
scope: table-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TABLE-008
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/tableStructure.ts
tested_in_files:
- test/page/runtimeTableCellEditor.test.ts
---

## EARS Expression

### Normative behavior

When the writer presses Col left on the table bar, the extension SHALL insert an empty column to the left of the selected column, keep the text of every existing cell and the style of every line, save the table and reopen the cell editor in the new column.

### Scenario (nominal): Col left on a column

| Input | Outcome |
| --- | --- |
| Editor in the header cell "B" of a two-column table, Col left | A final previewEditSave carries a table whose header reads "A", an empty cell, "B", whose delimiter row has a third "---" cell and whose body rows gain an empty cell at the same place; the title "B" is kept; the page reopens the editor in the new column of the same row |

### Scenario (boundary): Style kept

| Input | Outcome |
| --- | --- |
| An indented, padded table, Col left on its first column | Every line keeps its indentation, padding and outer pipes, as for Col right (see SwRS-MDOKFSTUDIO-TABLE-055) |

### Verification notes

- Method: test/page/runtimeTableCellEditor.test.ts (Col left inserts an empty column to the left and leaves the title of the selected column), and the real-window scenario in test/integration/tableStructureReal.ts.
- Criteria: the cells of each saved line, the pending navigation row and column.
