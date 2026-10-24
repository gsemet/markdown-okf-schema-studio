---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-064
uuid: 7aeceee1-2b86-4ea3-b09d-99018113aff0
title: The insert point after the table has no move buttons
description: When the insert point after the properties table, or the Start
  writing point of a frontmatter-only document, is shown, the extension SHALL
  show no move buttons on it.
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

## The insert point after the table has no move buttons

### Normative behavior

When the insert point after the properties table, or the Start writing point of a frontmatter-only document, is shown, the extension SHALL show no move buttons on it.

### Scenario: Nominal

- GIVEN a document with a properties table in edit mode
- WHEN the insert point after the table renders
- THEN it has a single control and no move buttons

### Scenario: Boundary or refusal

- GIVEN a document with an empty body
- WHEN the Start writing point renders
- THEN it has a single control and no move buttons

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeBlockMoves.test.ts).
- Criteria: Test T36 the properties point and the Start writing point have no move buttons.
