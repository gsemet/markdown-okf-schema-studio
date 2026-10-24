---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-011
uuid: 1a67d083-3877-41bc-88a6-629588860b8b
title: The table fits a narrow preview
description: When the preview is 640 px wide or less, the extension SHALL lay
  the properties table out with fixed columns and let names, values, links and
  type labels wrap anywhere so that nothing pushes the page sideways.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## The table fits a narrow preview

### Normative behavior

When the preview is 640 px wide or less, the extension SHALL lay the properties table out with fixed columns and let names, values, links and type labels wrap anywhere so that nothing pushes the page sideways.

### Scenario: Narrow preview

- GIVEN a preview 460 px wide showing a schema table with alert rows and link details
- WHEN the preview is rendered
- THEN the page has no horizontal overflow and long names, values and links wrap inside their cells

### Scenario: Preview just above the limit

- GIVEN a preview wider than 640 px
- WHEN the preview is rendered
- THEN the table keeps its normal automatic layout

### Verification notes

- Method: Visual scenarios v10, v17 and v19 (no-overflow checks).
- Criteria: The narrow rules apply under the media query max-width 640px.
- Known issue: a word can still break in the middle of a name in a narrow preview; there is no stacked layout.
