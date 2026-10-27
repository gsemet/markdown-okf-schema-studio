---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-130
uuid: 2757f725-8d0a-47bd-bb51-83612553fcbc
title: Alt+Up and Alt+Down move the focused block, also from the text box
description: When a writer presses Alt+ArrowUp or Alt+ArrowDown on a focused
  body block in edit mode, the page SHALL request the move of that block and
  focus the block at its new place, and the move chord in the text box of a
  block editor does the same after saving the edit and reopens the editor with
  the caret where it was.
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-014
- StRS-MDOKFSTUDIO-BLOCK-025
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-BLOCK-058
- SwRS-MDOKFSTUDIO-TRUST-090
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/blockEditor.ts
- src/page/features/blockMoves.ts
tested_in_files:
- test/integration/realInput/markers.ts
- test/page/blockReq.requirements.test.ts
- test/page/runtimeBlockMoves.test.ts
---

## Alt+Up and Alt+Down move the focused block, also from the text box

### Normative behavior

When a writer presses Alt+ArrowUp or Alt+ArrowDown on a focused body block in edit mode, the page SHALL request the move of that block and focus the block at its new place, and the move chord in the text box of a block editor does the same after saving the edit and reopens the editor with the caret where it was.

### Scenario (nominal): Alt+Arrow on a focused block or insert point

| Input | Outcome |
| --- | --- |
| Alt+ArrowDown on a focused body block, edit mode on | previewBlockMove is posted for that block and, after the render, the block at its new line has the focus; one message per key press |
| Alt+ArrowUp or Alt+ArrowDown with the plus button of a bar focused | previewBlockMove is posted for the block above the bar |
| Alt+ArrowUp on the first block | Nothing is posted |
| Alt+ArrowDown with the bar of the properties table focused | Nothing is posted |

### Scenario (boundary): A key repeat does not move a block twice

| Input | Outcome |
| --- | --- |
| The key repeat event arrives while a keyboard move waits for its result and render | No second message is posted |
| The result and the render of the move have arrived and the writer presses the chord again | A new move is requested |

### Scenario (refusal): Other chords and targets do not move a block

| Input | Outcome |
| --- | --- |
| Shift+Alt+Arrow or Ctrl+Alt+Arrow on a focused block | No move is posted |
| Alt+Arrow with Cmd | No move is posted |
| Plain Alt+Arrow with the focus in a text box | The key stays with the text box and no move is posted |
| Alt+Arrow in an input, select or editor, in the properties table, outside edit mode or during an open editor | No block move starts |

### Scenario (refusal): A refused keyboard move can be retried

- GIVEN a keyboard move whose result is ok false
- WHEN the result arrives
- THEN the flight is cleared, the block has the focus and the reason shows next to the bar under the block
- WHEN the writer presses the chord again
- THEN a new previewBlockMove is posted

### Scenario (boundary): A keyboard move that never lands is forgotten after five seconds

| Input | Outcome |
| --- | --- |
| A keyboard move in flight and no result for five seconds | The flight is cleared and a new chord is accepted |
| The result arrives after one second | The timer has been cleared |

### Scenario (nominal): The move chord in the text box moves the block and reopens its editor

The move chord is Cmd+Alt with ArrowUp or ArrowDown on macOS and Ctrl+Alt elsewhere.

| Input | Outcome |
| --- | --- |
| An editor with typed text and the caret at offset 12, the chord down | The final save is posted, then the block is moved, and the editor of the block at its new place opens with the caret at offset 12 |
| An editor opened and not changed, the chord | The editor closes, the host drops the edit and previewBlockMove is posted at once |

### Scenario (refusal): The move chord is always consumed in the text box

| Input | Outcome |
| --- | --- |
| The chord in the editor of the last block (no neighbour) | The key is consumed and nothing else happens |
| The chord while a move is already in flight | The key is consumed and nothing else happens |
| The chord in an insertion editor | No word navigation happens and nothing moves |
| The chord in a table cell, or as a key repeat | The key is consumed and nothing moves |
| AltGr with an arrow, on a layout where AltGr reports Ctrl and Alt together | The key stays native and moves the caret; AltGraph is never part of the chord |
| Option or Alt with an arrow, without Cmd or Ctrl (or without Cmd+Alt on macOS) | The key stays native and moves the caret by word; the chord itself is Cmd+Alt on macOS and Ctrl+Alt elsewhere |

### Related requirements

- SwRS-MDOKFSTUDIO-BLOCK-109: the arrows of an insert point and the reason shown for a refused move.
- SwRS-MDOKFSTUDIO-BLOCK-156: Alt+Arrow with a block selection moves the whole selection.
- SwRS-MDOKFSTUDIO-BLOCK-240: the accepted shape of previewBlockMove.
- SwRS-MDOKFSTUDIO-BLOCK-129: the page applies a move result only for its own render.

### Verification notes

- Method: test/page/runtimeBlockMoves.test.ts: `T37: Alt+ArrowDown on a focused block and Alt+ArrowUp on its bar button post the move` (scenario 1), `T37: a key repeat during the round trip does not move twice; the block takes the focus` (scenarios 1 and 2), `T37: other chords and other targets do not move a block` and `T37: plain Alt+Arrow in the text box stays native; the shortcut chord is the only one handled` (scenarios 3 and 7), `T37: a refused keyboard move can be retried` (scenario 4; it asserts only that the second chord posts a second message, so the focus and the missing reason are untested), `T37: Ctrl+Alt+ArrowDown saves, moves, then reopens the editor with the caret in place` and `T37: with nothing to save the chord closes the editor and moves at once` (scenario 6), `T37: on macOS the chord is Cmd+Alt, and Ctrl+Alt does nothing special` (scenario 7).
- Method: test/page/runtimeBlockMoves.test.ts: `T37: AltGr with an arrow in the text box is no move chord` (the AltGr scenario).
- Method: test/page/blockReq.requirements.test.ts: `a keyboard move that never lands is forgotten after five seconds` (scenario 5).
- Method: test/integration/realInput/markers.ts: real-input scenario scenarioBlockMoveKeys (screenshots block-editing/r21 for scenario 1 and block-editing/r22 for scenario 6).
- Method: test/page/runtimeBlockMoves.test.ts (`T37: Alt+ArrowDown on a focused block and Alt+ArrowUp on its bar button post the move`, changed: the refusal after a key press shows its reason) and test/page/blockReq.requirements.test.ts (`a keyboard move that never lands is forgotten after five seconds`, changed: the flight timer is replaced by the six-second reason timer).
- Criteria: A single message per key press. blockOfTarget returns the block of the bar. inFlight blocks requestBlockMove. moveChordDirection and the target checks of the keydown listener return no move for other chords. blockMoveInFlight is undefined after a refusal and after 5000 ms. The pending navigation carries direction and caretOffset. closeBlockEdit(true) precedes requestBlockMove. moveBlockFromEditor returns true for every handled chord.
