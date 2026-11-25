---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-033
uuid: 4bc2e7d0-e4c3-405c-8863-a043aefcb745
title: The status line shows the lines and keys, with Done and Cancel beside it
description: "When a writer opens a block editor, the page SHALL insert the editor
  frame in place of the block at once, expose it as a region named \"Raw Markdown
  editor\" around a text box named \"Raw Markdown block\" that switches off spell
  check and auto-correction, grows with its text and is drawn in monospace inside
  a one pixel border in the focus colour, hide the rendered block it replaces, and,
  when the host sends the block's source, fill the frame with the text box, a status
  line that shows the line range and the keys of the editor, and a primary Done button
  beside a Cancel button."
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-003
depends_on: []
scenarios:
- id: S1
  title: Frame at once, filled when the source arrives
- id: S2
  title: Line range in the status line
- id: S3
  title: Keys of the editor in the status line
- id: S4
  title: Done and Cancel buttons
- id: S5
  title: Pressing Done or Cancel keeps the focus in the text box
- id: S6
  title: A click inside the frame stays inside it
- id: S7
  title: Block editor names
- id: S8
  title: Cell that cannot be parsed
- id: S9
  title: Text box attributes
- id: S10
  title: The rendered block is hidden while its editor is open
- id: S11
  title: The frame is a one pixel accent frame with monospace text
- id: S12
  title: The text box grows with its text
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/editModeStyles.ts
- src/page/features/blockEditor.ts
- src/page/features/blockSourceEditor.ts
tested_in_files:
- test/page/blockReq.requirements.test.ts
- test/page/runtimeBlockEditor.test.ts
- test/page/runtimeBlockMoves.test.ts
- test/page/runtimeCardOptionEnter.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-BLOCK-029
---

## The status line shows the lines and keys, with Done and Cancel beside it

### Normative behavior

When a writer opens a block editor, the page SHALL insert the editor frame in place of the block at once, expose it as a region named "Raw Markdown editor" around a text box named "Raw Markdown block" that switches off spell check and auto-correction, grows with its text and is drawn in monospace inside a one pixel border in the focus colour, hide the rendered block it replaces, and, when the host sends the block's source, fill the frame with the text box, a status line that shows the line range and the keys of the editor, and a primary Done button beside a Cancel button.

### Scenario S1 (nominal): Frame at once, filled when the source arrives

- GIVEN a block editor just opened and previewEditSource not yet received
- WHEN the frame is inspected
- THEN the frame is in the page after the hidden block and holds no text box
- GIVEN the source message of the open editor
- WHEN it is received
- THEN the frame holds the text box, the status line and the buttons

### Scenario S2 (nominal): Line range in the status line

| Input | Outcome |
| --- | --- |
| Editor on lines 5 to 7, source arrived | The status line starts with "Lines 5–7" |
| Editor on a one-line block at line 5 | The status line starts with "Line 5" |
| Editor opened from an insert point | The status line starts with "New block" |

The text before the first separator dot is exactly one of the three forms.

### Scenario S3 (nominal): Keys of the editor in the status line

| Platform | The status line ends with |
| --- | --- |
| macOS | "Esc: cancel · ⌘↩: done" |
| Windows or Linux | "Esc: cancel · Ctrl+Enter: done" |

The keys before the done key read "Enter: new line · Tab: indent · Esc: cancel". In an editor opened on a one-line card part (a card title, `:header:` or `:footer:` line, SwRS-MDOKFSTUDIO-BLOCK-258), where Enter is done, they read "Enter: done · Esc: cancel": the whole hint is "Line 18 · Enter: done · Esc: cancel · ⌘↩: done" on macOS and ends with "Ctrl+Enter: done" on Windows or Linux.

### Scenario S4 (nominal): Done and Cancel buttons

- GIVEN an open block editor
- WHEN the frame is inspected
- THEN it holds Done first, labelled "Done editing", and Cancel second, labelled "Cancel editing and restore the original text" with the tooltip "Cancel (Esc)"; Done is styled as the primary button
- GIVEN the same frame
- WHEN the buttons are listed
- THEN no button named Save Markdown block or Cancel Markdown edit exists

### Scenario S5 (boundary): Pressing Done or Cancel keeps the focus in the text box

| Input | Outcome |
| --- | --- |
| Mouse button pressed on Done, with typed text in the editor | The mousedown default is prevented, the text box keeps the focus and no blur save is posted before the click |
| Mouse button pressed on Cancel, same editor | The same applies |

### Scenario S6 (boundary): A click inside the frame stays inside it

| Input | Outcome |
| --- | --- |
| Click in the text box, the status line or between the buttons | The document click listeners do not run, so no other editor opens and the block selection is not touched |
| Click on another block while the editor is open | The document listeners run as usual |

### Scenario S7 (nominal): Block editor names

- GIVEN edit mode on
- WHEN a block editor opens on a paragraph
- THEN the frame has role region and the aria-label Raw Markdown editor, and the text box has the aria-label Raw Markdown block

### Scenario S8 (boundary): Cell that cannot be parsed

- GIVEN the editor of a table cell whose source cannot be parsed as a pipe table
- WHEN it opens
- THEN the frame falls back to the raw names above, as specified by SwRS-MDOKFSTUDIO-TABLE-001; an ordinary cell editor is named "Markdown table cell editor" by the table editing behaviour

### Scenario S9 (nominal): Text box attributes

| Text box of | Attributes set |
| --- | --- |
| a block editor receiving its source | spellcheck is false and autocorrect, autocapitalize and autocomplete are off |
| an insertion editor | the same four attributes |

### Scenario S10 (nominal): The rendered block is hidden while its editor is open

| Editor | Rendered block |
| --- | --- |
| a paragraph in edit mode, its editor opens | the paragraph carries data-sphinx-preview-editing true and is not displayed, with the frame right after it |
| the open editor closes | the attribute is removed and the paragraph is displayed again; a diagram block follows the same rule, see SwRS-MDOKFSTUDIO-DIAG-001 |

### Scenario S11 (nominal): The frame is a one pixel accent frame with monospace text

| Pane | Measured frame |
| --- | --- |
| a paragraph editor open in the dark theme at 900 px | the border is 1 px, the font is monospace one pixel smaller than the editor font size and the tab size is 4 |
| the same editor at 460 px | the same border, font and tab size apply and the frame stays inside the column |

### Scenario S12 (nominal): The text box grows with its text

- GIVEN an open editor, one row high at creation
- WHEN the writer types more lines, or the preview layout changes, for example a width change
- THEN the height follows scrollHeight after every input and the height is computed again after a layout change, with no inner scrollbar

### Related requirements

- SwRS-MDOKFSTUDIO-TABLE-001: the editor of a pipe table cell and its fallback to the raw names
- SwRS-MDOKFSTUDIO-DIAG-001: a diagram block hidden while it is edited
- SwRS-MDOKFSTUDIO-BLOCK-014: the click or Enter that opens the editor
- SwRS-MDOKFSTUDIO-BLOCK-033: the content of the status line and the Done and Cancel buttons

### Verification notes

- Method: test/page/runtimeBlockEditor.test.ts (`an opened block editor shows its line range, Done and Cancel on one row`: line range, key hints for one platform only, both buttons; `Done posts a final save and both buttons keep the textarea focused on press`: focus on press); visual scenario block-editing/v04 (buttons).
- Method: test/page/runtimeCardOptionEnter.test.ts (`card one-line part: the status hint says Enter is done and drops Tab`: the one-line card hint on both platforms; `a one-line paragraph … keeps Enter as a new line and its hint`: the usual hint on a one-line block).
- Method: test/page/runtimeBlockMoves.test.ts (`T28: an empty source reply opens an empty textarea with a placeholder; Done saves the insertion`: the New block text).
- Method: test/page/blockReq.requirements.test.ts (`the editor frame appears at once, empty, and is filled when the source arrives`: frame at once and filled; `a click inside the editor frame does not reach the document listeners`: click in the frame).
- Method: test/page/blockReq.requirements.test.ts (`the editor frame is a region named Raw Markdown editor and its text box is named Raw Markdown block`: block editor names). The region name is also read by a recorded operation in test/page/runtimeContentPatch.test.ts and by the locators of the visual checks (test/visual/capture_layout_checks.py). The cell that cannot be parsed is not asserted here.
- Method: test/page/runtimeBlockEditor.test.ts (`active Markdown editors leave repeated spaces and Enter to native text input`: autocorrect, autocapitalize and autocomplete of the text box attributes, spellcheck false is asserted nowhere; `fenced Markdown editors sit outside the rendered pre and preserve source when saving`: the data-sphinx-preview-editing attribute; `an opened block editor shows its line range, Done and Cancel on one row` and `the status line shares one row with the Done and Cancel buttons`: 900 px row; `block textareas resize on input and preview layout changes`: the text box grows). The CSS rule [data-sphinx-preview-editing="true"] with display none is in src/core/preview/styles/editModeStyles.ts.
- Method: visual scenarios block-editing/v01 and v02 (text box attributes), block-editing/v04, v06, v07 and v08 (frame, border, font and tab size; v06 and v07 also the status row and the 75 percent ratio, with a lock text shared with v08; v07 at 460 px, buttons wrap), in test/visual/scenarioDefinitions1.ts and test/visual/scenarioIds.ts.
- Criteria: The text before the first separator dot is exactly one of the three forms; the hint equals the string built by blockEditHint for the platform; two buttons with the quoted labels, the primary style coming from the first-child rule of the stylesheet; the mousedown event of both buttons is default-prevented; openBlockEditor appends the status line to the frame at once, for a block and for a table cell; the frame has a click listener that stops propagation.
- Criteria: The two aria-label strings are exactly the ones above; the four attributes are present on every block text box; the attribute is set on open and removed on close, and the stylesheet hides marked elements; border width 1 px, font family monospace, tab-size 4 on the text box; the action row is a wrapping flex container with the buttons at the end and no overlap; the stylesheet sets font-size 0.75em on the status line; textarea.rows is 1 at creation and height equals scrollHeight after each input or layout change.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-003](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-003.md): A writer edits the raw Markdown of a block in a framed editor
- Supersedes:
  - [SwRS-MDOKFSTUDIO-BLOCK-029](SwRS-MDOKFSTUDIO-BLOCK-029.md): The block editor is a labelled one-pixel frame that hides its rendered block
<!-- okf:links:end -->
