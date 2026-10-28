---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-071
uuid: 27b7115e-f45e-4f05-8abf-ae5208efbf0c
title: Resolve and delete messages name a thread; resolve carries a flag
description: When a previewCommentResolve or previewCommentDelete message
  reaches the host, the extension SHALL drop it without an answer unless it has
  a non-empty thread id and, for resolve, a boolean resolved flag.
project: markdown-okf-schema-studio
scope: review-annotations
lifecycle: proposed
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
default_owner_email: gaetan@xeberon.net
---

## Resolve and delete messages name a thread; resolve carries a flag

### Normative behavior

When a previewCommentResolve or previewCommentDelete message reaches the host, the extension SHALL drop it without an answer unless it has a non-empty thread id and, for resolve, a boolean resolved flag.

### Scenario (nominal): Valid messages

- GIVEN a previewCommentResolve message with a thread id and resolved true, and a previewCommentDelete message with a thread id
- WHEN the messages are validated
- THEN both are accepted

### Scenario (refusal): Invalid messages

| Input | Outcome |
| --- | --- |
| previewCommentResolve or previewCommentDelete with an empty thread id | dropped without an answer |
| previewCommentResolve with a resolved flag that is not a boolean | dropped without an answer |

### Verification notes

- Method: test/core/protocol/pageToHost.test.ts (unit test `T44: previewCommentResolve and previewCommentDelete validate the thread id and the flag`: scenarios valid messages, invalid messages).
- Criteria: The validators accept only the valid shapes.
