---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-254
uuid: b68037d3-fe4d-4b5c-93c4-f89c9d6df6ae
title: Right and Left move the block selection down and up the structure
description: When edit mode is on and no editor is open, the page SHALL move the
  keyboard selection one level down with ArrowRight (a table to its first cell,
  an admonition, card or tab to its first inner block, the whole page to its
  first block) and one level up with ArrowLeft or Escape, move a selected table
  cell with the four arrow keys without wrapping, and open the cell editor with
  Enter.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-016
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/editModeStyles.ts
- src/page/features/blockSelectionView.ts
- src/page/features/mappedBlocks.ts
- src/page/features/structuralNavigationView.ts
- src/page/modules/structuralCursor.ts
tested_in_files:
- test/integration/realInput/markers.ts
- test/page/modules/structuralCursor.test.ts
- test/page/runtimeStructuralNavigation.test.ts
- test/visual/scenarioDefinitions1.ts
default_owner_email: gaetan@xeberon.net
---

## Right and Left move the block selection down and up the structure

### Normative behavior

When edit mode is on and no editor is open, the page SHALL move the keyboard selection one level down with ArrowRight (a table to its first cell, an admonition, card or tab to its first inner block, the whole page to its first block) and one level up with ArrowLeft or Escape, move a selected table cell with the four arrow keys without wrapping, and open the cell editor with Enter.

### Scenario (nominal): Right goes down, Left and Escape go up

- GIVEN edit mode on, no editor open and a block selected by the keyboard (or no selection, with the page itself holding the focus)
- WHEN the writer presses ArrowRight
- THEN a selected table selects its first cell (the first header cell), a selected admonition, card or tab selects its first inner mapped block, and with nothing selected the first block of the page is selected; the new selection is outlined in the focus colour and announced, and ArrowLeft or Escape returns to the parent block

| Input | Outcome |
| --- | --- |
| ArrowRight on a block with no inner block and no cells | Nothing changes |
| ArrowLeft on a top-level block, or with nothing selected | Nothing changes |
| Escape on a top-level block | The selection is cleared, as in BLOCK-004 |
| ArrowUp or ArrowDown on an inner block | The selection moves to the previous or next inner block of the same parent and stops at the first and the last |
| ArrowUp or ArrowDown on a top-level block | The block-to-block selection of BLOCK-004 |
| A block that comes from an include | It is never entered |

### Scenario (nominal): Walking the cells of a table

- GIVEN a table cell selected by the keyboard
- WHEN the writer presses ArrowLeft, ArrowRight, ArrowUp or ArrowDown
- THEN the selection moves to the neighbouring cell and stops at the edges of the table (no wrap), a row with fewer cells clamps the column, and the selected cell carries `data-sphinx-preview-cell-focus`, drawn with the focus colour of the block selection ring, and is announced as "Table cell row R, column C selected"

Escape returns the selection to the table block. Enter opens the cell editor through the same path as a click on the cell, and the cell highlight goes away.

### Scenario (refusal): Keys that belong to other controls

| Input | Outcome |
| --- | --- |
| Any of these keys with edit mode off, an editor open, or inside a text box, a field or the properties table | Not handled here |
| Any of these keys with Shift, Alt, Ctrl or Cmd | Not handled here (Shift extends a run, BLOCK-140; Alt moves, BLOCK-156) |

### Verification notes

- Method: test/page/modules/structuralCursor.test.ts, unit tests of the model (down, up, grid moves with edge stops and column clamping, whole-document start, unknown positions).
- Method: test/page/runtimeStructuralNavigation.test.ts, unit tests `CR 157: ...` over the page script: Right into the first cell, cell-to-cell arrows with edge stops, Escape back to the table, Enter opening the cell editor, Right into an admonition, Left and Escape up, Right on the whole page, leaves and top level, keys left alone.
- Method: test/visual/scenarioDefinitions1.ts, visual scenarios block-editing/v20 (light) and v21 (dark): Down then Right leaves the first header cell outlined, with no editor open.
- Method: test/integration/realInput/blockKeys.ts, real VS Code window: Right into the first cell and Escape back to the table block.
- Criteria: The structural listener of features/blockSelectionView.ts runs before the plain-key listener and the page input; the model is modules/structuralCursor.ts.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-016](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-016.md): A writer selects blocks and copies, cuts and pastes them as Markdown
<!-- okf:links:end -->
