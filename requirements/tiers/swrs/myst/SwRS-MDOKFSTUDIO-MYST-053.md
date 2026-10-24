---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-053
uuid: a73b4d1a-8be6-40e2-90e5-977f0e4535d8
title: Grids lay out items in responsive columns
description: When a `{grid}` has an argument such as `1 1 2 2`, the extension
  SHALL lay out its items in those columns for the extra-small, small, medium
  and large panes.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-011
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Grids lay out items in responsive columns

### Normative behavior

When a `{grid}` has an argument such as `1 1 2 2`, the extension SHALL lay out its items in those columns for the extra-small, small, medium and large panes.

### Scenario: Nominal

- GIVEN `{grid} 1 1 2 2`
- WHEN the preview renders
- THEN the columns per pane size are 1, 1, 2 and 2

### Scenario: Boundary or refusal

- GIVEN fewer values, `auto`, more than 12 or an invalid value
- WHEN the preview renders
- THEN fewer inherit the last value, auto fills 14 em columns, at most 12, invalid becomes 1

### Verification notes

- Method: test
- Criteria: Values are bounded.
