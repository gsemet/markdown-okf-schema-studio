---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-111
uuid: f5c54cc5-7adc-4777-9af4-178b6520027e
title: Column alignment sets the colons of the caret's column
description: When the writer runs Column alignment with left, center or right,
  the extension SHALL rewrite only the cell of the delimiter row that belongs to
  the caret's column, with a colon on the left (left), on both sides (center) or
  on the right (right) of its dashes, keeping at least three dashes.
project: markdown-okf-schema-studio
scope: table-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TABLE-012
- StRS-MDOKFSTUDIO-PALETTE-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/palette/paletteActions.ts
- src/page/modules/tableEditActions.ts
tested_in_files:
- test/page/modules/editActions.test.ts
- test/page/modules/editPalette.test.ts
---

## Column alignment sets the colons of the caret's column

### Normative behavior

When the writer runs Column alignment with left, center or right, the extension SHALL rewrite only the cell of the delimiter row that belongs to the caret's column, with a colon on the left (left), on both sides (center) or on the right (right) of its dashes, keeping at least three dashes.

### Scenario (nominal): Centre a column
- GIVEN the caret in the second column of a pipe table whose delimiter cell is ---
- WHEN Column alignment center is run
- THEN only the second delimiter cell changes to :---: and the other lines are unchanged

### Scenario (boundary): Same alignment
- GIVEN a column already aligned left
- WHEN left is run again
- THEN no edit is produced

### Scenario (boundary): Width of the delimiter cell and replacing an alignment
| Delimiter cell and choice | Outcome |
| --- | --- |
| a longer cell "\|----------\|", left | "\|:---------\|" (a dash is given up, never below three dashes) |
| a padded cell of exactly three dashes "\| ---      \|", left | "\| :---     \|" (a trailing space is given up, keeping at least one) |
| a column aligned right, left | the marker becomes :--- with no leftover colon |

### Scenario (nominal): Caret in any row, with or without edge pipes
- GIVEN the caret in a body cell, and in another run in the delimiter row
- WHEN Column alignment is run
- THEN the column of the caret is aligned
- GIVEN a table written "a | b", the caret in the second column and right run
- WHEN Column alignment is run
- THEN the second delimiter cell becomes ---:

### Scenario (refusal): Outside a pipe table or without a valid choice
| Input | Outcome |
| --- | --- |
| the caret in a paragraph | no edit is produced |
| the caret in a table and the choice "justify" | no edit is produced |
| the caret in a table and no choice | no edit is produced |

### Scenario (nominal): The menu of Left, Center and Right
- GIVEN the caret in a pipe table
- WHEN the writer presses Column alignment and chooses Center
- THEN the menu lists Left, Center and Right (option values left, center and right) and the delimiter cell of the caret's column is rewritten as in the "Centre a column" scenario

### Scenario (boundary): Strict mode
- GIVEN the strict mode
- WHEN the buttons are listed
- THEN there is no Column alignment button

### Related requirements
- SwRS-MDOKFSTUDIO-TABLE-106: the palette modes in which Column alignment is offered.

### Verification notes
- Method: test/page/modules/editActions.test.ts (T26: columnAlign rewrites only the delimiter cell of the caret's column; keeps the width of a padded column and replaces an existing alignment; works from a body row, outside pipes and in tables without edge pipes; its last assertions cover the unknown choice "justify" and the missing choice; the caret in a paragraph gives an undefined edit).
- Method: test/page/modules/editPalette.test.ts (T26: Column alignment lists left, center and right; a choice rewrites the delimiter cell; strict mode has no button).
- Criteria: The edit range is the delimiter cell and the text is the new marker; a longer delimiter cell keeps its dashes, minus the room taken by the colons, with at least three left; the delimiter line length is unchanged when a dash or a trailing space can give way; the changed delimiter cell index; an undefined edit for every refusal.
