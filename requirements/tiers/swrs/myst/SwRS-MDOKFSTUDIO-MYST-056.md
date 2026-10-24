---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-056
uuid: 8ceee383-321a-4ce8-9d30-d59a6e2cd56a
title: Grids nest and keep absolute source lines
description: When grids use backtick, tilde or colon fences and nest up to 8
  levels, the extension SHALL keep absolute source lines for everything inside,
  blank lines included.
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

## Grids nest and keep absolute source lines

### Normative behavior

When grids use backtick, tilde or colon fences and nest up to 8 levels, the extension SHALL keep absolute source lines for everything inside, blank lines included.

### Scenario: Nominal

- GIVEN a grid nested in a card
- WHEN the preview renders
- THEN inner blocks carry absolute source lines

### Scenario: Boundary or refusal

- GIVEN a grid deeper than 8 levels
- WHEN the preview renders
- THEN it stays an unexpanded directive placeholder

### Verification notes

- Method: test
- Criteria: Scroll sync and block selection rely on those lines.
