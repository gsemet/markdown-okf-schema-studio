---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-239
uuid: 49463f7b-9fe5-4c5e-bcfe-662ca3808681
title: "previewEditCancel needs an edit id and a line range"
description: "The host SHALL accept previewEditCancel only with the fields of a previewEditOpen."
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-025
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/pageToHost.ts
tested_in_files:
- test/core/protocol/pageStateMessages.test.ts
default_owner_email: gaetan@xeberon.net
---

## previewEditCancel needs an edit id and a line range

### Normative behavior

The host SHALL accept previewEditCancel only with the fields of a previewEditOpen.

### Scenario (nominal): A cancel with a line range

- GIVEN a previewEditCancel message with editId e1, line 3, endLine 4
- WHEN it is validated
- THEN it is accepted

### Scenario (refusal): A cancel that carries a text or a pin

- GIVEN a previewEditCancel message that carries a final or pin field
- WHEN it is validated
- THEN it is dropped

### Related requirements

- SwRS-MDOKFSTUDIO-BLOCK-237: the fields of a previewEditOpen

### Verification notes

- Method: Unit test `the page-state validators accept exactly what the frozen validator accepted` in test/core/protocol/pageStateMessages.test.ts (both scenarios).
- Criteria: Same rules as the open message.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-025](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-025.md): Preview edits land exactly, in one undo step, keep line endings, or are refused with a reason
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-052](../trust-security/SwRS-MDOKFSTUDIO-TRUST-052.md): Every page message has a registered type and a valid envelope before any handler runs
<!-- okf:links:end -->
