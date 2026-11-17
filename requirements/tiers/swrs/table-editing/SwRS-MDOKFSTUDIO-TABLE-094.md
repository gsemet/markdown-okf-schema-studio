---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-094
uuid: 93f706a7-9982-424b-8619-a29974736140
title: Editing one cell changes exactly one line of the source
description: "When a table is parsed and written back after a cell edit, a row insertion,
  a row deletion or no change, the extension SHALL change only the line the edit concerns,
  so that a cell edit changes one line, a new row adds one line, a deleted row removes
  one line and an unchanged table gives back exactly the original text; when a row
  is split into cells it SHALL accept rows with or without leading and trailing pipes,
  keep a pipe escaped with a backslash within its cell, and split a cell at every
  other pipe, also one inside a code span, as the preview does."
project: markdown-okf-schema-studio
scope: table-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TABLE-013
- StRS-MDOKFSTUDIO-TABLE-014
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/markdownTable.ts
tested_in_files:
- test/integration/realInput/blockKeys.ts
- test/page/modules/markdownTable.test.ts
- test/page/modules/markdownTablePreservation.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-TABLE-102
---

## Editing one cell changes exactly one line of the source

### Normative behavior

When a table is parsed and written back after a cell edit, a row insertion, a row deletion or no change, the extension SHALL change only the line the edit concerns, so that a cell edit changes one line, a new row adds one line, a deleted row removes one line and an unchanged table gives back exactly the original text; when a row is split into cells it SHALL accept rows with or without leading and trailing pipes, keep a pipe escaped with a backslash within its cell, and split a cell at every other pipe, also one inside a code span, as the preview does.

### Scenario (nominal): Unchanged table gives back the original text

| Table written back with no change | Outcome |
| --- | --- |
| compact | output equals the input |
| padded | output equals the input |
| no spaces | output equals the input |
| aligned | output equals the input |
| no outer pipes | output equals the input |
| escaped pipe and pipe in a code span | output equals the input |
| indented | output equals the input |
| CRLF line endings | output equals the input |
| wider than the padding | output equals the input |
| CRLF table with an escaped pipe and a pipe in a code span | output equals the input |

### Scenario (nominal): One edited cell changes one line

- GIVEN a padded table and a compact table, one body cell edited in each
- WHEN the table is written back
- THEN one line is removed and one line is added, and it is the edited row; every other line, the delimiter row included, is verbatim
- GIVEN the same two tables in a real window with the edit saved by Enter
- WHEN the buffer is compared with the original
- THEN the diff is one line

### Scenario (nominal): The edited cell keeps its leading whitespace and its width

| Edit | Outcome |
| --- | --- |
| the padded cell "| first    |" edited to a slightly longer value | the value fills the original cell width with trailing spaces, at least one |
| the same cell edited to a much longer value | the value gets one trailing space |
| a cell emptied, in a padded table | the table keeps its padding |
| an empty cell filled, in a padded table | the table keeps its padding |
| a cell emptied or filled, in a compact table | single spaces |

### Scenario (boundary): Any single cell edit parses again with that cell

| Input | Outcome |
| --- | --- |
| each header and body cell of every corpus table set to "" (the delimiter row is skipped) | the rows equal the edited model and at most one line changed |
| the same cells set to "x" | the rows equal the edited model and at most one line changed |
| the same cells set to a typed pipe between a and b | the pipe is saved escaped, the rows equal the edited model and at most one line changed |
| a cell set to the value it already holds | no line changes |

### Scenario (nominal): A new row takes the style of a neighbouring body row

- GIVEN a padded table and a row inserted after the first body row
- WHEN the table is written back
- THEN one padded line is added, with the padding of the nearest preceding body row, else the nearest following body row, else the header row
- GIVEN a table written "a | b" without outer pipes and a row inserted after the first body row
- WHEN the table is written back
- THEN one parseable line "|  |  |" is added (the row is written with outer pipes) and the table parses again with the new empty row

### Scenario (nominal): Deleting a row removes exactly one line

- GIVEN a compact table and its first body row deleted
- WHEN the table is written back
- THEN one line is removed and none is added and the other lines are verbatim

### Scenario (refusal): The header row is not deleted

- GIVEN the header row selected
- WHEN a deletion is requested from the model
- THEN nothing is deleted

### Scenario (boundary): Edge cells of rows without outer pipes and indented tables

| Input | Outcome |
| --- | --- |
| a table "a \| b" over "c \| d" with the first cell of the body row emptied | that row alone is rewritten canonically, keeping its indentation, the table parses with an empty cell and one line changed |
| the same table with the last cell of the body row emptied | that row alone is rewritten canonically, the table parses with an empty cell and one line changed |
| rows with a leading pipe only or a trailing pipe only and an edge cell emptied | the table still parses with the empty cell |
| a table whose rows are indented and one cell edited | only the edited row changes and its indentation is unchanged |
| the same indented table after Col + | the indentation is lost (see SwRS-MDOKFSTUDIO-TABLE-055) |

### Scenario (boundary): A row with text after its closing pipe

- GIVEN a table whose body row ends with a tail such as " ^row-a" after its closing pipe
- WHEN one cell of that row is edited
- THEN only that row's line changes and the tail stays at its end, and the table without an edit serialises to the same bytes, CRLF included

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
- THEN the pipe splits the cell, as it does in the preview (GFM): the row has three cells, of which the editor keeps the first two (the same cells as the preview) and the third, with the closing pipe, as the row tail, so the editor and the preview hold the same cells

### Scenario (boundary): Text after the closing pipe of a body row

- GIVEN a body row of a table of two columns with more cells than the header, such as "| alpha | 1 | ^row-a", "| alpha | 1 | {#row-c}", "| alpha | 1 | <!-- keep -->" or "| a | b | c |"
- WHEN it is parsed for editing
- THEN the row has the header's two cells and a tail: the text after the closing pipe of the last column, kept verbatim ("| alpha | 1 |" and " ^row-a"; "| a | b |" and " c |"); the preview ignores the extra cells, as GFM does, and the serialised table is unchanged
- GIVEN the same extra cell in the header or in the delimiter row
- WHEN the table is parsed
- THEN it is no pipe table of the editor, as it is none in the preview

### Related requirements

- SwRS-MDOKFSTUDIO-TABLE-055: the Row and Column buttons, which add and remove rows and columns and rewrite the table.

### Verification notes

- Method: test/page/modules/markdownTablePreservation.test.ts (unchanged table: round trip preserves the source, one per corpus table; one edited cell: one-cell edit changes exactly one line, padded, compact, indented and wider-than-padding, and lineDelta reports one removed and one added line; width: padded and wider-than-padding; any single cell edit: every single-cell edit reparses and changes at most one line; edge cell and indentation scenarios).
- Method: test/page/modules/markdownTable.test.ts (unchanged table: pipe tables round-trip escaped cells and CRLF line endings; width: a shrinking value in a padded table keeps the original cell width and filling an empty cell keeps the table's padding; new row: inserting a row after the first body row of a padded table adds one padded line and inserting a row into a table without outer pipes adds one parseable row; deleting the first body row of a compact table removes exactly one line; edge cells: rows without outer pipes stay parseable when an edge cell is emptied and rows with only one outer pipe stay parseable). The header refusal is read from the model and has no dedicated test (untested).
- Method: test/integration/realInput/blockKeys.ts, through the markers in test/integration/realInput/markers.ts (real window, scenarioTableMinimalDiff, ids table-editing/r02-padded-table-minimal-diff and table-editing/r03-compact-table-minimal-diff).
- Method: test/page/modules/markdownTable.test.ts (a cell edit of a row with a tail changes only that cell and keeps the tail).
- Method: test/page/modules/markdownTable.test.ts (rows without outer pipes: rows without outer pipes stay parseable when an edge cell is emptied and rows with only one outer pipe stay parseable; escaped pipe and its round trip: pipe tables round-trip escaped cells and CRLF line endings; pipe in backticks: cellSegments returns the text between the delimiting pipes, offsets in the untrimmed line; an unescaped pipe inside a code span splits the cell as the preview does). The odd-backslash boundary is read from splitRow and has no dedicated test (untested). The preview rule was checked with markdown-it 14.3.3 and the project's myst-parser.
- Method: test/page/modules/markdownTablePreservation.test.ts (escaped pipe round trip: corpus entry escaped-and-code).
- Method: test/page/modules/markdownTable.test.ts (a body row with text after its closing pipe is a row of the header's columns with a tail, LF and CRLF, tail kinds ^id, {#id}, an HTML comment and an extra cell; a header or delimiter row with an extra cell and a short body row refused).
- Criteria: String equality for every table of the corpus, one removed and one added line per cell edit, the added line text for a new row, a line delta of one removed and zero added lines for a deletion, and the reparsed rows for the pipe and edge cell cases.
- Criteria: The cells produced by parse for each row form, and string equality after serialising.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TABLE-013](../../strs/table-editing/StRS-MDOKFSTUDIO-TABLE-013.md): A writer converts a table between pipe, list-table and HTML forms
  - [StRS-MDOKFSTUDIO-TABLE-014](../../strs/table-editing/StRS-MDOKFSTUDIO-TABLE-014.md): A table edit changes only the lines it touches
- Supersedes:
  - [SwRS-MDOKFSTUDIO-TABLE-102](SwRS-MDOKFSTUDIO-TABLE-102.md): Edge pipes are optional and only an escaped pipe stays in its cell
<!-- okf:links:end -->
