---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-237
uuid: d4258dd5-4a0b-4e35-aeb4-d8afbe3173ee
title: "previewEditOpen needs an edit id and a line range"
description: "The host SHALL accept previewEditOpen only with a non-empty string editId,
  positive integer line and endLine with endLine not below line, an insertAfterLine
  that is absent or a non-negative integer, and no save or pin fields."
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-025
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/pageToHost.ts
tested_in_files:
- test/core/protocol/pageStateMessages.test.ts
---

## previewEditOpen needs an edit id and a line range

### Normative behavior

The host SHALL accept previewEditOpen only with a non-empty string editId, positive integer line and endLine with endLine not below line, an insertAfterLine that is absent or a non-negative integer, and no save or pin fields.

### Scenario (nominal): An open with a line range

- GIVEN a previewEditOpen message with editId e1, line 3, endLine 4
- WHEN it is validated
- THEN it is accepted, also with insertAfterLine 0

### Scenario (refusal): An open with a wrong range, insert point or extra field

| Input | Outcome |
| --- | --- |
| line 0 | dropped |
| endLine below line | dropped |
| insertAfterLine -1 | dropped |
| a pin field (pinLine with pinViewportTop) or the field final | dropped |
| a missing or empty editId, or an editId that is not a string | dropped |

### Related requirements

- SwRS-MDOKFSTUDIO-BLOCK-239: a previewEditCancel carries the same fields

### Verification notes

- Method: Unit test `the page-state validators accept exactly what the frozen validator accepted` in test/core/protocol/pageStateMessages.test.ts (both scenarios). The edit id has no upper length bound here (only previewEditClosed and previewEditFlushed bound theirs to 100).
- Criteria: isEditRequest and hasValidStateFields decide.
