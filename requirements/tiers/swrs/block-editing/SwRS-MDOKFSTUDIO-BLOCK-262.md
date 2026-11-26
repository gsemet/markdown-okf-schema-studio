---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-262
uuid: 2143145b-9eb4-414e-8772-a3338d735554
title: List item handle reorders an item among its siblings in edit mode
description: When the writer drags the handle of a list item in edit mode onto
  another item of the same list, or presses Alt+Up or Alt+Down on that handle,
  the extension SHALL move that item, with its sub-items and blocks, to the new
  position among its sibling items as one source edit and keep the numbers of an
  ordered list in order.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-014
scenarios:
- id: S1
  title: Dragging the handle of an item
- id: S2
  title: Keyboard move with Alt+Up and Alt+Down
- id: S3
  title: The handle beside its item
- id: S4
  title: Nesting, numbering and markers
- id: S5
  title: Lists in a quote, an alert or an admonition
- id: S6
  title: One edit, one undo
- id: S7
  title: Lists and states without a move
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/editModeStyles.ts
- src/page/features/editMode.ts
- src/page/features/listItemMove.ts
- src/page/features/mappedBlocks.ts
- src/page/features/pageInput.ts
- src/page/modules/listItemMove.ts
tested_in_files:
- test/core/preview/listItemHandleStyles.test.ts
- test/integration/listItemMoves.ts
- test/page/modules/listItemMove.test.ts
- test/page/runtimeListItemMove.test.ts
- test/session/listItemRange.test.ts
- test/visual/capture_list_item_handles.py
- test/visual/listItemHandleScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## List item handle reorders an item among its siblings in edit mode

### Normative behavior

When the writer drags the handle of a list item in edit mode onto another item of the same list, or presses Alt+Up or Alt+Down on that handle, the extension SHALL move that item, with its sub-items and blocks, to the new position among its sibling items as one source edit and keep the numbers of an ordered list in order.

### Scenario S1 (nominal): Dragging the handle of an item

| Input | Outcome |
| --- | --- |
| Edit mode on, a bullet list of three items, the handle of the first item dragged and dropped on the lower half of the third item | The item sits after the third; the document gets one text edit of the list's lines only, and the text outside the list is unchanged |
| The same drag dropped on the upper half of the third item | The item sits before the third |
| While the pointer is held over an item | The dragged item is dimmed and a line above or below the item under the pointer shows where the item would land, until the drop or the end of the drag |
| The pointer is held over the strip of the handles left of the list | The line shows on the nearest gap, as over the item at that height, and a drop there moves the item |
| Dropped on the lower half of the item before it, or on the upper half of the item after it | The item keeps its place: no line shows, nothing is requested from the host and the document is not edited |
| The pointer is held over another list, or outside the list and its handle strip | No line shows; a drop there requests nothing and the document is not edited |

### Scenario S2 (nominal): Keyboard move with Alt+Up and Alt+Down

| Input | Outcome |
| --- | --- |
| Focus on the handle of the first item, Alt+Down | The item swaps with the second as one edit, and after the render the focus is on the handle of the item at its new place |
| Alt+Up on the handle of the first item, or Alt+Down on that of the last | Nothing happens |
| Alt+Down repeated before the render of the previous move arrived | The repeat is ignored |

The chord on a handle is not also read as the move of the whole list block. In an open list item editor, the Cmd/Ctrl+Alt chord still moves the whole list (SwRS-MDOKFSTUDIO-BLOCK-130); for a list that is a direct block of an admonition or an alert, the list moves among the blocks of that admonition (SwRS-MDOKFSTUDIO-BLOCK-130).

### Scenario S3 (nominal): The handle beside its item

| Input | Outcome |
| --- | --- |
| Edit mode on, a list of two items or more | Each item shows the handle of the frontmatter list editor (named "Move list item") just left of its list, outside it, centred on the item's first line, with no hover needed |
| An item with sub-items, a nested list | The handle of the item stays on its first line; each item of the nested list has its own handle, left of the nested list |
| A list with less than a handle's width of room on its left (it fills the column in a narrow pane), or the alert or admonition that holds it | That block is pushed right by a handle's width, so every handle stays in the pane |
| The page is resized, or rendered again | The handles are placed again on their items as laid out now, in the next frame, reading each box once per pass |
| Edit mode switched off | The handles are gone and a pushed block returns to its place |
| A click on a handle | No editor opens; the pointer over a handle outlines the item it moves |

### Scenario S4 (nominal): Nesting, numbering and markers

| Input | Outcome |
| --- | --- |
| An item with a nested list, a fenced code block or a blank line inside | The item moves whole, with its sub-items and blocks, and only among its sibling items; it is never dropped into another list nor changes its level |
| A tight list, or a loose list | A tight list stays tight; the blank lines between the items of a loose list stay in place |
| An ordered list starting at 3, or written with `)` | The numbers stay in order from the first number, and each item keeps its delimiter; a list whose items all carry the same number keeps it |
| A marker that grows from `9.` to `10.` | The continuation lines of the moved item are indented by one, so its nesting stays |
| Bullet items with `-`, `*` or `+`, and task items | Each item keeps its marker and its checkbox text |
| CRLF line endings, or no final line break | The line endings and the end of the source are kept |

### Scenario S5 (boundary): Lists in a quote, an alert or an admonition

| Input | Outcome |
| --- | --- |
| A list in a quote, a GitHub alert, a MyST admonition or two nested admonitions | The handles sit left of the outermost box; a move saves only the list's lines, each with its quote prefix kept, blank quote lines included |
| A click on an item of a list in an alert or an admonition | The clicked item opens in its editor; a click on the title or the frame of the alert or admonition opens the whole container (SwRS-MDOKFSTUDIO-BLOCK-014) |

### Scenario S6 (boundary): One edit, one undo

- GIVEN an item moved by drag or by key
- WHEN the move is saved
- THEN the page posts one `previewEditOpen`, then one final `previewEditSave` of the list's lines, opens no editor, and the editor's undo restores the previous order in one step

### Scenario S7 (refusal): Lists and states without a move

| Input | Outcome |
| --- | --- |
| A list of one item, a list of an included file, a list in the properties table | No handle is shown |
| A drag or Alt+Up or Alt+Down while a block editor or the frontmatter editor is open, or while a move waits for its render | The drag is cancelled or the key is ignored and nothing is requested |
| The host answers the request for the list source with an error, or no answer arrives within 5 seconds | No edit is saved and the page tells the host the move is closed |
| The source does not read as the rendered items (another count, text before the first item, a line with less indentation, mixed quote prefixes) | No edit is saved and the page tells the host the move is closed |

### Related requirements

- SwRS-MDOKFSTUDIO-BLOCK-014: a click on a list item edits that item, also in an alert or an admonition, whose title or frame edits the whole container.
- SwRS-MDOKFSTUDIO-BLOCK-130: the move chord of a block editor's text box, which in a list item editor moves the whole list, inside its admonition when it has one.
- SwRS-MDOKFSTUDIO-TABLE-002: the row handles of a table, which these handles follow.

### Verification notes

- Method: test/page/modules/listItemMove.test.ts (the move on the source: bullet markers, task items, nested content, tight and loose lists, trailing blank lines, numbering and delimiters, the `9.` to `10.` content column read back by the renderer, quote prefixes, CRLF, refusals).
- Method: test/session/listItemRange.test.ts (with the real renderer, the items of a list in a quote, an alert, an admonition and two nested admonitions carry their source lines, and the list range covers only the list's lines).
- Method: test/page/runtimeListItemMove.test.ts (placement and push, nested lists, no handle on one-item, included and properties lists, containers, drag with one open and one final save, alert prefixes, drops in place, outside or over another list, a drop over a nested item of a sibling, Alt+Up and Alt+Down with the ends, a repeat and the focus after the render, refused, unreadable and lost sources, busy states, a click and the hover, one box read per pass in the next frame).
- Method: test/core/preview/listItemHandleStyles.test.ts (the shipped rules are scoped to edit mode, place the layer and the handles, push without a max-content width and draw the dragged item and the drop lines with the theme focus colour).
- Method: test/integration/listItemMoves.ts (real VS Code window: a real drag of an ordered item renumbers the list and one undo restores it, an item with a sub-list, an item of an alert, a drag over another list, Alt+Down on a focused handle and the whole-list chord of an item editor).
- Method: visual scenarios block-editing/v36 to v38 (handles in light, dark and cream at 900 px), v39 (360 px pane: pushed blocks) and v40 to v41 (a real mouse drag held down: dimmed item, drop line, one save, no editor).
- Criteria: the saved text equals the list's source with the items reordered and renumbered; the number of `previewEditSave` messages is one; each handle rectangle lies left of its list or outermost container, inside the pane and centred on the item's first line within 2 px.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-014](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-014.md): A writer reorders blocks with arrows, keys and selections
<!-- okf:links:end -->
