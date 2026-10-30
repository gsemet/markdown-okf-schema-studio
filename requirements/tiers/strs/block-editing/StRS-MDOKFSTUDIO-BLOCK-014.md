---
type: StRS
id: StRS-MDOKFSTUDIO-BLOCK-014
uuid: 9385d428-c83a-45dc-8d0a-62665d75f7c1
title: A writer reorders blocks with arrows, keys and selections
description: When a writer clicks an arrow of an insert point or presses Alt+Up
  or Alt+Down in edit mode, the Studio SHALL move the block, or the selected run
  of blocks, past its neighbour in one edit, keep it at the same place on the
  screen and keep the selection.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I swap a block or a selected run of blocks with its
  neighbour with one click on an arrow or one key press, also while I edit the
  block, keep typing at the same place, and can undo it with one undo.
derived_by:
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-BLOCK-058
- SwRS-MDOKFSTUDIO-BLOCK-109
- SwRS-MDOKFSTUDIO-BLOCK-117
- SwRS-MDOKFSTUDIO-BLOCK-124
- SwRS-MDOKFSTUDIO-BLOCK-127
- SwRS-MDOKFSTUDIO-BLOCK-129
- SwRS-MDOKFSTUDIO-BLOCK-130
- SwRS-MDOKFSTUDIO-BLOCK-139
- SwRS-MDOKFSTUDIO-BLOCK-156
- SwRS-MDOKFSTUDIO-BLOCK-240
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-065
default_owner_email: gaetan@xeberon.net
---

## A writer reorders blocks with arrows, keys and selections

### Normative behavior

When a writer clicks an arrow of an insert point or presses Alt+Up or Alt+Down in edit mode, the Studio SHALL move the block, or the selected run of blocks, past its neighbour in one edit, keep it at the same place on the screen and keep the selection.

### Preserved stakeholder intent

Writers expect to reorder sections without cutting and pasting lines.

Writers expect keyboard users to reorder blocks as easily as mouse users.

Writers expect to move a group of blocks as easily as one.

As a writer, I swap a block or a selected run of blocks with its neighbour with one click on an arrow or one key press, also while I edit the block, keep typing at the same place, and can undo it with one undo.

### Rationale and constraints

- Arrows are disabled at the ends of the document and next to an included block, and are absent on the properties bar and on Start writing.
- A move refused after an arrow click shows a reason next to the insert point.
- The chord in the text box is Cmd+Alt on macOS and Ctrl+Alt elsewhere; plain Option or Alt with an arrow keeps word navigation.
- A repeated key does not move the block twice.
- The selection stays on the moved blocks after the move, also if the preview reloads meanwhile.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-BLOCK-041](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-041.md): One edit at a time: an open editor blocks other edits, opens and refreshes
  - [SwRS-MDOKFSTUDIO-BLOCK-058](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-058.md): Every host source edit is one undo step, renders once and reports a failed apply
  - [SwRS-MDOKFSTUDIO-BLOCK-109](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-109.md): The up and down arrows of an insert point move its block
  - [SwRS-MDOKFSTUDIO-BLOCK-117](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-117.md): The host swaps two blocks in one edit and keeps their separators
  - [SwRS-MDOKFSTUDIO-BLOCK-124](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-124.md): Moves and clipboard edits are refused for ranges that do not match the document
  - [SwRS-MDOKFSTUDIO-BLOCK-127](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-127.md): An included block is never moved, cut, copied, selected or pasted after
  - [SwRS-MDOKFSTUDIO-BLOCK-129](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-129.md): The page applies a move result only for its own render
  - [SwRS-MDOKFSTUDIO-BLOCK-130](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-130.md): Alt+Up and Alt+Down move the focused block, also from the text box
  - [SwRS-MDOKFSTUDIO-BLOCK-139](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-139.md): The chord is Cmd+Alt on macOS and Ctrl+Alt elsewhere
  - [SwRS-MDOKFSTUDIO-BLOCK-156](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-156.md): A block selection moves as a whole
  - [SwRS-MDOKFSTUDIO-BLOCK-240](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-240.md): previewBlockMove needs both ranges and a direction
  - [SwRS-MDOKFSTUDIO-TRUST-005](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-005.md): The host refuses every write request of a read-only preview with a reason
  - [SwRS-MDOKFSTUDIO-TRUST-065](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
<!-- okf:links:end -->
