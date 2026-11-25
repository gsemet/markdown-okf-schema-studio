---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-017
uuid: ef06d1d8-a4c0-4d05-a0db-4cb7f88aa5b3
title: "The quote of a thread is highlighted once in its block, also over a line break
  of the source"
description: "When review threads are applied to the page, the extension SHALL wrap
  the first occurrence of each thread quote, found inside one text node of the innermost
  mapped block that covers the anchor line, in one highlight, or add a badge to that
  block when the quote is not found inside one text node, and never mark code, math,
  diagrams, the properties table, open editors or included content; a run of whitespace
  of the text node, such as the line break of a paragraph or list item wrapped over
  several lines of the source, matches a space of the quote, and the matched text
  is highlighted as one highlight."
project: markdown-okf-schema-studio
scope: review-annotations
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-001
depends_on: []
scenarios:
- id: S1
  title: Quote in the block of the line
- id: S2
  title: Quote at the start of a text node
- id: S3
  title: Regions that are never marked
- id: S4
  title: Same text in a figure and in a paragraph
- id: S5
  title: Quote across an element boundary
- id: S6
  title: Block that takes no children
- id: S7
  title: Applied again
- id: S8
  title: Resolved style
- id: S9
  title: Quote over a wrapped line
- id: S10
  title: Long document
- id: S11
  title: Another word
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/commentThreadData.ts
- src/page/modules/commentThreads.ts
tested_in_files:
- test/page/modules/commentThreads.test.ts
- test/page/modules/commentThreadsLongDocument.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-DIAG-019
- SwRS-MDOKFSTUDIO-REVIEW-216
---

## The quote of a thread is highlighted once in its block, also over a line break of the source

### Normative behavior

When review threads are applied to the page, the extension SHALL wrap the first occurrence of each thread quote, found inside one text node of the innermost mapped block that covers the anchor line, in one highlight, or add a badge to that block when the quote is not found inside one text node, and never mark code, math, diagrams, the properties table, open editors or included content; a run of whitespace of the text node, such as the line break of a paragraph or list item wrapped over several lines of the source, matches a space of the quote, and the matched text is highlighted as one highlight.

### Scenario S1 (nominal): Quote in the block of the line
- GIVEN two paragraphs holding the same sentence and a thread anchored on the line of the second
- WHEN the thread is posted
- THEN only the sentence of the second paragraph is highlighted, in preview and in edit mode

### Scenario S2 (boundary): Quote at the start of a text node
- GIVEN a thread whose quote starts a text node
- WHEN the thread is posted and then cleared
- THEN no empty text node is left before the highlight and clearing restores the original structure

### Scenario S3 (refusal): Regions that are never marked
| Input | Outcome |
| --- | --- |
| Threads anchored on a code block, math, the properties table and a block under an open editor | No highlight is created in any of them |
| A block that comes from an include directive and carries lines of another file, with a thread anchor line inside it | The block is not chosen for the highlight |
| A review thread whose quote text also appears inside a Mermaid figure and a PlantUML figure | No comment mark is added inside either figure |

### Scenario S4 (boundary): Same text in a figure and in a paragraph
- GIVEN the same quote text in an ordinary paragraph covering the anchor line
- WHEN the page applies the threads
- THEN the paragraph, not the figure, receives the mark

### Scenario S5 (nominal): Quote across an element boundary
- GIVEN a paragraph whose quote runs through an emphasised word, and a thread with two comments
- WHEN the thread is posted
- THEN no highlight is made and the paragraph holds a badge button with the label "Comment thread, 2 comments"

### Scenario S6 (boundary): Block that takes no children
- GIVEN a thread anchored on a table, a list, a code block, a details block, an image or a rule
- WHEN the thread is posted
- THEN the badge sits after the block

### Scenario S7 (boundary): Applied again
| Input | Outcome |
| --- | --- |
| The same threads applied a second time to a page with a highlighted quote | The page holds one highlight, as after the first run |
| A content patch that replaces the blocks, then the threads applied again | The highlight is on the new content and none is left on removed nodes |

### Scenario S8 (nominal): Resolved style
| Input | Outcome |
| --- | --- |
| A resolved thread with a highlighted quote | The highlight carries the resolved attribute and is drawn differently from an open one; its badge and orphaned comments entry are drawn in the resolved style too |
| An open thread | The highlight has no resolved attribute |

### Scenario S9 (nominal): Quote over a wrapped line
- GIVEN a paragraph wrapped over several lines of the source, so that its text node holds a line break, and a thread whose quote has a space where the line break is
- WHEN the thread is posted
- THEN the text from the first to the last word of the quote is highlighted once, with the line break kept inside the highlight, and the text of the page does not change

### Scenario S10 (boundary): Long document
- GIVEN a long document with raw HTML, images and tables whose paragraphs, list items and cells are wrapped, and one thread on each text of them, re-anchored by the host
- WHEN the threads are posted
- THEN every thread is highlighted on its text, none gets a badge or goes to the Orphaned comments box, and the length of the document changes nothing

### Scenario S11 (refusal): Another word
- GIVEN a quote with a word that the text node does not hold at that place
- WHEN the thread is posted
- THEN no highlight is created and the existing rule applies: a badge on the block of the line

### Verification notes
- Method: test/page/modules/commentThreads.test.ts: `T42: the first occurrence of the quote is wrapped in a mark`, `T42: the block that covers the line is searched, not another with the same text` (quote in the block of the line), `T42 r2: a quote at index 0 leaves no empty text node and clear restores the structure` (quote at the start of a text node), `T42: code, math, mermaid, plantuml and the properties table are never wrapped`, `T42: blocks inside an open editor are left alone (O10)`, `T42 r2: included content and blocks under a skipped ancestor are never chosen` (regions that are never marked, same text in a figure and in a paragraph), `T42: a quote that spans an element boundary gets a badge, not a mark` (quote across an element boundary), `T42: re-applying is idempotent and survives replaced content` (applied again), `T42: the popover shows author, date and bodies as text, never as HTML` (asserts the resolved attribute).
- Method: real window review-annotations/r02-review-thread-popover (quote in the block of the line, in preview and in edit mode); visual scenario review-annotations/v18-review-thread-resolved-light-900 (resolved style).
- Method: the after-the-block placement for the listed tags (block that takes no children) is not asserted by a test (untested).
- Criteria: A mark element with the thread id wraps exactly the quote in the expected block; figure text is unchanged and no mark or badge is placed inside a figure; no mark element appears under the skipped ancestors; the block holds a button with attribute data-okf-comment-badge and the aria-label and the block text is unchanged; the DOM after the second apply equals the DOM after the first; the attribute data-okf-comment-resolved is set exactly for resolved threads and the stylesheet draws it differently.
- Method: Unit test of the comment threads on the rendered content of a long README-like document, with the host re-anchoring and the page placement run one after the other.
- Criteria: Each thread has one highlight, no badge and no orphan entry; the text content of the page is unchanged.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-REVIEW-001](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-001.md): A reviewer reads review threads on the text, and unplaceable ones are kept
- Supersedes:
  - [SwRS-MDOKFSTUDIO-DIAG-019](../diagrams/SwRS-MDOKFSTUDIO-DIAG-019.md): Comment quotes are never wrapped inside diagrams
  - [SwRS-MDOKFSTUDIO-REVIEW-216](SwRS-MDOKFSTUDIO-REVIEW-216.md): A quote over a line break of the source is highlighted
<!-- okf:links:end -->
