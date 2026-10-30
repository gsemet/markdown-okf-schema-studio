---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-148
uuid: 98f5a485-8829-4bea-b310-ea860b23ab55
title: "A block selection survives saves and is cleared by patches"
description: "When the page applies a content patch, it SHALL clear the block selection
  unless a selection is waiting for the patch of a save, and it applies a waiting
  selection by position only if the number of body blocks is the one it was read at,
  while the properties table is never part of a block selection."
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-016
- StRS-MDOKFSTUDIO-BLOCK-006
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-041
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/blockEditor.ts
- src/page/features/blockSelectionView.ts
- src/page/features/mappedBlocks.ts
tested_in_files:
- test/page/runtimeBlockSelection.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-FMEDIT-063
---

## A block selection survives saves and is cleared by patches

### Normative behavior

When the page applies a content patch, it SHALL clear the block selection unless a selection is waiting for the patch of a save, and it applies a waiting selection by position only if the number of body blocks is the one it was read at, while the properties table is never part of a block selection.

### Scenario (nominal): A content patch clears the selection

- GIVEN a block selection and a patch from the host
- WHEN the patch is applied
- THEN the selection is cleared and the outline is gone

### Scenario (nominal): A selection waits for the save of the open editor

- GIVEN an open block editor with typed text, and a selection requested while the editor was saved (the writer Shift+clicks another block)
- WHEN the final save is posted and then the patch of that save arrives
- THEN the waiting selection is applied instead of being cleared, and the blocks are selected only once the patch is in

### Scenario (boundary): A waiting selection is named by position

| Input | Outcome |
| --- | --- |
| The save adds lines but no block | The same blocks by position are selected |
| The save adds or removes a block | Nothing is selected instead of another block |

### Scenario (refusal): A waiting selection is dropped without its patch

| Input | Outcome |
| --- | --- |
| The editor that the Shift+click waits for closes by Cancel or Escape | The waiting selection is dropped and nothing is selected later |
| The editor closes by its patch | The waiting selection is applied |
| Shift+click while a field editor of the properties table is open | Nothing is selected |

### Scenario (refusal): The properties table is never selected

| Input | Outcome |
| --- | --- |
| Shift+click on the properties table of a document with frontmatter, in edit mode | Nothing is selected, the table gets no selected mark and the selection stays unchanged |
| Shift+ArrowUp with the first body block focused (extension from the first body block) | The properties table is not added and the selection stops at the first body block |

### Related requirements

- SwRS-MDOKFSTUDIO-BLOCK-140: Shift+click and Shift+Arrow build the selection.
- SwRS-MDOKFSTUDIO-BLOCK-156: a selection move restores the selection after its patch.

### Verification notes

- Method: test/page/runtimeBlockSelection.test.ts, unit tests `T39: a content patch and leaving edit mode clear the selection` (patch clears; waiting selection survives the patch); `T39: an open editor with changes is saved first; the blocks are selected once the patch is in` and `T39 r2: Shift+click while the property editor is open selects nothing` (waiting for the save; field editor open); `T39 r2: blocks are named by position, so an edit that adds lines selects the right blocks` and `T39 r2: a save that changes the number of blocks selects nothing instead of another block` (position table); `T39 r2: a pending selection does not survive its editor closing without the patch` (dropped without its patch); `T39: included blocks stop the range and the properties table is never selected` (properties table, both rows).
- Criteria: clearBlockSelection(true) keeps the pending selection. pendingBlockSelection holds anchor, target index and block count. The block count is compared before selectBlocksNow. closeBlockEdit clears pendingBlockSelection unless a patch is being applied. selectableBlocks excludes elements marked data-okf-properties.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-016](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-016.md): A writer selects blocks and copies, cuts and pastes them as Markdown
  - [StRS-MDOKFSTUDIO-BLOCK-006](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-006.md): Typed text is saved, survives updates and is never lost on leaving
- Depends on:
  - [SwRS-MDOKFSTUDIO-BLOCK-041](SwRS-MDOKFSTUDIO-BLOCK-041.md): One edit at a time: an open editor blocks other edits, opens and refreshes
- Supersedes:
  - [SwRS-MDOKFSTUDIO-FMEDIT-063](../frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-063.md): The properties table is never part of a block selection or move
<!-- okf:links:end -->
