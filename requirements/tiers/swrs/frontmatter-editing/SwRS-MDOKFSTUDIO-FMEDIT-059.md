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
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-008
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-BLOCK-041; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-BLOCK-041
default_owner_email: gaetan@xeberon.net
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

- Method: Unit test a task-list checkbox click is refused with a message while a field editor is open in test/page/fmtableReqFrontmatter.requirements.test.ts.
- Criteria: The same guard applies to an open block editor.
