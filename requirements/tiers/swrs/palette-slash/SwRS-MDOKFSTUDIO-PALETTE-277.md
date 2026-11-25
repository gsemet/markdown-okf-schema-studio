---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-277
uuid: 1ca47ad3-0e9a-41dc-879d-2e3355217d88
title: Line-prefix buttons toggle their prefix on the touched lines
description: When the writer presses Blockquote, Checkbox or Option, or runs
  Bulleted list or Numbered list from the slash menu, the extension SHALL put
  the prefix of that action in front of the touched lines, or remove it when
  every touched line already has it, in one undoable step.
project: markdown-okf-schema-studio
scope: palette-slash
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-019
- StRS-MDOKFSTUDIO-PALETTE-020
scenarios:
- id: S1
  title: Blockquote quotes a list and keeps blank lines
- id: S2
  title: Bulleted list and Numbered list from the slash menu
- id: S3
  title: No palette button for the list actions
- id: S4
  title: Checkbox toggles a task list box
- id: S5
  title: Option toggles a choice list marker
annotation_exemption: false
exemption_reason:
derived_by: []
supersedes:
- SwRS-MDOKFSTUDIO-PALETTE-049
- SwRS-MDOKFSTUDIO-PALETTE-052
- SwRS-MDOKFSTUDIO-PALETTE-053
- SwRS-MDOKFSTUDIO-PALETTE-123
- SwRS-MDOKFSTUDIO-PALETTE-267
implemented_in_files:
- src/core/palette/paletteActions.ts
- src/page/modules/blockEditActions.ts
tested_in_files:
- test/page/modules/editActions.test.ts
- test/page/modules/optionAction.test.ts
- test/page/modules/slashMenu.test.ts
- test/page/runtimeEditPalette.test.ts
- test/visual/optionListScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## Line-prefix buttons toggle their prefix on the touched lines

### Normative behavior

When the writer presses Blockquote, Checkbox or Option, or runs Bulleted list or Numbered list from the slash menu, the extension SHALL put the prefix of that action in front of the touched lines (`> `, a task box `[ ]`, a choice marker `( )`, `- ` or `1. `, `2. `), or remove it when every touched non-blank line already has it, keeping the list items, and leave a blank line blank. Bulleted list and Numbered list exist only as slash menu entries, in every mode and block scope, with no palette button and no shortcut.

In the tables of this requirement, `[ ]` marks the selection and `|` marks the caret.

### Scenario S1 (nominal): Blockquote quotes a list and keeps blank lines

- GIVEN the selection of two list lines - a and - b
- WHEN Blockquote is pressed
- THEN both lines start with > before the list marker

- GIVEN a selection of a, a blank line and b
- WHEN Blockquote is pressed
- THEN the lines a and b get > and the blank line gets a bare >; a single blank line gets > followed by a space

| Input | Outcome |
| --- | --- |
| `a\|bc` | `> a\|bc` |
| `> a\|bc` | `a\|bc` |
| `>> a\|` | `> a\|` (one level removed) |
| `[- a` newline `- b]` | `[> - a` newline `> - b]` |
| `[> - a` newline `> - b]` | `[- a` newline `- b]` |
| `[1. a` newline `   2. b]` | `[> 1. a` newline `>    2. b]` |
| `x` newline `[a` newline `b]` newline `y` | only the touched lines a and b get `> ` |
| `[a` newline `> b]` (one line already quoted) | `[> a` newline `> > b]` |
| `\|` | `> \|` |
| `> \|` | `\|` |
| `[a` newline `]b` (selection ending at a line start) | `[> a` newline `]b` (the line b is not touched) |

### Scenario S2 (nominal): Bulleted list and Numbered list from the slash menu

- GIVEN the selection of a, b and c on three lines
- WHEN Bulleted list runs
- THEN each line starts with a dash and a space; when it runs again the markers are removed, and on an empty single line the marker is inserted with the caret after it

- GIVEN the selection of a, a blank line and b
- WHEN Numbered list runs
- THEN the lines read 1. a and 2. b and the blank line is unchanged; when it runs again the markers are removed

- GIVEN a block editor in the strict mode
- WHEN the writer types / and lists the commands
- THEN Bulleted list and Numbered list are in the list

- GIVEN a block editor in the strict, gfm or myst mode
- WHEN the writer types /bullet and presses Enter
- THEN the text gets the prefix `- ` on a new line after the line Intro, as one edit

| Input | Outcome |
| --- | --- |
| Bulleted list: empty text, caret at 0 | `- ` with the caret after it |
| Bulleted list: `a`, blank line, caret on the last empty line | `a`, blank line, `- ` with the caret after it |
| Bulleted list: `item` with the caret in it | `- item` |
| Bulleted list: `one`, blank line, `two` all selected | `- one`, blank line, `- two` (blank lines stay blank) |
| Bulleted list: `- one` newline `- two` all selected | `one` newline `two` (toggled off) |
| Bulleted list: `1. one` newline `2. two` all selected | `- one` newline `- two` (a numbered marker is replaced) |
| Bulleted list: `- one` newline `two` all selected | `- one` newline `- two` (a mixed selection adds) |
| Bulleted list: a marker written with `*` or `+` | counts as present |
| Numbered list: empty text, caret at 0 | `1. ` with the caret after it |
| Numbered list: `a`, `b`, blank line, `c` all selected | `1. a`, `2. b`, blank line, `3. c` |
| Numbered list: `1. a` newline `2. b` all selected | `a` newline `b` |
| Numbered list: `- a` newline `- b` all selected | `1. a` newline `2. b` (a bullet marker is replaced) |
| Numbered list: `word` with the caret at its end | `1. word` |
| Numbered list: `/numbered` typed in the gfm mode, then Tab | the text gets the prefix `1. ` as one edit |

### Scenario S3 (refusal): No palette button for the list actions

- GIVEN the same editor
- WHEN the buttons of the palette are listed
- THEN neither Bulleted list nor Numbered list appears as a button, they have no shortcut, and a table cell menu does not list them

### Scenario S4 (nominal): Checkbox toggles a task list box

- GIVEN a plain line and a list item
- WHEN Checkbox is pressed on each
- THEN the plain line gets - [ ] and the item gets [ ] after its marker, with the caret kept on its text

- GIVEN lines that all have a checked or unchecked box
- WHEN Checkbox is pressed
- THEN all boxes are removed and the list items stay

| Input | Outcome |
| --- | --- |
| Several touched lines, all with a box | All boxes lose it (one action for the lines) |
| Several touched lines, not all with a box | All lines get one |
| An empty line | The box is inserted with the caret after it |
| A list item, Checkbox pressed twice | The text is back as before (its own inverse) |
| Checkbox pressed in the text box | The text box is edited as one undo step |

### Scenario S5 (nominal): Option toggles a choice list marker

- GIVEN a plain line and a list item (the GFM and MyST palettes show the Option button next to Checkbox)
- WHEN Option is pressed on each
- THEN the plain line gets - ( ) and the item gets ( ) after its marker, with the caret kept on its text

- GIVEN lines that all start with a choice marker ( ), (x) or (X) after their list marker
- WHEN Option is pressed
- THEN every marker is removed and the list items stay

| Input | Outcome |
| --- | --- |
| Several touched lines, all with a choice marker | All markers are removed (one action for the lines) |
| Several touched lines, not all with a choice marker | All lines get one |
| A line with a task box, as in - [ ] a | The box is replaced by the choice marker |
| An empty line | The marker is inserted with the caret after it |
| A list item, Option pressed twice | The text is back as before (its own inverse) |
| Option pressed in the text box | The text box is edited as one undo step |

### Related requirements

- The clickable rendering of a task box and the rendering of a choice list belong to the GFM requirements, and the Enter continuation of an option item to SwRS-MDOKFSTUDIO-BLOCK-061.

### Verification notes

- Method: test/page/modules/editActions.test.ts (data-driven rows named editActions quote; the list actions are menu-only, block-scope and in every mode; Bulleted list and Numbered list on an empty line, a text line, several lines, toggled off; checkbox: add, remove, caret, several lines, empty line, own inverse)
- Method: test/page/modules/slashMenu.test.ts (choosing the list entries writes the list prefix as one edit; the /numbered row)
- Method: test/page/modules/optionAction.test.ts (option puts - ( ) on a plain line and ( ) after the marker of a list item; removes the markers; keeps the caret; one action for several lines; replaces a task box; empty line; own inverse; the registry lists Option after Checkbox in the GFM and MyST palettes only)
- Method: test/page/runtimeEditPalette.test.ts (Checkbox edits the text box as one undo step; the GFM palette shows the Option button); visual scenario palette-slash/v30-option-list-enter-cream-900 (the toolbar button turns a paragraph into an option list in the real page)
- Criteria: Pressing Blockquote twice on a quoted selection restores the text and a selection ending at a line start does not touch that line; both list actions carry the slash flag menuOnly, the scope block and the mode strict, a marker of the other kind is replaced, a marker written with * or + counts as present, and the recognised numbered markers are digits (one to nine) followed by a dot or a parenthesis; Checkbox and Option are each their own inverse on a list item.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-019](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-019.md): A writer formats text with buttons and shortcuts
  - [StRS-MDOKFSTUDIO-PALETTE-020](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-020.md): A writer inserts GitHub Flavored Markdown constructs
- Supersedes:
  - [SwRS-MDOKFSTUDIO-PALETTE-049](SwRS-MDOKFSTUDIO-PALETTE-049.md): Blockquote prefixes the touched lines or removes one quote level
  - [SwRS-MDOKFSTUDIO-PALETTE-052](SwRS-MDOKFSTUDIO-PALETTE-052.md): Bulleted list toggles a dash prefix, from the slash menu only
  - [SwRS-MDOKFSTUDIO-PALETTE-053](SwRS-MDOKFSTUDIO-PALETTE-053.md): Numbered list numbers the touched non-blank lines
  - [SwRS-MDOKFSTUDIO-PALETTE-123](SwRS-MDOKFSTUDIO-PALETTE-123.md): Checkbox toggles a task list box on the touched lines
  - [SwRS-MDOKFSTUDIO-PALETTE-267](SwRS-MDOKFSTUDIO-PALETTE-267.md): Option toggles a choice list marker on the touched lines
<!-- okf:links:end -->
