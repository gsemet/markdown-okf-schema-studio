---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-070
uuid: 3ae5a265-01fe-465a-a0e6-d10a588c612d
title: A comment reply message names a thread and carries a bounded body
description: When a previewCommentReply message reaches the host, the extension
  SHALL drop it without an answer unless it has a non-empty thread id and a body
  of 1 to 10 000 characters.
project: markdown-okf-schema-studio
scope: review-annotations
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-003
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-065
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/pageToHost.ts
- src/session/features/comments.ts
tested_in_files:
- test/core/protocol/pageToHost.test.ts
---

## A comment reply message names a thread and carries a bounded body

### Normative behavior

When a previewCommentReply message reaches the host, the extension SHALL drop it without an answer unless it has a non-empty thread id and a body of 1 to 10 000 characters.

### Scenario (nominal): Valid reply

- GIVEN a previewCommentReply message with a thread id and a body of 1 character
- WHEN the message is validated
- THEN it is accepted

### Scenario (refusal): Invalid reply

| Input | Outcome |
| --- | --- |
| An empty thread id | dropped without an answer |
| A body of 0 characters | dropped without an answer |
| A body of 10 001 characters | dropped without an answer |

### Scenario (boundary): Accepted limits

| Input | Outcome |
| --- | --- |
| A body of 1 character, a body of 10 000 characters | accepted |

### Verification notes

- Method: test/core/protocol/pageToHost.test.ts (unit test `T43: previewCommentCreate and previewCommentReply validate anchor, id and body limits`: scenarios valid reply, invalid reply, accepted limits).
- Criteria: The validator accepts the boundary values and refuses one more.
