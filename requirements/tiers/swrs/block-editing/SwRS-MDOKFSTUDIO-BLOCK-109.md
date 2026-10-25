---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-109
uuid: b37c2b28-2c0c-498a-9746-1d0b6134d150
title: The up and down arrows of an insert point move its block
description: "While edit mode is on, the page SHALL give the insert point of every
  body block an up arrow labelled \"Move the block above up\" and a down arrow labelled
  \"Move the block above down\", and a click on an enabled arrow asks the host to
  swap the block with its neighbour."
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-014
- StRS-MDOKFSTUDIO-BLOCK-025
- StRS-MDOKFSTUDIO-FMEDIT-008
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-TRUST-065
- SwRS-MDOKFSTUDIO-TRUST-090
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/editModeStyles.ts
- src/page/features/blockMoves.ts
- src/page/features/insertPoints.ts
tested_in_files:
- test/core/preview/blockReq.requirements.test.ts
- test/core/protocol/pageToHost.test.ts
- test/page/runtimeBlockMoves.test.ts
---

## The up and down arrows of an insert point move its block

### Normative behavior

While edit mode is on, the page SHALL give the insert point of every body block an up arrow labelled "Move the block above up" and a down arrow labelled "Move the block above down", and a click on an enabled arrow asks the host to swap the block with its neighbour.

### Scenario (nominal): Every body bar holds the two arrows

- GIVEN a document with three body blocks in edit mode
- WHEN the bars are built
- THEN each bar holds a plus button, an up button and a down button with the labels above
- WHEN the bar is the one under the last block of a block selection and the labels are updated
- THEN they read "Move the selected blocks up" and "Move the selected blocks down" (see SwRS-MDOKFSTUDIO-BLOCK-156)

### Scenario (boundary): The arrows are disabled at the ends of the document

| Input | Outcome |
| --- | --- |
| Three body blocks | The up arrow of the first bar and the down arrow of the last bar are disabled, the others are enabled |
| One body block | Both arrows are disabled |

### Scenario (refusal): The properties bar and Start writing have no arrows

| Input | Outcome |
| --- | --- |
| A document with frontmatter in edit mode, the bar after the properties table | It holds only a plus button, a single control and no move buttons |
| An empty document, the Start writing bar | It holds only that button, a single control and no move buttons |
| A document with only frontmatter, the Start writing point | It holds a single control and no move buttons |

### Scenario (boundary): The arrows are hidden while a block editor is open

| Input | Outcome |
| --- | --- |
| A block editor is open | The move buttons of all bars are not displayed |
| No editor is open | The arrows are displayed again |

### Scenario (nominal): A click on an enabled arrow asks the host for the swap

- GIVEN a bar under a block at lines 7 to 8 and a neighbour at lines 10 to 12
- WHEN the writer clicks the down arrow
- THEN previewBlockMove carries line 7, endLine 8, neighbourLine 10, neighbourEndLine 12, direction down and pinViewportTop, one message per click
- AND the bar is marked data-sphinx-move-pending until a refusal clears the mark or the re-render rebuilds the bars

### Scenario (refusal): A disabled arrow posts nothing and the arrows stand down during an edit

| Input | Outcome |
| --- | --- |
| A click on a disabled arrow at the end of the document | No message is posted |
| An arrow activated while a block editor or a field editor is open | No message is posted |

### Scenario (refusal): A refused move says why next to the bar for six seconds

| Input | Outcome |
| --- | --- |
| The host answers ok false with a reason to a move requested from a bar | A status element with role status and the reason appears next to that bar and disappears after 6 s; the pending mark is cleared |
| The host answers ok true | No status is shown; the page is re-rendered |

### Related requirements

- SwRS-MDOKFSTUDIO-BLOCK-240: the accepted shape of previewBlockMove.
- SwRS-MDOKFSTUDIO-BLOCK-129: the page applies a move result only for its own render.
- SwRS-MDOKFSTUDIO-BLOCK-117: what the host does with the swap.
- SwRS-MDOKFSTUDIO-BLOCK-124: the host refuses ranges that do not match the document.
- SwRS-MDOKFSTUDIO-BLOCK-127: an included block is never moved.
- SwRS-MDOKFSTUDIO-BLOCK-156: a block selection moves as a whole.

### Verification notes

- Method: test/page/runtimeBlockMoves.test.ts: `T36: every body insertion point has up and down buttons, disabled at the ends` (scenarios 1 and 2), `T36: the properties point and the Start writing point have no move buttons` (scenario 3), `T36: a click posts the ranges of the block above the bar and of its neighbour` (scenario 5), `T36: a disabled button posts nothing, and the buttons stand down while an editor is open` (scenario 6), `T36: a refused move says why next to the bar; a result of another context is ignored` (scenario 7). The labels of a selection (scenario 1, second part) are checked by the tests of SwRS-MDOKFSTUDIO-BLOCK-156.
- Method: test/core/preview/blockReq.requirements.test.ts: `the move arrows are hidden only while a block editor is open` (scenario 4).
- Method: test/core/protocol/pageToHost.test.ts: `previewBlockMove validates both ranges, the direction and the optional pin` (scenario 5).
- Criteria: Two buttons with data-sphinx-move up and down per body bar. The disabled attribute is set when the neighbour is missing. addMoveButtons is called only for body bars. The stylesheet hides the buttons under the open-editor attribute. postBlockMove returns false when an editor is open. The status lives 6000 ms.
