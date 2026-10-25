---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-242
uuid: f61b9e78-882c-4f37-8ca6-40d8d7d0e597
title: "previewBlocksCut needs a line range and an optional pin"
description: "The host SHALL accept previewBlocksCut only with positive integer line
  and endLine and an optional pinViewportTop that is finite and within 100000."
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-025
- StRS-MDOKFSTUDIO-BLOCK-016
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-065
- SwRS-MDOKFSTUDIO-TRUST-090
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/pageToHost.ts
tested_in_files:
- test/core/protocol/pageToHost.test.ts
---

## previewBlocksCut needs a line range and an optional pin

### Normative behavior

The host SHALL accept previewBlocksCut only with positive integer line and endLine and an optional pinViewportTop that is finite and within 100000.

### Scenario (nominal): A cut with a line range and a pin

- GIVEN a previewBlocksCut message with line 5, endLine 8, pinViewportTop 10
- WHEN it is validated
- THEN it is accepted, also without the pin

### Scenario (refusal): Invalid pin or lines

| Input | Outcome |
| --- | --- |
| a NaN pin top | dropped |
| the invalid lines of a copy (line 0, endLine 1.5, a missing line, a string endLine) | dropped |

### Related requirements

- SwRS-MDOKFSTUDIO-BLOCK-241: the lines are checked as for a copy

### Verification notes

- Method: Unit test `T40: the block clipboard messages validate their lines and the optional pin` in test/core/protocol/pageToHost.test.ts (both scenarios).
- Criteria: isPinViewportTop decides the pin.
