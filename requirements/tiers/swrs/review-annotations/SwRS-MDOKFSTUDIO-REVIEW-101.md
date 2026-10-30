---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-101
uuid: 45abec4f-6dff-4b32-9438-091ac3044bf9
title: A thread whose quote is gone or ambiguous is orphaned and keeps its lines
description: When the quote of a review thread cannot be found and its old lines
  do not resemble it, the extension SHALL mark the thread as orphaned and keep
  its stored lines and comments.
project: markdown-okf-schema-studio
scope: review-annotations
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-008
- StRS-MDOKFSTUDIO-REVIEW-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/comments/anchoring.ts
tested_in_files:
- test/core/comments/anchoring.test.ts
default_owner_email: gaetan@xeberon.net
---

## A thread whose quote is gone or ambiguous is orphaned and keeps its lines

### Normative behavior

When the quote of a review thread cannot be found and its old lines do not resemble it, the extension SHALL mark the thread as orphaned and keep its stored lines and comments.

### Scenario (nominal): A deleted quote orphans the thread

- GIVEN a thread on line 3 and a document without the quote
- WHEN the thread is checked
- THEN the state is orphaned and the lines are still 3 to 3

### Scenario (nominal): An orphan among several threads is untouched

- GIVEN a thread list with one orphan
- WHEN the threads are checked
- THEN the orphan keeps its lines 4 to 6 and its comments, the orphan set holds the thread id and the thread object is unchanged

### Scenario (boundary): The old lines are checked before the cap of 200 candidates

- GIVEN 300 lines holding the word item and a thread on line 301
- WHEN the thread is checked
- THEN the thread stays anchored on line 301, because a quote that occurs in more than 200 places is still looked for in the old lines first
- AND for a quote with more than 200 copies and no copy in the old lines, at most 200 copies are examined (MAX_CANDIDATES)

### Scenario (refusal): Surroundings that disagree prevent a move

| Input | Outcome |
| --- | --- |
| a thread quoting Overview (a short quote) with prefix "Intro: " and a document where the word has other surroundings | the thread is orphaned |
| two copies of the quote and none that matches the stored prefix and suffix | the thread is orphaned |

### Scenario (boundary): Old lines that still resemble the quote keep the thread

When the quote has no acceptable place but at least 60 percent of its words occur in order in the old lines (RESEMBLANCE = 0.6), or the old lines hold a role that renders text the source lacks, the thread stays on those lines.

| Input | Outcome |
| --- | --- |
| the quote "The scheduler stops after the first problem" and the old line "The scheduler stops after a first problem happens." | the thread stays anchored |
| a quote with no word in common with the old lines | the thread is orphaned |

### Verification notes

- Method: test/core/comments/anchoring.test.ts, `T45: a deleted quote orphans the thread and keeps its old line` (deleted quote), `T45: reanchorThreads updates moved threads, keeps orphans untouched and loses nothing` (orphan among several threads), `T45r2: the old lines are checked before the candidate cap` (old lines first; the cap itself is untested), `T45r2: a short quote never re-attaches when the surroundings disagree` and `T45r2: several copies and no context match is no move` (surroundings disagree), `T45r2: a quote that resembles the old lines (60 % of its words, in order) is not orphaned` (resemblance; the role case is covered by `T45r2: text that renders differently from its source stays anchored at the original line`).
- Criteria: The orphan set holds the thread id and the thread object is unchanged; MAX_CANDIDATES = 200 limits the search and the old lines are searched directly before it; the state is orphaned in both disagreeing cases; RESEMBLANCE = 0.6 of the words in order.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-REVIEW-008](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-008.md): Review threads follow edits and renames of the document
  - [StRS-MDOKFSTUDIO-REVIEW-001](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-001.md): A reviewer reads review threads on the text, and unplaceable ones are kept
<!-- okf:links:end -->
