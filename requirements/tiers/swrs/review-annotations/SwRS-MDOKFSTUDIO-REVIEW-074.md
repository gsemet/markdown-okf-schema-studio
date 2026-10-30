---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-074
uuid: 495194d0-2127-40ff-a77a-99f239aa50cd
title: Reply, resolve, reopen and delete change the named thread only
description: When the host handles a reply, resolve or delete message for a
  thread of the review comments file, the extension SHALL append the comment,
  set the resolved flag or remove the thread of that name only and change no
  other thread, and refuse with a reason and write nothing when that thread does
  not exist or already holds 200 comments.
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
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/comments/commentModel.ts
- src/session/features/comments.ts
tested_in_files:
- test/core/comments/commentEditing.test.ts
- test/integration/commentWrite.test.ts
default_owner_email: gaetan@xeberon.net
---

## Reply, resolve, reopen and delete change the named thread only

### Normative behavior

When the host handles a reply, resolve or delete message for a thread of the review comments file, the extension SHALL append the comment, set the resolved flag or remove the thread of that name only and change no other thread, and refuse with a reason and write nothing when that thread does not exist or already holds 200 comments.

### Scenario (nominal): Reply

- GIVEN two threads and a reply to the first, sent from the thread popover
- WHEN the host handles it
- THEN the first thread holds its comment and the reply, listed after the first comment, with author, id and time chosen by the host, and the second thread is unchanged

### Scenario (refusal): A reply to an unknown or full thread

| Input | Outcome |
| --- | --- |
| A reply to the thread t_ffffffff | The page is told "the thread no longer exists or has too many comments." and the file is unchanged |
| A reply to a thread that holds 200 comments | The change is refused with the same reason |

### Scenario (nominal): Resolve and reopen

| Input | Outcome |
| --- | --- |
| The reader resolves an open thread and then reopens it | The file shows resolved true and then false and the other threads are unchanged |
| Three threads of which one is resolved, and another one is resolved | Only that one changes |

### Scenario (nominal): Delete one of two

- GIVEN two threads
- WHEN one is deleted
- THEN the other stays in the file

### Scenario (boundary): Delete the last thread

- GIVEN a file with one thread
- WHEN it is deleted
- THEN the file stays with an empty threads list (threads []) and the page is told the list is empty

### Scenario (refusal): A resolve or a delete of an unknown thread

| Input | Outcome |
| --- | --- |
| A delete for the thread t_ffffffff | The page is told ok false with kind delete and "the thread no longer exists.", and the file is unchanged |
| A resolve for an unknown thread | The same refusal is answered with kind resolve |

The refusals of the host that apply to every comment change (a read-only preview, a document that is not a saved file, a comments file with unsaved changes in an editor, the size and thread limits of the file) and the warning shown with them are in SwRS-MDOKFSTUDIO-REVIEW-054.

### Related requirements

- SwRS-MDOKFSTUDIO-REVIEW-054: the per-file queue and the refusals shared by every comment change.
- SwRS-MDOKFSTUDIO-REVIEW-065: the author stored with a reply.
- SwRS-MDOKFSTUDIO-REVIEW-070: the accepted shape of the reply message.
- SwRS-MDOKFSTUDIO-REVIEW-071: the accepted shape of the resolve and delete messages.
- SwRS-MDOKFSTUDIO-REVIEW-081: the thread popover that sends the reply.
- SwRS-MDOKFSTUDIO-REVIEW-086: the thread popover that sends resolve, reopen and delete.

### Verification notes

- Method: test/core/comments/commentEditing.test.ts, unit tests `T43: addReply appends to the named thread only` (Reply, A reply to an unknown or full thread at the model level), `T44: setResolved resolves and reopens the named thread only, without touching the input` (Resolve and reopen, A resolve of an unknown thread: undefined for a missing thread is part of the contract), `T44: deleteThread removes the named thread only; the last one leaves an empty list` (Delete one of two, Delete the last thread, A delete of an unknown thread).
- Method: test/integration/commentWrite.test.ts (reply to the named thread; unknown thread refused with the file unchanged; resolve, reopen, resolve a second thread; delete a second thread with the others staying; deleting the last thread keeps the file and the page gets the empty list; delete of an unknown thread refused with the file unchanged). The 200-comment limit through addReply is covered by no test, and the resolve refusal through the host is untested.
- Method: real window review-annotations/r05-thread-reply (Reply) and review-annotations/r06-thread-resolved (Resolve and reopen).
- Criteria: The thread holds the comments in order and the other thread is identical. The resolved flag changes for the named thread only. The remaining ids match and the file exists with threads [] after the last delete. addReply returns undefined for a missing or full thread, setResolved and deleteThread return undefined for a missing thread, and the page gets the reason.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-REVIEW-003](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-003.md): A reviewer comments, replies, resolves and deletes, and no comment is lost
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-005](../trust-security/SwRS-MDOKFSTUDIO-TRUST-005.md): The host refuses every write request of a read-only preview with a reason
  - [SwRS-MDOKFSTUDIO-TRUST-090](../trust-security/SwRS-MDOKFSTUDIO-TRUST-090.md): Every page request is answered once by its id and result type, or ends with a readable error
<!-- okf:links:end -->
