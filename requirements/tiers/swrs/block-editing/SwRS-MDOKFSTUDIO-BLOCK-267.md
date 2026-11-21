---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-267
uuid: c9aca100-242f-4db3-996f-3b6d96ac404c
title: A blank-lines block takes the arrows, Enter and a click
description: When the writer reaches a blank-lines block with Up or Down,
  presses Enter on it or clicks it, the extension SHALL select it, or open an
  insertion editor in its place, remove it on Delete or Backspace only when it
  is selected, and keep it out of every block selection range, move and
  clipboard copy or cut. Inside a list, the arrows visit the blocks of the list
  in line order.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-011
- StRS-MDOKFSTUDIO-BLOCK-025
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/blockSelectionView.ts
tested_in_files:
- test/core/mapping/quoteBlankRuns.test.ts
- test/page/runtimeBlankLines.test.ts
- test/page/runtimeBlankLinesContainers.test.ts
default_owner_email: gaetan@xeberon.net
---

## A blank-lines block takes the arrows, Enter and a click

### Normative behavior

When the writer reaches a blank-lines block with Up or Down, presses Enter on it or clicks it, the extension SHALL select it, or open an insertion editor in its place, remove it on Delete or Backspace only when it is selected, and keep it out of every block selection range, move and clipboard copy or cut. Inside a list, the arrows visit the blank-lines blocks of the list in line order.

### Scenario: Arrows, Enter and a click

- GIVEN edit mode on and a blank-lines block between two blocks
- WHEN the writer presses Down from the block above, presses Enter on the blank-lines block, or clicks it
- THEN it is selected, and Enter or a click opens an insertion editor in its place

### Scenario: Arrows, Shift+Arrow and a click inside a list

- GIVEN edit mode on and a list that holds blank-lines blocks
- WHEN the writer presses Down from the selected list, Up from the block after it, Shift+Up or Shift+Down from one of its blank-lines blocks, or clicks one
- THEN Down stops on each blank-lines block of the list in line order and then on the block after the list, Up walks back, Shift+Up or Shift+Down starts the block selection on the list or on the block after it, and a click opens the insertion editor of the run, not the list item editor

### Scenario: Delete needs the selection

- GIVEN a blank-lines block that is only focused, and one that is selected
- WHEN the writer presses Delete or Backspace
- THEN nothing happens for the focused one and previewBlankRunDelete is posted for the selected one
- AND the block is never part of a block selection range, a move, or a copy or cut

### Verification notes

- Method: test/page/runtimeBlankLines.test.ts (keys, click, selection, ranges, copy and cut).
- Method: the list cases of test/page/runtimeBlankLines.test.ts (order of the stops, Shift+Arrow, click).
- Criteria: a blank-lines block has no data-sphinx-source-line, so the block commands never see it.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-011](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-011.md): A writer adds blocks and starts an empty document from the preview
  - [StRS-MDOKFSTUDIO-BLOCK-025](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-025.md): Preview edits land exactly, in one undo step, keep line endings, or are refused with a reason
<!-- okf:links:end -->
