---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-046
uuid: ea054013-69d4-47cb-adf3-26391d026efd
title: A key the cell editor handled does not reach VS Code
description: When the cell editor or the table bar has handled Tab, Enter,
  Escape or an arrow key, the extension SHALL stop that key at the document so
  that VS Code runs no shortcut for it, and SHALL let keys the editor did not
  use, such as Ctrl+Tab, reach VS Code.
project: markdown-okf-schema-studio
scope: table-editing
lifecycle: deprecated
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

## A key the cell editor handled does not reach VS Code

### Normative behavior

When the cell editor or the table bar has handled Tab, Enter, Escape or an arrow key, the extension SHALL stop that key at the document so that VS Code runs no shortcut for it, and SHALL let keys the editor did not use, such as Ctrl+Tab, reach VS Code.

### Scenario: Tab moved the editor

- GIVEN the cell editor moved to the next cell on Tab
- WHEN the keydown bubbles to the document
- THEN its propagation is stopped once and the page records the key as kept

### Scenario: Ctrl+Tab

- GIVEN Ctrl+Tab pressed in the cell text box
- WHEN the keydown bubbles to the document
- THEN it is not stopped and reaches VS Code

### Verification notes

- Method: Unit tests CR 041: Tab handled by the table cell editor stops at the document; Ctrl+Tab goes on in test/page/runtimeEditorFlush.test.ts and, in test/page/modules/editorKeys.test.ts, CR 041: Tab, Enter, Escape and the arrow keys an open editor handled are the page's and CR 041: keys no editor handled keep reaching VS Code.
- Criteria: Number of stopPropagation calls per press. The policy is page-wide (block editor and frontmatter editor too); this requirement states the cell and table bar case.
