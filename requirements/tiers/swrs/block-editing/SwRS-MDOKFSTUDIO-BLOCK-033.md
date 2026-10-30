---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-033
uuid: 4bc2e7d0-e4c3-405c-8863-a043aefcb745
title: The status line shows the lines and keys, with Done and Cancel beside it
description: When a writer opens a block editor, the page SHALL insert the
  editor frame in place of the block at once and, when the host sends the
  block's source, fill it with the text box, a status line that shows the line
  range and the keys of the editor, and a primary Done button beside a Cancel
  button.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-003
- StRS-MDOKFSTUDIO-BLOCK-006
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/blockEditor.ts
tested_in_files:
- test/page/blockReq.requirements.test.ts
- test/page/runtimeBlockEditor.test.ts
- test/page/runtimeBlockMoves.test.ts
default_owner_email: gaetan@xeberon.net
---

## The status line shows the lines and keys, with Done and Cancel beside it

### Normative behavior

When a writer opens a block editor, the page SHALL insert the editor frame in place of the block at once and, when the host sends the block's source, fill it with the text box, a status line that shows the line range and the keys of the editor, and a primary Done button beside a Cancel button.

### Scenario (nominal): Frame at once, filled when the source arrives
- GIVEN a block editor just opened and previewEditSource not yet received
- WHEN the frame is inspected
- THEN the frame is in the page after the hidden block and holds no text box
- GIVEN the source message of the open editor
- WHEN it is received
- THEN the frame holds the text box, the status line and the buttons

### Scenario (nominal): Line range in the status line
| Input | Outcome |
| --- | --- |
| Editor on lines 5 to 7, source arrived | The status line starts with "Lines 5–7" |
| Editor on a one-line block at line 5 | The status line starts with "Line 5" |
| Editor opened from an insert point | The status line starts with "New block" |

The text before the first separator dot is exactly one of the three forms.

### Scenario (nominal): Keys of the editor in the status line
| Platform | The status line ends with |
| --- | --- |
| macOS | "Esc: cancel · ⌘↩: done" |
| Windows or Linux | "Esc: cancel · Ctrl+Enter: done" |

The keys before the done key read "Enter: new line · Tab: indent · Esc: cancel".

### Scenario (nominal): Done and Cancel buttons
- GIVEN an open block editor
- WHEN the frame is inspected
- THEN it holds Done first, labelled "Done editing", and Cancel second, labelled "Cancel editing and restore the original text" with the tooltip "Cancel (Esc)"; Done is styled as the primary button
- GIVEN the same frame
- WHEN the buttons are listed
- THEN no button named Save Markdown block or Cancel Markdown edit exists

### Scenario (boundary): Pressing Done or Cancel keeps the focus in the text box
| Input | Outcome |
| --- | --- |
| Mouse button pressed on Done, with typed text in the editor | The mousedown default is prevented, the text box keeps the focus and no blur save is posted before the click |
| Mouse button pressed on Cancel, same editor | The same applies |

### Scenario (boundary): A click inside the frame stays inside it
| Input | Outcome |
| --- | --- |
| Click in the text box, the status line or between the buttons | The document click listeners do not run, so no other editor opens and the block selection is not touched |
| Click on another block while the editor is open | The document listeners run as usual |


### Verification notes
- Method: test/page/runtimeBlockEditor.test.ts (`an opened block editor shows its line range, Done and Cancel on one row`: line range, key hints for one platform only, both buttons; `Done posts a final save and both buttons keep the textarea focused on press`: focus on press); visual scenario block-editing/v04 (buttons).
- Method: test/page/runtimeBlockMoves.test.ts (`T28: an empty source reply opens an empty textarea with a placeholder; Done saves the insertion`: the New block text).
- Method: test/page/blockReq.requirements.test.ts (`the editor frame appears at once, empty, and is filled when the source arrives`: frame at once and filled; `a click inside the editor frame does not reach the document listeners`: click in the frame).
- Criteria: The text before the first separator dot is exactly one of the three forms; the hint equals the string built by blockEditHint for the platform; two buttons with the quoted labels, the primary style coming from the first-child rule of the stylesheet; the mousedown event of both buttons is default-prevented; openBlockEditor appends the status line to the frame at once, for a block and for a table cell; the frame has a click listener that stops propagation.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-003](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-003.md): A writer edits the raw Markdown of a block in a framed editor
  - [StRS-MDOKFSTUDIO-BLOCK-006](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-006.md): Typed text is saved, survives updates and is never lost on leaving
<!-- okf:links:end -->
