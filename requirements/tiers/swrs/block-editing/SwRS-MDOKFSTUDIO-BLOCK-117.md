---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-117
uuid: 5602791d-ad52-4542-905c-7e2c722a70d1
title: The host swaps two blocks in one edit and keeps their separators
description: When the host moves a block past its neighbour, it SHALL replace
  only the lines from the first block to the second block with the swapped
  blocks, keeping the blank separator between them, the final line break and the
  line breaks of each block where they were, and adding a blank line only where
  the swap would glue a block to a non-blank line.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-014
- StRS-MDOKFSTUDIO-BLOCK-025
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-058
scenarios:
- id: S1
  title: Swap
- id: S2
  title: The separator is kept as it is
- id: S3
  title: The line breaks of each block are kept
- id: S4
  title: A blank line is added where the swap would glue a block
- id: S5
  title: Moving down and then up restores the document
- id: S6
  title: A list mapped up to its trailing blank line
- id: S7
  title: Two blocks inside one quote prefix
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/edits/sourceEdits.ts
- src/core/mapping/blockMove.ts
tested_in_files:
- test/core/edits/sourceEdits.test.ts
- test/core/mapping/blockMove.test.ts
- test/integration/blockMove.test.ts
default_owner_email: gaetan@xeberon.net
---

## The host swaps two blocks in one edit and keeps their separators

### Normative behavior

When the host moves a block past its neighbour, it SHALL replace only the lines from the first block to the second block with the swapped blocks, keeping the blank separator between them, the final line break and the line breaks of each block where they were, and adding a blank line only where the swap would glue a block to a non-blank line.

### Scenario S1 (nominal): Swap

- GIVEN a document `A`, blank line, `B` with a final line break and a move of B up
- WHEN the host plans the move
- THEN the edit replaces the lines of both blocks with `B`, the blank line and `A`, the lines outside are untouched, and the new first line of each block is reported

### Scenario S2 (boundary): The separator is kept as it is

| Input | Outcome |
| --- | --- |
| Two blank lines between the blocks | Both blank lines stay between the swapped blocks |
| One blank line between the blocks | The same blank line stays between them |

### Scenario S3 (boundary): The line breaks of each block are kept

| Input | Outcome |
| --- | --- |
| A document with CR LF line breaks, two blocks swapped | Every line break of the result is CR LF; no LF appears where the original had CR LF |
| A block with a list and a block with a paragraph, swapped | Each keeps its own inner line breaks |

### Scenario S4 (boundary): A blank line is added where the swap would glue a block

| Input | Outcome |
| --- | --- |
| Two blocks with no blank line between them, swapped | A blank line separates them in the result instead of merging them into one paragraph |
| A block that touched the block above it, moved down | A blank line is added so that it stays apart from its new neighbour |

### Scenario S5 (nominal): Moving down and then up restores the document

| Input | Outcome |
| --- | --- |
| Three blank-separated blocks, the first moved down and moved up again | The text equals the original |
| Blocks without a blank line, the same two moves | The added blank line stays, so the text differs (see the scenario above) |

### Scenario S6 (boundary): A list mapped up to its trailing blank line

| Input | Outcome |
| --- | --- |
| A list followed by a blank line, sent with the range the renderer maps for it (the list's lines and that blank line), moved down or up past a heading | The blank lines at the end of the range are dropped first; the move is done and no "The preview is out of date" refusal is shown |
| A range that is only blank lines | Refused as a range that does not match the document |

### Scenario S7 (boundary): Two blocks inside one quote prefix

Inside a block quote, a line holding only the quote's markers is a blank line.

| Input | Outcome |
| --- | --- |
| Two blocks of a GitHub alert body with a `>` line between them, swapped | The blocks swap and the `>` line stays as it is |
| The same in an alert indented in a list item | The same; every line keeps its indentation and its marker |
| A swap that needs an added separator line, as for two blocks that touch | The added line carries the quote prefix without a trailing space (`>`, or the indentation then `>`) |
| Blocks that are not under the same quote prefix: two alerts, or a block of an alert and a block outside it | Refused as a range that does not match the document |

### Related requirements

- SwRS-MDOKFSTUDIO-BLOCK-124: the host refuses ranges that do not match the document, blocks in the frontmatter and text between the blocks.
- SwRS-MDOKFSTUDIO-BLOCK-259: the accepted shape of previewBlockMove.
- SwRS-MDOKFSTUDIO-BLOCK-156: a block selection moves as one range.

### Verification notes

- Method: test/core/mapping/blockMove.test.ts: `swaps two blocks and keeps the separator and the final line break`, `only the lines from the first block to the second block change` and `reports the new first line of each block` (scenario 1), `several blank lines between the blocks are kept as they are` (scenario 2), `keeps CRLF line breaks, inside the blocks and between them` (scenario 3), `glued blocks get a blank line instead of merging into one paragraph` and `a block glued to its neighbours stays apart after the move` (scenario 4), `move down then up restores the document` (scenario 5).
- Method: test/core/edits/sourceEdits.test.ts: `a block move swaps the blocks in one edit and gives the moved block's new first line` (scenario 1).
- Method: test/core/edits/sourceEdits.test.ts: `a list mapped up to its trailing blank line moves like any block` (scenario 6).
- Method: test/core/mapping/blockMove.test.ts: `two blocks of an alert body swap and keep the quote's empty line between them`, `a separator added inside a quote carries the quote prefix`, `blocks that are not in the same quote are refused` (scenario 7) and `two blocks of an admonition body swap, with a blank line where one would touch a fence` (scenario 4, inside the body of a MyST admonition).
- Method: test/integration/blockMove.test.ts: the move in the real host (scenarios 1 and 5, down then up), and `runMappedRanges`, a document with a frontmatter, headings and a list moved with the ranges the renderer maps (scenario 6).
- Criteria: Applying the edit gives the expected text and the reported new first line. No two blocks that were separate become one paragraph. Identity for blank-separated blocks.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-014](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-014.md): A writer reorders blocks with arrows, keys and selections
  - [StRS-MDOKFSTUDIO-BLOCK-025](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-025.md): Preview edits land exactly, in one undo step, keep line endings, or are refused with a reason
- Depends on:
  - [SwRS-MDOKFSTUDIO-BLOCK-058](SwRS-MDOKFSTUDIO-BLOCK-058.md): Every host source edit is one undo step, renders once and reports a failed apply
<!-- okf:links:end -->
