---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-219
uuid: 1180dc9f-31e6-41fe-89db-c954df58c002
title: An orphaned thread whose quote returns is placed again
description: When the document text changes while a review thread is orphaned
  and its quote is found again under the re-anchoring rules, the extension SHALL
  post the thread on the found lines with orphaned false, without writing the
  comments file.
project: markdown-okf-schema-studio
scope: review-annotations
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-008
- StRS-MDOKFSTUDIO-REVIEW-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/session/features/comments.ts
tested_in_files:
- test/integration/commentAnchors.test.ts
- test/integration/realInput/tableCommentUndo.ts
- test/session/reviewReqComments.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## An orphaned thread whose quote returns is placed again

### Normative behavior

When the document text changes while a review thread is orphaned and its quote is found again under the re-anchoring rules, the extension SHALL post the thread on the found lines with orphaned false, without writing the comments file.

### Scenario (nominal): A deleted row is restored by an undo

- GIVEN a thread quoting "beta" on a table row, the row deleted so that the thread is orphaned, and the comments file unchanged
- WHEN the delete is undone
- THEN the thread is posted on the line of the restored row with orphaned false, so the page shows its mark
- AND the comments file on disk is unchanged

### Scenario (nominal): A quote retyped in a document with unsaved changes

- GIVEN an orphaned thread in a document with unsaved changes
- WHEN the text gains its quote again (a paste, a retyped word)
- THEN the thread is posted on the lines where the quote is found with orphaned false

### Scenario (refusal): A short quote outside the window stays orphaned

- GIVEN an orphaned thread whose quote has fewer than 12 characters and a document where that word reappears more than 50 lines from the stored line
- WHEN the document text changes
- THEN the thread stays orphaned and keeps its stored lines

### Scenario (boundary): No orphaned thread

- GIVEN threads that are all anchored
- WHEN the document text changes
- THEN the threads only follow the edits and the document is not checked again

### Verification notes

- Method: test/session/reviewReqComments.requirements.test.ts (`an orphaned thread whose quote returns is posted again on its lines, nothing is written`; `a short quote that reappears outside the window stays orphaned`; `without an orphaned thread a text change costs no extra check of the document`), test/integration/commentAnchors.test.ts (row deleted with a workspace edit, then undone) and test/integration/realInput/tableCommentUndo.ts (Row -, Escape, undo: the mark of the thread is back).
- Criteria: the posted thread has orphaned false and the found line; the comments file text is identical before and after; the buffer is not read again while no thread is orphaned. The check runs in the post that follows a change of the document revision, only while an orphan exists; anchored threads are not checked again.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-REVIEW-008](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-008.md): Review threads follow edits and renames of the document
  - [StRS-MDOKFSTUDIO-REVIEW-001](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-001.md): A reviewer reads review threads on the text, and unplaceable ones are kept
<!-- okf:links:end -->
