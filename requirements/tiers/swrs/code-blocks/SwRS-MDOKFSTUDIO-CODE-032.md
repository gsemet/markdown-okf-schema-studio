---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-032
uuid: 39b18e50-7b67-48c5-bab2-d165c96af91e
title: Hide the copy button when scrolling stops outside the block
description: When scrolling stops for 120 ms with the pointer outside the
  hovered block, the extension SHALL hide the copy button.
project: markdown-okf-schema-studio
scope: code-blocks
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-004
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CODE-017; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-CODE-017
---

## Hide the copy button when scrolling stops outside the block

### Normative behavior

When scrolling stops for 120 ms with the pointer outside the hovered block, the extension SHALL hide the copy button.

### Scenario: nominal behavior

- GIVEN the copy button is shown and the reader scrolls so that the pointer is outside the block
- WHEN scrolling stops for 120 ms
- THEN the button is hidden

### Scenario: boundary or refusal behavior

- GIVEN scrolling stops with the pointer still over the block
- WHEN 120 ms pass
- THEN the button stays shown

### Verification notes

- Method: Unit test with fake timers.
- Criteria: Hidden after the 120 ms settle only when the pointer is outside the block.
