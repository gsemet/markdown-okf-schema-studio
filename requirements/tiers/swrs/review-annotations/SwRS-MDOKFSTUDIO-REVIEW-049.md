---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-049
uuid: ebd65f08-7c4e-42d2-8060-bb62d2be711d
title: A new comment is anchored by its lines, quote and surroundings
description: When a reader saves a comment on a selection, the page SHALL anchor
  it from the first line of the first selected block to the last line of the
  last selected block, with the selected text collapsed and cut at 500
  characters and up to 32 characters of text before and after it.
project: markdown-okf-schema-studio
scope: review-annotations
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-003
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/commentCompose.ts
tested_in_files:
- test/page/modules/commentCompose.test.ts
default_owner_email: gaetan@xeberon.net
---

## A new comment is anchored by its lines, quote and surroundings

### Normative behavior

When a reader saves a comment on a selection, the page SHALL anchor it from the first line of the first selected block to the last line of the last selected block, with the selected text collapsed and cut at 500 characters and up to 32 characters of text before and after it.

### Scenario (nominal): Selection across blocks

- GIVEN a selection from a paragraph on lines 3 to 4 to a paragraph on lines 7 to 8
- WHEN the comment is saved
- THEN the anchor runs from line 3 to line 8

### Scenario (nominal): Normal selection

- GIVEN a selection of "second   paragraph" in the middle of a block
- WHEN the comment is saved
- THEN the quote is "second paragraph" and the prefix and suffix hold the words around it

### Scenario (boundary): Triple click

- GIVEN a triple click whose selection ends at offset 0 of the next block
- WHEN the comment is saved
- THEN the anchor stays in the block that was clicked

### Scenario (boundary): Long selection

| Input | Outcome |
| --- | --- |
| A selection of more than 500 characters with long surroundings | The quote has 500 characters |
| The text before the selection is longer than 32 characters | The prefix has at most 32 characters |
| The text after the selection is longer than 32 characters | The suffix has at most 32 characters |

### Related requirements

- SwRS-MDOKFSTUDIO-REVIEW-044: the comment box that sends the anchor.
- SwRS-MDOKFSTUDIO-REVIEW-069: the accepted shape of the create message and its anchor.

### Verification notes

- Method: test/page/modules/commentCompose.test.ts, unit tests `T43: a selection across blocks anchors first block line to last block end line` (Selection across blocks), `T43: a triple-click selection that ends at offset 0 of the next block stays in its own block` (Triple click), `T43: the quote is whitespace-collapsed and capped at 500, prefix and suffix at 32` (Normal selection, Long selection).
- Criteria: The anchor lines equal the data-line of the first block and the data-end-line of the last block. The lengths are 500, 32 and 32 at most.
