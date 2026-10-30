---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-241
uuid: e4d1aaa6-7a33-4e13-8b26-9fd43b477634
title: "previewBlocksCopy needs a line range"
description: "The host SHALL accept previewBlocksCopy only with positive integer line
  and endLine."
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-025
- StRS-MDOKFSTUDIO-BLOCK-016
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/pageToHost.ts
tested_in_files:
- test/core/protocol/pageToHost.test.ts
default_owner_email: gaetan@xeberon.net
---

## previewBlocksCopy needs a line range

### Normative behavior

The host SHALL accept previewBlocksCopy only with positive integer line and endLine.

### Scenario (nominal): A copy with a line range

- GIVEN a previewBlocksCopy message with line 5, endLine 8
- WHEN it is validated
- THEN it is accepted

### Scenario (refusal): Invalid lines

| Input | Outcome |
| --- | --- |
| line 0 | dropped |
| endLine 1.5 | dropped |
| a missing line | dropped |
| a string endLine | dropped |

### Verification notes

- Method: Unit test `T40: the block clipboard messages validate their lines and the optional pin` in test/core/protocol/pageToHost.test.ts (both scenarios).
- Criteria: The order of the two lines is checked by the planner, not here.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-025](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-025.md): Preview edits land exactly, in one undo step, keep line endings, or are refused with a reason
  - [StRS-MDOKFSTUDIO-BLOCK-016](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-016.md): A writer selects blocks and copies, cuts and pastes them as Markdown
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-052](../trust-security/SwRS-MDOKFSTUDIO-TRUST-052.md): Every page message has a registered type and a valid envelope before any handler runs
<!-- okf:links:end -->
