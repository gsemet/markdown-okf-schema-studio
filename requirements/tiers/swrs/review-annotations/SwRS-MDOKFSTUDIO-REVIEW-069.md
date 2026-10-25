---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-069
uuid: af06fba4-f484-4854-bceb-17e016f21dc4
title: A comment create message needs a valid anchor and a bounded body
description: When a previewCommentCreate message reaches the host, the extension
  SHALL drop it without an answer unless its anchor has integer lines with 1 <=
  line <= endLine, a quote of at most 500 characters and a prefix and suffix of
  at most 32 characters, and its body has 1 to 10 000 characters.
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
- test/core/comments/commentEditing.test.ts
- test/core/protocol/pageToHost.test.ts
- test/integration/commentWrite.test.ts
---

## A comment create message needs a valid anchor and a bounded body

### Normative behavior

When a previewCommentCreate message reaches the host, the extension SHALL drop it without an answer unless its anchor has integer lines with 1 <= line <= endLine, a quote of at most 500 characters and a prefix and suffix of at most 32 characters, and its body has 1 to 10 000 characters.

### Scenario (nominal): Valid message

- GIVEN a previewCommentCreate message with an anchor on lines 3 to 3 with a quote of 5 characters and a body of 1 character
- WHEN the message is validated
- THEN it is accepted

### Scenario (refusal): Invalid messages

| Input | Outcome |
| --- | --- |
| An anchor with line 0 | dropped without an answer and nothing is written |
| An anchor with endLine before line | dropped without an answer and nothing is written |
| A quote of 501 characters | dropped without an answer and nothing is written |
| A prefix or suffix of 33 characters | dropped without an answer and nothing is written |
| A body of 0 characters | dropped without an answer and nothing is written |
| A body of 10 001 characters | dropped without an answer and nothing is written |

### Scenario (boundary): Accepted limits

| Input | Outcome |
| --- | --- |
| A quote of 500 characters, a prefix and a suffix of 32 characters | accepted |
| A body of 1 character, a body of 10 000 characters | accepted |

### Verification notes

- Method: test/core/protocol/pageToHost.test.ts (unit test `T43: previewCommentCreate and previewCommentReply validate anchor, id and body limits`: scenarios valid message, invalid messages, accepted limits).
- Method: test/core/comments/commentEditing.test.ts (unit test `T43: isValidAnchor enforces lines and the 500 / 32 / 32 limits`: scenarios invalid messages, accepted limits).
- Method: test/integration/commentWrite.test.ts (invalid messages write nothing: scenario invalid messages).
- Criteria: The validator accepts the boundary values and refuses one more.
