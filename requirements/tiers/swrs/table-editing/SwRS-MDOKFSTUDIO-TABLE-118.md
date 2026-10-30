---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-118
uuid: f5ab483d-7389-4f06-aac5-7f6fa6900a72
title: A table cell editor that opens late leaves the focus in a field that took
  it
description: When the source of a table cell editor reaches the page after
  another text field outside the editor took the focus (the find field opened
  with Cmd/Ctrl+F right after the click), the page SHALL build the cell editor
  without moving the focus, so text typed in that field never reaches the
  Markdown table.
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
- src/page/features/tableCellEditor.ts
- src/page/features/textControls.ts
tested_in_files:
- test/page/runtimeTableCellEditor.test.ts
default_owner_email: gaetan@xeberon.net
---

## A table cell editor that opens late leaves the focus in a field that took it

### Normative behavior

When the source of a table cell editor reaches the page after another text field outside the editor took the focus (the find field opened with Cmd/Ctrl+F right after the click), the page SHALL build the cell editor without moving the focus, so text typed in that field never reaches the Markdown table.

### Scenario (nominal): The find field keeps the focus

- GIVEN edit mode on and a click on a pipe table cell, whose editor waits for its source from the host
- WHEN the find bar opens before the source arrives (Cmd/Ctrl+F) and the source then arrives
- THEN the cell editor is built with its text box, and the find field keeps the focus: what the writer types goes on into the search, not into the table cell

| Input | Outcome |
| --- | --- |
| Another text field, select or editable element outside the editor took the focus | It keeps the focus; the cell editor opens unfocused |
| The focus is where it was when the editor opened (the page, the clicked cell) | The cell text box takes the focus as in TABLE-001 |
| The focus moved into the editor frame itself | The cell text box takes the focus |

### Scenario (boundary): The editor stays open

- GIVEN a cell editor built without the focus because another field held it
- WHEN the writer clicks into the cell text box
- THEN the cell editor is an open edit like any other, and the click edits the cell

### Verification notes

- Method: test/page/runtimeTableCellEditor.test.ts, unit tests over the page script: the source delivered after the find bar opened leaves the focus in the find field; the source delivered with the focus still on the page focuses the cell text box.
- Criteria: features/tableCellEditor.ts focuses the cell text box only when no text field outside the frame took the focus since the editor opened (`focusAtOpen`, recorded by features/blockEditor.ts), through the check shared with BLOCK-255 (`focusMovedToAnotherField` in features/textControls.ts).

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TABLE-008](../../strs/table-editing/StRS-MDOKFSTUDIO-TABLE-008.md): A table bar locates the writer and edits rows and columns
<!-- okf:links:end -->
