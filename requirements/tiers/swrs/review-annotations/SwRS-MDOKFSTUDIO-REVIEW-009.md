---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-009
uuid: 330b13b9-086b-446d-9c63-e192b4001065
title: "A changed block shows as a side-by-side diff with its word marks, cut by line
  hunks, and a malformed baseline message is dropped"
description: "While the side-by-side diff is on and a baseline for the current render
  is held, the page SHALL replace each block that changed since the last commit by
  a card with the rendered block at the last commit on the left and the rendered current
  block on the right, keep on the left of a block that lies inside one hunk only the
  block at the last commit that shares the most words with it (each kept by one block
  at most) and show the other blocks at the last commit of that hunk as removed blocks
  in their source order, mark the removed words on the left and the added words on
  the right, leave the left empty for an added block and show a removed block with
  an empty right side, leave unchanged blocks as they are, and show the original blocks
  again when the diff goes off or the baseline is stale; the baseline message previewBaselineDiff
  is accepted only with an html string of at most 20 MiB and at most 100 000 hunks
  of non-negative integer lines whose ends are not more than one before their starts,
  for the current render, and any other is dropped; the removed and added words are
  the character ranges found by comparing the block at the last commit with the current
  block word by word, consecutive changed words merged into one range, all words of
  both texts being marked when the comparison would exceed 4 000 000 word pairs; the
  changed blocks are found from line hunks that give the last-commit lines and the
  current lines as 1-based inclusive ranges, with an empty side for lines only added
  or only removed, merged with the hunk next to them when only blank lines separate
  them, ignoring differences of line endings, and reported as one hunk when more than
  20 000 lines differ or more than 2000 edits are needed."
project: markdown-okf-schema-studio
scope: review-annotations
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-018
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/mapping/lineDiff.ts
- src/core/mapping/wordDiff.ts
- src/core/protocol/hostToPage.ts
- src/page/features/hostHandlers.ts
- src/page/modules/sideBySide.ts
tested_in_files:
- test/core/mapping/lineHunks.test.ts
- test/core/mapping/wordDiff.test.ts
- test/core/preview/previewStyles.test.ts
- test/core/protocol/hostToPage.holes.test.ts
- test/core/protocol/hostToPage.test.ts
- test/integration/realWindowGaps.ts
- test/page/runtimePageControls.test.ts
- test/page/sideBySideCards.test.ts
- test/visual/capture_sbs_checks.py
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-REVIEW-005
- SwRS-MDOKFSTUDIO-REVIEW-007
- SwRS-MDOKFSTUDIO-REVIEW-010
---

## A changed block shows as a side-by-side diff with its word marks, cut by line hunks, and a malformed baseline message is dropped

### Normative behavior

While the side-by-side diff is on and a baseline for the current render is held, the page SHALL replace each block that changed since the last commit by a card with the rendered block at the last commit on the left and the rendered current block on the right, keep on the left of a block that lies inside one hunk only the block at the last commit that shares the most words with it (each kept by one block at most) and show the other blocks at the last commit of that hunk as removed blocks in their source order, mark the removed words on the left and the added words on the right, leave the left empty for an added block and show a removed block with an empty right side, leave unchanged blocks as they are, and show the original blocks again when the diff goes off or the baseline is stale; the baseline message previewBaselineDiff is accepted only with an html string of at most 20 MiB and at most 100 000 hunks of non-negative integer lines whose ends are not more than one before their starts, for the current render, and any other is dropped; the removed and added words are the character ranges found by comparing the block at the last commit with the current block word by word, consecutive changed words merged into one range, all words of both texts being marked when the comparison would exceed 4 000 000 word pairs; the changed blocks are found from line hunks that give the last-commit lines and the current lines as 1-based inclusive ranges, with an empty side for lines only added or only removed, merged with the hunk next to them when only blank lines separate them, ignoring differences of line endings, and reported as one hunk when more than 20 000 lines differ or more than 2000 edits are needed.

### Scenario (nominal): Cards for changed blocks

| Input | Outcome |
| --- | --- |
| A block with changed words | a card of two columns: the block at the last commit on the left with the removed words marked, the current block on the right with the added words marked; the original block is hidden |
| An added block | a card with an empty left side |
| A removed block | a card with the removed block on the left and an empty right side, in the place of the removal |
| A list or table with a changed item or row | one card with the whole list or table on both sides |
| A paragraph removed next to an edited one (one hunk holds both) | the edited paragraph is a card with its own text at the last commit on the left (the one that shares the most words with it); the removed paragraph is a card with an empty right side, before or after it in source order |
| Two blocks inside one hunk that holds one block at the last commit | the block that shares the most words with it keeps it on its left; the other is an added block |
| An unchanged block | shown as it is, no card |

### Scenario (boundary): Going back

| Input | Outcome |
| --- | --- |
| The diff switched off, or edit mode on | the cards go away and the original blocks show again |
| A baseline of an older render than the page content | no card is made |
| A baseline whose hunks are empty | no card is made |
| The page content is patched | the cards are made again from the held baseline when it matches the new content |
### Scenario (nominal): A well-formed baseline message

| Input | Outcome |
| --- | --- |
| previewBaselineDiff with an html string and hunks of non-negative integers whose ends are at least one before their starts | accepted for the current render |

### Scenario (refusal): Dropped baseline messages

| Input | Outcome |
| --- | --- |
| previewBaselineDiff with a non-string html, no hunks, a negative or fractional line, an end more than one before its start, or a null hunk | dropped |
| An html of more than 20 MiB, or more than 100 000 hunks | dropped |
| A baseline message of a stale render | dropped |

### Scenario (nominal): Changed words of a card

| Input | Outcome |
| --- | --- |
| Two identical texts | no range on either side |
| One word replaced | that word is removed on the old side and added on the new side |
| Several consecutive words replaced | one range per run, the space between them included |
| Separate changes | separate ranges |
| Words only inserted or only deleted | ranges on one side only |
| Texts that come in pieces (text nodes) | compared as one text in which a piece boundary separates words, the ranges given inside their piece |

### Scenario (boundary): Word diff size limit

| Input | Outcome |
| --- | --- |
| Texts of more than 4 000 000 word pairs | all words of both texts are marked |

### Scenario (nominal): Hunks with both sides

| Input | Outcome |
| --- | --- |
| Two identical texts, or texts that differ only by line endings | no hunk |
| One line modified | one hunk with the same line on both sides |
| Lines added | a hunk whose base side is empty (base end one before base start) |
| Lines removed | a hunk whose current side is empty (end one before start) |
| Two separate edits | two hunks |
| Lines removed and added before the next common line | one hunk |
| Lines removed (or added) next to a changed line, only blank lines between them on both sides | one hunk that holds both and the blank lines between them |
| Lines removed (or added) next to a changed line, a heading or any other non-blank line between them | two hunks |
| Two changed lines (both sides not empty), only blank lines between them | two hunks |

### Scenario (boundary): Hunk size limits and block mapping

| Input | Outcome |
| --- | --- |
| More than 20 000 differing lines, or more than 2000 edits | one hunk covers the whole differing middle |
| A block of the current text and the hunks | the block is changed when it meets a hunk with current lines or holds a removal; its base lines are the base side of the hunk it lies in, or its own lines shifted by the hunks before it |

### Related requirements

- SwRS-MDOKFSTUDIO-REVIEW-006: the baseline it shows.
- SwRS-MDOKFSTUDIO-REVIEW-207: the green bars it replaces while on.

### Verification notes

- Method: real window: scenario incoming-changes of test/integration/realInput (reads the cards, the marked words and the hidden originals in a VS Code window), test/page/runtimePageControls.test.ts (`CR147: a baseline sent while the diff is off is answered by telling the host it is off`), test/core/preview/previewStyles.test.ts (cards CSS), test/page/sideBySideCards.test.ts (`CR234: a paragraph removed next to an edited one is a removed card, the edited one is paired with its own last-commit text`, `CR234: two blocks inside one hunk do not share a last-commit block: the closer keeps it, the other is added`), test/core/mapping/wordDiff.test.ts (`CR234: the shared-word ratio of two texts`).
- Criteria: In the real window the page holds one card per changed block with the expected sides and marked words, none for unchanged blocks, and the original blocks are back when the diff is off. On the DOM stand-in the cards of a hunk that holds a removed and an edited paragraph come in source order with the expected kinds and sides.
- Method: test/core/protocol/pageToHost.test.ts (`CR147: previewSideBySideChanged carries a boolean and names the current render`) and test/core/protocol/hostToPage.test.ts (`CR147: a baseline message needs an html string and well-formed hunks`, and the rule table tests that list previewBaselineDiff as a render message).
- Criteria: Each malformed message is rejected by its validator; a well-formed one passes the filter on the current page.
- Method: test/core/mapping/wordDiff.test.ts (unit tests `CR147: identical texts have no changed word`, `CR147: a replaced word is removed on the left and added on the right`, `CR147: consecutive changed words of a card are one range, separate ones are separate`, `CR147: inserted and deleted words only mark one side`, `CR147: an empty side marks all of the other`, `CR147: pieces of text are compared as one text and the ranges come back inside their piece`: scenario changed words of a card; `CR147: a very long pair marks everything`: scenario word diff size limit).
- Criteria: The ranges slice to the expected words; above MAX_WORD_DIFF_CELLS = 4 000 000 the single range covers all words.
- Method: test/core/mapping/lineHunks.test.ts (unit tests `CR147: identical texts have no hunk, line endings do not count`, `CR147: a hunk gives the base lines and the current lines`, `CR147: added lines have an empty base side and removed lines an empty current side`, `CR147: separate edits are separate hunks`, `CR147: lines removed and added before the next common line form one hunk`, `CR234: a removal next to a changed line across a blank line is one hunk`, `CR234: a removal is never merged across a heading or a text line`: scenario hunks with both sides; `CR147: above the size caps the whole differing middle is one hunk`, `CR147: a block is changed when it meets added lines or holds a removal`, `CR147: the base lines of a block follow the hunks`: scenario hunk size limits and block mapping).
- Criteria: The hunks equal the expected base and current line ranges; the whole middle is one hunk above MAX_DIFF_LINES = 20000 and MAX_DIFF_EDITS = 2000; the changed test and the base lines of a block match the expected values.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-REVIEW-018](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-018.md): A writer compares each changed block with its last-commit version side by side
- Supersedes:
  - [SwRS-MDOKFSTUDIO-REVIEW-005](SwRS-MDOKFSTUDIO-REVIEW-005.md): The word diff reports the added and removed words
  - [SwRS-MDOKFSTUDIO-REVIEW-007](SwRS-MDOKFSTUDIO-REVIEW-007.md): The side-by-side messages are validated and gated
  - [SwRS-MDOKFSTUDIO-REVIEW-010](SwRS-MDOKFSTUDIO-REVIEW-010.md): The line diff reports hunks with both sides
<!-- okf:links:end -->
