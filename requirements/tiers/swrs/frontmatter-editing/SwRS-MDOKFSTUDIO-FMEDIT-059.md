---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-059
uuid: 882c6941-277f-4589-ac1c-001d16c52d74
title: A checkbox toggle is refused while a field editor is open
description: While a field editor is open, the extension SHALL refuse a
  task-list checkbox click with "Save or cancel this edit before toggling a
  checkbox." in the editor.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-011
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A checkbox toggle is refused while a field editor is open

### Normative behavior

While a field editor is open, the extension SHALL refuse a task-list checkbox click with "Save or cancel this edit before toggling a checkbox." in the editor.

### Scenario: Nominal

- GIVEN a field editor open
- WHEN the writer clicks a task-list checkbox
- THEN the toggle is cancelled and the editor status shows the message

### Scenario: Boundary or refusal

- GIVEN no editor open
- WHEN the writer clicks the checkbox
- THEN a previewCheckboxToggle is posted

### Verification notes

- Method: Inspection of src/page/features/checkboxes.ts.
- Criteria: The same guard applies to an open block editor.
