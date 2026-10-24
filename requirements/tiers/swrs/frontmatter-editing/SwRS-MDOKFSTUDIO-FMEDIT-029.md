---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-029
uuid: 8be9695c-f3bb-4669-9c99-0b781e7ea85c
title: Every field editor has a Remove field button in a field action menu
description: When a field editor is open, the extension SHALL show in its field
  action menu a "Remove field" button for the edited row.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-007
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Every field editor has a Remove field button in a field action menu

### Normative behavior

When a field editor is open, the extension SHALL show in its field action menu a "Remove field" button for the edited row.

### Scenario: Nominal

- GIVEN a value editor open on an optional field
- WHEN the editor renders
- THEN the menu has an enabled button "Remove frontmatter field" labelled Remove field

### Scenario: Boundary or refusal

- GIVEN a key editor open on a row
- WHEN the editor renders
- THEN the same Remove field button appears in its menu

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterFields.test.ts).
- Criteria: Tests T24 Remove field stays enabled on an optional row.
