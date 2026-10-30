---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-123
uuid: 5368e942-4109-47d0-bc1c-dbe012d8d378
title: Checkbox toggles a task list box on the touched lines
description: When the writer presses Checkbox, the extension SHALL add [ ] after
  the list marker of the touched lines, or - [ ] to lines that have no marker,
  and remove the box from every line when all of them have one, keeping the list
  item.
project: markdown-okf-schema-studio
scope: palette-slash
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/blockEditActions.ts
tested_in_files:
- test/page/modules/editActions.test.ts
default_owner_email: gaetan@xeberon.net
---

## Checkbox toggles a task list box on the touched lines

### Normative behavior

When the writer presses Checkbox, the extension SHALL add [ ] after the list marker of the touched lines, or - [ ] to lines that have no marker, and remove the box from every line when all of them have one, keeping the list item.

### Scenario (nominal): Add

- GIVEN a plain line and a list item
- WHEN Checkbox is pressed on each
- THEN the plain line gets - [ ] and the item gets [ ] after its marker, with the caret kept on its text

### Scenario (nominal): Remove

- GIVEN lines that all have a checked or unchecked box
- WHEN Checkbox is pressed
- THEN all boxes are removed and the list items stay

### Scenario (boundary): Several lines, empty line and undo

| Input | Outcome |
| --- | --- |
| Several touched lines, all with a box | All boxes lose it (one action for the lines) |
| Several touched lines, not all with a box | All lines get one |
| An empty line | The box is inserted with the caret after it |
| A list item, Checkbox pressed twice | The text is back as before (its own inverse) |
| Checkbox pressed in the text box | The text box is edited as one undo step |

### Verification notes

- Method: test/page/modules/editActions.test.ts (T25: checkbox puts - [ ] on a plain line and [ ] after the marker of a list item; checkbox toggles a checkbox line off, checked or not, and leaves the list item; checkbox keeps the caret on its text; checkbox on several lines is one action: all checkboxes lose it, else all lines get one; checkbox on an empty line inserts the box with the caret after it; checkbox is its own inverse on a list item; scenarios add, remove, several lines)
- Method: test/page/runtimeEditPalette.test.ts (T25: Checkbox and HTML table edit the text box as one undo step each; scenario several lines, undo row)
- Criteria: The clickable rendering of the box belongs to the GFM requirements.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-001](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-001.md): A writer formats and inserts Markdown, GFM and MyST constructs from the palette
<!-- okf:links:end -->
