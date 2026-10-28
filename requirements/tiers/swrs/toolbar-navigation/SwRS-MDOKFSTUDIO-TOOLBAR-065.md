---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-065
uuid: 905a404d-0df1-4d58-b444-e5aab4d642b8
title: "The history keeps the last 50 places without duplicates"
description: "When a place is pushed to the history of a panel, the extension SHALL
  keep at most the 50 newest places, add no duplicate of the current place and drop
  the places after the current one."
project: markdown-okf-schema-studio
scope: toolbar-navigation
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-009
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/state/navigationHistory.ts
tested_in_files:
- test/core/state/navigationHistory.test.ts
default_owner_email: gaetan@xeberon.net
---

## The history keeps the last 50 places without duplicates

### Normative behavior

When a place is pushed to the history of a panel, the extension SHALL keep at most the 50 newest places, add no duplicate of the current place and drop the places after the current one.

### Scenario (boundary): 51st distinct place

- GIVEN a history of 50 places
- WHEN another distinct place is pushed
- THEN it still holds 50 places, the oldest is gone and the newest is current

### Scenario (nominal): New place after Back

| Given | When | Then |
| --- | --- | --- |
| a history of three places at the second | a new place is pushed | the third place is gone, Next is not possible and the new place is current |
| a history at its last place | a new place is pushed | nothing is dropped |

### Scenario (refusal): Duplicate of the current place is not added

| Given | When | Then |
| --- | --- | --- |
| a current place second.md line 5 | second.md line 5 is pushed | the history keeps its length |
| a current place second.md line 5 | the same document at line 6 is pushed | it is added |
| a jump inside the current document | it is recorded | the number of places does not grow |

### Scenario (nominal): Leaving a place

| Given | When | Then |
| --- | --- | --- |
| a current entry first.md line 1 and the reader at line 8 of first.md | a jump starts | the current entry becomes line 8 and no entry is added |
| a current entry of the same document and no known line | a jump starts | the entry keeps its line and no entry is added |
| a current entry of another document and a place of first.md with no line | a jump starts | first.md is pushed at line 1 |

### Related requirements

- SwRS-MDOKFSTUDIO-TOOLBAR-054: Back and Next move along this history.
- SwRS-MDOKFSTUDIO-TOOLBAR-059: the followed links and anchor jumps that push places.

### Verification notes

- Method: test/core/state/navigationHistory.test.ts (51st distinct place keeps the newest 50; a push after going back drops the forward entries; a duplicate of the current entry is ignored; depart updates the line of the same document, keeps the line when none is known and pushes another document at line 1).
- Criteria: entries.length <= 50 after any push; canForward is false after a push; no change when uri and line are equal; for an equal uri the line is updated if known, else a push with line ?? 1.
