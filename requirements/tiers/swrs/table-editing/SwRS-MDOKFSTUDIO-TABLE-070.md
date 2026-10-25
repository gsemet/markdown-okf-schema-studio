---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-070
uuid: 56dba447-f374-4cd8-89af-4812971ec663
title: The List table button converts the edited table in one final save
description: When the writer presses List table in the table bar, the extension
  SHALL post the pipe table, including the text typed in the current cell, as a
  {list-table} directive in one final save.
project: markdown-okf-schema-studio
scope: table-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TABLE-011
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-058
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/tableCellEditor.ts
tested_in_files:
- test/page/fmtableReqTable.requirements.test.ts
- test/page/runtimeTableCellEditor.test.ts
---

## The List table button converts the edited table in one final save

### Normative behavior

When the writer presses List table in the table bar, the extension SHALL post the pipe table, including the text typed in the current cell, as a {list-table} directive in one final save.

### Scenario (nominal): Convert after typing
- GIVEN a two-column pipe table with text typed in a cell and the editor open
- WHEN the writer presses List table
- THEN one final previewEditSave is posted whose editedText is the {list-table} form of the table, typed text included, so the whole change is one undo step (see SwRS-MDOKFSTUDIO-BLOCK-058)

### Scenario (boundary): Table in a captioned figure
- GIVEN a pipe table inside a {table} directive that renders as a figure
- WHEN the bar is shown
- THEN the List table button is disabled

### Scenario (boundary): A cell change drops a conversion that was not saved
| Input | Outcome |
| --- | --- |
| A List table conversion prepared and its save refused by the host, then the writer types in the cell (or presses a row or column button) | The next save carries the pipe table with the typed text, not the prepared conversion |
| No prepared conversion and the writer types | Saves carry the pipe table as usual |

### Scenario (boundary): Line break pasted into the cell
- GIVEN a line break pasted into the cell text box
- WHEN the writer presses List table
- THEN the line break is already a space (see SwRS-MDOKFSTUDIO-TABLE-091) and the table converts in one final save

### Related requirements
- SwRS-MDOKFSTUDIO-TABLE-073: the List table palette action that converts the table at the caret.
- SwRS-MDOKFSTUDIO-TABLE-076: the refusal reasons of a conversion.
- SwRS-MDOKFSTUDIO-TABLE-091: the pasted line break that becomes a space.

### Verification notes
- Method: test/page/runtimeTableCellEditor.test.ts, unit tests CR038: the table toolbar converts the pipe table to a list-table in one final save ("Convert after typing") and CR038: the conversion button is off for a table inside a captioned figure ("Table in a captioned figure").
- Method: test/page/fmtableReqTable.requirements.test.ts, unit tests a cell change after a refused conversion drops the prepared list-table and saves the pipe table ("A cell change drops a conversion that was not saved") and the List table button converts the table after a line break was pasted into the cell ("Line break pasted into the cell").
- Criteria: A single final message with the list-table text; the disabled button in a figure; editedText of the next save equal to the serialised pipe table; the pasted line break written as a space in the list-table.
