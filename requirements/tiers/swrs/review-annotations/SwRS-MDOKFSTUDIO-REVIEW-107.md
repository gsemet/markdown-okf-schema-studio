---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-107
uuid: f453aeb4-1a69-4209-ab9a-733f248498a0
title: A slightly changed quote is followed by a bounded fuzzy search
description: When a review thread quote has no exact copy, the extension SHALL
  move the thread to the one place of the document that differs from the quote
  by at most 20 percent of its length and agrees on numbers and negation words,
  searching only around the rarest word of the quote within a fixed cost bound,
  and orphan the thread when there is no such place or the places are ambiguous.
project: markdown-okf-schema-studio
scope: review-annotations
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-001
- StRS-MDOKFSTUDIO-REVIEW-008
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/comments/anchoring.ts
tested_in_files:
- test/core/comments/anchoring.test.ts
---

## A slightly changed quote is followed by a bounded fuzzy search

### Normative behavior

When a review thread quote has no exact copy, the extension SHALL move the thread to the one place of the document that differs from the quote by at most 20 percent of its length and agrees on numbers and negation words, searching only around the rarest word of the quote within a fixed cost bound, and orphan the thread when there is no such place or the places are ambiguous.

### Scenario (nominal): Small edit

- GIVEN a quote "the scheduler retries the failed upload twice" and the sentence now reading "uploads"
- WHEN the thread is checked
- THEN the thread moves to the line of the sentence

### Scenario (boundary): Large edit

- GIVEN a sentence that differs by more than 20 percent
- WHEN the thread is checked
- THEN the thread is orphaned

### Scenario (boundary): Where the fuzzy search gives up

| Input | Outcome |
| --- | --- |
| A quote whose words are all gone from the document | There is no candidate and the thread is orphaned |
| A quote whose rarest word occurs more than 20 times | No fuzzy search is made for it |
| A short quote of under 12 characters with no exact copy | No fuzzy search is made |
| A text of over 2 million characters | The fuzzy search is skipped |

### Scenario (refusal): Numbers and negation words must agree

| Input | Outcome |
| --- | --- |
| The quote "You should enable the cache" and the sentence "You should not enable the cache" | The thread is orphaned |
| The quote with 300 and the sentence with 30 | The thread is orphaned |

The negation words are not, no, never, without, cannot, nor, none, ne, pas, non and words ending in n't. Numbers and these words must be the same in the quote and in the match.

### Scenario (refusal): Ambiguous fuzzy matches

- GIVEN two sentences each one letter away from the quote, both more than 50 lines from the old lines
- WHEN the thread is checked
- THEN the thread is orphaned, because the decision used for exact copies (surroundings, the 50 line window, a strictly nearest place) picks none

### Scenario (nominal): Single fuzzy match

- GIVEN only one such sentence
- WHEN the thread is checked
- THEN the thread moves to it

### Scenario (boundary): Large document

- GIVEN a document of 20 000 lines and 200 threads without exact copies
- WHEN the threads are checked
- THEN the work ends in under 5 seconds and no thread is lost

### Scenario (boundary): Budget exhausted

- GIVEN a budget of 20 million edit distance cells already used up by earlier threads
- WHEN a further thread needs a fuzzy search
- THEN no fuzzy match is made for it, so it is orphaned unless an exact place or its resembling old lines keep it

### Verification notes

- Method: test/core/comments/anchoring.test.ts: `T45: a small edit of the quote is followed by the fuzzy search` (small edit); `T45: a quote that changed by more than 20 percent is orphaned, not guessed` (large edit); `T45: fuzzy search needs a candidate containing the rarest word` (the first row of the gives-up table); `T45r2: fuzzy matches must agree on numbers and negations` (numbers and negation words); `T45: two fuzzy matches far apart are ambiguous and orphan the thread` (ambiguous; the single match is the complementary case of the same decision); `T45: the cost stays bounded for a large document and many fuzzy threads` (large document). The 20 occurrences cap, the 12 characters floor, the 2 million characters limit and the orphaning after the budget are untested.
- Criteria: FUZZY_RATIO = 0.2 bounds the edit distance; MAX_RARE_OCCURRENCES = 20, MIN_FAR_QUOTE = 12, MAX_FUZZY_TEXT = 2000000 characters and FUZZY_BUDGET = 20000000 cells per check gate the search; fuzzy candidates go through the same decision as exact ones.
