---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-029
uuid: 1a562d3b-021b-4392-abf4-e92a2659acda
title: Hide the copy button when the pointer leaves the block
description: When the pointer leaves a code block, the extension SHALL hide the
  copy button.
project: markdown-okf-schema-studio
scope: code-blocks
req_lifecycle: superseded
status: deprecated
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

## Hide the copy button when the pointer leaves the block

### Normative behavior

When the pointer leaves a code block, the extension SHALL hide the copy button.

### Scenario: nominal behavior

- GIVEN the copy button is shown
- WHEN the pointer leaves the block
- THEN the button is hidden

### Scenario: boundary or refusal behavior

- GIVEN the pointer moves from the block onto the button
- WHEN the mouseout fires
- THEN the button stays shown

### Verification notes

- Method: Unit test of mouseout.
- Criteria: Hidden on leaving the block, kept when moving onto the button.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CODE-004](../../strs/code-blocks/StRS-MDOKFSTUDIO-CODE-004.md): A reader copies the exact code of a block
- Superseded by:
  - [SwRS-MDOKFSTUDIO-CODE-017](SwRS-MDOKFSTUDIO-CODE-017.md): A Copy code button appears on a hovered or focused code block
<!-- okf:links:end -->
