---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-061
uuid: 9ec33069-03b8-4062-a4a4-e12a395b7307
title: Toctree shows at most 500 entries
description: When a toctree holds more than 500 entries, the extension SHALL
  show at most 500.
project: markdown-okf-schema-studio
scope: myst
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-012
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-057; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-MYST-057
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

- Method: Unit test "a toctree shows at most 500 entries and all of them when there are 500" in test/core/render/renderReq.myst.requirements.test.ts
- Criteria: At most 500 entries are shown; 500 are all shown.
