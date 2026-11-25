---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-254
uuid: b68037d3-fe4d-4b5c-93c4-f89c9d6df6ae
title: Right and Left move the block selection down and up the structure
description: When edit mode is on and no editor is open, the page SHALL move the
  keyboard selection one level down with ArrowRight (a table to its first cell,
  an admonition, card or tab to its first inner block, a list to its first item,
  a list item to its first inner block, the whole page to its first block) and
  one level up with ArrowLeft or Escape, move a selected table cell with the
  four arrow keys without wrapping, and open with Enter the editor of the
  selected cell, list item or block of a list item.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-008
depends_on: []
scenarios:
- id: S1
  title: Right goes down, Left and Escape go up
- id: S2
  title: Walking the cells of a table
- id: S3
  title: Walking a list
- id: S4
  title: Keys that belong to other controls
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
- test/integration/realInput/blockKeys.ts
- test/page/modules/structuralCursor.test.ts
- test/page/runtimeStructuralNavigation.test.ts
- test/session/listItemEditOpen.test.ts
- test/visual/scenarioDefinitions1.ts
default_owner_email: gaetan@xeberon.net
---

## Right and Left move the block selection down and up the structure

### Normative behavior

When edit mode is on and no editor is open, the page SHALL move the keyboard selection one level down with ArrowRight (a table to its first cell, an admonition, card or tab to its first inner block, a list to its first item, a list item to its first inner block, the whole page to its first block) and one level up with ArrowLeft or Escape, move a selected table cell with the four arrow keys without wrapping, and open with Enter the editor of the selected cell, list item or block of a list item.

### Scenario S1 (nominal): Right goes down, Left and Escape go up

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

### Scenario S2 (nominal): Walking the cells of a table

- GIVEN a table cell selected by the keyboard
- WHEN the writer presses ArrowLeft, ArrowRight, ArrowUp or ArrowDown
- THEN the selection moves to the neighbouring cell and stops at the edges of the table (no wrap), a row with fewer cells clamps the column, and the selected cell carries `data-sphinx-preview-cell-focus`, drawn with the focus colour of the block selection ring, and is announced as "Table cell row R, column C selected"

Escape returns the selection to the table block. Enter opens the cell editor through the same path as a click on the cell, and the cell highlight goes away.

### Scenario S3 (nominal): Walking a list

- GIVEN edit mode on, no editor open and a list selected by the keyboard, whose first item (lines 80 to 83, line 83 blank) holds two paragraphs (lines 80 and 82) and whose second item holds one paragraph (lines 84 and 85)
- WHEN the writer presses ArrowRight, then Enter; or ArrowRight twice, ArrowDown, then Enter; or ArrowRight twice, ArrowLeft twice, then Enter
- THEN ArrowRight selects the first item and Enter opens it on lines 80 to 83; ArrowRight on the item selects its first paragraph, ArrowDown the second, and Enter opens that paragraph only, on lines 82 to 83 (a block mapped to one line reaches the line before the next block of the item, or the end of the item, so a paragraph of a tight item keeps all its wrapped lines); ArrowLeft goes back to the item, then to the list, and Enter on the list opens the whole list, lines 80 to 85

A click on a list item opens the item, not the block under the click (SwRS-MDOKFSTUDIO-BLOCK-014): only the keyboard reaches a block inside an item.

### Scenario S4 (refusal): Keys that belong to other controls

| Input | Outcome |
| --- | --- |
| Any of these keys with edit mode off, an editor open, or inside a text box, a field or the properties table | Not handled here |
| Any of these keys with Shift, Alt, Ctrl or Cmd | Not handled here (Shift extends a run, BLOCK-140; Alt moves, BLOCK-156) |

### Verification notes

- Method: test/page/modules/structuralCursor.test.ts, unit tests of the model (down, up, grid moves with edge stops and column clamping, whole-document start, unknown positions).
- Method: test/page/runtimeStructuralNavigation.test.ts, unit tests `CR 157: ...` over the page script: Right into the first cell, cell-to-cell arrows with edge stops, Escape back to the table, Enter opening the cell editor, Right into an admonition, Left and Escape up, Right on the whole page, leaves and top level, keys left alone.
- Method: test/page/runtimeStructuralNavigation.test.ts (`Right walks a list down to its items and their blocks, Enter edits the selected level, Left goes back up`: list scenario) and test/session/listItemEditOpen.test.ts (`from the keyboard, an item opens on its lines and a block inside it opens on its own lines`: the ranges on Markdown rendered like the preview, the tight item paragraph).
- Method: test/visual/scenarioDefinitions1.ts, visual scenarios block-editing/v20 (light) and v21 (dark): Down then Right leaves the first header cell outlined, with no editor open.
- Method: test/integration/realInput/blockKeys.ts, real VS Code window: Right into the first cell and Escape back to the table block.
- Criteria: The structural listener of features/blockSelectionView.ts runs before the plain-key listener and the page input; the model is modules/structuralCursor.ts; Enter on an inner block calls `openMappedEditor` with `exact`, so `editingElementFor` (src/page/features/mappedBlocks.ts) gives a block inside a list item its own range (sourceRangeForInnerBlock) instead of the item's.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-008](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-008.md): A writer types and moves between blocks with text editor keys
<!-- okf:links:end -->
