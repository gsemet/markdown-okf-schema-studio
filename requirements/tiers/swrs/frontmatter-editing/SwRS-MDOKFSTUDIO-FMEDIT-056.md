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
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-019; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMEDIT-019
default_owner_email: gaetan@xeberon.net
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

- Method: Unit test undo and redo keys in a field editor stop at the control, in the value and the key editor in test/page/fmtableReqFrontmatter.requirements.test.ts.
- Criteria: keepUndoInControl calls stopPropagation for Z and Y with Cmd or Ctrl.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMEDIT-001](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-001.md): A writer edits metadata values in place with fitting controls
- Superseded by:
  - [SwRS-MDOKFSTUDIO-FMEDIT-019](SwRS-MDOKFSTUDIO-FMEDIT-019.md): A field editor saves a changed value and Escape cancels it
<!-- okf:links:end -->
