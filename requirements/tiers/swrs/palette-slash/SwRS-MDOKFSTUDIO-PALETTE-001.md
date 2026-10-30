---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-001
uuid: fa6fbf0b-0e26-4ecd-808c-e951999d9a8b
title: The palette mode decides the button sets, in registry order
description: When the extension builds the edition palette of a block editor,
  the extension SHALL start it with a select named Palette buttons that offers
  Strict Markdown, GitHub (GFM), MyST and Full and shows the current mode, and
  list below it the buttons of that mode in the order of the registry, marking
  the start of each group.
project: markdown-okf-schema-studio
scope: palette-slash
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-001
- StRS-MDOKFSTUDIO-PALETTE-002
depends_on:
- SwRS-MDOKFSTUDIO-LIFE-169
- SwRS-MDOKFSTUDIO-LIFE-170
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/configuration/settingsRegistry.ts
- src/core/palette/paletteActions.ts
- src/page/features/blockSourceEditor.ts
- src/page/features/tableCellEditor.ts
- src/page/modules/editPalette.ts
tested_in_files:
- test/core/configuration/editingConfiguration.test.ts
- test/core/palette/paletteActions.test.ts
- test/page/modules/editPalette.test.ts
- test/page/modules/paletteReq.requirements.test.ts
- test/page/runtimeEditPalette.test.ts
- test/page/runtimePaletteActions.test.ts
- test/security/package-contract.test.ts
default_owner_email: gaetan@xeberon.net
---

## The palette mode decides the button sets, in registry order

### Normative behavior

When the extension builds the edition palette of a block editor, the extension SHALL start it with a select named Palette buttons that offers Strict Markdown, GitHub (GFM), MyST and Full and shows the current mode, and list below it the buttons of that mode in the order of the registry, marking the start of each group.

### Scenario (nominal): Select in the palette

- GIVEN an open block editor in the GFM mode
- WHEN the palette is inspected
- THEN its first control is a select with the accessible name Palette buttons and four options with the values strict, gfm, myst and full labelled Strict Markdown, GitHub (GFM), MyST and Full, and the option gfm is selected

### Scenario (nominal): Each mode adds its buttons to those of the mode before

- GIVEN an open paragraph editor in the strict, gfm, myst or full mode
- WHEN the palette is inspected
- THEN the buttons are those of the row of the mode, in registry order, the select reads the mode and the palette carries data-palette-mode with the mode name

| Mode | Buttons shown | Not in the palette |
| --- | --- | --- |
| strict | Heading, Bold, Italic, Strikethrough, Colour, Colour code, Link, Image, Code block, Blockquote, Horizontal rule, Table, Emoji, TODO and Thread; Colour code is hidden until the caret is in a colour code; the two list actions of the slash menu have no button | no GitHub or MyST button: Alert, Checkbox, HTML table, Admonition and Figure |
| gfm | the strict buttons, followed by the eight GitHub buttons Alert, Checkbox, HTML table, Collapsible, Footnote, Mermaid, Column alignment and Key | Admonition, Math and Figure |
| myst | the GitHub buttons, followed by the MyST buttons Admonition, Definition list, Math, Subscript, Superscript, Label, Reference, Document link, Citation, Dropdown, Table with caption, List table, Pipe table, Figure and Key (MyST); List table and Pipe table are hidden unless the caret is in a table of the matching form | none; both Key (the HTML kbd element) and Key (MyST) (the kbd role) are present, because the modes add up |
| full | the MyST buttons, followed by the Full buttons Vega-Lite chart and Vega chart (see SwRS-MDOKFSTUDIO-PALETTE-265) | nothing of the other modes is missing |

### Scenario (nominal): Order and groups

- GIVEN the MyST mode
- WHEN the buttons are listed
- THEN they follow the registry order from Heading to Key (MyST), and the first button of each group other than the first carries data-edit-group-start (the groups are inline, block, insert, annotation, github, myst and full)

### Scenario (nominal): The editor opened from an insert point

- GIVEN the GFM mode and an editor opened from an insert point
- WHEN the palette is inspected
- THEN its buttons equal those of a paragraph editor in the GFM mode and it carries data-palette-mode gfm, and in the strict and the MyST modes the two palettes list the same buttons as well

### Scenario (nominal): Choosing another mode

- GIVEN an editor in the strict mode with some text typed
- WHEN the writer chooses MyST in the select
- THEN the buttons are rebuilt at once, the MyST buttons are shown, the select reads MyST, the text and the focus stay in the text box and no save is posted (the choice is stored for the workspace, see SwRS-MDOKFSTUDIO-LIFE-169)

### Scenario (refusal): Same mode again or a value outside the three modes

- GIVEN a palette in the GFM mode
- WHEN the select fires a change
- THEN the outcome is the one of the table

| Select change | Outcome |
| --- | --- |
| to gfm again | nothing is rebuilt and no change is reported |
| to an unknown value | the select shows gfm again and no mode change is reported |
| to strict | the change is applied and reported once |

### Scenario (boundary): The setting defaultPaletteMode

- GIVEN the setting markdownOkfSchemaStudio.editing.defaultPaletteMode
- WHEN the editing configuration is read
- THEN defaultPaletteMode is the value of the table (the start of a page follows SwRS-MDOKFSTUDIO-LIFE-170)

| Setting | defaultPaletteMode |
| --- | --- |
| strict, gfm, myst or full (myst for example) | the value |
| not set | gfm |
| the text html or a number | gfm |

### Scenario (nominal): The cell formatting group follows the mode

- GIVEN an open table cell editor (the group is specified in SwRS-MDOKFSTUDIO-TABLE-085)
- WHEN the cell formatting group is inspected
- THEN the group holds no mode select, and its buttons are those of the table

| Mode | Cell formatting group |
| --- | --- |
| gfm | Bold, Italic, Strikethrough, Colour, Colour code, Link, Emoji and Key, and no Subscript or Superscript |
| myst | also Subscript, Superscript and Key (MyST) |

### Verification notes

- Method: test/page/modules/editPalette.test.ts (select in the palette, each mode adds its buttons, choosing another mode, order); test/page/runtimeEditPalette.test.ts (each mode adds its buttons, the editor opened from an insert point, a mode change does not save the block and the next editor opens in the new mode, order of all 38 buttons); test/page/runtimePaletteActions.test.ts (strict mode shows no GitHub buttons, the MyST buttons show in MyST mode only, the cell bar keeps the table operations and adds the inline group); test/page/modules/paletteReq.requirements.test.ts (a select value outside the three modes is put back); test/core/configuration/editingConfiguration.test.ts (the setting, an unknown or non-string value); test/core/palette/paletteActions.test.ts (the registry lists every palette action once, in display order); visual scenarios palette-slash/v05-mode-strict-light-900, palette-slash/v06-mode-strict-dark-900, palette-slash/v07-mode-gfm-light-900, palette-slash/v08-mode-gfm-dark-900, palette-slash/v09-mode-myst-light-900, palette-slash/v10-mode-myst-dark-900 (each mode, and the editor opened from an insert point)
- Method: the same-mode case is deduced from the code (the change handler returns when the value equals the mode), not tested; the mode follow-up of the cell group and the MyST additions are deduced from the code (cellPalette.setMode and the scopes of the registry), not asserted by a test; the absence of the select in a cell is covered by the cell group requirement of the table editing scope; the contributed setting in package.json lists the same three values and the default gfm
- Criteria: The select has the aria-label Palette buttons, the four options in the order strict, gfm, myst, full with the four labels, and its value equals the mode of the palette. The visible buttons equal the actions registered for the mode and the modes before it with the block scope, in registry order, and the palette root carries the mode. The button ids of the paragraph editor and of the editor opened from an insert point are equal for each mode. After a mode change the palette root carries the new data-palette-mode, the text box value and focus are unchanged and no previewEditSave was posted. After a foreign value the select value equals the mode of the palette and no onModeChange call happened. The normalizer returns the value when it is a palette mode and gfm otherwise; the setting changes the buttons and the slash menu only, never the rendering of the preview (see SwRS-MDOKFSTUDIO-CORE-001). The buttons of the cell group equal the registry actions with the cell scope and a mode rank at or below the current one; the palette of scope cell appends no select.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-001](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-001.md): A writer formats and inserts Markdown, GFM and MyST constructs from the palette
  - [StRS-MDOKFSTUDIO-PALETTE-002](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-002.md): A writer chooses which palette buttons are offered
- Depends on:
  - [SwRS-MDOKFSTUDIO-LIFE-169](../lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-169.md): A view choice made on the page is stored for the workspace
  - [SwRS-MDOKFSTUDIO-LIFE-170](../lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-170.md): A new page starts each view choice from the panel, stored or default value
<!-- okf:links:end -->
