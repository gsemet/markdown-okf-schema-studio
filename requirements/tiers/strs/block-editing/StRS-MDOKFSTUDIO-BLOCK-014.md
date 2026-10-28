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
lifecycle: proposed
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
