---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-067
uuid: bee45b68-0f32-4364-abde-2f84ba294814
title: The include watch is cleared when the preview follows another document
description: When the preview follows another document, the host SHALL forget
  all remembered include files.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-009
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-053; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-DIAG-053
---

## The include watch is cleared when the preview follows another document

### Normative behavior

When the preview follows another document, the host SHALL forget all remembered include files.

### Scenario: Document switch

- GIVEN remembered include files
- WHEN the preview follows another document
- THEN the include watch is empty

### Scenario: Old file changes

- GIVEN a file remembered for the earlier document
- WHEN it changes after the switch
- THEN the page is not told

### Verification notes

- Method: Unit test `the include watch is emptied when the preview follows another document` in `test/session/diagReq.plantuml.requirements.test.ts`.
- Criteria: No stale watch survives a switch.
