---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-027
uuid: f41a5afd-4ff9-4544-a2f2-7d08929b336d
title: The Cancel button does what Escape does
description: When the writer presses Cancel in a cell editor, the extension
  SHALL cancel the edit exactly as Escape does.
project: markdown-okf-schema-studio
scope: table-editing
req_lifecycle: deprecated
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TABLE-001
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
---

## The Cancel button does what Escape does

### Normative behavior

When the writer presses Cancel in a cell editor, the extension SHALL cancel the edit exactly as Escape does.

### Scenario: Cancel before autosave

- GIVEN a cell edited and not autosaved
- WHEN Cancel is clicked
- THEN the editor closes with no message sent

### Scenario: Cancel after autosave

- GIVEN a cell edited and autosaved
- WHEN Cancel is clicked
- THEN a previewEditCancel is posted

### Verification notes

- Method: Unit test Cancel in the table cell editor does what Escape does in test/page/runtimeTableCellEditor.test.ts.
- Criteria: The sequence of messages equals the one produced by Escape in the same state.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TABLE-001](../../strs/table-editing/StRS-MDOKFSTUDIO-TABLE-001.md): A writer edits a table cell in place and never loses the text
<!-- okf:links:end -->
