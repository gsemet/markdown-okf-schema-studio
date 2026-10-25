---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-084
uuid: 40a499be-7b53-4691-b20d-c251ead66096
title: The field action menu stays inside its row in a narrow preview
description: When the field action menu is shown, the extension SHALL keep the
  menu and its tooltips inside the edited row without covering the value or
  other rows, wrapping inside the row at about 520 px.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-005
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-028; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMEDIT-028
---

## The field action menu stays inside its row in a narrow preview

### Normative behavior

When the field action menu is shown, the extension SHALL keep the menu and its tooltips inside the edited row without covering the value or other rows, wrapping inside the row at about 520 px.

### Scenario: Nominal

- GIVEN a field editor open at a normal preview width
- WHEN the menu renders
- THEN neither the value nor another row is covered by the menu or its tooltips

### Scenario: Boundary or refusal

- GIVEN a preview about 520 px wide
- WHEN the menu renders
- THEN the menu wraps inside the edited row and covers nothing

### Verification notes

- Method: Visual scenario frontmatter-editing/v02-edit-enum-value-dark-900 and the real-input scenario of the field menu.
- Criteria: Layout check in a real browser; the unit test only checks presence.
