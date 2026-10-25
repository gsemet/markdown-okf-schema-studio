---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-023
uuid: 7bf4b7ee-5ba4-4ff5-8839-d983212c6b3c
title: A pending toggle blocks further clicks
description: When the host is processing a checkbox toggle, the extension SHALL
  mark the checkbox aria-busy and ignore further clicks on it until the result
  arrives.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-003
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-GFM-021; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-GFM-021
---

## A pending toggle blocks further clicks

### Normative behavior

When the host is processing a checkbox toggle, the extension SHALL mark the checkbox aria-busy and ignore further clicks on it until the result arrives.

### Scenario: Busy during processing

- GIVEN a click awaiting the host result
- WHEN the box is clicked again
- THEN only one toggle message was sent and aria-busy is true

### Scenario: Missing position attributes

- GIVEN a checkbox without valid line or column attributes
- WHEN it is clicked
- THEN the click is prevented and no message is sent

### Verification notes

- Method: Page unit test.
- Criteria: Exactly one message per pending toggle.
