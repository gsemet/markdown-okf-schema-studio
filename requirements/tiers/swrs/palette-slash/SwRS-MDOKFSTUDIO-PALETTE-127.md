---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-127
uuid: e014bb68-5c90-4609-8605-0a8b34568d1a
title: Admonition wraps lines in a colon fence of a chosen type
description: When the writer presses Admonition and chooses a type from the menu
  of Note, Tip, Important, Warning, Caution, Danger, Attention, Error, Hint, See
  also and Custom…, the extension SHALL wrap the touched lines in a colon fence
  `:::{type}`, or with no selection insert an empty fence set apart by blank
  lines with the caret on the empty body line, and make no edit for a missing or
  unknown type.
project: markdown-okf-schema-studio
scope: palette-slash
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-021
depends_on:
- SwRS-MDOKFSTUDIO-PALETTE-031
scenarios:
- id: S1
  title: The menu of eleven types
- id: S2
  title: Other modes
- id: S3
  title: A chosen type wraps the touched lines
- id: S4
  title: The fence has one colon more than the longest fence inside
- id: S5
  title: Unknown or missing type
- id: S6
  title: Custom writes a titled admonition with a class
- id: S7
  title: Dropdown writes a note admonition with the dropdown class
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/palette/paletteActions.ts
- src/page/modules/blockEditActions.ts
tested_in_files:
- test/page/modules/editActions.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-PALETTE-130
- SwRS-MDOKFSTUDIO-PALETTE-137
---

## Admonition wraps lines in a colon fence of a chosen type

### Normative behavior

When the writer presses Admonition and chooses a type from the menu of Note, Tip, Important, Warning, Caution, Danger, Attention, Error, Hint, See also and Custom…, the extension SHALL wrap the touched lines in a colon fence `:::{type}`, or with no selection insert an empty fence set apart by blank lines with the caret on the empty body line, and make no edit for a missing or unknown type.

### Scenario S1 (nominal): The menu of eleven types

- GIVEN the MyST mode
- WHEN the writer presses Admonition
- THEN the menu lists the eleven entries Note, Tip, Important, Warning, Caution, Danger, Attention, Error, Hint, See also and Custom… in this order, with the option values note, tip, important, warning, caution, danger, attention, error, hint, seealso and custom

### Scenario S2 (boundary): Other modes

- GIVEN the strict or GFM mode
- WHEN the buttons are listed
- THEN there is no Admonition button

### Scenario S3 (nominal): A chosen type wraps the touched lines

| Given | Chosen | Outcome |
| --- | --- | --- |
| The lines one, two and three with the first two selected | warning | The first two lines are inside `:::{warning}` and `:::`, the body is selected and three is outside |
| A selection from the start of one to the start of two | note | Only the first line is wrapped |
| No selection | a type | An empty fence set apart by blank lines is inserted, with the caret on the empty body line |
| A selection with list item lines | a type | The list item lines stay together inside the fence |

### Scenario S4 (nominal): The fence has one colon more than the longest fence inside

| Selection | Chosen | Outer fence |
| --- | --- | --- |
| A fence of three colons | hint | Four colons |
| A fence of four colons | hint | Five colons |
| No colon fence inside | any type | Three colons (at least three) |

Only lines that start with three or more colons count as fences.

### Scenario S5 (refusal): Unknown or missing type

| Argument | Outcome |
| --- | --- |
| bogus | No edit is produced |
| No argument | No edit is produced |

Only the ten types and custom are accepted.

### Scenario S6 (nominal): Custom writes a titled admonition with a class

- GIVEN the selected text Body
- WHEN Custom is chosen
- THEN the text is `:::{admonition} Title` with the option `:class: note` and Body, and Title is selected

- GIVEN the caret after Intro
- WHEN Custom is chosen
- THEN a new titled fence follows Intro, set apart by a blank line, with Title selected

| Input | Outcome |
| --- | --- |
| Custom chosen | The option line `:class: note` is followed by a blank line |

### Scenario S7 (nominal): Dropdown writes a note admonition with the dropdown class

- GIVEN the caret after intro
- WHEN Dropdown is pressed
- THEN a note admonition with the title Title and the option `:class: dropdown` and the content Content follows intro after a blank line, with Title selected; with a selection the touched lines are wrapped instead of the sample

- GIVEN a selection that is a tip fence of three colons
- WHEN Dropdown is pressed
- THEN the outer fence has four colons, as in the scenario of the colon count

### Related requirements

- SwRS-MDOKFSTUDIO-PALETTE-031: palette popovers open in the frame, one at a time, and Escape or typing closes them.

### Verification notes

- Method: test/page/modules/editActions.test.ts, through test/page/modules/editActions.test.ts (unit tests "the MyST actions are myst-only with no shortcut; sub and sup also work in a cell": scenarios "The menu of eleven types" and "Other modes"; "admonition wraps the touched lines in a colon fence and selects the body", "admonition without a selection inserts an empty body with the caret in it", "a selection ending at a line start does not pull that line into the admonition", "admonition keeps list items together and ignores an unknown type", "admonition uses one more colon than the longest fence inside": the wrap, fence and refusal scenarios)
- Method: test/page/modules/editActions.test.ts (unit tests "custom admonition writes a titled block with a class and selects the title": Custom wrap, empty and option line; "dropdown inserts a note with :class: dropdown or wraps the touched lines": Dropdown sample and nested fence)
- Criteria: The option values are note, tip, important, warning, caution, danger, attention, error, hint, seealso and custom; list item lines of the selection stay together inside the fence; the colon count is the longest fence inside plus one and at least three; only the ten types and custom are accepted.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-021](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-021.md): A writer inserts MyST constructs
- Depends on:
  - [SwRS-MDOKFSTUDIO-PALETTE-031](SwRS-MDOKFSTUDIO-PALETTE-031.md): Palette popovers open in the frame, one at a time, and Escape or typing closes them
- Supersedes:
  - [SwRS-MDOKFSTUDIO-PALETTE-130](SwRS-MDOKFSTUDIO-PALETTE-130.md): Custom writes a titled admonition with a class
  - [SwRS-MDOKFSTUDIO-PALETTE-137](SwRS-MDOKFSTUDIO-PALETTE-137.md): Dropdown writes a note admonition with the dropdown class
<!-- okf:links:end -->
