---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-063
uuid: 8af6e481-14f4-48cf-8367-ca182fa7b27a
title: The properties table is never part of a block selection or move
description: When a writer selects or moves blocks, the extension SHALL exclude
  the properties table from the selection and from the move.
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

## The properties table is never part of a block selection or move

### Normative behavior

When a writer selects or moves blocks, the extension SHALL exclude the properties table from the selection and from the move.

### Scenario: Nominal

- GIVEN edit mode on
- WHEN the writer Shift+clicks the properties table
- THEN it gets no selected mark and the selection stays unchanged

### Scenario: Boundary or refusal

- GIVEN a Shift+Up extension from the first body block
- WHEN it is pressed
- THEN the selection stops at the first body block

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeBlockSelection.test.ts).
- Criteria: Test T39 the properties table is never selected.
