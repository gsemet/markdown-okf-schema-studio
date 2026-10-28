---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-057
uuid: b0ff0af5-97df-4a2d-85d8-e71d8c7bd8e3
title: "The properties section keeps its place across the save"
description: "When a writer saves a field, the extension SHALL send the properties
  section's source line and viewport top with the save so that the section keeps its
  screen position after the re-render."
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-BLOCK-228; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-BLOCK-228
default_owner_email: gaetan@xeberon.net
---

## The properties section keeps its place across the save

### Normative behavior

When a writer saves a field, the extension SHALL send the properties section's source line and viewport top with the save so that the section keeps its screen position after the re-render.

### Scenario: Nominal

- GIVEN a value save of a field
- WHEN the page posts it
- THEN the message carries pinLine 1 and pinViewportTop of the properties section

### Scenario: Boundary or refusal

- GIVEN a save of a field in the last row of a long table
- WHEN the page posts it
- THEN pinLine is still 1 and the viewport top is that of the section, not of the row

### Verification notes

- Method: Unit test a field save carries the source line and viewport top of the properties section in test/page/fmtableReqFrontmatter.requirements.test.ts.
- Criteria: Add and remove actions carry the same fields; a section with an empty rectangle sends no pin fields.
