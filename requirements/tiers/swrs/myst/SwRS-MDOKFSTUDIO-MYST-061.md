---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-061
uuid: 9ec33069-03b8-4062-a4a4-e12a395b7307
title: Toctree shows at most 500 entries
description: When a toctree holds more than 500 entries, the extension SHALL
  show at most 500.
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

## Toctree shows at most 500 entries

### Normative behavior

When a toctree holds more than 500 entries, the extension SHALL show at most 500.

### Scenario: Nominal

- GIVEN 501 entries
- WHEN the preview renders
- THEN 500 are shown

### Scenario: Boundary or refusal

- GIVEN 500 entries
- WHEN the preview renders
- THEN all are shown

### Verification notes

- Method: test
- Criteria: Untested today.
