---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-080
uuid: dc393005-df9e-49dd-be4c-ad3a6d95422d
title: A conversion keeps cells, escapes and alignment across forms
description: When a pipe table, a {list-table} or a simple HTML table is
  converted to another form, the extension SHALL keep the cells and their
  escaped pipes, write the header row and the fence of the target form, and
  carry the alignment only where the target form has it.
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
- test/page/modules/listTable.test.ts
---

## A conversion keeps cells, escapes and alignment across forms

### Normative behavior

When a pipe table, a {list-table} or a simple HTML table is converted to another form, the extension SHALL keep the cells and their escaped pipes, write the header row and the fence of the target form, and carry the alignment only where the target form has it.

### Scenario (nominal): Pipe table to list-table
| Input | Outcome |
| --- | --- |
| A pipe table with a header and one body row | The result opens with a three-backtick {list-table} fence, carries :header-rows: 1 and has one "* -" row per row, each further cell on a "  -" line, closed by the same fence |
| A cell containing a run of three backticks | The fence has four backticks (longer than any backtick run in a cell) |

### Scenario (nominal): Escaped pipes
- GIVEN a pipe table cell containing x\|y, and a list-table cell containing a|b
- WHEN the first is converted to a list-table and the second to a pipe table
- THEN the list-table item holds x|y, and the pipe table cell is written a\|b

### Scenario (boundary): Alignment
| Input | Outcome |
| --- | --- |
| A pipe table with a left, a centre and a right aligned column, converted to a list-table | The list-table carries no alignment: the colons are dropped |
| A pipe table with plain --- delimiters, converted to a list-table | The conversion succeeds in the same way and the result carries no alignment |
| An HTML table with align="left", "center" and "right" cells in its first row, converted to a pipe table | The delimiter row is ":---", ":---:" and "---:" |
| A column without an align attribute, converted to a pipe table | Its delimiter cell is "---" |

### Scenario (nominal): List-table read in every fence style
| Input | Outcome |
| --- | --- |
| List-tables fenced with backticks, tildes and colons, with :widths: and :header-rows: 1, converted to pipe tables | Each gives the same pipe table and the :widths: option is dropped |
| A list-table without :header-rows: | The pipe table has an empty header row followed by all the rows |

### Scenario (nominal): Canonical round trip
- GIVEN the canonical pipe tables of the lossless test ("| a | b |" with "---" delimiters, no alignment colons), with escaped pipes and empty cells
- WHEN each is converted to a list-table and back
- THEN the result equals the original text

### Scenario (boundary): Other styles lose their style
- GIVEN a table that is padded, indented, written with long dashes or with alignment colons
- WHEN the round trip is made
- THEN the result is the canonical table: padding, indentation, delimiter width and colons are lost

### Related requirements
- SwRS-MDOKFSTUDIO-TABLE-076: the conversions that are refused instead of losing content.
- SwRS-MDOKFSTUDIO-TABLE-073: the List table action that runs the conversion to a list-table.
- SwRS-MDOKFSTUDIO-TABLE-074: the Pipe table action that runs the conversion to a pipe table.

### Verification notes
- Method: test/page/modules/listTable.test.ts, unit tests a pipe table becomes a list-table with one header row and the fence is longer than any backtick run in a cell ("Pipe table to list-table"), an escaped pipe is a plain pipe in the list item and escaped again in the pipe table and a list-table cell with a pipe is escaped in the pipe table ("Escaped pipes"), column alignment colons are dropped going to a list-table and a simple HTML table converts to a pipe table keeping alignment, and to a list-table ("Alignment"; the no-attribute boundary is the plain column of that test), a list-table with several fence styles and options is read, a list-table without header rows gets an empty header in the pipe table and a list-table becomes a canonical pipe table ("List-table read in every fence style"), and pipe -> list-table -> pipe is lossless for simple tables plus the HTML round trip of the table written by toHtmlTable ("Canonical round trip", canonical sources only). "Other styles lose their style" is read from gridToPipe in src/page/modules/markdownTable.ts and has no test.
- Criteria: The exact converted text for the simple table and the fence length for the code cell; the cell text in each direction; no colon or alignment in the list-table result and the delimiter row of the pipe table result; the converted text for each fence style and the empty header row; string equality after the round trip for canonical tables.
