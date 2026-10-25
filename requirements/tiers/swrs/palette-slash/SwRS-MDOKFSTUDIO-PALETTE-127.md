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
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-001
depends_on:
- SwRS-MDOKFSTUDIO-PALETTE-031
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/palette/paletteActions.ts
- src/page/modules/blockEditActions.ts
tested_in_files:
- test/page/modules/editActions.test.ts
---

## Admonition wraps lines in a colon fence of a chosen type

### Normative behavior

When the writer presses Admonition and chooses a type from the menu of Note, Tip, Important, Warning, Caution, Danger, Attention, Error, Hint, See also and Custom…, the extension SHALL wrap the touched lines in a colon fence `:::{type}`, or with no selection insert an empty fence set apart by blank lines with the caret on the empty body line, and make no edit for a missing or unknown type.

### Scenario (nominal): The menu of eleven types

- GIVEN the MyST mode
- WHEN the writer presses Admonition
- THEN the menu lists the eleven entries Note, Tip, Important, Warning, Caution, Danger, Attention, Error, Hint, See also and Custom… in this order, with the option values note, tip, important, warning, caution, danger, attention, error, hint, seealso and custom

### Scenario (boundary): Other modes

- GIVEN the strict or GFM mode
- WHEN the buttons are listed
- THEN there is no Admonition button

### Scenario (nominal): A chosen type wraps the touched lines

| Given | Chosen | Outcome |
| --- | --- | --- |
| The lines one, two and three with the first two selected | warning | The first two lines are inside `:::{warning}` and `:::`, the body is selected and three is outside |
| A selection from the start of one to the start of two | note | Only the first line is wrapped |
| No selection | a type | An empty fence set apart by blank lines is inserted, with the caret on the empty body line |
| A selection with list item lines | a type | The list item lines stay together inside the fence |

### Scenario (nominal): The fence has one colon more than the longest fence inside

| Selection | Chosen | Outer fence |
| --- | --- | --- |
| A fence of three colons | hint | Four colons |
| A fence of four colons | hint | Five colons |
| No colon fence inside | any type | Three colons (at least three) |

Only lines that start with three or more colons count as fences.

### Scenario (refusal): Unknown or missing type

| Argument | Outcome |
| --- | --- |
| bogus | No edit is produced |
| No argument | No edit is produced |

Only the ten types and custom are accepted.

### Related requirements

- SwRS-MDOKFSTUDIO-PALETTE-130: the Custom entry writes a titled admonition with a class.
- SwRS-MDOKFSTUDIO-PALETTE-137: Dropdown writes a note admonition with the dropdown class.
- SwRS-MDOKFSTUDIO-PALETTE-031: palette popovers open in the frame, one at a time, and Escape or typing closes them.

### Verification notes

- Method: test/page/modules/editActions.test.ts, through test/page/modules/editActions.test.ts (unit tests "the MyST actions are myst-only with no shortcut; sub and sup also work in a cell": scenarios "The menu of eleven types" and "Other modes"; "admonition wraps the touched lines in a colon fence and selects the body", "admonition without a selection inserts an empty body with the caret in it", "a selection ending at a line start does not pull that line into the admonition", "admonition keeps list items together and ignores an unknown type", "admonition uses one more colon than the longest fence inside": the wrap, fence and refusal scenarios)
- Criteria: The option values are note, tip, important, warning, caution, danger, attention, error, hint, seealso and custom; list item lines of the selection stay together inside the fence; the colon count is the longest fence inside plus one and at least three; only the ten types and custom are accepted.
