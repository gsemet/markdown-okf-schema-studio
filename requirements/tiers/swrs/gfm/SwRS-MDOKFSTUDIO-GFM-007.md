---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-007
uuid: 3e9b20fd-bb75-48b5-ac0d-75d3b12c3881
title: Pathological URLs render in linear time
description: When a document contains a URL with 50 000 closing parentheses or
  100 000 characters, the extension SHALL render it in under one second.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-002
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-GFM-001; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-GFM-001
---

## Pathological URLs render in linear time

### Normative behavior

When a document contains a URL with 50 000 closing parentheses or 100 000 characters, the extension SHALL render it in under one second.

### Scenario: Long URL renders quickly

- GIVEN a 100 000-character URL
- WHEN the preview is rendered
- THEN rendering completes in under 1 s

### Scenario: Many closing parentheses

- GIVEN a URL followed by 50 000 closing parentheses
- WHEN the preview is rendered
- THEN rendering completes in under 1 s and the link ends at the balanced position

### Verification notes

- Method: Unit test with a timing bound.
- Criteria: Both inputs render in under 1 s.
