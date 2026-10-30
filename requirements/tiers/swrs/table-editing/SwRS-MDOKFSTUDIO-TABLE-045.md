---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-045
uuid: 05deec40-e58b-4ad9-8a7a-6cd833d9ec82
title: Undo and redo shortcuts stay in the cell text box
description: When the writer presses Cmd or Ctrl with Z or Y in the cell text
  box, the extension SHALL stop the event before it reaches any window listener
  and leave the undo or redo to the text box.
project: markdown-okf-schema-studio
scope: table-editing
req_lifecycle: deprecated
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TABLE-006
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
---

## Undo and redo shortcuts stay in the cell text box

### Normative behavior

When the writer presses Cmd or Ctrl with Z or Y in the cell text box, the extension SHALL stop the event before it reaches any window listener and leave the undo or redo to the text box.

### Scenario: Undo in a cell

- GIVEN a cell edited and a window keydown listener installed
- WHEN the writer presses Cmd+Z or Ctrl+Z
- THEN the listener never sees the key and the browser undoes the typing in the text box

### Scenario: Other chord

- GIVEN Cmd+B pressed in the cell
- WHEN the key is handled
- THEN it is not treated as undo

### Verification notes

- Method: Unit tests undo and redo keys stop at the table cell editor and reach no window listener and the editing shortcuts do not touch the table cell editor in test/page/runtimeBlockEditor.test.ts.
- Criteria: No window listener call for the undo and redo chords; the document text is not touched.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TABLE-006](../../strs/table-editing/StRS-MDOKFSTUDIO-TABLE-006.md): Tab, arrows and editing keys work in a table cell
<!-- okf:links:end -->
