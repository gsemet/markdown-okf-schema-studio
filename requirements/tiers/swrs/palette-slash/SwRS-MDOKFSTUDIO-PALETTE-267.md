---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-267
uuid: 02d59944-fcb7-44a2-bf9f-f4378514c71c
title: Option toggles a choice list marker on the touched lines
description: When the writer presses Option, the extension SHALL add ( ) after
  the list marker of the touched lines, or - ( ) to lines that have no marker,
  and remove the marker from every line when all of them have one, keeping the
  list item.
project: markdown-okf-schema-studio
scope: palette-slash
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/blockEditActions.ts
tested_in_files:
- test/page/modules/optionAction.test.ts
- test/page/runtimeEditPalette.test.ts
- test/visual/optionListScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## Option toggles a choice list marker on the touched lines

### Normative behavior

When the writer presses Option, the extension SHALL add ( ) after the list marker of the touched lines, or - ( ) to lines that have no marker, and remove the marker from every line when all of them have one, keeping the list item.

### Scenario (nominal): Add

- GIVEN a plain line and a list item (the GFM and MyST palettes show the Option button next to Checkbox)
- WHEN Option is pressed on each
- THEN the plain line gets - ( ) and the item gets ( ) after its marker, with the caret kept on its text

### Scenario (nominal): Remove

- GIVEN lines that all start with a choice marker ( ), (x) or (X) after their list marker
- WHEN Option is pressed
- THEN every marker is removed and the list items stay

### Scenario (boundary): Several lines, checkbox line, empty line and undo

| Input | Outcome |
| --- | --- |
| Several touched lines, all with a choice marker | All markers are removed (one action for the lines) |
| Several touched lines, not all with a choice marker | All lines get one |
| A line with a task box, as in - [ ] a | The box is replaced by the choice marker |
| An empty line | The marker is inserted with the caret after it |
| A list item, Option pressed twice | The text is back as before (its own inverse) |
| Option pressed in the text box | The text box is edited as one undo step |

### Verification notes

- Method: test/page/modules/optionAction.test.ts (option puts - ( ) on a plain line and ( ) after the marker of a list item; option removes the markers of option lines, selected or not; option keeps the caret on its text; option on several lines is one action; option replaces a task box; option on an empty line; option is its own inverse; the registry lists Option after Checkbox in the GFM and MyST palettes only)
- Method: test/page/runtimeEditPalette.test.ts (the GFM palette shows the Option button)
- Method: visual scenario palette-slash/v30-option-list-enter-cream-900 (the toolbar button turns a paragraph into an option list in the real page)
- Criteria: The choice list rendering belongs to the GFM requirements and the Enter continuation of an option item to SwRS-MDOKFSTUDIO-BLOCK-061.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-001](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-001.md): A writer formats and inserts Markdown, GFM and MyST constructs from the palette
<!-- okf:links:end -->
