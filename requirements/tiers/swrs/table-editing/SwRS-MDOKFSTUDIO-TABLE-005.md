---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-005
uuid: 6616f007-4c56-40a7-b9cc-364de1952e47
title: The row and column buttons also edit a plain list-table
description: When the writer opens a cell of a plain list-table (one header row,
  one-line cells, no title, label or option other than header-rows), the
  extension SHALL open the cell editor with the row and column buttons of the
  table bar and write the changed grid back as a list-table, leaving the text of
  an untouched list-table as it was.
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

When the writer opens a cell of a plain list-table (one header row, one-line cells, no title, label or option other than header-rows), the extension SHALL open the cell editor with the row and column buttons of the table bar and write the changed grid back as a list-table, leaving the text of an untouched list-table as it was.

### Scenario (nominal): Buttons on a list-table

| Input | Outcome |
| --- | --- |
| A cell of ```{list-table} with ":header-rows: 1", Col left | The cell editor opens, and the saved text is the list-table with an empty first cell added to every row (`* -` followed by the other cells) |
| The same list-table, a cell edited and committed with no button | Only the cell changes in the saved list-table |
| The same list-table, nothing changed | The text is saved as it was, character for character |

### Scenario (refusal): Not a plain list-table

| Input | Outcome |
| --- | --- |
| A list-table with a title, a label, ":widths:", no ":header-rows: 1", several-line cells or indentation | The whole block opens in the raw Markdown editor, as before |
| A plain list-table open in the cell editor | List table (the conversion button) is disabled |

### Verification notes

- Method: test/page/runtimeTableCellEditor.test.ts (a plain {list-table} opens the cell editor and its buttons write a list-table), test/page/fmtableReqTable.requirements.test.ts (a list-table with options opens the raw editor), and the real-window scenario in test/integration/tableStructureReal.ts.
- Criteria: the saved list-table text, the presence of the cell editor, the disabled button.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TABLE-008](../../strs/table-editing/StRS-MDOKFSTUDIO-TABLE-008.md): A table bar locates the writer and edits rows and columns
<!-- okf:links:end -->
