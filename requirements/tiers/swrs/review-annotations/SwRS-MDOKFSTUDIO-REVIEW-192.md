---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-192
uuid: 471a5f82-0279-4bb3-8b6e-9dcd93f7d8b6
title: Deleting an inline thread removes whole lines
description: When the host applies a delete of an inline thread, the extension
  SHALL remove the lines of the thread and one surrounding blank line when both
  neighbours are blank or missing, remove the line break before a thread that
  ends the file, and change nothing else.
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
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-BLOCK-058
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/comments/inlineThread.ts
tested_in_files:
- test/core/comments/inlineThread.test.ts
- test/core/edits/sourceEdits.test.ts
- test/integration/inlineThread.test.ts
default_owner_email: gaetan@xeberon.net
---

## Deleting an inline thread removes whole lines

### Normative behavior

When the host applies a delete of an inline thread, the extension SHALL remove the lines of the thread and one surrounding blank line when both neighbours are blank or missing, remove the line break before a thread that ends the file, and change nothing else.

### Scenario (nominal): Blank neighbours

- GIVEN a thread between two blank lines
- WHEN it is deleted
- THEN the thread and one blank line go and no double gap is left

### Scenario (boundary): Position of the thread in the file

| Input | Outcome |
| --- | --- |
| A thread directly after a text line | only the thread lines go |
| A thread on the last lines of the file | the line break before it goes: the file ends with the text before it and no trailing blank line is left (the edit range ends at the end of the file and starts at the end of the previous line) |
| A thread on the first lines of the file | the thread and the blank line after it go |

### Scenario (refusal): Lines that are not exactly one thread

- GIVEN lines that hold ordinary text, a part of the thread, or the thread and more
- WHEN a delete is asked
- THEN the answer is "The thread is no longer in the source. Refresh the preview." and the document is unchanged, as for a reply (see SwRS-MDOKFSTUDIO-REVIEW-186)

### Related requirements

- SwRS-MDOKFSTUDIO-REVIEW-178: the accepted shape of the delete message.
- SwRS-MDOKFSTUDIO-REVIEW-186: the reply to an inline thread and the refusal of lines that are not one thread.

### Verification notes

- Method: test/core/comments/inlineThread.test.ts (unit test `deleting takes one surrounding blank line when both neighbours are blank` and the threadDeleteRange unit test for the first-in-file case: scenarios blank neighbours, position of the thread in the file).
- Method: test/core/edits/sourceEdits.test.ts (unit tests `deleting a thread removes whole lines and one of two surrounding blank lines`, `deleting a thread at the end of the file removes the line break before it`, `thread lines are read only when they are exactly one thread comment`: scenarios blank neighbours, position of the thread in the file, lines that are not exactly one thread).
- Method: test/integration/inlineThread.test.ts (delete between paragraphs; lines that are not exactly the thread change nothing: scenarios blank neighbours, lines that are not exactly one thread).
- Criteria: The result text equals the document without the thread and one blank line; the document text is identical after a refused request.
