---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-013
uuid: 66db5b79-9e94-439d-ada6-2016694ef2f1
title: A cell edit saves the whole table and moves between cells without
  reopening
description: When the writer types in a cell text box, the extension SHALL
  remember each change in the table model so that the autosave carries the whole
  serialised table and not only the edited cell, and keep that model and the
  same edit session when the editor moves to another cell of the table.
project: markdown-okf-schema-studio
scope: table-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TABLE-001
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-042
- SwRS-MDOKFSTUDIO-BLOCK-058
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/tableCellEditor.ts
tested_in_files:
- test/page/runtimeTableCellEditor.test.ts
default_owner_email: gaetan@xeberon.net
---

## A cell edit saves the whole table and moves between cells without reopening

### Normative behavior

When the writer types in a cell text box, the extension SHALL remember each change in the table model so that the autosave carries the whole serialised table and not only the edited cell, and keep that model and the same edit session when the editor moves to another cell of the table.

### Scenario (nominal): Typing in one cell
- GIVEN a two-column table with two body rows and the editor in the first body cell
- WHEN the writer types a new text and the autosave fires
- THEN one non-final previewEditSave is posted whose editedText is the whole table with the new text in that cell and every other cell unchanged

### Scenario (nominal): Two cells edited
- GIVEN text typed in one cell, then the editor moved to another cell where text is typed too
- WHEN the autosave of the second cell fires
- THEN editedText holds both changes

### Scenario (nominal): Switch to a neighbouring cell
- GIVEN a cell editor open on the first body cell of a two-column table
- WHEN the writer clicks the other body cell of the same row
- THEN the editor sits in the new cell with its raw Markdown, no previewEditOpen was posted for the click, and later saves carry the same editId

### Scenario (boundary): Cell missing from the model
- GIVEN a rendered cell whose position has no cell in the parsed table model
- WHEN the writer clicks it
- THEN the editor stays where it was

### Scenario (nominal): Switch right after typing
- GIVEN text typed in a cell less than 400 ms ago
- WHEN the writer clicks another cell
- THEN a non-final previewEditSave with the typed text is posted immediately and the autosave timer is cleared

### Scenario (boundary): Switch with nothing typed
- GIVEN a cell editor open with no change since the last post
- WHEN the writer clicks another cell
- THEN no previewEditSave is posted

### Scenario (nominal): The cell the editor leaves shows its rendered content again
- GIVEN the editor on cell A and the writer clicks cell B
- WHEN the move is done
- THEN cell A has no selected mark and shows its original rendered content, and cell B carries the mark and hides its content

### Scenario (boundary): Editor closed
- GIVEN the editor on cell B closed by Escape
- WHEN the page is inspected
- THEN no cell carries the selected mark

### Related requirements
- SwRS-MDOKFSTUDIO-BLOCK-042: the 400 ms delay and the one-save-per-burst rule of the autosave.
- SwRS-MDOKFSTUDIO-BLOCK-058: every host source edit is one undo step and renders once.

### Verification notes
- Method: test/page/runtimeTableCellEditor.test.ts ("table cell editing exposes row and column operations and saves the edited table" and "table editing switches cells without losing changes and finalizes before leaving the table" for typing in one cell, two cells edited, neighbouring cell switch and the selected mark of the left cell being null; "switching table cells posts the pending change immediately" for the switch right after typing).
- Method: visual scenarios table-editing/v02 to v05 (autosave of edits, one editor and one edit session).
- Criteria: editedText of the last save equals the serialised model with all typed changes. No new previewEditOpen after the switch and an unchanged editId across the session. The message of a switch is non-final, carries the typed text, and flushing the timers afterwards posts nothing more. Mark and content wrapper presence is checked for both cells after the move. The missing-cell boundary is read from switchTableCell and has no dedicated test.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TABLE-001](../../strs/table-editing/StRS-MDOKFSTUDIO-TABLE-001.md): A writer edits a table cell in place and never loses the text
- Depends on:
  - [SwRS-MDOKFSTUDIO-BLOCK-042](../block-editing/SwRS-MDOKFSTUDIO-BLOCK-042.md): Typing is autosaved as the smallest single replacement
  - [SwRS-MDOKFSTUDIO-BLOCK-058](../block-editing/SwRS-MDOKFSTUDIO-BLOCK-058.md): Every host source edit is one undo step, renders once and reports a failed apply
<!-- okf:links:end -->
