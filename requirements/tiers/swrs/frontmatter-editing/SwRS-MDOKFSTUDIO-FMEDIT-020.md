---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-020
uuid: 1a4bab09-867c-4acd-98d9-6e5b42f5778f
title: Escape cancels a field editor
description: When a writer presses Escape in a field editor control or anywhere
  in the properties section, the extension SHALL close the editor without
  saving, unless a save is in flight.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-019; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMEDIT-019
default_owner_email: gaetan@xeberon.net
---

## Escape cancels a field editor

### Normative behavior

When a writer presses Escape in a field editor control or anywhere in the properties section, the extension SHALL close the editor without saving, unless a save is in flight.

### Scenario: Nominal

- GIVEN a field editor with typed text
- WHEN the writer presses Escape in the control, or in the field picker or a header cell of the properties section
- THEN the editor closes and nothing is posted

### Scenario: Boundary or refusal

- GIVEN the same editor
- WHEN the writer presses Escape outside the properties section, or while its save is in flight
- THEN the editor stays open

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterEditor.test.ts).
- Criteria: Tests Escape cancels an unsaved frontmatter value edit; Escape outside the properties section does not touch an open frontmatter edit.
