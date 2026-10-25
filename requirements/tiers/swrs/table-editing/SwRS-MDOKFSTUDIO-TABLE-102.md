---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-102
uuid: 24211349-a556-47b9-8dde-6fe33b637cf7
title: Edge pipes are optional and escaped or code pipes do not split a cell
description: When a table row is split into cells for editing, the extension
  SHALL accept rows with or without leading and trailing pipes and keep a pipe
  that is escaped with a backslash or that sits inside a code span within its
  cell.
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

## Edge pipes are optional and escaped or code pipes do not split a cell

### Normative behavior

When a table row is split into cells for editing, the extension SHALL accept rows with or without leading and trailing pipes and keep a pipe that is escaped with a backslash or that sits inside a code span within its cell.

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

### Scenario (nominal): Pipe in backticks
- GIVEN the row "| Brake | `a|b` and x |"
- WHEN it is parsed for editing
- THEN the cells are Brake and `a|b` and x

### Scenario (boundary): Pipe after the code span
- GIVEN the row "| `a` | b |" and the row "| ``a`|b | c |"
- WHEN they are parsed for editing
- THEN the first gives the cells `a` and b, because the code span is closed by a run of the same length; in the second the opening run of two backticks is never closed by the single one, so the rest of the row stays in one cell

### Known issues
- Known issue: The preview renderer follows the GFM table rule, which splits a row at a pipe inside a code span, while the editor keeps that pipe in one cell. For the row `| a | b |` over a body row `| `x|y` | z |`, the preview shows the cells `x and y` (the extra cell z is dropped) while the editor model holds the two cells `x|y` and z, so a click on the second rendered cell opens the editor of z.

### Verification notes
- Method: test/page/modules/markdownTable.test.ts (rows without outer pipes: rows without outer pipes stay parseable when an edge cell is emptied and rows with only one outer pipe stay parseable; escaped pipe and its round trip: pipe tables round-trip escaped cells and CRLF line endings; pipe in backticks: cellSegments returns the text between the delimiting pipes, offsets in the untrimmed line). The odd-backslash boundary and the "Pipe after the code span" scenario are read from splitRow and have no dedicated test (untested). The renderer difference of the Known issue was checked with markdown-it 14.3.3 and the project's myst-parser and has no test.
- Method: test/page/modules/markdownTablePreservation.test.ts (escaped pipe round trip: corpus entry escaped-and-code).
- Criteria: The cells produced by parse for each row form, and string equality after serialising.
