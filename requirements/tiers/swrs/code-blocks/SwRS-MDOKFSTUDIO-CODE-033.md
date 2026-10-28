---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-033
uuid: b96341ad-b5bf-4681-974e-27d7bb3ee43c
title: Reposition the copy button on window resize
description: When the window is resized while the copy button is shown, the
  extension SHALL move the button to the top-right corner of the resized block.
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

## Reposition the copy button on window resize

### Normative behavior

When the window is resized while the copy button is shown, the extension SHALL move the button to the top-right corner of the resized block.

### Scenario: nominal behavior

- GIVEN the copy button is shown on a block
- WHEN the window width changes
- THEN the button sits 6 px inside the block's new top-right corner

### Scenario: boundary or refusal behavior

- GIVEN the resize leaves less than 30 px of the block visible
- WHEN the window is resized
- THEN the button is hidden

### Verification notes

- Method: Unit test "a resize moves the button to the new top-right corner of the block and hides it when too little shows" in test/page/modules/renderReq.codeCopy.requirements.test.ts.
- Criteria: Button position follows the block rect after resize.
