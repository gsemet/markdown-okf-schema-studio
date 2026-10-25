---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-070
uuid: 56dba447-f374-4cd8-89af-4812971ec663
title: The List table button converts the edited table in one final save
description: When the writer presses List table in the table bar, the extension
  SHALL post the pipe table, including the text typed in the current cell, as a
  {list-table} directive in one final save, or show the refusal reason in the
  bar status and save nothing when the conversion refuses the table.
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

When the writer presses List table in the table bar, the extension SHALL post the pipe table, including the text typed in the current cell, as a {list-table} directive in one final save, or show the refusal reason in the bar status and save nothing when the conversion refuses the table.

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

### Scenario (refusal): Refusal reason
- GIVEN a conversion that returns a refusal
- WHEN the button is pressed
- THEN the reason is written to the bar status and nothing is saved

### Scenario (refusal): Nothing recognised
- GIVEN table text that the conversion does not recognise as a table
- WHEN the button is pressed
- THEN the button does nothing: no status text and no save

### Known issues
- Known issue: When a line break pasted into the cell makes the rows uneven (SwRS-MDOKFSTUDIO-TABLE-091), the table text no longer parses, the conversion finds no table and the button does nothing and shows no message.
- Known issue: The refusal branch cannot run: a pipe table that the cell editor can open always converts to a list-table, so the status is never written by this button. The no-table branch runs after a pasted line break (SwRS-MDOKFSTUDIO-TABLE-091).

### Related requirements
- SwRS-MDOKFSTUDIO-TABLE-073: the List table palette action that converts the table at the caret.
- SwRS-MDOKFSTUDIO-TABLE-076: the refusal reasons of a conversion.
- SwRS-MDOKFSTUDIO-TABLE-091: the line break that makes the rows uneven.

### Verification notes
- Method: test/page/runtimeTableCellEditor.test.ts, unit tests CR038: the table toolbar converts the pipe table to a list-table in one final save ("Convert after typing") and CR038: the conversion button is off for a table inside a captioned figure ("Table in a captioned figure").
- Method: test/page/fmtableReqTable.requirements.test.ts, unit tests a cell change after a refused conversion drops the prepared list-table and saves the pipe table ("A cell change drops a conversion that was not saved") and the List table button does nothing and shows no message when the table text is not recognised ("Nothing recognised").
- Method: "Refusal reason" is untested: the refusal branch cannot run (Known issue).
- Criteria: A single final message with the list-table text; the disabled button in a figure; editedText of the next save equal to the serialised pipe table; a refusal reason in the status when the conversion fails; no message and no save when the text is not recognised.
