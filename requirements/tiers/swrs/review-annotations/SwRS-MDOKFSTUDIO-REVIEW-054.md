---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-054
uuid: 55130de2-cc11-47c6-8ac0-30305b4c0217
title: The host writes comment changes one after another within the file limits
description: When the host receives a create message from a writable preview of
  a saved document, the extension SHALL append a thread with the anchor as sent,
  resolved false and one comment, with thread and comment ids and the time
  chosen by the host, in the review comments file next to the document, running
  the changes of one file one after another on its latest content and refusing
  with a reason and a warning, and writing nothing, a change that the file state
  or its limits do not allow, and writing through a temporary file renamed onto
  the comments file and never into a comments file that is a symbolic link.
project: markdown-okf-schema-studio
scope: review-annotations
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-003
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-065
- SwRS-MDOKFSTUDIO-TRUST-090
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/comments/commentModel.ts
- src/core/comments/commentStore.ts
- src/host-vscode/vscodeHost.ts
- src/session/features/comments.ts
tested_in_files:
- test/core/comments/commentEditing.test.ts
- test/core/comments/reviewReq.requirements.test.ts
- test/host-vscode/fileRename.test.ts
- test/integration/commentWrite.test.ts
- test/node-services/nodeServices.test.ts
- test/session/reviewReqComments.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## The host writes comment changes one after another within the file limits

### Normative behavior

When the host receives a create message from a writable preview of a saved document, the extension SHALL append a thread with the anchor as sent, resolved false and one comment, with thread and comment ids and the time chosen by the host, in the review comments file next to the document, running the changes of one file one after another on its latest content and refusing with a reason and a warning, and writing nothing, a change that the file state or its limits do not allow, and writing through a temporary file renamed onto the comments file and never into a comments file that is a symbolic link.

### Scenario (nominal): First comment on a text

- GIVEN a writable preview of notes.md and a create message with an anchor and the body "First remark"
- WHEN the host handles it
- THEN the comments file holds one thread with the anchor as sent, resolved false, an id of the form t_ and 8 hex characters, a comment with an id of the form c_ and 8 hex characters, and an ISO creation time
- AND the earlier threads of the file are unchanged
- AND the answer of the store carries the written text and its hash

### Scenario (nominal): The first comment creates the review comments file

| Input | Outcome |
| --- | --- |
| notes.md with no comments file and a comment is saved | notes.comments.json exists with version 1 and the document name notes.md |
| A comments file that names the document and a comment is saved | The file keeps its document name and gains the thread |

### Scenario (nominal): Changes of one file run one after another

| Input | Outcome |
| --- | --- |
| Two create messages sent at the same moment | The file holds both threads |
| A create and a reply to another thread queued together | Both changes are in the file |
| A resolve or a delete queued with a create | The same per-file queue runs them, each on the latest file |

### Scenario (refusal): A refused change does not stop the queue

- GIVEN a refused change followed by a valid one for the same file
- WHEN both are handled
- THEN the valid change is written

### Scenario (refusal): Refusal reasons

When the host refuses a comment change, it answers the page ok false with the reason below, writes nothing and leaves the file untouched.

| Condition | Reason answered to the page |
| --- | --- |
| The preview is read-only | see SwRS-MDOKFSTUDIO-TRUST-005 |
| The document is not a saved file (an untitled document, a uri that does not start with file:) | "save the document first." |
| The comments file is open in an editor with unsaved changes | "{name} has unsaved changes in an editor; save or close it first." |
| The change makes the serialized file larger than 2 MiB (the UTF-8 length above MAX_SIDECAR_BYTES) | "the comments file would become too large." |
| The file already holds 1000 threads | "the comments file is full." |
| A new thread repeats the id of another thread | the change is refused (the same reason, "the comments file is full.") |
| The existing comments file is not valid | "the comments file is not valid ({first problem}) and is left untouched." |
| The comments file path is itself a symbolic link (a dangling one included) | "the comments file is a symbolic link and is left untouched" |

### Scenario (nominal): A write replaces the file in one step

- GIVEN a valid change to a comments file that is not a symbolic link
- WHEN the host writes it
- THEN the text is written to a temporary file in the same folder and renamed onto the comments file
- AND a failed write or rename removes the temporary file and leaves the comments file as it was

### Scenario (refusal): A refusal also shows a warning

- GIVEN a comments file with unsaved changes in an editor
- WHEN a comment is saved
- THEN the warning "The comment was not saved: {reason}" names the reason and the page is told the same reason
- AND WHEN a comment is saved normally, THEN no warning is shown

### Scenario (boundary): The change is written once the cause is gone

| Input | Outcome |
| --- | --- |
| The same comments file saved or closed in its editor, and a comment is saved | The comment is written |
| A comment that keeps the file below 2 MiB | The comment is written |
| A preview of a saved file, and a comment is created | The comment is written |

### Related requirements

- SwRS-MDOKFSTUDIO-REVIEW-044: the comment box that shows the answer of the host.
- SwRS-MDOKFSTUDIO-REVIEW-065: the author stored with the comment.
- SwRS-MDOKFSTUDIO-REVIEW-069: the accepted shape of the create message.
- SwRS-MDOKFSTUDIO-REVIEW-074: the other changes of a thread that use the same queue and refusals.

### Verification notes

- Method: test/core/comments/commentEditing.test.ts, unit tests `T43: addThread appends a thread with its first comment and does not touch the input` and `T43: ids are a prefix and 8 hex characters` (First comment on a text), `T43: two quick creates never lose one (per-file queue: read latest, apply, write)`, `T43: a create and a reply queued together both land` and `T44: resolve and delete go through the same per-file queue as create` (Changes of one file run one after another), `T43: an invalid existing file is never overwritten, and a refusal does not stop the queue` (A refused change does not stop the queue, the invalid file row), `T43: the result carries the written text and its hash (the host ignores that echo)` (First comment on a text), `T43: addThread refuses a full file and a repeated id` (Refusal reasons, the 1000 threads and repeated id rows).
- Method: test/integration/commentWrite.test.ts (First comment on a text with ids, author and anchor; the file does not exist before the first create, version 1, document notes.md; two quick creates must both be saved; dirty sidecar, the result reason matches unsaved changes and the file on disk is untouched; the refusal reasons sent to the page). The warning text is not asserted, and the write after the editor is reverted is not asserted.
- Method: test/core/comments/reviewReq.requirements.test.ts, unit test a change that makes the serialized file larger than 2 MiB is refused before the write (Refusal reasons, the 2 MiB row).
- Method: test/session/reviewReqComments.requirements.test.ts, unit test a comment for a document that is not a file is refused with 'save the document first.' (Refusal reasons, the not-a-file row).
- Method: test/core/comments/commentEditing.test.ts, unit tests `S-04: a comments file that is a symbolic link is refused and its target is never written` (the symbolic link row) and `S-04: a write goes to a temporary file and is renamed onto the comments file; a failed rename leaves no temporary file` (A write replaces the file in one step).
- Method: test/node-services/nodeServices.test.ts, unit test `the Node file system reports a link itself, a dangling one included, and not a missing path` (the link check of the Node file system).
- Method: real window review-annotations/r04-thread-created (First comment on a text).
- Criteria: The written file matches the pattern for ids and dates and holds the anchor as sent, and parses with version 1. After concurrent changes the file holds every change, and the second change is written after the first was refused. The refusal comes before the write when the UTF-8 length exceeds MAX_SIDECAR_BYTES, writeComment refuses when the document uri does not start with file:, and for an unsaved comments file the reason names the file and the disk content is identical. showWarning is called with the prefix and the reason on every refusal in writeComment; the refusals of an empty or too long body, an unknown thread id and an unexpected error are answered to the page without a warning.
