---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-034
uuid: 5a78c453-665d-4b4f-8a40-4a027c888b14
title: Keep the copy button clear of the sticky band and toolbar
description: When the default top-right position of the copy button falls under
  the sticky heading band or the floating toolbar, the extension SHALL place the
  button below them.
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

## Keep the copy button clear of the sticky band and toolbar

### Normative behavior

When the default top-right position of the copy button falls under the sticky heading band or the floating toolbar, the extension SHALL place the button below them.

### Scenario: nominal behavior

- GIVEN a block whose top edge is under the sticky heading band
- WHEN the pointer enters the block
- THEN the button is placed below the band

### Scenario: boundary or refusal behavior

- GIVEN the button would overlap the floating toolbar
- WHEN the pointer enters the block
- THEN the button is placed below the toolbar

### Verification notes

- Method: Unit test with simulated geometry and the copy-button visual scenarios.
- Criteria: Button top is not above the bottom of the band or toolbar.
