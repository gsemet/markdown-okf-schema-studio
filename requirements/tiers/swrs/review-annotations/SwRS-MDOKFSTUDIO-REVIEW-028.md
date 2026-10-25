---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-028
uuid: b5d64190-0602-45d7-be7d-a753c19f3a1d
title: Threads that cannot be placed are listed in the Orphaned comments box
description: When the page cannot place a review thread, the extension SHALL
  list it as an entry of an Orphaned comments region placed after the content.
project: markdown-okf-schema-studio
scope: review-annotations
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-001
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-059
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/commentStyles.ts
- src/page/modules/commentThreads.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/page/modules/commentThreads.test.ts
---

## Threads that cannot be placed are listed in the Orphaned comments box

### Normative behavior

When the page cannot place a review thread, the extension SHALL list it as an entry of an Orphaned comments region placed after the content.

### Scenario (nominal): A thread outside any placeable block is listed

- GIVEN a thread whose line has no eligible block and whose quote is found nowhere
- WHEN the thread is posted
- THEN an Orphaned comments region after the content element lists it and no highlight is made

### Scenario (nominal): An entry shows the quote, the first comment and the count

| Given | Then the entry shows |
| --- | --- |
| an orphaned thread with two comments | the quote, "{author}: {first 120 characters of the first comment}" and "(2 comments)" |
| a resolved orphaned thread with one comment and no quote | "(no quoted text)" and "(1 comment, resolved)" |

### Scenario (boundary): Nothing to list

- GIVEN all threads placed
- WHEN the threads are applied
- THEN no Orphaned comments region exists

### Scenario (refusal): The page writes nothing for an orphaned thread

| Given | When | Then |
| --- | --- | --- |
| an orphaned thread | the threads are applied | no comment message is posted to the host |
| an orphaned thread | its entry is clicked | only the popover opens |

### Scenario (boundary): The box adds no scroll height at the end of the document

| Given | When | Then |
| --- | --- | --- |
| a document with one orphan, a box shorter than the bottom padding of the content | the page is measured with and without the box | the scrollable height is the same |
| a box taller than the padding | the page is measured | the page is exactly as much taller as the box exceeds the padding |

### Scenario (boundary): The host verdict decides where a thread goes

| Host verdict and situation | Outcome |
| --- | --- |
| orphaned true, quote is on the page | listed in the box without looking for the quote, not highlighted |
| orphaned false, no block at its line | not searched elsewhere, listed in the box |
| orphaned false, a block at its line | the quote is highlighted in that block as for a thread without verdict |
| orphaned false, the same quote also present in another block | only the block of the line is searched |

### Scenario (boundary): Without a host verdict the quote is searched elsewhere

| Input | Outcome |
| --- | --- |
| quote of 12 or more characters that occurs once, in another block | highlighted there |
| quote that occurs twice | listed as orphaned |
| quote under 12 characters that occurs once | listed as orphaned |

### Verification notes

- Method: test/page/modules/commentThreads.test.ts (`T44: a thread with no block at its line and no quote anywhere goes to the Orphaned comments box`, `T44: the box lives outside the content, after it, and is re-created after content is replaced` and `T44: the box goes away when the orphan is resolved away, and its entries open the popover` check the listing, the empty case and the popover; `T44: orphans are never reported to the host as changes (the page only displays them)` checks the refusal; `T45: orphaned true goes to the box even when the quote is on the page`, `T45: orphaned false trusts the host lines and does not search the quote elsewhere` and `T45: orphaned false with a block at the line places the thread as before` check the verdict table; `T44 r2: a long quote that occurs once elsewhere is placed, not orphaned`, `T44 r2: a quote repeated elsewhere is orphaned, not marked on the first copy` and `T44 r2: a short quote is orphaned even when it occurs once elsewhere` check the quote search); visual scenario review-annotations/v19-orphaned-list-light-900 (the box and its entries).
- Method: test/core/preview/previewStyles.test.ts (`T44: the Orphaned comments box sits in the content's bottom padding and adds no scroll height`); visual scenario review-annotations/v01-orphan-box-end-padding-dark-900.
- Untested: the exact meta text and the 120-character cut of an entry are not asserted.
- Criteria: The region has role region and the label Orphaned comments, is a sibling after the content element and exists only while an orphan exists. The entry text follows the template in renderOrphans. The post hook is never called while orphans are applied and opened. The stylesheet gives the box a negative top margin equal to the padding and the measured heights match. No mark is created for orphaned true; for orphaned false without a block no search happens; with a block the mark is created in the block of the posted line only. MIN_MOVED_QUOTE = 12 and a total count of exactly one occurrence decide the placement.
