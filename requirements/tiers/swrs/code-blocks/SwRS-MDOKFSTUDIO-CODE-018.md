---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-018
uuid: 93f876c5-9143-48f4-8b54-185fd26d1ca5
title: Hide the copy button below 30 px of visible block
description: When less than 30 px of the hovered block is visible below the
  sticky band or the frame top, the extension SHALL hide the copy button,
  showing it again once 30 px are visible.
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
superseded_by:
- SwRS-MDOKFSTUDIO-CODE-017
default_owner_email: gaetan@xeberon.net
---

## Hide the copy button below 30 px of visible block

### Normative behavior

When less than 30 px of the hovered block is visible below the sticky band or the frame top, the extension SHALL hide the copy button, showing it again once 30 px are visible.

### Scenario: nominal behavior

- GIVEN the copy button is shown and the block scrolls under the sticky band to 29 px visible
- WHEN the scroll event fires
- THEN the button is hidden

### Scenario: boundary or refusal behavior

- GIVEN the block then scrolls back to exactly 30 px visible with the pointer over it
- WHEN the scroll event fires
- THEN the button is shown again

### Verification notes

- Method: Unit test with simulated geometry.
- Criteria: Visibility toggles at the 30 px threshold.
