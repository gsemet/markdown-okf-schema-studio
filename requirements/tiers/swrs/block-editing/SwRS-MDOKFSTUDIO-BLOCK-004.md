---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-004
uuid: 10a056dc-425c-456c-aac2-4ba03c3159dd
title: Arrow keys, Enter and Escape drive block editing without the mouse
description: When edit mode is on and no editor is open, the page SHALL move a
  one-block selection with ArrowUp and ArrowDown, open the selected block with
  Enter, and, when an editor closes through Escape or Cmd/Ctrl+Enter, leave the
  edited block selected; the keys SHALL work while the page itself holds the
  focus, and a window or tab that comes back SHALL restore the selection.
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-016
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/blockSelectionView.ts
tested_in_files:
- test/build/integrationEditModeRestore.test.ts
- test/integration/windowSwitchKeys.test.ts
- test/page/runtimeBlockSelection.test.ts
- test/visual/scenarioDefinitions1.ts
---

## Arrow keys, Enter and Escape drive block editing without the mouse

### Normative behavior

When edit mode is on and no editor is open, the page SHALL move a one-block selection with ArrowUp and ArrowDown, open the selected block with Enter, and, when an editor closes through Escape or Cmd/Ctrl+Enter, leave the edited block selected. The keys SHALL work while the page itself (the document, its body or the content root) holds the focus, the page itself SHALL show no focus ring, and when the window or tab comes back with the page holding the focus in edit mode with no editor open, the page SHALL select the block that was selected, else the last block the keyboard selected, else the block nearest the top of the viewport.

### Scenario (nominal): Up and Down select, Enter opens, Escape or Cmd/Ctrl+Enter returns to the selection

- GIVEN edit mode on, no editor open and no block selected
- WHEN the writer presses ArrowDown, ArrowDown, Enter, types, then presses Escape (or Cmd/Ctrl+Enter)
- THEN the first press selects the body block nearest the top of the viewport, the second moves the selection to the next block, Enter opens the editor of the selected block, and Escape cancels (Cmd/Ctrl+Enter saves) and leaves that block selected, so the next ArrowUp or ArrowDown carries on from it

The selection is the one of SwRS-MDOKFSTUDIO-BLOCK-140: it is outlined in the focus colour, scrolled into view, takes the focus and is announced as "1 block selected". After a save, the block is selected once the patch of the save is in; when the save changed the number of blocks, nothing is selected.

### Scenario (boundary): Moving the selection

| Input | Outcome |
| --- | --- |
| ArrowDown on the last block, ArrowUp on the first | The selection stays |
| ArrowUp or ArrowDown with a run of blocks selected | The run collapses onto the neighbour of its free end |
| A neighbour that comes from an include | It is skipped |
| Enter with no selection | Nothing opens |
| Enter on the page itself (the focus lost to the body) with a selection | The editor of the free end of the selection opens |

### Scenario (nominal): Coming back to the window

- GIVEN edit mode on, no editor open, and the page itself holds the focus (the writer clicked the margin of the page, or the window or the tab comes back)
- WHEN the writer presses ArrowDown
- THEN the selection moves as above and the page shows no focus ring; when the window or tab comes back, the block that was selected (else the last one the keyboard selected, else the block nearest the top of the viewport) is selected again and holds the focus before any key is pressed

### Scenario (refusal): Keys that belong to other controls

| Input | Outcome |
| --- | --- |
| ArrowUp, ArrowDown or Enter with edit mode off | Nothing is selected or opened |
| ArrowDown in a block editor text box, a field or the properties table | The key stays with that control |
| ArrowDown with Shift, Alt, Ctrl or Cmd | Not handled here: Shift extends a run (BLOCK-140), Alt moves the block |
| ArrowDown on the edit-mode toggle right after it was pressed | Handled as on the page |
| The window comes back with a toolbar button, a block or an editor focused, or outside edit mode | The selection is left as it is |

Table-cell editors keep their own Escape and Cmd/Ctrl+Enter and do not select a block when they close.

### Verification notes

- Method: test/page/runtimeBlockSelection.test.ts, unit tests `CR 120: plain Up and Down select a block, starting at the block nearest the viewport top`, `CR 120: plain Up collapses a block run onto the neighbour of its free end`, `CR 120: plain Up and Down do nothing outside edit mode, in a text box or with a modifier`, `CR 120: Enter opens the editor of the selected block`, `CR 120: Enter with no selection opens nothing`, `CR 120: Escape closes the editor and leaves its block selected for the arrow keys`, `CR 120: Cmd/Ctrl+Enter without changes closes the editor and selects its block` and `CR 120: Cmd/Ctrl+Enter with changes saves, and the block is selected once the patch is in`. The included-block skip and the toggle-button focus rows are untested. CR 129 unit tests `CR 129: plain Up and Down on the focused content root move the block selection`, `CR 129: Shift+Down on the focused content root extends a selection`, `CR 129: the window coming back selects the block nearest the top when nothing was selected`, `CR 129: the window coming back restores the last block the keyboard selected` and `CR 129: the window coming back selects nothing outside edit mode, in an editor or on another control`.
- Method: test/integration/windowSwitchKeys.test.ts, real VS Code window: after a click on the page margin, and after leaving for another editor tab and coming back, ArrowDown selects a block and the page shows no focus ring. A switch to another application cannot be driven from the test window; the focus event it raises is covered by the unit tests.
- Method: test/build/integrationEditModeRestore.test.ts (CR 152): every top-level real-window scenario that turns edit mode on turns it off again, so windowSwitchKeys.test.ts starts with edit mode off and its toggle click gives the page the keyboard focus (pasteUrl.test.ts left it on and the first ArrowDown went to the workbench).
- Method: test/visual/scenarioDefinitions2.ts, visual scenarios block-editing/v18 (cream and dark): real key presses Down, Down, Enter, Escape leave one block outlined and announced.
- Criteria: The plain-key handler requires edit mode, no open editor and no modifier; the target is the page, a block or the edit-mode toggle. The edited block is read before the editor closes and selected by position.

### Known issues

- Known issue (CR 152): in the real-window test, a preview that has just opened holds no keyboard focus (the workbench body has it, `document.hasFocus()` is false in the page), so the arrow keys act only once the page, the margin or a toolbar button was clicked or the tab was focused again.
