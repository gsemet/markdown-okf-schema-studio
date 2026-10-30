---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-171
uuid: d495f720-7053-41af-870d-fe7acd7bbd50
title: An open inline thread offers Reply and Delete thread
description: When a writable preview shows an inline thread, the page SHALL add
  once to the body of the thread a reply text area labelled "Reply to this
  thread" with the placeholder Reply, a Reply button and a Delete thread button
  titled "Delete the whole thread from the document", and send a reply or a
  delete of the thread to the host with its source lines.
project: markdown-okf-schema-studio
scope: review-annotations
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-015
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-001
- SwRS-MDOKFSTUDIO-TRUST-090
- SwRS-MDOKFSTUDIO-BLOCK-041
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/inlineThread.ts
tested_in_files:
- test/integration/inlineThread.test.ts
- test/page/modules/inlineThread.test.ts
default_owner_email: gaetan@xeberon.net
---

## An open inline thread offers Reply and Delete thread

### Normative behavior

When a writable preview shows an inline thread, the page SHALL add once to the body of the thread a reply text area labelled "Reply to this thread" with the placeholder Reply, a Reply button and a Delete thread button titled "Delete the whole thread from the document", and send a reply or a delete of the thread to the host with its source lines.

### Scenario (nominal): Controls added once
- GIVEN a thread and the content applied twice
- WHEN the page runs the controls
- THEN the thread holds one set of controls (one element with data-okf-thread-actions in its body)

### Scenario (refusal): Read-only page
- GIVEN a preview that cannot edit (an untrusted workspace)
- WHEN the thread is shown
- THEN the messages show and no control is added; see SwRS-MDOKFSTUDIO-TRUST-001

### Scenario (nominal): Reply sends the trimmed text and the source lines
- GIVEN a reply box holding "  Thanks  " in a thread on lines 5 to 8
- WHEN the writer presses Reply, or Cmd+Enter or Ctrl+Enter in the box
- THEN the host is asked for a reply with the lines 5 and 8 and the text Thanks, the controls are disabled until the answer and the box is emptied on success; the keys typed in the box never reach the page

### Scenario (nominal): Delete thread asks without confirmation
- GIVEN a thread on lines 5 to 8
- WHEN the writer presses Delete thread
- THEN the host is asked to delete lines 5 to 8 with no text and no question is shown; the writer undoes the deletion in the editor in one undo step

### Scenario (refusal): Nothing is sent
| Input | Outcome |
| --- | --- |
| Reply with an empty reply box | No request is sent, the message "Write a reply first." appears and the box takes the focus |
| Reply with a box holding only spaces | The same |
| Reply or Delete thread on a thread element without valid source lines (no data-line) | No request is sent and the status line says "The thread has no source position. Refresh the preview." |
| Reply or Delete thread while a block or frontmatter editor is open | No request is sent and the status line holds the reason of the open edit, see SwRS-MDOKFSTUDIO-BLOCK-041 |

### Scenario (refusal): The host refuses the change
The answer is matched to the request, see SwRS-MDOKFSTUDIO-TRUST-090.

| Input | Outcome |
| --- | --- |
| The host answers a reply or a delete with ok false and a reason | The typed text stays and the reason is shown in the status line next to the buttons |
| The host answers with ok false and no reason | The status line reads "The change was not saved." |

### Related requirements
- SwRS-MDOKFSTUDIO-REVIEW-178: shape of the reply and delete messages of an inline thread.
- SwRS-MDOKFSTUDIO-REVIEW-186: the host appends the reply inside the thread comment.
- SwRS-MDOKFSTUDIO-REVIEW-192: the host removes the whole lines of a deleted thread.
- SwRS-MDOKFSTUDIO-REVIEW-086: a review thread's Delete asks first, unlike Delete thread of an inline thread.

### Verification notes
- Method: test/page/modules/inlineThread.test.ts (`an open thread gets a reply box and a Delete button once, and apply is idempotent`, `a read-only page (untrusted workspace) shows the messages without controls`, `Reply sends the trimmed text with the source lines and clears the box on success`, `Cmd or Ctrl+Enter in the box replies, and keys in the box never reach the page`, `Delete thread asks the host with the source lines only`, `an empty reply is not sent, and a refusal keeps the text and says why`, `an open edit blocks the change with its reason, and a thread without lines is not sent`). The default text "The change was not saved." is untested.
- Method: test/integration/inlineThread.test.ts (Delete thread, assert "one undo should restore the thread").
- Method: visual scenario review-annotations/v11-inline-thread-light-900 (controls and reply).
- Criteria: The body holds exactly one element with data-okf-thread-actions in a writable page and none in a read-only page; one request carries the lines and the trimmed text and the controls are re-enabled by the answer; one delete request with the lines and no text is posted; no request is posted and the status line holds the message in the refusal cases; the status line holds the reason and the text area keeps its value.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-REVIEW-015](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-015.md): A writer keeps a discussion in the Markdown source and answers it from the preview
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-001](../trust-security/SwRS-MDOKFSTUDIO-TRUST-001.md): A read-only preview offers no editing affordance
  - [SwRS-MDOKFSTUDIO-TRUST-090](../trust-security/SwRS-MDOKFSTUDIO-TRUST-090.md): Every page request is answered once by its id and result type, or ends with a readable error
  - [SwRS-MDOKFSTUDIO-BLOCK-041](../block-editing/SwRS-MDOKFSTUDIO-BLOCK-041.md): One edit at a time: an open editor blocks other edits, opens and refreshes
<!-- okf:links:end -->
