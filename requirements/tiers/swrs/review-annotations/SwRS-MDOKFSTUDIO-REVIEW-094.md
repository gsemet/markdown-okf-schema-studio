---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-094
uuid: bb5c7828-1583-4820-9a65-40af09f2c4e9
title: Edits move the stored lines of a thread in memory
description: When lines are inserted or removed above a review thread in an
  edited document, the extension SHALL move the stored lines of the thread by
  the same number of lines in memory.
project: markdown-okf-schema-studio
scope: review-annotations
lifecycle: proposed
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
tested_in_files:
- test/core/comments/anchoring.test.ts
- test/integration/commentAnchors.test.ts
default_owner_email: gaetan@xeberon.net
---

## Edits move the stored lines of a thread in memory

### Normative behavior

When lines are inserted or removed above a review thread in an edited document, the extension SHALL move the stored lines of the thread by the same number of lines in memory.

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

### Verification notes

- Method: test/core/comments/anchoring.test.ts, `T45: shiftThreadLines follows lines inserted and removed above` (lines inserted, lines removed), `T45: shiftThreadLines applies several changes of one event (multi-cursor, undo order)` (several changes), `T45: shiftThreadLines keeps endLine at or after line` (end line, no edit), `T45: a quote still inside its lines stays anchored` and `T45r2: a copy in the old lines that does not fit the context yields to the copy that does` (quote still inside its lines), `T45: a thread without quote stays where it is while the line exists` (no quote).
- Method: test/integration/commentAnchors.test.ts (anchors follow edits, two inserts in one event).
- Criteria: The shifted lines equal the original lines plus the net number of inserted lines above and do not depend on the order of the changes; endLine >= line for every shifted thread; the state is anchored with unchanged lines for a quote in place, and anchored for line 3 and orphaned for line 30 without a quote.
