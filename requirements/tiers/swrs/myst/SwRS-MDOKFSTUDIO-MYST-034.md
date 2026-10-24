---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-034
uuid: 5a2e06c7-90d8-45b7-83a0-d4ebc6308aa1
title: The page applies figure widths through the CSSOM
description: When a figure or image has a requested width, the extension SHALL
  apply it from the page without inline styles, including after every in-place
  content update.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-008
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## The page applies figure widths through the CSSOM

### Normative behavior

When a figure or image has a requested width, the extension SHALL apply it from the page without inline styles, including after every in-place content update.

### Scenario: Nominal

- GIVEN an image with `:width: 300`
- WHEN the page runs
- THEN the image gets that width

### Scenario: Boundary or refusal

- GIVEN a left-floated figure with `:width: 50%` and a content update
- WHEN the page runs again
- THEN the figure takes the width, its image fills it and the percentage stays relative to the column

### Verification notes

- Method: test
- Criteria: The value is re-validated with the page's own pattern.
