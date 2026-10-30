---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-052
uuid: 0d5a4cee-85bc-4453-9b42-4999a8b94e13
title: Bulleted list toggles a dash prefix, from the slash menu only
description: When the writer runs Bulleted list, the extension SHALL put - and a
  space in front of every touched non-blank line, replacing a numbered marker,
  and remove the markers when every non-blank touched line already has one, and
  offer it only as a slash menu entry in every mode and block scope, without a
  palette button and without a shortcut.
project: markdown-okf-schema-studio
scope: palette-slash
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-001
- StRS-MDOKFSTUDIO-PALETTE-015
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/palette/paletteActions.ts
- src/page/modules/blockEditActions.ts
tested_in_files:
- test/page/modules/editActions.test.ts
- test/page/modules/slashMenu.test.ts
default_owner_email: gaetan@xeberon.net
---

## Bulleted list toggles a dash prefix, from the slash menu only

### Normative behavior

When the writer runs Bulleted list, the extension SHALL put - and a space in front of every touched non-blank line, replacing a numbered marker, and remove the markers when every non-blank touched line already has one, and offer it only as a slash menu entry in every mode and block scope, without a palette button and without a shortcut.

### Scenario (nominal): Several lines

- GIVEN the selection of a, b and c on three lines
- WHEN Bulleted list runs
- THEN each line starts with a dash and a space

### Scenario (nominal): Toggle off

- GIVEN three lines that all start with a dash and a space
- WHEN Bulleted list runs again
- THEN the markers are removed; on an empty single line the marker is inserted with the caret after it

### Scenario (nominal): Slash menu entries

- GIVEN a block editor in the strict mode
- WHEN the writer types / and lists the commands
- THEN Bulleted list and Numbered list are in the list

- GIVEN a block editor in the strict, gfm or myst mode
- WHEN the writer types /bullet and presses Enter
- THEN the text gets the prefix `- ` on a new line after the line Intro, as one edit

### Scenario (refusal): No palette button

- GIVEN the same editor
- WHEN the buttons of the palette are listed
- THEN neither Bulleted list nor Numbered list appears as a button, they have no shortcut, and a table cell menu does not list them

### Scenario (boundary): Lines and markers

In this table `[ ]` marks the selection and `|` marks the caret; the input is given as the text and its selection range.

| Input | Outcome |
| --- | --- |
| empty text, caret at 0 | `- ` with the caret after it |
| `a`, blank line, caret on the last empty line | `a`, blank line, `- ` with the caret after it |
| `item` with the caret in it | `- item` |
| `one`, blank line, `two` all selected | `- one`, blank line, `- two` (blank lines stay blank) |
| `- one` newline `- two` all selected | `one` newline `two` (toggled off) |
| `1. one` newline `2. two` all selected | `- one` newline `- two` (a numbered marker is replaced) |
| `- one` newline `two` all selected | `- one` newline `- two` (a mixed selection adds) |
| a marker written with `*` or `+` | counts as present |

### Related requirements

- SwRS-MDOKFSTUDIO-PALETTE-053: Numbered list, the second slash menu only entry.

### Verification notes

- Method: test/page/modules/editActions.test.ts (P11: the list actions are menu-only, block-scope and in every mode; P11: Bulleted list on an empty line, a text line, several lines, and toggled off)
- Method: test/page/modules/slashMenu.test.ts (P11 r2: choosing the list entries writes the list prefix as one edit)
- Method: test/page/modules/editActions.test.ts (marker holder of editActions.test.ts for this requirement)
- Criteria: Both actions carry the slash flag menuOnly, the scope block and the mode strict; a marker of the other kind (1. ) is replaced; a marker written with * or + counts as present.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-001](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-001.md): A writer formats and inserts Markdown, GFM and MyST constructs from the palette
  - [StRS-MDOKFSTUDIO-PALETTE-015](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-015.md): A writer runs any palette command from an accessible slash menu
<!-- okf:links:end -->
