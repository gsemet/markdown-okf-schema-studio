---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-094
uuid: bb5c7828-1583-4820-9a65-40af09f2c4e9
title: "Edits move the stored lines of a thread in memory and write nothing to its
  file"
description: "When lines are inserted or removed above a review thread in an edited
  document, the extension SHALL move the stored lines of the thread by the same number
  of lines in memory; the edit writes nothing to the comments file, and a change of
  a document without unsaved changes drops the lines followed in memory so that every
  thread is checked again against the new text."
project: markdown-okf-schema-studio
scope: review-annotations
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-008
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/comments/anchoring.ts
- src/session/features/comments.ts
tested_in_files:
- test/core/comments/anchoring.test.ts
- test/integration/commentAnchors.test.ts
default_owner_email: gaetan@xeberon.net
---

## Edits move the stored lines of a thread in memory and write nothing to its file

### Normative behavior

When lines are inserted or removed above a review thread in an edited document, the extension SHALL move the stored lines of the thread by the same number of lines in memory; the edit writes nothing to the comments file, and a change of a document without unsaved changes drops the lines followed in memory so that every thread is checked again against the new text.

### Scenario (nominal): Lines inserted above

- GIVEN a thread on lines 10 to 12, a thread on line 3 and two lines inserted at line 5
- WHEN the document changes
- THEN the first thread is on lines 12 to 14 and the thread on line 3 is unchanged

### Scenario (nominal): Lines removed above

- GIVEN the same threads and the lines 5 and 6 removed (a change from line 4 to line 6)
- WHEN the document changes
- THEN the first thread is on lines 8 to 10

### Scenario (boundary): Several changes of one edit event move the thread once

Every change is read in the coordinates of the text before the event and the thread moves by their sum, whatever the order of the changes.

| Input | Outcome |
| --- | --- |
| a thread on line 20 and one event that inserts two lines at line 2, inserts two lines at line 10 and removes two lines at 15 to 17 | the thread is on line 22 |
| the same changes listed in the opposite order | the thread is on line 22 as well |

### Scenario (boundary): A thread end line never falls before its first line

| Input | Outcome |
| --- | --- |
| a thread on lines 5 to 8 and a removal from line 6 to line 12 | endLine is not smaller than line |
| no change event | the same threads are returned |

### Scenario (nominal): A quote still inside its lines keeps its thread there

- GIVEN a thread on line 3 quoting "quick brown fox" and a paragraph on line 3 holding it
- WHEN the thread is checked against the document text
- THEN the thread stays anchored on line 3
- AND with several copies of the quote in the document, one inside the old lines that fits the surroundings of the thread, the thread stays as well

### Scenario (boundary): A thread without a quote stays while its line exists

| Input | Outcome |
| --- | --- |
| a block-only thread (no quoted text) on line 3 in a document of 5 lines | the thread stays anchored |
| the same thread on line 30 in that document | the thread is orphaned |

### Scenario (refusal): Typing writes nothing

- GIVEN a document with three threads and lines inserted above them
- WHEN the edits are made without saving
- THEN the comments file on disk is unchanged
- AND when the threads are posted again the page shows the threads on their new lines

### Scenario (boundary): Change of a clean document

| Input | Outcome |
| --- | --- |
| A document without unsaved changes changes (a revert, a reload from disk, an undo or a redo whose change event reports no unsaved changes) | The lines followed in memory are dropped and the threads are checked again against the new text |
| The same change while the comments file text stays the same | The threads are still checked again against the new text: the unchanged file does not skip the check, and later edits shift the new lines |
| An undo or a redo whose change event reports unsaved changes (the flag is the state before the change, so an undo back to the saved text still reports unsaved changes) | The lines are shifted in memory as for any edit, then every thread is checked again against the new text starting from the lines followed in memory |
| A document with unsaved changes changes (not an undo or a redo) | The lines are shifted in memory instead |

### Verification notes

- Method: test/core/comments/anchoring.test.ts, `T45: shiftThreadLines follows lines inserted and removed above` (lines inserted, lines removed), `T45: shiftThreadLines applies several changes of one event (multi-cursor, undo order)` (several changes), `T45: shiftThreadLines keeps endLine at or after line` (end line, no edit), `T45: a quote still inside its lines stays anchored` and `T45r2: a copy in the old lines that does not fit the context yields to the copy that does` (quote still inside its lines), `T45: a thread without quote stays where it is while the line exists` (no quote).
- Method: test/integration/commentAnchors.test.ts (anchors follow edits, two inserts in one event).
- Criteria: The shifted lines equal the original lines plus the net number of inserted lines above and do not depend on the order of the changes; endLine >= line for every shifted thread; the state is anchored with unchanged lines for a quote in place, and anchored for line 3 and orphaned for line 30 without a quote.
- Method: test/integration/commentAnchors.test.ts (no write while typing and the page follows: Typing writes nothing).
- Method: test/session/reviewReqComments.requirements.test.ts: `a document without unsaved changes that changes drops the followed lines, a dirty one shifts them` and `an undo or a redo shifts the followed lines and marks every thread to be checked again` (Change of a clean document, the undo and redo rows), `an unrelated undo keeps a short-quote thread on its followed line, far beyond the search window` (the check starts from the lines followed in memory), `a clean document that changes is checked again even when the comments file did not change` (the same comments file text).
- Criteria: The comments file text is identical before and after the edits; the view is set to undefined when the changed document is not dirty; after an undo or a redo flagged dirty, the view has recheck true and its thread line is shifted (4 to 5), and the short-quote thread followed in memory to line 73 is posted on line 73 with orphaned false after an unrelated undo.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-REVIEW-008](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-008.md): Review threads follow edits and renames of the document
<!-- okf:links:end -->
