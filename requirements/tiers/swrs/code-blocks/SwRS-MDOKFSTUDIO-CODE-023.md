---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-023
uuid: ab715fe8-cfc0-4f07-bc78-3d8193815ec2
title: Hide the copy button on a click inside the block until the pointer moves
description: When the reader clicks inside the hovered code block, the extension
  SHALL hide the copy button until the pointer moves again.
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

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CODE-004](../../strs/code-blocks/StRS-MDOKFSTUDIO-CODE-004.md): A reader copies the exact code of a block
- Superseded by:
  - [SwRS-MDOKFSTUDIO-CODE-017](SwRS-MDOKFSTUDIO-CODE-017.md): A Copy code button appears on a hovered or focused code block
<!-- okf:links:end -->
