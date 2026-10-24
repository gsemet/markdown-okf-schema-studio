---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-056
uuid: f7b5f687-109e-49e2-8434-27fdaa5bacc0
title: Undo and redo keys in a field editor act on the field text
description: When a writer presses the undo or redo keys in a field editor
  control, the extension SHALL leave them to the control and not pass them to
  the document.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-004
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Undo and redo keys in a field editor act on the field text

### Normative behavior

When a writer presses the undo or redo keys in a field editor control, the extension SHALL leave them to the control and not pass them to the document.

### Scenario: Nominal

- GIVEN a value editor with typed text
- WHEN the writer presses Cmd or Ctrl+Z or Y
- THEN the key event stops at the control and the document is not undone

### Scenario: Boundary or refusal

- GIVEN a key editor, a list item or the custom key input
- WHEN the same keys are pressed
- THEN the same happens

### Verification notes

- Method: Inspection of keepUndoInControl (src/page/features/textControls.ts); the table cell editor has a test, the field editors have none.
- Criteria: keepUndoInControl calls stopPropagation for Z and Y with Cmd or Ctrl.
