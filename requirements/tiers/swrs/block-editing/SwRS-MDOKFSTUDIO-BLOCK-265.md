---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-265
uuid: a91f0617-19a3-4fa8-90fe-27a3d42eaaea
title: Delete block deletes the blocks of a selection with one separator in one
  undo step
description: When the writer clicks the Delete block button of a block, or
  presses Delete or Backspace on a block selection, the extension SHALL delete
  the blocks of the selection (or the one block) with their trailing blank lines
  and one separator in one edit and one undo step, refuse an included block, and
  select the block that took the place.
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
- src/core/edits/sourceEdits.ts
- src/core/preview/styles/editModeStyles.ts
- src/core/protocol/pageToHost.ts
- src/page/features/blockMoves.ts
- src/page/features/blockSelectionView.ts
- src/page/modules/deleteBlockButton.ts
- src/session/features/sourceEdits.ts
tested_in_files:
- test/core/edits/blocksDelete.test.ts
- test/core/preview/blockReq.requirements.test.ts
- test/integration/emptyBlocks.test.ts
- test/page/runtimeBlockDelete.test.ts
- test/session/emptiedBlockDelete.test.ts
- test/visual/capture_delete_block_bar.py
- test/visual/deleteBlockBarScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## Delete block deletes the blocks of a selection with one separator in one undo step

### Normative behavior

When the writer clicks the Delete block button of a block, or presses Delete or Backspace on a block selection, the extension SHALL delete the blocks of the selection (or the one block) with their trailing blank lines and one separator in one edit and one undo step, refuse an included block, and select the block that took the place.

### Scenario: The button and the keys

- GIVEN edit mode on, three blocks and a block selection on the second
- WHEN the writer presses Delete or Backspace, or clicks the Delete block button of the bar of the second block
- THEN the page posts previewBlocksDelete for the selected lines, the host deletes them with one separator in one edit, and the selection goes to the block that took their place

### Scenario: The button in the bar

- GIVEN the bar of a body block
- WHEN it is shown
- THEN a "Delete block" button sits right after the down arrow and touches it, the move status sits to its right and never overlaps it, the button is hidden while a block editor is open, and an included block, the properties bar and the Start writing entry have none

### Scenario: The keys act on a block selection only

- GIVEN only a focused block, a focused bar button, a text box, an open editor, or the structural cursor on a cell, a list item or an inner block
- WHEN the writer presses Delete or Backspace
- THEN nothing is posted

### Scenario: Refusals and the selection after the delete

- GIVEN a span that opens an {include} directive, lines out of date or in the frontmatter, or an open block edit on the host
- WHEN the delete is requested
- THEN the document does not change and the refusal is shown next to the selection ("A block that comes from an included file cannot be deleted." for an include)
- AND after a successful delete the following block is selected, else the block above, else the Start writing button has the focus

### Scenario: A blank-lines block

- GIVEN a selected blank-lines block
- WHEN the writer presses Delete or Backspace or clicks its Delete block button
- THEN previewBlankRunDelete removes the extra blank lines and keeps one separator (see SwRS-MDOKFSTUDIO-BLOCK-269)

### Verification notes

- Method: test/core/edits/sourceEdits.test.ts (`planBlocksDelete`: separators, trailing blank lines, include and frontmatter refusals, CR LF and lone CR).
- Method: test/session/ (previewBlocksDelete: one edit, previewBlocksResult op delete, the refusals).
- Method: test/page/runtimeBlockDelete.test.ts (bar buttons, clicks, keys, nothing cases, selection after the delete), geometry checks and visual captures of the bar.
- Method: test/integration (a real file in LF and CR LF).
- Criteria: one TextEdit through applyWrittenEdits; trailing blank lines of the span are dropped before the cut plan; the viewport is pinned on the following block as a cut does; the button is built by createDeleteBlockButton.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-011](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-011.md): A writer adds blocks and starts an empty document from the preview
  - [StRS-MDOKFSTUDIO-BLOCK-025](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-025.md): Preview edits land exactly, in one undo step, keep line endings, or are refused with a reason
<!-- okf:links:end -->
