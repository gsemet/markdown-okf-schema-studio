---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-047
uuid: b2e17bca-c302-420e-87f8-680f5dfb7ccb
title: Select all in the cell text box selects only the box text
description: When the writer presses Cmd+A (Ctrl+A elsewhere) in the cell text
  box, the extension SHALL stop the event at the document and leave the
  select-all to the text box so that only its text is selected.
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

## Select all in the cell text box selects only the box text

### Normative behavior

When the writer presses Cmd+A (Ctrl+A elsewhere) in the cell text box, the extension SHALL stop the event at the document and leave the select-all to the text box so that only its text is selected.

### Scenario: Cmd+A on macOS

- GIVEN the cell text box focused on macOS
- WHEN the writer presses Cmd+A
- THEN the event does not reach VS Code's window listener and the text of the box is selected

### Scenario: Other letter

- GIVEN Cmd+B or A without the modifier
- WHEN the key is handled
- THEN it is not treated as select-all

### Verification notes

- Method: Unit tests CR 041: Ctrl+A (Cmd+A on macOS) in a text control is the select-all of that control and CR 041: the shortcut stops at the document, so VS Code's window listener never forwards it in test/page/modules/selectAllKey.test.ts and test/page/runtimeEditorFlush.test.ts.
- Criteria: Propagation stopped once, default action not prevented. The policy is page-wide; this requirement states the cell case.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TABLE-006](../../strs/table-editing/StRS-MDOKFSTUDIO-TABLE-006.md): Tab, arrows and editing keys work in a table cell
<!-- okf:links:end -->
