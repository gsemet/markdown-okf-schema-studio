---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-023
uuid: ab715fe8-cfc0-4f07-bc78-3d8193815ec2
title: Hide the copy button on a click inside the block until the pointer moves
description: When the reader clicks inside the hovered code block, the extension
  SHALL hide the copy button until the pointer moves again.
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

## Hide the copy button on a click inside the block until the pointer moves

### Normative behavior

When the reader clicks inside the hovered code block, the extension SHALL hide the copy button until the pointer moves again.

### Scenario: nominal behavior

- GIVEN the copy button is shown
- WHEN the reader clicks in the block
- THEN the button is hidden

### Scenario: boundary or refusal behavior

- GIVEN the button was hidden by a click
- WHEN the pointer moves within the block
- THEN the button is shown again

### Verification notes

- Method: Unit test.
- Criteria: Hidden after click; visible after next pointer move.
