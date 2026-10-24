---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-092
uuid: 7d54074e-4d32-48c9-8660-9ae5542ac1f4
title: The table directive family renders with its own styles and actions
description: When a document holds a `{table}`, `{list-table}` or `{csv-table}`
  directive, the extension SHALL render it with the table styles and offer the
  table palette action.
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

## The table directive family renders with its own styles and actions

### Normative behavior

When a document holds a `{table}`, `{list-table}` or `{csv-table}` directive, the extension SHALL render it with the table styles and offer the table palette action.

### Scenario: Nominal

- GIVEN a `{list-table}`
- WHEN the preview renders
- THEN table styles apply and the table palette action is offered

### Scenario: Boundary or refusal

- GIVEN a `{csv-table}` and a `{table}`
- WHEN the preview renders
- THEN each uses the same table styles

### Verification notes

- Method: test
- Criteria: Table family behaves per name.
