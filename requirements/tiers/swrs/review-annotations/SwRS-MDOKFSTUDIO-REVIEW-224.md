---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-224
uuid: d251cd03-86bf-47e8-9990-f3463e9b192b
title: A posted thread list changes only the elements of the threads that differ
description: When the page receives the comment threads again, it SHALL change
  only the highlights, badges and orphan entries whose thread has another place
  or shown state than before, and measure its source positions again only when a
  block of the content can have moved, with the same result as placing every
  thread from nothing.
project: markdown-okf-schema-studio
scope: review-annotations
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-001
- StRS-MDOKFSTUDIO-REVIEW-003
scenarios:
- id: S1
  title: One thread added
- id: S2
  title: Same page as from nothing
- id: S3
  title: Open popover
- id: S4
  title: When the page is measured again
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/hostHandlers.ts
- src/page/modules/commentPlacements.ts
tested_in_files:
- test/page/modules/commentThreadsUpdate.test.ts
default_owner_email: gaetan@xeberon.net
---

## A posted thread list changes only the elements of the threads that differ

### Normative behavior

When the page receives the comment threads again, it SHALL change only the highlights, badges and orphan entries whose thread has another place or shown state than before, and measure its source positions again only when a block of the content can have moved, with the same result as placing every thread from nothing.

### Scenario S1 (nominal): One thread added

- GIVEN a page that shows threads as highlights, a badge and an orphan entry
- WHEN the page receives the same threads and one new thread whose quote no other thread marks
- THEN the highlight, badge and orphan entry elements of the other threads are the same elements in the same places, nothing of them is written again, and the update reads the document's `[data-line]` blocks once

### Scenario S2 (boundary): Same page as from nothing

- GIVEN a page that shows threads, among them two threads in one block, overlapping quotes, threads on nested blocks, several badges below one block, resolved threads and orphaned threads
- WHEN the page receives lists in which threads were created, replied to, resolved, reopened, moved or deleted, an empty list included, comments shown or hidden
- THEN after each list the highlights, text nodes, badges, badged blocks and orphan box of the page are those of a fresh page that receives only that list

### Scenario S3 (boundary): Open popover

- GIVEN a thread popover with a typed reply draft and the Delete question
- WHEN the page receives a list that still holds the thread
- THEN the popover of the thread is open with the same draft and the same question

### Scenario S4 (boundary): When the page is measured again

- GIVEN a page that shows threads, comments shown
- WHEN the page receives a list that adds, moves or removes a badge below a block, and when it receives a list that does not
- THEN the page measures its source positions again in the first case only; with comments hidden it does not measure them

### Related requirements

- SwRS-MDOKFSTUDIO-REVIEW-017: where a thread is shown, as a highlight or a badge.
- SwRS-MDOKFSTUDIO-REVIEW-028: the orphan box.
- SwRS-MDOKFSTUDIO-REVIEW-152: hidden comments.

### Known issues

- Known issue: Each update still searches the text of the blocks of every thread to find its place; only the changes to the page are limited to what differs.
- Known issue: A content patch or a new render places every thread from nothing.

### Verification notes

- Method: test/page/modules/commentThreadsUpdate.test.ts (the page module on a fake DOM: element identity and read count, a comparison of the whole page after seeded random lists with a fresh page, the popover, and the host message handler with the module to count the measures).
- Criteria: The elements of the unchanged threads are identical objects with no write; every compared page is equal, text node boundaries included; the measure count is 1 for a list that changes a badge below a block and 0 otherwise.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-REVIEW-001](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-001.md): A reviewer reads review threads on the text, and unplaceable ones are kept
  - [StRS-MDOKFSTUDIO-REVIEW-003](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-003.md): A reviewer comments, replies, resolves and deletes, and no comment is lost
<!-- okf:links:end -->
