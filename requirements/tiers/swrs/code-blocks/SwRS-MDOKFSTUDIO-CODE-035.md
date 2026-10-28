---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-035
uuid: f5be1f9f-cbba-475c-bbeb-1bb05213cbe6
title: Reset the Copied state when another block is hovered
description: When the pointer enters another code block while the button shows
  Copied, the extension SHALL reset the button to Copy code.
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
default_owner_email: gaetan@xeberon.net
---

## Reset the Copied state when another block is hovered

### Normative behavior

When the pointer enters another code block while the button shows Copied, the extension SHALL reset the button to Copy code.

### Scenario: nominal behavior

- GIVEN the button shows Copied on block A
- WHEN the pointer enters block B
- THEN the button on block B reads Copy code with no check mark

### Scenario: boundary or refusal behavior

- GIVEN the button shows Copied
- WHEN the pointer stays in the same block
- THEN the Copied state is kept until the 1.5 s end

### Verification notes

- Method: Unit test.
- Criteria: State reset only when the hovered block changes.
