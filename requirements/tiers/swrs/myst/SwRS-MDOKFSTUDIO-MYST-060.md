---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-060
uuid: fbb9f7d3-f904-467d-a52b-1cfb07b150ff
title: Toctree reversed option flips the order
description: When a toctree has `:reversed:`, the extension SHALL flip the entry
  order.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-012
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Toctree reversed option flips the order

### Normative behavior

When a toctree has `:reversed:`, the extension SHALL flip the entry order.

### Scenario: Nominal

- GIVEN three entries with `:reversed:`
- WHEN the preview renders
- THEN they appear in reverse order

### Scenario: Boundary or refusal

- GIVEN three entries without it
- WHEN the preview renders
- THEN they keep the written order

### Verification notes

- Method: test
- Criteria: Untested today.
