---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-178
uuid: b48281cf-8996-4e82-8fbd-224db2ca2aea
title: An inline thread change message carries valid lines and a non-blank text
description: When a previewThreadReply or previewThreadDelete message reaches
  the host, the extension SHALL drop it unless it has an edit id, integer lines
  with 1 <= line <= endLine and, for a reply, a text of 1 to 10 000 characters
  that is not blank.
project: markdown-okf-schema-studio
scope: review-annotations
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-015
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-065
- SwRS-MDOKFSTUDIO-TRUST-090
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/pageToHost.ts
tested_in_files:
- test/core/protocol/pageToHost.test.ts
default_owner_email: gaetan@xeberon.net
---

## An inline thread change message carries valid lines and a non-blank text

### Normative behavior

When a previewThreadReply or previewThreadDelete message reaches the host, the extension SHALL drop it unless it has an edit id, integer lines with 1 <= line <= endLine and, for a reply, a text of 1 to 10 000 characters that is not blank.

### Scenario (nominal): Valid

- GIVEN a previewThreadReply message with an edit id, lines 5 and 8 and the text ok
- WHEN the message is validated
- THEN it is accepted

### Scenario (refusal): Invalid

| Input | Outcome |
| --- | --- |
| A missing edit id | dropped |
| Line 0 | dropped |
| An end line before the line | dropped |
| A blank text in a previewThreadReply | dropped |
| A text of 10 001 characters in a previewThreadReply | dropped |

### Verification notes

- Method: test/core/protocol/pageToHost.test.ts (unit test `previewThreadReply and previewThreadDelete validate the lines, the edit id and the text`: scenarios valid, invalid).
- Criteria: The validators accept the boundary values and refuse one more.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-REVIEW-015](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-015.md): A writer keeps a discussion in the Markdown source and answers it from the preview
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-052](../trust-security/SwRS-MDOKFSTUDIO-TRUST-052.md): Every page message has a registered type and a valid envelope before any handler runs
  - [SwRS-MDOKFSTUDIO-TRUST-005](../trust-security/SwRS-MDOKFSTUDIO-TRUST-005.md): The host refuses every write request of a read-only preview with a reason
  - [SwRS-MDOKFSTUDIO-TRUST-065](../trust-security/SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
  - [SwRS-MDOKFSTUDIO-TRUST-090](../trust-security/SwRS-MDOKFSTUDIO-TRUST-090.md): Every page request is answered once by its id and result type, or ends with a readable error
<!-- okf:links:end -->
