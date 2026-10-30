---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-186
uuid: 7734894d-d131-4ec7-a255-fb2b67af57f6
title: The host appends a reply inside the thread comment under the author
description: When the host receives a reply to an inline thread, the extension
  SHALL, if the named lines are still exactly one thread comment and the
  document has not changed meanwhile, add one message, a header with the author
  on one line and the local date and time as YYYY-MM-DD HH:MM and the reply text
  indented by two spaces, above the closing --> and change nothing else, and
  otherwise answer with the reason and leave the document unchanged.
project: markdown-okf-schema-studio
scope: review-annotations
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-015
- StRS-MDOKFSTUDIO-REVIEW-003
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-065
- SwRS-MDOKFSTUDIO-TRUST-090
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-BLOCK-058
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/comments/inlineThread.ts
- src/session/features/sourceEdits.ts
tested_in_files:
- test/core/comments/inlineThread.test.ts
- test/core/edits/sourceEdits.test.ts
- test/integration/inlineThread.test.ts
- test/session/reviewReqThreads.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## The host appends a reply inside the thread comment under the author

### Normative behavior

When the host receives a reply to an inline thread, the extension SHALL, if the named lines are still exactly one thread comment and the document has not changed meanwhile, add one message, a header with the author on one line and the local date and time as YYYY-MM-DD HH:MM and the reply text indented by two spaces, above the closing --> and change nothing else, and otherwise answer with the reason and leave the document unchanged.

### Scenario (nominal): Reply above the closing marker

- GIVEN a thread whose closing marker is alone on its line, a reply "hi\nthere", the author Bob and text before and after the thread
- WHEN the reply is applied
- THEN the lines "Bob (2026-10-17 08:00):", "  hi", "  there" are added above "-->", the date is the local time as YYYY-MM-DD HH:MM, and the text before and after the thread is unchanged byte for byte

### Scenario (nominal): Line break, indentation and text after the marker

- GIVEN a document with CRLF line ends, or a closing marker indented by two spaces and followed by a space
- WHEN a reply is applied
- THEN every new line ends with CRLF and no lone LF appears, and the marker keeps both its two-space indentation and the text after it

### Scenario (nominal): Author in the header

- GIVEN the setting authorName set to Bob Reviewer, or an author name holding a line break and a tab
- WHEN a reply is applied
- THEN the header reads Bob Reviewer followed by the date, and a name with a line break or a tab is written on one line with single spaces

### Scenario (boundary): Closing marker position and marker in the text

| Input | Outcome |
| --- | --- |
| The lines "<!-- THREAD", "Ada (2026-10-16 10:47):", "  hello -->" and a reply x | the last lines become "  hello", the reply header, "  x" and "-->": the text stays on its line and the marker moves below the reply |
| A closing marker alone on its line | no line is split |
| A reply "a --> b" | the line reads "  a -- > b" and the comment stays open; no reply line contains --> |
| A reply without the marker | the text is written as typed |

### Scenario (refusal): Lines that are not exactly one thread

| Input | Outcome |
| --- | --- |
| Lines 5 to 8 that hold exactly one thread comment | the reply is applied |
| Lines that hold ordinary text | the answer is "The thread is no longer in the source. Refresh the preview." and the document is unchanged |
| Lines that hold a part of the thread | the answer is "The thread is no longer in the source. Refresh the preview." and the document is unchanged |
| Lines that hold the thread and more | the answer is "The thread is no longer in the source. Refresh the preview." and the document is unchanged |

### Scenario (refusal): Document changed while the author is resolved

| Input | Outcome |
| --- | --- |
| A reply whose author lookup is slow and an edit of the document in between | the answer is "The document changed meanwhile. Try again." and nothing is changed |
| No edit in between | the reply is planned and applied |

### Related requirements

- SwRS-MDOKFSTUDIO-REVIEW-178: the accepted shape of the reply message.
- SwRS-MDOKFSTUDIO-REVIEW-192: the delete of an inline thread, which re-reads the same lines.
- SwRS-MDOKFSTUDIO-REVIEW-065: the order in which the author name is resolved.

### Verification notes

- Method: test/core/comments/inlineThread.test.ts (unit tests `a reply goes above the closing marker and nothing else changes`, `the date is written in local time as YYYY-MM-DD HH:MM`, `a reply keeps the indentation and the text after the closing marker`, `a reply cannot close the comment early, and an empty reply or a non-thread is refused`, `a thread closed on the last message line is split before the reply`, `an author is written on one line`: scenarios reply above the closing marker, line break and indentation, author, closing marker position and marker in the text).
- Method: test/core/edits/sourceEdits.test.ts (unit tests `thread lines are read only when they are exactly one thread comment`, `a thread reply replaces the closing line and uses the document's line break`: scenarios lines that are not exactly one thread, line break).
- Method: test/integration/inlineThread.test.ts (reply appended, text before and after unchanged, LF and CRLF, author Bob Reviewer, lines that are not exactly the thread change nothing: scenarios reply above the closing marker, line break, author, lines that are not exactly one thread).
- Method: test/session/reviewReqThreads.requirements.test.ts (unit test: a document that changes while the author is resolved gets the changed-meanwhile answer: scenario document changed while the author is resolved).
- Criteria: Only the closing line is replaced by the new lines and the closing marker; the edit text uses the document end of line and the marker line keeps its prefix and suffix; the header author has no control character or line break; the document text is identical after a refused request; the revision of the document is compared again after the author is known.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-REVIEW-015](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-015.md): A writer keeps a discussion in the Markdown source and answers it from the preview
  - [StRS-MDOKFSTUDIO-REVIEW-003](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-003.md): A reviewer comments, replies, resolves and deletes, and no comment is lost
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-052](../trust-security/SwRS-MDOKFSTUDIO-TRUST-052.md): Every page message has a registered type and a valid envelope before any handler runs
  - [SwRS-MDOKFSTUDIO-TRUST-005](../trust-security/SwRS-MDOKFSTUDIO-TRUST-005.md): The host refuses every write request of a read-only preview with a reason
  - [SwRS-MDOKFSTUDIO-TRUST-065](../trust-security/SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
  - [SwRS-MDOKFSTUDIO-TRUST-090](../trust-security/SwRS-MDOKFSTUDIO-TRUST-090.md): Every page request is answered once by its id and result type, or ends with a readable error
  - [SwRS-MDOKFSTUDIO-BLOCK-041](../block-editing/SwRS-MDOKFSTUDIO-BLOCK-041.md): One edit at a time: an open editor blocks other edits, opens and refreshes
  - [SwRS-MDOKFSTUDIO-BLOCK-058](../block-editing/SwRS-MDOKFSTUDIO-BLOCK-058.md): Every host source edit is one undo step, renders once and reports a failed apply
<!-- okf:links:end -->
