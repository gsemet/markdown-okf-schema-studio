---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-064
uuid: 849299c6-0763-409c-83a0-fb3ed2793cc0
title: Invalid list-table widths are ignored
description: When `:widths:` is `auto`, `grid`, non numeric or does not match
  the column count, the extension SHALL ignore it and make no column group.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-013
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Invalid list-table widths are ignored

### Normative behavior

When `:widths:` is `auto`, `grid`, non numeric or does not match the column count, the extension SHALL ignore it and make no column group.

### Scenario: Nominal

- GIVEN `:widths: auto`
- WHEN the preview renders
- THEN no column group exists

### Scenario: Boundary or refusal

- GIVEN three widths for two columns
- WHEN the preview renders
- THEN no column group exists

### Verification notes

- Method: test
- Criteria: Valid widths are applied as percent.
