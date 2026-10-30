---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-245
uuid: 67228e14-f9a0-496b-a79c-d8954d5563e4
title: "previewEditFlushed carries the flush id and a flag"
description: "The host SHALL accept previewEditFlushed only with a non-empty flushId
  of at most 100 characters and a boolean flushed."
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-025
- StRS-MDOKFSTUDIO-BLOCK-006
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

## previewEditFlushed carries the flush id and a flag

### Normative behavior

The host SHALL accept previewEditFlushed only with a non-empty flushId of at most 100 characters and a boolean flushed.

### Scenario (nominal): A flush answer

- GIVEN a previewEditFlushed message with flushId flush-1 and flushed true
- WHEN it is validated
- THEN it is accepted

### Scenario (refusal): Invalid flush id or flag

| Input | Outcome |
| --- | --- |
| an empty flushId | dropped |
| a flushId of more than 100 characters | dropped |
| a flushed that is not a boolean | dropped |

### Verification notes

- Method: Unit test `CR 025: previewEditFlushed validates the flush id and the flag` in test/core/protocol/pageToHost.test.ts (both scenarios; the 100-character bound of the flush id is named in the criteria and not in the test title).
- Criteria: MAX_EDIT_ID_LENGTH is 100.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-025](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-025.md): Preview edits land exactly, in one undo step, keep line endings, or are refused with a reason
  - [StRS-MDOKFSTUDIO-BLOCK-006](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-006.md): Typed text is saved, survives updates and is never lost on leaving
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-052](../trust-security/SwRS-MDOKFSTUDIO-TRUST-052.md): Every page message has a registered type and a valid envelope before any handler runs
<!-- okf:links:end -->
