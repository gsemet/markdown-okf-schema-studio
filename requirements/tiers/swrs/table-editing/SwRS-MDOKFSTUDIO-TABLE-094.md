---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-094
uuid: 93f706a7-9982-424b-8619-a29974736140
title: Editing one cell changes exactly one line of the source
description: When a table is parsed and written back after a cell edit, a row
  insertion, a row deletion or no change, the extension SHALL change only the
  line the edit concerns, so that a cell edit changes one line, a new row adds
  one line, a deleted row removes one line and an unchanged table gives back
  exactly the original text.
project: markdown-okf-schema-studio
scope: table-editing
lifecycle: proposed
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
- test/integration/realInput/markers.ts
- test/page/modules/markdownTable.test.ts
- test/page/modules/markdownTablePreservation.test.ts
default_owner_email: gaetan@xeberon.net
---

## Editing one cell changes exactly one line of the source

### Normative behavior

When a table is parsed and written back after a cell edit, a row insertion, a row deletion or no change, the extension SHALL change only the line the edit concerns, so that a cell edit changes one line, a new row adds one line, a deleted row removes one line and an unchanged table gives back exactly the original text.

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

### Related requirements
- SwRS-MDOKFSTUDIO-TABLE-055: the Row and Column buttons, which add and remove rows and columns and rewrite the table.
- SwRS-MDOKFSTUDIO-TABLE-102: the splitting of a row into the cells that this write keeps.

### Verification notes
- Method: test/page/modules/markdownTablePreservation.test.ts (unchanged table: round trip preserves the source, one per corpus table; one edited cell: one-cell edit changes exactly one line, padded, compact, indented and wider-than-padding, and lineDelta reports one removed and one added line; width: padded and wider-than-padding; any single cell edit: every single-cell edit reparses and changes at most one line; edge cell and indentation scenarios).
- Method: test/page/modules/markdownTable.test.ts (unchanged table: pipe tables round-trip escaped cells and CRLF line endings; width: a shrinking value in a padded table keeps the original cell width and filling an empty cell keeps the table's padding; new row: inserting a row after the first body row of a padded table adds one padded line and inserting a row into a table without outer pipes adds one parseable row; deleting the first body row of a compact table removes exactly one line; edge cells: rows without outer pipes stay parseable when an edge cell is emptied and rows with only one outer pipe stay parseable). The header refusal is read from the model and has no dedicated test (untested).
- Method: test/integration/realInput/blockKeys.ts, through the markers in test/integration/realInput/markers.ts (real window, scenarioTableMinimalDiff, ids table-editing/r02-padded-table-minimal-diff and table-editing/r03-compact-table-minimal-diff).
- Criteria: String equality for every table of the corpus, one removed and one added line per cell edit, the added line text for a new row, a line delta of one removed and zero added lines for a deletion, and the reparsed rows for the pipe and edge cell cases.
