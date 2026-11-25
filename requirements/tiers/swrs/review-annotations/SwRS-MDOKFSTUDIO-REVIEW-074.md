---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-074
uuid: 495194d0-2127-40ff-a77a-99f239aa50cd
title: "Reply, resolve, reopen and delete change the named thread only, and a malformed
  message changes nothing"
description: "When the host handles a reply, resolve or delete message for a thread
  of the review comments file, the extension SHALL append the comment, set the resolved
  flag or remove the thread of that name only and change no other thread, and refuse
  with a reason and write nothing when that thread does not exist or already holds
  200 comments; a reply, resolve or delete message is dropped without an answer unless
  it has a non-empty thread id, a reply has a body of 1 to 10 000 characters and a
  resolve has a boolean resolved flag."
project: markdown-okf-schema-studio
scope: review-annotations
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-003
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-090
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-065
scenarios:
- id: S1
  title: Reply
- id: S2
  title: A reply to an unknown or full thread
- id: S3
  title: Resolve and reopen
- id: S4
  title: Delete one of two
- id: S5
  title: Delete the last thread
- id: S6
  title: A resolve or a delete of an unknown thread
- id: S7
  title: Valid reply message
- id: S8
  title: Invalid reply message
- id: S9
  title: Accepted limits of a reply message
- id: S10
  title: Valid resolve and delete messages
- id: S11
  title: Invalid resolve and delete messages
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/comments/commentModel.ts
- src/core/protocol/pageToHost.ts
- src/session/features/comments.ts
tested_in_files:
- test/core/comments/commentEditing.test.ts
- test/core/protocol/pageToHost.test.ts
- test/integration/commentWrite.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-REVIEW-070
- SwRS-MDOKFSTUDIO-REVIEW-071
---

## Reply, resolve, reopen and delete change the named thread only, and a malformed message changes nothing

### Normative behavior

When the host handles a reply, resolve or delete message for a thread of the review comments file, the extension SHALL append the comment, set the resolved flag or remove the thread of that name only and change no other thread, and refuse with a reason and write nothing when that thread does not exist or already holds 200 comments; a reply, resolve or delete message is dropped without an answer unless it has a non-empty thread id, a reply has a body of 1 to 10 000 characters and a resolve has a boolean resolved flag.

### Scenario S1 (nominal): Reply

- GIVEN two threads and a reply to the first, sent from the thread popover
- WHEN the host handles it
- THEN the first thread holds its comment and the reply, listed after the first comment, with author, id and time chosen by the host, and the second thread is unchanged

### Scenario S2 (refusal): A reply to an unknown or full thread

| Input | Outcome |
| --- | --- |
| A reply to the thread t_ffffffff | The page is told "the thread no longer exists or has too many comments." and the file is unchanged |
| A reply to a thread that holds 200 comments | The change is refused with the same reason |

### Scenario S3 (nominal): Resolve and reopen

| Input | Outcome |
| --- | --- |
| The reader resolves an open thread and then reopens it | The file shows resolved true and then false and the other threads are unchanged |
| Three threads of which one is resolved, and another one is resolved | Only that one changes |

### Scenario S4 (nominal): Delete one of two

- GIVEN two threads
- WHEN one is deleted
- THEN the other stays in the file

### Scenario S5 (boundary): Delete the last thread

- GIVEN a file with one thread
- WHEN it is deleted
- THEN the file stays with an empty threads list (threads []) and the page is told the list is empty

### Scenario S6 (refusal): A resolve or a delete of an unknown thread

| Input | Outcome |
| --- | --- |
| A delete for the thread t_ffffffff | The page is told ok false with kind delete and "the thread no longer exists.", and the file is unchanged |
| A resolve for an unknown thread | The same refusal is answered with kind resolve |

The refusals of the host that apply to every comment change (a document that is not a saved file, a comments file with unsaved changes in an editor, the size and thread limits of the file) and the warning shown with them are in SwRS-MDOKFSTUDIO-REVIEW-054.

### Scenario S7 (nominal): Valid reply message

- GIVEN a previewCommentReply message with a thread id and a body of 1 character
- WHEN the message is validated
- THEN it is accepted

### Scenario S8 (refusal): Invalid reply message

| Input | Outcome |
| --- | --- |
| An empty thread id | dropped without an answer |
| A body of 0 characters | dropped without an answer |
| A body of 10 001 characters | dropped without an answer |

### Scenario S9 (boundary): Accepted limits of a reply message

| Input | Outcome |
| --- | --- |
| A body of 1 character, a body of 10 000 characters | accepted |

### Scenario S10 (nominal): Valid resolve and delete messages

- GIVEN a previewCommentResolve message with a thread id and resolved true, and a previewCommentDelete message with a thread id
- WHEN the messages are validated
- THEN both are accepted

### Scenario S11 (refusal): Invalid resolve and delete messages

| Input | Outcome |
| --- | --- |
| previewCommentResolve or previewCommentDelete with an empty thread id | dropped without an answer |
| previewCommentResolve with a resolved flag that is not a boolean | dropped without an answer |

### Related requirements

- SwRS-MDOKFSTUDIO-REVIEW-054: the per-file queue and the refusals shared by every comment change.
- SwRS-MDOKFSTUDIO-REVIEW-065: the author stored with a reply.
- SwRS-MDOKFSTUDIO-REVIEW-044: the thread popover that sends the reply.
- SwRS-MDOKFSTUDIO-REVIEW-086: the thread popover that sends resolve, reopen and delete.

### Verification notes

- Method: test/core/comments/commentEditing.test.ts, unit tests `T43: addReply appends to the named thread only` (Reply, A reply to an unknown or full thread at the model level), `T44: setResolved resolves and reopens the named thread only, without touching the input` (Resolve and reopen, A resolve of an unknown thread: undefined for a missing thread is part of the contract), `T44: deleteThread removes the named thread only; the last one leaves an empty list` (Delete one of two, Delete the last thread, A delete of an unknown thread).
- Method: test/integration/commentWrite.test.ts (reply to the named thread; unknown thread refused with the file unchanged; resolve, reopen, resolve a second thread; delete a second thread with the others staying; deleting the last thread keeps the file and the page gets the empty list; delete of an unknown thread refused with the file unchanged). The 200-comment limit through addReply is covered by no test, and the resolve refusal through the host is untested.
- Method: real window review-annotations/r05-thread-reply (Reply) and review-annotations/r06-thread-resolved (Resolve and reopen).
- Criteria: The thread holds the comments in order and the other thread is identical. The resolved flag changes for the named thread only. The remaining ids match and the file exists with threads [] after the last delete. addReply returns undefined for a missing or full thread, setResolved and deleteThread return undefined for a missing thread, and the page gets the reason.
- Method: test/core/protocol/pageToHost.test.ts (unit test `T43: previewCommentCreate and previewCommentReply validate anchor, id and body limits`: scenarios valid reply message, invalid reply message message, accepted limits of a reply message).
- Criteria: The validator accepts the boundary values and refuses one more.
- Method: test/core/protocol/pageToHost.test.ts (unit test `T44: previewCommentResolve and previewCommentDelete validate the thread id and the flag`: scenarios valid resolve and delete messages, invalid resolve and delete messages).
- Criteria: The validators accept only the valid shapes.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-REVIEW-003](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-003.md): A reviewer comments, replies, resolves and deletes, and no comment is lost
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-005](../trust-security/SwRS-MDOKFSTUDIO-TRUST-005.md): The host handles the page messages of every preview, whatever the trust
  - [SwRS-MDOKFSTUDIO-TRUST-090](../trust-security/SwRS-MDOKFSTUDIO-TRUST-090.md): Every page request is answered once by its id and result type, or ends with a readable error
  - [SwRS-MDOKFSTUDIO-TRUST-052](../trust-security/SwRS-MDOKFSTUDIO-TRUST-052.md): Every page message has a registered type and a valid envelope before any handler runs
  - [SwRS-MDOKFSTUDIO-TRUST-065](../trust-security/SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
- Supersedes:
  - [SwRS-MDOKFSTUDIO-REVIEW-070](SwRS-MDOKFSTUDIO-REVIEW-070.md): A comment reply message names a thread and carries a bounded body
  - [SwRS-MDOKFSTUDIO-REVIEW-071](SwRS-MDOKFSTUDIO-REVIEW-071.md): Resolve and delete messages name a thread; resolve carries a flag
<!-- okf:links:end -->
