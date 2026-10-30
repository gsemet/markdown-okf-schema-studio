---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-029
uuid: eebc4393-cadb-4339-8db3-d7e650098ad2
title: "The block editor is a labelled one-pixel frame that hides its rendered block"
description: "When a block editor is open, the page SHALL expose its frame as a region
  named \"Raw Markdown editor\" and its text box under the name \"Raw Markdown block\"\
  , draw the frame with a one pixel border in the focus colour around a monospace
  text box that switches off spell check and auto-correction and grows with its text,
  lay out the status line with the Done and Cancel buttons beneath, and hide the rendered
  block it replaces."
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-003
depends_on: []
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
- test/visual/scenarioDefinitions1.ts
default_owner_email: gaetan@xeberon.net
---

## The block editor is a labelled one-pixel frame that hides its rendered block

### Normative behavior

When a block editor is open, the page SHALL expose its frame as a region named "Raw Markdown editor" and its text box under the name "Raw Markdown block", draw the frame with a one pixel border in the focus colour around a monospace text box that switches off spell check and auto-correction and grows with its text, lay out the status line with the Done and Cancel buttons beneath, and hide the rendered block it replaces.

### Scenario (nominal): Block editor names

- GIVEN edit mode on
- WHEN a block editor opens on a paragraph
- THEN the frame has role region and the aria-label Raw Markdown editor, and the text box has the aria-label Raw Markdown block

### Scenario (boundary): Cell that cannot be parsed

- GIVEN the editor of a table cell whose source cannot be parsed as a pipe table
- WHEN it opens
- THEN the frame falls back to the raw names above, as specified by SwRS-MDOKFSTUDIO-TABLE-001; an ordinary cell editor is named "Markdown table cell editor" by the table editing behaviour

### Scenario (nominal): Text box attributes

| Text box of | Attributes set |
| --- | --- |
| a block editor receiving its source | spellcheck is false and autocorrect, autocapitalize and autocomplete are off |
| an insertion editor | the same four attributes |

### Scenario (nominal): The rendered block is hidden while its editor is open

| Editor | Rendered block |
| --- | --- |
| a paragraph in edit mode, its editor opens | the paragraph carries data-sphinx-preview-editing true and is not displayed, with the frame right after it |
| the open editor closes | the attribute is removed and the paragraph is displayed again; a diagram block follows the same rule, see SwRS-MDOKFSTUDIO-DIAG-001 |

### Scenario (nominal): The frame is a one pixel accent frame with monospace text

| Pane | Measured frame |
| --- | --- |
| a paragraph editor open in the dark theme at 900 px | the border is 1 px, the font is monospace one pixel smaller than the editor font size and the tab size is 4 |
| the same editor at 460 px | the same border, font and tab size apply and the frame stays inside the column |

### Scenario (nominal): The status line and the buttons

| Pane | Measured row |
| --- | --- |
| an editor in a 900 px pane | the status text, Done and Cancel share one row, the buttons sit at the right end of the row, vertically centred with the text, the status does not overlap the buttons, and no wrapping happens |
| an editor in a 460 px pane | the buttons wrap below the status line, nothing overlaps and nothing is clipped |
| any pane | the font size of the status line is 75 percent of the font size of its parent |

### Scenario (nominal): The text box grows with its text

- GIVEN an open editor, one row high at creation
- WHEN the writer types more lines, or the preview layout changes, for example a width change
- THEN the height follows scrollHeight after every input and the height is computed again after a layout change, with no inner scrollbar

### Related requirements

- SwRS-MDOKFSTUDIO-TABLE-001: the editor of a pipe table cell and its fallback to the raw names
- SwRS-MDOKFSTUDIO-DIAG-001: a diagram block hidden while it is edited
- SwRS-MDOKFSTUDIO-BLOCK-014: the click or Enter that opens the editor
- SwRS-MDOKFSTUDIO-BLOCK-033: the content of the status line and the Done and Cancel buttons

### Verification notes

- Method: test/page/blockReq.requirements.test.ts (`the editor frame is a region named Raw Markdown editor and its text box is named Raw Markdown block`: block editor names). The region name is also read by a recorded operation in test/page/runtimeContentPatch.test.ts and by the locators of the visual checks (test/visual/capture_layout_checks.py). The cell that cannot be parsed is not asserted here.
- Method: test/page/runtimeBlockEditor.test.ts (`active Markdown editors leave repeated spaces and Enter to native text input`: autocorrect, autocapitalize and autocomplete of the text box attributes, spellcheck false is asserted nowhere; `fenced Markdown editors sit outside the rendered pre and preserve source when saving`: the data-sphinx-preview-editing attribute; `an opened block editor shows its line range, Done and Cancel on one row` and `the status line shares one row with the Done and Cancel buttons`: 900 px row; `block textareas resize on input and preview layout changes`: the text box grows). The CSS rule [data-sphinx-preview-editing="true"] with display none is in src/core/preview/styles/editModeStyles.ts.
- Method: visual scenarios block-editing/v01 and v02 (text box attributes), block-editing/v04, v06, v07 and v08 (frame, border, font and tab size; v06 and v07 also the status row and the 75 percent ratio, with a lock text shared with v08; v07 at 460 px, buttons wrap), in test/visual/scenarioDefinitions1.ts and test/visual/scenarioIds.ts.
- Criteria: The two aria-label strings are exactly the ones above; the four attributes are present on every block text box; the attribute is set on open and removed on close, and the stylesheet hides marked elements; border width 1 px, font family monospace, tab-size 4 on the text box; the action row is a wrapping flex container with the buttons at the end and no overlap; the stylesheet sets font-size 0.75em on the status line; textarea.rows is 1 at creation and height equals scrollHeight after each input or layout change.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-003](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-003.md): A writer edits the raw Markdown of a block in a framed editor
<!-- okf:links:end -->
