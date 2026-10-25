---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-243
uuid: 00d5c483-1956-4ebf-b400-8334e9f59552
title: "previewBlocksPaste needs a line to paste after"
description: "The host SHALL accept previewBlocksPaste only with a non-negative integer
  insertAfterLine, an optional positive integer pinLine and an optional pinViewportTop
  that is finite and within 100000."
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

## previewBlocksPaste needs a line to paste after

### Normative behavior

The host SHALL accept previewBlocksPaste only with a non-negative integer insertAfterLine, an optional positive integer pinLine and an optional pinViewportTop that is finite and within 100000.

### Scenario (nominal): A paste after a line

- GIVEN a previewBlocksPaste message with insertAfterLine 0, pinLine 4, pinViewportTop 99
- WHEN it is validated
- THEN it is accepted, also without the pin fields

### Scenario (refusal): Invalid line or pin

| Input | Outcome |
| --- | --- |
| insertAfterLine -1 | dropped |
| insertAfterLine 1.5 | dropped |
| insertAfterLine missing | dropped |
| pinLine 0 | dropped |
| a pin top of 200000 | dropped |

### Verification notes

- Method: Unit test `T40: the block clipboard messages validate their lines and the optional pin` in test/core/protocol/pageToHost.test.ts (both scenarios).
- Criteria: The validator is the one named above.
