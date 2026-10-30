---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-017
uuid: ef06d1d8-a4c0-4d05-a0db-4cb7f88aa5b3
title: The quote of a thread is highlighted once in its block
description: When review threads are applied to the page, the extension SHALL
  wrap the first occurrence of each thread quote, found inside one text node of
  the innermost mapped block that covers the anchor line, in one highlight, or
  add a badge to that block when the quote is not found inside one text node,
  and never mark code, math, diagrams, the properties table, open editors or
  included content.
project: markdown-okf-schema-studio
scope: review-annotations
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-001
- StRS-MDOKFSTUDIO-DIAG-001
- StRS-MDOKFSTUDIO-DIAG-006
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/commentThreads.ts
tested_in_files:
- test/page/modules/commentThreads.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-DIAG-019
---

## The quote of a thread is highlighted once in its block

### Normative behavior

When review threads are applied to the page, the extension SHALL wrap the first occurrence of each thread quote, found inside one text node of the innermost mapped block that covers the anchor line, in one highlight, or add a badge to that block when the quote is not found inside one text node, and never mark code, math, diagrams, the properties table, open editors or included content.

### Scenario (nominal): Quote in the block of the line
- GIVEN two paragraphs holding the same sentence and a thread anchored on the line of the second
- WHEN the thread is posted
- THEN only the sentence of the second paragraph is highlighted, in preview and in edit mode

### Scenario (boundary): Quote at the start of a text node
- GIVEN a thread whose quote starts a text node
- WHEN the thread is posted and then cleared
- THEN no empty text node is left before the highlight and clearing restores the original structure

### Scenario (refusal): Regions that are never marked
| Input | Outcome |
| --- | --- |
| Threads anchored on a code block, math, the properties table and a block under an open editor | No highlight is created in any of them |
| A block that comes from an include directive and carries lines of another file, with a thread anchor line inside it | The block is not chosen for the highlight |
| A review thread whose quote text also appears inside a Mermaid figure and a PlantUML figure | No comment mark is added inside either figure |

### Scenario (boundary): Same text in a figure and in a paragraph
- GIVEN the same quote text in an ordinary paragraph covering the anchor line
- WHEN the page applies the threads
- THEN the paragraph, not the figure, receives the mark

### Scenario (nominal): Quote across an element boundary
- GIVEN a paragraph whose quote runs through an emphasised word, and a thread with two comments
- WHEN the thread is posted
- THEN no highlight is made and the paragraph holds a badge button with the label "Comment thread, 2 comments"

### Scenario (boundary): Block that takes no children
- GIVEN a thread anchored on a table, a list, a code block, a details block, an image or a rule
- WHEN the thread is posted
- THEN the badge sits after the block

### Scenario (boundary): Applied again
| Input | Outcome |
| --- | --- |
| The same threads applied a second time to a page with a highlighted quote | The page holds one highlight, as after the first run |
| A content patch that replaces the blocks, then the threads applied again | The highlight is on the new content and none is left on removed nodes |

### Scenario (nominal): Resolved style
| Input | Outcome |
| --- | --- |
| A resolved thread with a highlighted quote | The highlight carries the resolved attribute and is drawn differently from an open one; its badge and orphaned comments entry are drawn in the resolved style too |
| An open thread | The highlight has no resolved attribute |

### Verification notes
- Method: test/page/modules/commentThreads.test.ts: `T42: the first occurrence of the quote is wrapped in a mark`, `T42: the block that covers the line is searched, not another with the same text` (quote in the block of the line), `T42 r2: a quote at index 0 leaves no empty text node and clear restores the structure` (quote at the start of a text node), `T42: code, math, mermaid, plantuml and the properties table are never wrapped`, `T42: blocks inside an open editor are left alone (O10)`, `T42 r2: included content and blocks under a skipped ancestor are never chosen` (regions that are never marked, same text in a figure and in a paragraph), `T42: a quote that spans an element boundary gets a badge, not a mark` (quote across an element boundary), `T42: re-applying is idempotent and survives replaced content` (applied again), `T42: the popover shows author, date and bodies as text, never as HTML` (asserts the resolved attribute).
- Method: real window review-annotations/r02-review-thread-popover (quote in the block of the line, in preview and in edit mode); visual scenario review-annotations/v18-review-thread-resolved-light-900 (resolved style).
- Method: the after-the-block placement for the listed tags (block that takes no children) is not asserted by a test (untested).
- Criteria: A mark element with the thread id wraps exactly the quote in the expected block; figure text is unchanged and no mark or badge is placed inside a figure; no mark element appears under the skipped ancestors; the block holds a button with attribute data-okf-comment-badge and the aria-label and the block text is unchanged; the DOM after the second apply equals the DOM after the first; the attribute data-okf-comment-resolved is set exactly for resolved threads and the stylesheet draws it differently.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-REVIEW-001](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-001.md): A reviewer reads review threads on the text, and unplaceable ones are kept
  - [StRS-MDOKFSTUDIO-DIAG-001](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-001.md): A writer reads and inserts Mermaid diagrams that follow the theme
  - [StRS-MDOKFSTUDIO-DIAG-006](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-006.md): A writer reads PlantUML diagrams without any setup
- Supersedes:
  - [SwRS-MDOKFSTUDIO-DIAG-019](../diagrams/SwRS-MDOKFSTUDIO-DIAG-019.md): Comment quotes are never wrapped inside diagrams
<!-- okf:links:end -->
