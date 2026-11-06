---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-216
uuid: a0243ab8-e525-41c2-94b6-cf68e4fcd623
title: A quote over a line break of the source is highlighted
description: When review threads are applied to the page and the quote of a
  thread, whose whitespace was collapsed when the writer selected the text,
  differs from the text node of its block only by the kind or the length of its
  whitespace runs (a paragraph or list item wrapped over several lines of the
  source), the extension SHALL match any run of whitespace of the node with a
  space of the quote and highlight the matched text as one highlight.
project: markdown-okf-schema-studio
scope: review-annotations
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/commentThreadData.ts
tested_in_files:
- test/page/modules/commentThreadsLongDocument.test.ts
default_owner_email: gaetan@xeberon.net
---

## A quote over a line break of the source is highlighted

### Normative behavior

When review threads are applied to the page and the quote of a thread, whose whitespace was collapsed when the writer selected the text, differs from the text node of its block only by the kind or the length of its whitespace runs (a paragraph or list item wrapped over several lines of the source), the extension SHALL match any run of whitespace of the node with a space of the quote and highlight the matched text as one highlight.

### Scenario (nominal): Quote over a wrapped line
- GIVEN a paragraph wrapped over several lines of the source, so that its text node holds a line break, and a thread whose quote has a space where the line break is
- WHEN the thread is posted
- THEN the text from the first to the last word of the quote is highlighted once, with the line break kept inside the highlight, and the text of the page does not change

### Scenario (boundary): Long document
- GIVEN a long document with raw HTML, images and tables whose paragraphs, list items and cells are wrapped, and one thread on each text of them, re-anchored by the host
- WHEN the threads are posted
- THEN every thread is highlighted on its text, none gets a badge or goes to the Orphaned comments box, and the length of the document changes nothing

### Scenario (refusal): Another word
- GIVEN a quote with a word that the text node does not hold at that place
- WHEN the thread is posted
- THEN no highlight is created and the existing rule applies: a badge on the block of the line

### Verification notes

- Method: Unit test of the comment threads on the rendered content of a long README-like document, with the host re-anchoring and the page placement run one after the other.
- Criteria: Each thread has one highlight, no badge and no orphan entry; the text content of the page is unchanged.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-REVIEW-001](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-001.md): A reviewer reads review threads on the text, and unplaceable ones are kept
<!-- okf:links:end -->
