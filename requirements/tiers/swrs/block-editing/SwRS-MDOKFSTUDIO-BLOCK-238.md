---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-238
uuid: e5651e04-87f0-44d0-acb7-a1adb3e3102b
title: "previewEditSave needs both texts and valid optional fields"
description: "The host SHALL accept previewEditSave only with string originalText
  and editedText, the editId and line range of a previewEditOpen, a boolean final
  when present, flush only as true, an insertAfterLine that is absent or an integer
  of at least 0, and pinLine with pinViewportTop (finite, within 100000 in absolute
  value) only on a final save."
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-025
- StRS-MDOKFSTUDIO-TRUST-009
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
- test/core/protocol/pageStateMessages.test.ts
---

## previewEditSave needs both texts and valid optional fields

### Normative behavior

The host SHALL accept previewEditSave only with string originalText and editedText, the editId and line range of a previewEditOpen, a boolean final when present, flush only as true, an insertAfterLine that is absent or an integer of at least 0, and pinLine with pinViewportTop (finite, within 100000 in absolute value) only on a final save.

### Scenario (nominal): Autosave and final save

- GIVEN previewEditSave messages with originalText and editedText, one with final false and one with final true and a pin (pinLine with pinViewportTop)
- WHEN it is validated
- THEN both are accepted

### Scenario (refusal): Invalid optional fields

| Input | Outcome |
| --- | --- |
| final "yes" | dropped |
| flush false | dropped (flush is accepted only as true) |
| a pin on an autosave | dropped (a pin is accepted only on a final save) |
| a pin top of 200000 | dropped (pinViewportTop is finite and within 100000 in absolute value) |
| originalText or editedText missing or not a string | dropped |
| no editId, or no line range with endLine not below line (as for previewEditOpen) | dropped |

### Scenario (boundary): Insert point of a block edit

| Input | Outcome |
| --- | --- |
| previewEditSave with insertAfterLine 0 | accepted (an integer of at least 0) |
| previewEditSave with insertAfterLine -1 | dropped |
| previewEditOpen with insertAfterLine 0 | accepted |
| previewScroll with insertAfterLine 0 | dropped (insertAfterLine is accepted only on previewEditOpen, previewEditSave and previewEditCancel) |

### Related requirements

- SwRS-MDOKFSTUDIO-BLOCK-237: the open message carries the same editId, range and insert point

### Verification notes

- Method: Unit test `the page-state validators accept exactly what the frozen validator accepted` in test/core/protocol/pageStateMessages.test.ts (all scenarios, including the insert point rows).
- Criteria: hasValidStateFields decides.
