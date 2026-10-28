---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-240
uuid: 617cad28-140c-4a0b-8a0d-29227c710c77
title: "previewBlockMove needs both ranges and a direction"
description: "The host SHALL accept previewBlockMove only with four positive integer
  lines, a direction up or down and an optional pinViewportTop that is finite and
  within 100000."
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-025
- StRS-MDOKFSTUDIO-BLOCK-014
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
default_owner_email: gaetan@xeberon.net
---

## previewBlockMove needs both ranges and a direction

### Normative behavior

The host SHALL accept previewBlockMove only with four positive integer lines, a direction up or down and an optional pinViewportTop that is finite and within 100000.

### Scenario (nominal): A move with both ranges

- GIVEN a previewBlockMove message with line 5, endLine 6, neighbourLine 1, neighbourEndLine 3, direction up, pinViewportTop 120.5
- WHEN it is validated
- THEN it is accepted, also without the pin

### Scenario (refusal): Invalid lines, direction or pin

| Input | Outcome |
| --- | --- |
| direction left | dropped |
| line 0 | dropped |
| endLine 1.5 | dropped |
| a missing neighbour line | dropped |
| a NaN pin top or a pin top of 200000 | dropped |

### Related requirements

- SwRS-MDOKFSTUDIO-BLOCK-117: the host plans the swap from the validated ranges

### Verification notes

- Method: Unit test `previewBlockMove validates both ranges, the direction and the optional pin` in test/core/protocol/pageToHost.test.ts (both scenarios).
- Criteria: The order of the lines is checked by the planner, not here.
