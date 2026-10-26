---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-102
uuid: 24211349-a556-47b9-8dde-6fe33b637cf7
title: Edge pipes are optional and only an escaped pipe stays in its cell
description: When a table row is split into cells for editing, the extension
  SHALL accept rows with or without leading and trailing pipes, keep a pipe that
  is escaped with a backslash within its cell, and split a cell at every other
  pipe, also one inside a code span, as the preview does.
project: markdown-okf-schema-studio
scope: table-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TABLE-011
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/markdownTable.ts
tested_in_files:
- test/page/modules/markdownTable.test.ts
---

## Edge pipes are optional and only an escaped pipe stays in its cell

### Normative behavior

When a table row is split into cells for editing, the extension SHALL accept rows with or without leading and trailing pipes, keep a pipe that is escaped with a backslash within its cell, and split a cell at every other pipe, also one inside a code span, as the preview does.

### Scenario (nominal): Rows without outer pipes
- GIVEN the rows "a | b", "| a | b" and "a | b |"
- WHEN each is split
- THEN each gives the cells a and b

### Scenario (boundary): Trailing pipe after a backslash
- GIVEN a row ending with \|
- WHEN it is split
- THEN the final pipe belongs to the last cell when the backslashes before it are odd in number

### Scenario (nominal): Escaped pipe
- GIVEN a row "| Brake | x\|y |"
- WHEN it is parsed, and then written back unchanged
- THEN the cells are Brake and x\|y (the cell text holds the backslash) and the serialised row text is unchanged

### Scenario (nominal): Escaped pipe in backticks
- GIVEN the row "| Brake | `a\|b` and x |"
- WHEN it is parsed for editing
- THEN the cells are Brake and `a\|b` and x (the preview shows a|b in the code span)

### Scenario (boundary): Unescaped pipe in backticks
- GIVEN the row "| `x|y` | z |" under a two-column table
- WHEN it is parsed for editing
- THEN the pipe splits the cell, as it does in the preview (GFM): the row has three cells, so the table is not a pipe table of the editor and no cell editor opens on it, instead of the editor and the preview holding different cells

### Verification notes
- Method: test/page/modules/markdownTable.test.ts (rows without outer pipes: rows without outer pipes stay parseable when an edge cell is emptied and rows with only one outer pipe stay parseable; escaped pipe and its round trip: pipe tables round-trip escaped cells and CRLF line endings; pipe in backticks: cellSegments returns the text between the delimiting pipes, offsets in the untrimmed line; an unescaped pipe inside a code span splits the cell as the preview does). The odd-backslash boundary is read from splitRow and has no dedicated test (untested). The preview rule was checked with markdown-it 14.3.3 and the project's myst-parser.
- Method: test/page/modules/markdownTablePreservation.test.ts (escaped pipe round trip: corpus entry escaped-and-code).
- Criteria: The cells produced by parse for each row form, and string equality after serialising.
