---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-005
uuid: 62463e93-f810-46fa-aebd-09a51dda0488
title: The word diff reports the added and removed words
description: When the extension compares the text of a block at the last commit
  with its text now, it SHALL report the character ranges of the old text that
  are not in the new text and the character ranges of the new text that are not
  in the old text, comparing word by word, merging consecutive changed words
  into one range, and marking all words of both texts when the comparison would
  exceed 4 000 000 word pairs.
project: markdown-okf-schema-studio
scope: review-annotations
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-017
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/mapping/wordDiff.ts
tested_in_files:
- test/core/mapping/wordDiff.test.ts
- test/page/sideBySideCards.test.ts
default_owner_email: gaetan@xeberon.net
---

## The word diff reports the added and removed words

### Normative behavior

When the extension compares the text of a block at the last commit with its text now, it SHALL report the character ranges of the old text that are not in the new text and the character ranges of the new text that are not in the old text, comparing word by word, merging consecutive changed words into one range, and marking all words of both texts when the comparison would exceed 4 000 000 word pairs.

### Scenario (nominal): Changed words

| Input | Outcome |
| --- | --- |
| Two identical texts | no range on either side |
| One word replaced | that word is removed on the old side and added on the new side |
| Several consecutive words replaced | one range per run, the space between them included |
| Separate changes | separate ranges |
| Words only inserted or only deleted | ranges on one side only |
| Texts that come in pieces (text nodes) | compared as one text in which a piece boundary separates words, the ranges given inside their piece |

### Scenario (boundary): Size limit

| Input | Outcome |
| --- | --- |
| Texts of more than 4 000 000 word pairs | all words of both texts are marked |
### Related requirements

- SwRS-MDOKFSTUDIO-REVIEW-009: the page that marks the words in the cards.

### Verification notes

- Method: test/core/mapping/wordDiff.test.ts (unit tests `CR147: identical texts have no changed word`, `CR147: a replaced word is removed on the left and added on the right`, `CR147: consecutive changed words are one range, separate ones are separate`, `CR147: inserted and deleted words only mark one side`, `CR147: an empty side marks all of the other`, `CR147: pieces of text are compared as one text and the ranges come back inside their piece`: scenario changed words; `CR147: a very long pair marks everything`: scenario size limit).
- Criteria: The ranges slice to the expected words; above MAX_WORD_DIFF_CELLS = 4 000 000 the single range covers all words.
