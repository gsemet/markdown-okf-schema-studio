---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-130
uuid: 2757f725-8d0a-47bd-bb51-83612553fcbc
title: Alt+Up and Alt+Down move the focused block, also from the text box
description: When a writer presses Alt+ArrowUp or Alt+ArrowDown on a focused
  body block in edit mode, the page SHALL request the move of that block and
  focus the block at its new place, and the move chord in the text box of a
  block editor does the same after saving the edit and reopens the editor with
  the caret where it was; inside an admonition or an alert the chord moves the
  edited direct block among the blocks of that admonition.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-014
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-BLOCK-058
- SwRS-MDOKFSTUDIO-TRUST-090
scenarios:
- id: S1
  title: Alt+Arrow on a focused block or insert point
- id: S2
  title: A key repeat does not move a block twice
- id: S3
  title: Other chords and targets do not move a block
- id: S4
  title: A refused keyboard move can be retried
- id: S5
  title: A keyboard move that never lands is forgotten after five seconds
- id: S6
  title: The move chord in the text box moves the block and reopens its editor
- id: S7
  title: The move chord is always consumed in the text box
- id: S8
  title: The move chord in the editor of a block inside an admonition
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/mystBoxLines.ts
- src/page/features/blockEditor.ts
- src/page/features/blockMoves.ts
tested_in_files:
- test/integration/listItemMoves.ts
- test/integration/realInput/blockKeys.ts
- test/page/blockReq.requirements.test.ts
- test/page/runtimeBlockEditorLineEndings.test.ts
- test/page/runtimeBlockMoves.test.ts
- test/session/boxBlockSourceLines.test.ts
default_owner_email: gaetan@xeberon.net
---

## Alt+Up and Alt+Down move the focused block, also from the text box

### Normative behavior

When a writer presses Alt+ArrowUp or Alt+ArrowDown on a focused body block in edit mode, the page SHALL request the move of that block and focus the block at its new place, and the move chord in the text box of a block editor does the same after saving the edit and reopens the editor with the caret where it was; inside an admonition or an alert the chord moves the edited direct block among the blocks of that admonition.

### Scenario S1 (nominal): Alt+Arrow on a focused block or insert point

| Input | Outcome |
| --- | --- |
| Alt+ArrowDown on a focused body block, edit mode on | previewBlockMove is posted for that block and, after the render, the block at its new line has the focus; one message per key press |
| Alt+ArrowUp or Alt+ArrowDown with the plus button of a bar focused | previewBlockMove is posted for the block above the bar |
| Alt+ArrowUp on the first block | Nothing is posted |
| Alt+ArrowDown with the bar of the properties table focused | Nothing is posted |

### Scenario S2 (boundary): A key repeat does not move a block twice

| Input | Outcome |
| --- | --- |
| The key repeat event arrives while a keyboard move waits for its result and render | No second message is posted |
| The result and the render of the move have arrived and the writer presses the chord again | A new move is requested |

### Scenario S3 (refusal): Other chords and targets do not move a block

| Input | Outcome |
| --- | --- |
| Shift+Alt+Arrow or Ctrl+Alt+Arrow on a focused block | No move is posted |
| Alt+Arrow with Cmd | No move is posted |
| Plain Alt+Arrow with the focus in a text box | The key stays with the text box and no move is posted |
| Alt+Arrow in an input, select or editor, in the properties table, outside edit mode or during an open editor | No block move starts |

### Scenario S4 (refusal): A refused keyboard move can be retried

- GIVEN a keyboard move whose result is ok false
- WHEN the result arrives
- THEN the flight is cleared, the block has the focus and the reason shows next to the bar under the block
- WHEN the writer presses the chord again
- THEN a new previewBlockMove is posted

### Scenario S5 (boundary): A keyboard move that never lands is forgotten after five seconds

| Input | Outcome |
| --- | --- |
| A keyboard move in flight and no result for five seconds | The flight is cleared and a new chord is accepted |
| The result arrives after one second | The timer has been cleared |

### Scenario S6 (nominal): The move chord in the text box moves the block and reopens its editor

The move chord is Cmd+Alt with ArrowUp or ArrowDown on macOS and Ctrl+Alt elsewhere.

| Input | Outcome |
| --- | --- |
| An editor with typed text and the caret at offset 12, the chord down | The final save is posted, then the block is moved, and the editor of the block at its new place opens with the caret at offset 12 |
| An editor opened and not changed, the chord | The editor closes, the host drops the edit and previewBlockMove is posted at once |

### Scenario S7 (refusal): The move chord is always consumed in the text box

| Input | Outcome |
| --- | --- |
| The chord in the editor of the last block (no neighbour) | The key is consumed and nothing else happens |
| The chord while a move is already in flight | The key is consumed and nothing else happens |
| The chord in an insertion editor | No word navigation happens and nothing moves |
| The chord in a table cell, or as a key repeat | The key is consumed and nothing moves |
| AltGr with an arrow, on a layout where AltGr reports Ctrl and Alt together | The key stays native and moves the caret; AltGraph is never part of the chord |
| Option or Alt with an arrow, without Cmd or Ctrl (or without Cmd+Alt on macOS) | The key stays native and moves the caret by word; the chord itself is Cmd+Alt on macOS and Ctrl+Alt elsewhere |

### Scenario S8 (nominal): The move chord in the editor of a block inside an admonition

A direct block of an admonition or an alert is a block of its body with no element between them (the code of a code block counts with its frame).

| Input | Outcome |
| --- | --- |
| The chord down in the editor of an item of a list in the body of a MyST admonition, a paragraph after the list | The item is saved if changed, the list and the paragraph swap inside the admonition, the fence and the title stay, and the list's editor opens at its new place with the caret at the same offset |
| The same from the editor of the list, of a paragraph or of a code block of the body | That list, paragraph or code block swaps with its neighbour inside the admonition and its editor reopens |
| The same in a GitHub alert, also an alert indented in a list item | The same; every line keeps its quote prefix |
| An item of a nested sub-list | The outermost list of the admonition's body moves, with all its items |
| The chord again in the editor that reopened, and again | The block moves one more place each time, until the first or last place of the body |
| The block is the first of the body and the chord is up, or the last and the chord is down | The key is consumed and nothing happens; the block never leaves the admonition |
| A block in the body of an admonition nested in another; the inner admonition opened whole | The block moves among the inner admonition's blocks only; the inner admonition moves among the outer one's blocks |
| The editor of a block inside a list item of the admonition; the editor of an item of a list inside a block quote, a card or a grid of the admonition | The key is consumed and nothing moves |
| The edited block, or the block it would swap with, is not a direct block, as the table of a `{table}` directive, with or without a caption, held in a figure that carries no source line | The key is consumed and nothing moves |
| The edited block, or the block it would swap with, is a directive of the body (`{mermaid}`, `{math}`, `{code-block}` with or without a caption, `{list-table}`, `{csv-table}`, a nested one-line admonition) or a bare LaTeX environment | The two blocks swap whole, opening line to closing line; no line enters a fence |

### Related requirements

- SwRS-MDOKFSTUDIO-BLOCK-109: the arrows of an insert point and the reason shown for a refused move, also for a move refused inside an admonition.
- SwRS-MDOKFSTUDIO-BLOCK-124: the host refuses a move that would start an admonition body with a block that hides it or becomes its title.
- SwRS-MDOKFSTUDIO-BLOCK-156: Alt+Arrow with a block selection moves the whole selection.
- SwRS-MDOKFSTUDIO-BLOCK-259: the accepted shape of previewBlockMove.

### Verification notes

- Method: test/page/runtimeBlockMoves.test.ts: `T37: Alt+ArrowDown on a focused block and Alt+ArrowUp on its bar button post the move` (scenario 1), `T37: a key repeat during the round trip does not move twice; the block takes the focus` (scenarios 1 and 2), `T37: other chords and other targets do not move a block` and `T37: plain Alt+Arrow in the text box stays native; the shortcut chord is the only one handled` (scenarios 3 and 7), `T37: a refused keyboard move can be retried` (scenario 4; it asserts only that the second chord posts a second message, so the focus and the missing reason are untested), `T37: Ctrl+Alt+ArrowDown saves, moves, then reopens the editor with the caret in place` and `T37: with nothing to save the chord closes the editor and moves at once` (scenario 6), `T37: on macOS the chord is Cmd+Alt, and Ctrl+Alt does nothing special` (scenario 7).
- Method: test/page/runtimeBlockMoves.test.ts: `T37: AltGr with an arrow in the text box is no move chord` (the AltGr scenario).
- Method: test/page/runtimeBlockMoves.test.ts: `T37: the chord in a list item editor saves the item, then moves the whole list` (scenario 6 from the editor of a list item: the block moved is the whole list, the top-level block that holds the item; with typed text the final save carries the item lines and the move is posted once the save is rendered, without it the move is posted at once).
- Method: test/page/blockReq.requirements.test.ts: `a keyboard move that never lands is forgotten after five seconds` (scenario 5).
- Method: test/integration/realInput/markers.ts: real-input scenario scenarioBlockMoveKeys (screenshots block-editing/r21 for scenario 1 and block-editing/r22 for scenario 6).
- Method: test/page/runtimeBlockMoves.test.ts (`T37: Alt+ArrowDown on a focused block and Alt+ArrowUp on its bar button post the move`, changed: the refusal after a key press shows its reason) and test/page/blockReq.requirements.test.ts (`a keyboard move that never lands is forgotten after five seconds`, changed: the flight timer is replaced by the six-second reason timer).
- Method: test/page/runtimeBlockMoves.test.ts, on a MyST admonition and a GitHub alert (scenario 8): `the chord in the editor of a block of an admonition moves it among the blocks of that admonition`, `the chord stops at the edge of an admonition body and leaves a block that is not a direct one`, `after a move inside an admonition the block's editor reopens, and the chord moves it again to the edge` and `with unsaved text the chord in an admonition saves, moves the list, then reopens its editor`. The quote prefixes the host keeps are checked by SwRS-MDOKFSTUDIO-BLOCK-117.
- Method: test/session/boxBlockSourceLines.test.ts, with the neighbour `moveNeighbour` gives on the rendered page, moved by the real `PreviewManager`: every directive of an admonition and of an alert, a `{list-table}`, a `{csv-table}`, a LaTeX environment and a nested one-line admonition swap whole with the blocks beside them, as do a directive and a code block that end an admonition left open at the end of the file; neither a `{table}`, with or without a caption, nor its neighbour moves past it, in an admonition and in an alert, while two blocks away from it swap (scenario 8).
- Criteria: A single message per key press. blockOfTarget returns the block of the bar. inFlight blocks requestBlockMove. moveChordDirection and the target checks of the keydown listener return no move for other chords. blockMoveInFlight is undefined after a refusal and after 5000 ms. The pending navigation carries direction and caretOffset. closeBlockEdit(true) precedes requestBlockMove. moveBlockFromEditor returns true for every handled chord. moveNeighbour gives the neighbour of every move, a body block's or a direct block's inside its admonition, and a move in flight finds its block again whether it is top-level or inner.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-014](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-014.md): A writer reorders blocks with arrows, keys and selections
- Depends on:
  - [SwRS-MDOKFSTUDIO-BLOCK-041](SwRS-MDOKFSTUDIO-BLOCK-041.md): One edit at a time: an open editor blocks other edits, opens and refreshes
  - [SwRS-MDOKFSTUDIO-BLOCK-058](SwRS-MDOKFSTUDIO-BLOCK-058.md): Every host source edit is one undo step, renders once and reports a failed apply
  - [SwRS-MDOKFSTUDIO-TRUST-090](../trust-security/SwRS-MDOKFSTUDIO-TRUST-090.md): Every page request is answered once by its id and result type, or ends with a readable error
<!-- okf:links:end -->
