---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-004
uuid: 90f036d9-5843-412b-9328-62efbf098fdf
title: A width of zero lifts the column limit
description: When the setting maxContentWidth is 0, the extension SHALL write
  the width rule as none so that the text column has no cap and follows the pane
  width.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-003
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-LAYOUT-002; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-LAYOUT-002
---

## A width of zero lifts the column limit

### Normative behavior

When the setting maxContentWidth is 0, the extension SHALL write the width rule as none so that the text column has no cap and follows the pane width.

### Scenario: Zero means no cap

- GIVEN maxContentWidth set to 0 and a 2000 px pane
- WHEN the width rule is built and the preview is rendered
- THEN the rule reads :root { --sphinx-preview-content-max-width: none; } and the column is not limited to a pixel width

### Scenario: Smallest limiting value

- GIVEN maxContentWidth set to 1
- WHEN the width rule is built
- THEN the rule reads --sphinx-preview-content-max-width: 1px, because only 0 lifts the limit

### Known issues

- Known issue: The README says that with the setting at 0 the three width modes look the same, which is not exact: Full width keeps a 16 px side gutter where Margin and Auto keep a gutter of 16 to 78 px.
- Known issue: The unit test asserts the rule text for 0 and 1200 only; the rendered column at 0 has no automated check.

### Verification notes

- Method: Unit test of the width rule builder for 0 and 1200; the column behaviour follows from the CSS.
- Criteria: The generated rule is none for 0 and a pixel value otherwise.
