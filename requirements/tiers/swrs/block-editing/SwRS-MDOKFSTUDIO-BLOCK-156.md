---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-156
uuid: 752542f4-0a66-4003-ab9f-1d2a7ab75c39
title: "A block selection moves as a whole"
description: "When a writer presses Alt+ArrowUp or Alt+ArrowDown with blocks selected
  and the focus on the selection, a bar of it or the page, the page SHALL post one
  previewBlockMove with the line span of the selection and the neighbouring block."
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
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-BLOCK-058
- SwRS-MDOKFSTUDIO-TRUST-005
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/mapping/blockMove.ts
- src/page/features/blockMoves.ts
tested_in_files:
- test/core/mapping/blockMove.test.ts
- test/integration/blockMove.test.ts
- test/integration/realInput/markers.ts
- test/page/runtimeBlockSelection.test.ts
default_owner_email: gaetan@xeberon.net
---

## A block selection moves as a whole

### Normative behavior

When a writer presses Alt+ArrowUp or Alt+ArrowDown with blocks selected and the focus on the selection, a bar of it or the page, the page SHALL post one previewBlockMove with the line span of the selection and the neighbouring block.

### Scenario (nominal): Alt+Up and Alt+Down move the whole selection

- GIVEN two selected blocks with a block below and a block above
- WHEN the writer presses Alt+ArrowDown, or Alt+ArrowUp
- THEN previewBlockMove carries the first line of the first selected block, the last line of the last one, the neighbouring block and the direction (down, or up); one message is posted with the span as the moving range

### Scenario (nominal): The arrows under the last selected block move the whole selection

| Input | Outcome |
| --- | --- |
| The writer clicks the down arrow of the bar under the second of two selected blocks | The span of both blocks is posted |
| The writer clicks the arrow of another bar | Only that bar's block moves |
| Blocks are selected | The two arrows of the bar under the last selected block are labelled "Move the selected blocks up" and "Move the selected blocks down" and carry the same text as a tooltip |
| The selection is cleared | The arrows carry "Move the block above up" and "Move the block above down" again, without titles |

### Scenario (nominal): A block outside the selection moves alone

| Input | Outcome |
| --- | --- |
| Two blocks selected and a third, not selected, block focused; Alt+ArrowDown | Only the third block is moved |
| Nothing selected; Alt+ArrowDown on a focused block | That block moves as with its arrow button |

### Scenario (boundary): The moved selection is selected again at its new place

| Input | Outcome |
| --- | --- |
| The render of a move of a two-block selection down arrives | The same blocks by position one block lower are selected and the focus goes to the free end |
| The patch has a different number of blocks | Nothing is selected instead of another block |
| A full reload replaces the page after the move, the new page renders a newer revision than the saved one, and the saved state (pendingMoveSelection) is less than five seconds old (5000 ms) | The moved blocks are selected |
| A saved selection with the same revision, or older than five seconds | Nothing is selected and the saved entry is dropped |

### Scenario (refusal): At the ends of the document the selection does not move

| Input | Outcome |
| --- | --- |
| A selection that starts at the first block; Alt+ArrowUp | Nothing is posted and the selection stays |
| An included block below the selection; Alt+ArrowDown | Nothing is posted |

### Scenario (refusal): A repeated key moves once and a refusal keeps the selection

| Input | Outcome |
| --- | --- |
| A selection move is in flight and the key repeats | No second message is posted |
| The result and the render of the move arrived and the writer presses the chord again | A new selection move is requested |
| The host answers the selection move with ok false and a reason | The selection is kept and the chord can be pressed again |
| The request of a selection move was dropped and the flight is forgotten | No pending mark is left on the bar |

### Scenario (nominal): The host swaps a span of blocks with the neighbouring block

- GIVEN blocks A, B and C with A and B as the moving span
- WHEN the host receives the block move down and plans it
- THEN C comes first, then A and B with their inner blank line unchanged; the whole span is swapped with the neighbouring block, the separators inside the span stay untouched and a span keeps CRLF line breaks inside and around it

### Scenario (refusal): The host refuses a span that cannot move

| Input | Outcome |
| --- | --- |
| A span that would move past the end of the document | The move is refused |
| A span next to the frontmatter that would cross it | The move is refused |
| A refusal answer after a key press | The reason shows next to the bar under the last selected block |


### Related requirements

- SwRS-MDOKFSTUDIO-BLOCK-130: Alt+Up and Alt+Down move the focused block.
- SwRS-MDOKFSTUDIO-BLOCK-148: a patch clears the selection unless one is waiting.
- SwRS-MDOKFSTUDIO-BLOCK-127: an included block is never moved.

### Verification notes

- Method: test/page/runtimeBlockSelection.test.ts, unit tests `T41: Alt+ArrowDown with a two-block selection posts the span; the selection follows the patch` and `T41: Alt+ArrowUp with a selection posts the span above its neighbour` (Alt+Up and Alt+Down; render selects again); `T41: the arrows of the last selected block's bar move the span; other bars move one block` and `T41 r2: the last selected block's arrows are labelled for the selection; a dropped request leaves no pending mark` (arrows and labels; dropped request); `T41 r2: with a selection, Alt+Arrow on a block outside it moves that one block` and `T41: without a selection Alt+Arrow still moves the one focused block` (moves alone); `T41: a patch that changes the number of blocks restores nothing instead of another block` (count changed); `T41: after a full reload the selection is restored from the saved state` and `T41 r2: a saved pending selection of the same version, or an old one, selects nothing and is dropped` (reload); `T41: at either end of the document the span does not move, and the selection stays` (ends); `T41: a key repeat does not move the span twice; a refusal keeps the selection and can be retried` (repeat and refusal).
- Method: test/integration/realInput/markers.ts, real-input scenario scenarioBlockMoveSelection (screenshot block-editing/r23) for Alt+ArrowDown with a selection.
- Method: test/core/mapping/blockMove.test.ts, unit tests `a span of blocks moves past one block, inner separators untouched` and `a span keeps CRLF line breaks inside and around it` (host swap); `a span at the end of the document, or past it, is refused` and `a span next to the frontmatter cannot cross it` (host refusals); test/integration/blockMove.test.ts (selection span, one undo).
- Method: test/page/runtimeBlockSelection.test.ts (`T41: a key repeat does not move the span twice; a refusal keeps the selection and can be retried`, changed: the reason shows under the last selected block).
- Criteria: One message with the span as the moving range. applyMoveSelection compares the block count. MOVE_SELECTION_MAX_AGE is 5000 ms. requestSelectionMove returns false without a neighbour and while a flight exists. The pending selection state is cleared on refusal. selectionEndsAt picks the bar. selectionMoveOwns is true only for selected blocks or the page. updateMoveLabels runs on every render of the selection. The result equals the expected text of each case.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-014](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-014.md): A writer reorders blocks with arrows, keys and selections
  - [StRS-MDOKFSTUDIO-BLOCK-025](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-025.md): Preview edits land exactly, in one undo step, keep line endings, or are refused with a reason
- Depends on:
  - [SwRS-MDOKFSTUDIO-BLOCK-041](SwRS-MDOKFSTUDIO-BLOCK-041.md): One edit at a time: an open editor blocks other edits, opens and refreshes
  - [SwRS-MDOKFSTUDIO-BLOCK-058](SwRS-MDOKFSTUDIO-BLOCK-058.md): Every host source edit is one undo step, renders once and reports a failed apply
  - [SwRS-MDOKFSTUDIO-TRUST-005](../trust-security/SwRS-MDOKFSTUDIO-TRUST-005.md): The host refuses every write request of a read-only preview with a reason
<!-- okf:links:end -->
