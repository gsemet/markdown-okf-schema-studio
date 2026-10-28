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
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-053; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-MYST-053
default_owner_email: gaetan@xeberon.net
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

- Method: Unit test "a grid also works with backtick fences, and grids nest inside items with colon fences" in test/core/render/gridToctree.test.ts
- Criteria: Scroll sync and block selection rely on those lines.
