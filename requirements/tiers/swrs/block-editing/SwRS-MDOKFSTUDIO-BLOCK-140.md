---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-140
uuid: 046c06db-f06d-4450-b26d-20be5b06d7ac
title: "Shift+click and Shift+Arrow select a run of blocks"
description: "When a writer Shift+clicks a body block, or presses Shift+ArrowUp or
  Shift+ArrowDown on a focused body block or on the selection, in edit mode, the page
  SHALL select a run of body blocks, from the anchor block to the clicked block or
  to the free end of the selection, and open no editor."
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-016
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-041
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/editModeStyles.ts
- src/page/features/blockSelectionView.ts
tested_in_files:
- test/page/modules/blockSelection.test.ts
- test/page/runtimeBlockSelection.test.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
---

## Shift+click and Shift+Arrow select a run of blocks

### Normative behavior

When a writer Shift+clicks a body block, or presses Shift+ArrowUp or Shift+ArrowDown on a focused body block or on the selection, in edit mode, the page SHALL select a run of body blocks, from the anchor block to the clicked block or to the free end of the selection, and open no editor.

### Scenario (nominal): Shift+click selects every body block from the anchor to the clicked block

- GIVEN edit mode on, a block opened or clicked earlier and another block further down
- WHEN the writer Shift+clicks the further block
- THEN the page selects every body block from the anchor block to the clicked block, no editor opens and the browser text selection is cleared

Shift+mousedown on the block is the first half of this gesture; see the mousedown scenario below.

### Scenario (boundary): The anchor is the block clicked or opened last

| Input | Outcome |
| --- | --- |
| Shift+click with no selection, after a block was opened or clicked earlier, and the number of blocks is unchanged | The range starts at the block opened or clicked earlier |
| Shift+click with no selection, after blocks were added or removed since the anchor was remembered | The clicked block becomes the anchor |

### Scenario (nominal): Shift+Arrow grows and shrinks the selection

- GIVEN a focused block in the middle of five
- WHEN the writer presses Shift+ArrowDown twice and Shift+ArrowUp once
- THEN the selection covers two, then three, then two blocks, the anchor never moves, the free end moves by one block and the focus follows the free end

A first Shift+Arrow from a focused block selects two blocks (the block and its neighbour), not one. At the end of the document the selection stops: with the last block focused, Shift+ArrowDown selects only that block.

### Scenario (nominal): Selected blocks are outlined and announced

| State | Outcome |
| --- | --- |
| Two blocks selected | Both carry `data-sphinx-preview-block-selected` true (a code block carries it on its `pre` element) and are outlined with a two pixel solid line in the focus colour; the status region has role status and aria-live polite and reads "2 blocks selected" |
| One block selected | The status region reads "1 block selected" |
| Selection cleared | No element carries the attribute and the status region is empty |

### Scenario (nominal): Escape or a plain click clears the selection

- GIVEN a block selection in edit mode
- WHEN the writer presses Escape outside a text box or field, or clicks a block without Shift
- THEN the selection is cleared, and on a plain click it is cleared before the block's editor opens; Escape inside an editor or a field keeps its own meaning

### Scenario (refusal): Reading mode

- GIVEN edit mode off
- WHEN the writer Shift+clicks a block
- THEN nothing is selected

### Scenario (refusal): Keys that belong to other controls or chords

| Input | Outcome |
| --- | --- |
| Shift+ArrowDown in a block editor text box | The text selection extends and no block is selected |
| Shift+ArrowUp or Shift+ArrowDown in a field or in the properties table | The key stays with that control; the keydown handler returns |
| Shift+ArrowDown on a toolbar button or menu while a block selection exists | The selection is unchanged |
| Alt+Shift+ArrowDown, or an arrow with Shift and Ctrl, or with Shift and Cmd, on a focused block | No selection is made, so the Alt+Arrow move chords do not collide |
| Plain Shift+ArrowDown on the same focused block | The selection is made |

### Scenario (boundary): Shift+mousedown on a block does not extend the browser text selection

| Input | Outcome |
| --- | --- |
| Shift+mousedown on a paragraph in edit mode | The default is prevented, so no browser text range extends under the block selection |
| Shift+mousedown inside a link | The browser default is kept |
| Shift+mousedown on a control, in the properties table, in an editor or on an insert point | The browser default is kept; preventDefault is called only for blocks |

### Related requirements

- SwRS-MDOKFSTUDIO-BLOCK-148: the selection survives a save and is cleared by a patch.
- SwRS-MDOKFSTUDIO-BLOCK-156: the selection moves as a whole.
- SwRS-MDOKFSTUDIO-BLOCK-166: the selection is copied as Markdown.
- SwRS-MDOKFSTUDIO-BLOCK-127: an included block stops the range.

### Verification notes

- Method: test/page/runtimeBlockSelection.test.ts, unit tests `T39: Shift+click on two blocks selects the run between them without opening an editor` and `T39: outside edit mode Shift+click selects nothing` (Shift+click scenario, reading mode); `T39: the range starts at the block that was clicked or opened last` (anchor); `T39: Shift+Arrow from a focused block extends and shrinks the selection and moves the focus` (Shift+Arrow); `T39: Shift+Arrow inside the text box, a field or the property table is left alone` and `T39 r2: Shift+Arrow with a selection leaves toolbar buttons alone` (other controls); `T39: Shift+Arrow does not collide with the Alt+Arrow move chords` (chords); `T39: the selection announcer is a polite live region created by the page script` (announcement); `T39: Escape or a plain click clears the selection` (Escape and plain click); `T39 r2: Shift+mousedown inside a link keeps the browser default` (mousedown, link row). The mousedown paragraph row, and the control, properties table, editor and insert point rows, are untested.
- Method: test/page/modules/blockSelection.test.ts, model tests `T39: extendTo selects from the anchor in both directions`, `T39: extendBy grows the free end and shrinks it back, keeping the anchor` and `T39: the selection stops at the first and the last block` (run between anchor and target in document order; Shift+Arrow, end of the document).
- Method: test/visual/scenarioDefinitions2.ts, visual scenario block-editing/v17 (outlines both blocks as selected, status "2 blocks selected"); real-input scenario scenarioBlockSelection (screenshot block-editing/r20) for the Shift+click gesture. The 2 px width is only in src/core/preview/styles/editModeStyles.ts and is not asserted.
- Criteria: The selection model covers the blocks between anchor and target in document order. The anchor is stored by position with the block count it was read at. The selection handler requires Shift without Alt, Ctrl and Cmd. The attribute marks exactly the selected blocks. The status region is visually hidden and created once.
