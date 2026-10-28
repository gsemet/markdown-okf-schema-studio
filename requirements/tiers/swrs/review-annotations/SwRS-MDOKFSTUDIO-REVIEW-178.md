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
lifecycle: proposed
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
