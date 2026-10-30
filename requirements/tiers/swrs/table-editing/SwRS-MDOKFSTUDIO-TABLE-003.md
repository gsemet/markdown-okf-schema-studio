---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-003
uuid: d476dbbb-aa46-495f-8a90-2732da559096
title: Row above inserts an empty row above the selected body row
description: When the writer presses Row above on the table bar with the cell
  editor in a body row, the extension SHALL insert an empty body row above the
  selected row, keep the text of every existing cell, save the table and reopen
  the cell editor in the new row, with Row above disabled in the header row.
project: markdown-okf-schema-studio
scope: table-editing
req_lifecycle: proposed
status: stable
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
default_owner_email: gaetan@xeberon.net
---

## EARS Expression

### Normative behavior

When the writer presses Row above on the table bar with the cell editor in a body row, the extension SHALL insert an empty body row above the selected row, keep the text of every existing cell, save the table and reopen the cell editor in the new row, with Row above disabled in the header row.

### Scenario (nominal): Row above on a body row

| Input | Outcome |
| --- | --- |
| Editor in the second body row, "qq" typed in the cell, Row above | A final previewEditSave carries an empty body row above that row and "qq" in the original cell; the page reopens the editor in the new row, in the same column |

### Scenario (refusal): Header row

| Input | Outcome |
| --- | --- |
| Editor in the header row, the bar inspected | Row above is disabled and nothing is saved |

### Verification notes

- Method: test/page/runtimeTableCellEditor.test.ts (Row above inserts an empty row above the selected one and keeps its text; Row above is off in the header row), and the real-window scenario in test/integration/tableStructureReal.ts.
- Criteria: the saved text, the pending navigation row and column, the disabled attribute of the button.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TABLE-008](../../strs/table-editing/StRS-MDOKFSTUDIO-TABLE-008.md): A table bar locates the writer and edits rows and columns
<!-- okf:links:end -->
