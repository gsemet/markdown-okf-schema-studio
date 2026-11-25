---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-122
uuid: d73d60d0-0577-4ae0-9009-8d863f8e4517
title: A table converts between pipe, list-table and HTML forms without loss, or
  is refused with a reason
description: When the writer converts a table between a pipe table, a
  {list-table} and a simple HTML table, from the table bar, the palette or the
  slash menu, the extension SHALL replace it in one edit with the other form,
  keeping its cells, escaped pipes and header row and carrying the alignment
  only where the target form has it, or SHALL change nothing and give a reason
  ending Nothing was changed when the conversion would lose content.
project: markdown-okf-schema-studio
scope: table-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TABLE-013
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-058
scenarios:
- id: S1
  title: "List table action: Pipe table"
- id: S2
  title: "Pipe table action: List-table from any line"
- id: S3
  title: A simple HTML table converts to either form
- id: S4
  title: The conversion actions follow the table at the caret
- id: S5
  title: Caret elsewhere
- id: S6
  title: "Table bar: Convert after typing"
- id: S7
  title: "Table bar: Table in a captioned figure"
- id: S8
  title: "Table bar: A row with text after its closing pipe"
- id: S9
  title: "Table bar: A cell change drops a conversion that was not saved"
- id: S10
  title: "Table bar: Line break pasted into the cell"
- id: S11
  title: "Table bar: A table inside a quote or an admonition"
- id: S12
  title: List-table that would lose content
- id: S13
  title: HTML table that would lose content
- id: S14
  title: Several header rows
- id: S15
  title: Pipe table whose row has text after its closing pipe
- id: S16
  title: Table already in the target form
- id: S17
  title: Text that is no table
- id: S18
  title: Tables that convert
- id: S19
  title: Pipe table to list-table
- id: S20
  title: Escaped pipes
- id: S21
  title: Alignment
- id: S22
  title: List-table read in every fence style
- id: S23
  title: Canonical round trip
- id: S24
  title: Other styles lose their style
annotation_exemption: false
exemption_reason:
derived_by: []
supersedes:
- SwRS-MDOKFSTUDIO-TABLE-070
- SwRS-MDOKFSTUDIO-TABLE-073
- SwRS-MDOKFSTUDIO-TABLE-074
- SwRS-MDOKFSTUDIO-TABLE-076
- SwRS-MDOKFSTUDIO-TABLE-080
implemented_in_files:
- src/page/features/tableCellEditor.ts
- src/page/modules/tableConversion.ts
- src/page/modules/tableEditActions.ts
tested_in_files:
- test/integration/tableMoves.ts
- test/page/fmtableReqTable.requirements.test.ts
- test/page/modules/editActions.test.ts
- test/page/modules/editPalette.test.ts
- test/page/modules/fmtableReqTable.requirements.test.ts
- test/page/modules/listTable.test.ts
- test/page/modules/markdownTable.test.ts
- test/page/runtimeTableCellEditor.test.ts
- test/page/runtimeTableRowTail.test.ts
default_owner_email: gaetan@xeberon.net
---

## A table converts between pipe, list-table and HTML forms without loss, or is refused with a reason

### Normative behavior

When the writer converts a table between a pipe table, a {list-table} and a simple HTML table, from the table bar (List table, and Pipe table on a list-table), the palette or the slash menu (MyST mode), the extension SHALL replace it in one edit, so one undo step, with the other form, keeping its cells, escaped pipes and header row and carrying the alignment only where the target form has it, and put the caret after it; the table bar button SHALL convert the table including the text typed in the current cell in one final save; and when the conversion would lose content or the table is already in the target form, the extension SHALL change nothing and give a reason ending "Nothing was changed.". The actions are offered only where the caret is in a table of the other form.

### Scenario S1 (nominal): List table action: Pipe table

- GIVEN the caret on the delimiter line of a pipe table with a paragraph before and a table after it
- WHEN List table is run
- THEN only the table is replaced by a {list-table} directive in one edit, the neighbouring lines and the other table are kept, and the caret is after the new text

### Scenario S2 (nominal): Pipe table action: List-table from any line

- GIVEN the caret on the opening fence, on a cell line and on the closing fence of a {list-table}, in turn
- WHEN Pipe table is run
- THEN each time the whole directive, fences included, is replaced by a pipe table

### Scenario S3 (nominal): A simple HTML table converts to either form

- GIVEN the caret in a simple HTML table written by the HTML table action
- WHEN List table or Pipe table is run
- THEN the table is replaced by the {list-table} form or by a pipe table

### Scenario S4 (nominal): The conversion actions follow the table at the caret

| Input | Outcome |
| --- | --- |
| The caret on any line of a pipe table in MyST mode | List table is available and the slash menu lists it; Pipe table is not |
| The caret on any line of a {list-table} (the opening fence, a cell line or the closing fence) | Pipe table is available and the slash menu lists it; List table is not |
| The caret in a simple HTML table | Both List table and Pipe table are available |

### Scenario S5 (refusal): Caret elsewhere

- GIVEN the caret in a paragraph, or no table tools
- WHEN the availability of List table and of Pipe table is read, or one of them is run
- THEN neither is available and running it never throws

### Scenario S6 (nominal): Table bar: Convert after typing

- GIVEN a two-column pipe table with text typed in a cell and the editor open
- WHEN the writer presses List table
- THEN one final previewEditSave is posted whose editedText is the {list-table} form of the table, typed text included, so the whole change is one undo step

### Scenario S7 (boundary): Table bar: Table in a captioned figure

- GIVEN a pipe table inside a {table} directive that renders as a figure
- WHEN the bar is shown
- THEN the List table button is disabled

### Scenario S8 (boundary): Table bar: A row with text after its closing pipe

- GIVEN a pipe table whose row has text after its closing pipe (see SwRS-MDOKFSTUDIO-TABLE-094)
- WHEN the table bar is shown
- THEN the List table button is disabled, as the conversion would lose that text

### Scenario S9 (boundary): Table bar: A cell change drops a conversion that was not saved

| Input | Outcome |
| --- | --- |
| A List table conversion prepared and its save refused by the host, then the writer types in the cell (or presses a row or column button) | The next save carries the pipe table with the typed text, not the prepared conversion |
| No prepared conversion and the writer types | Saves carry the pipe table as usual |

### Scenario S10 (boundary): Table bar: Line break pasted into the cell

- GIVEN a line break pasted into the cell text box
- WHEN the writer presses List table
- THEN the line break is already a space (see SwRS-MDOKFSTUDIO-TABLE-091) and the table converts in one final save

### Scenario S11 (boundary): Table bar: A table inside a quote or an admonition

| Input | Outcome |
| --- | --- |
| The cell editor of a pipe table inside a blockquote, a GFM alert or a MyST admonition | The List table button is disabled and its title says "Not available for a table inside a quote or an admonition" (see SwRS-MDOKFSTUDIO-TABLE-121) |

### Scenario S12 (refusal): List-table that would lose content

| Input ({list-table} converted to a pipe table) | Outcome |
| --- | --- |
| A title | No edit; reason "The list-table title would be lost in a pipe table. Nothing was changed." |
| YAML options | No edit; reason "A list-table with YAML options cannot be converted. Nothing was changed." |
| A :name: label | No edit; reason "The list-table label (:name:) would be lost in a pipe table. Nothing was changed." |
| :header-rows: set to a word | No edit; reason "The :header-rows: option is not a number. Nothing was changed." |
| A cell that continues on an indented line (multi-line or block cell) | No edit; reason "A list-table cell with several lines or block content cannot be a pipe table cell. Nothing was changed." |
| Rows of 2 and 3 cells | No edit; reason "The rows do not all have the same number of cells. Nothing was changed." |
| No rows | No edit; reason "The list-table has no rows. Nothing was changed." |

### Scenario S13 (refusal): HTML table that would lose content

| Input (HTML table converted by List table or Pipe table) | Outcome |
| --- | --- |
| A colspan, a class on a row, or other attributes (spans, classes, styles) | No edit; reason "This HTML table has X; only a simple table converts. Nothing was changed." where X names what the table has |
| A nested em element in a cell (markup inside a cell) | Same reason form, X names what the table has |
| Text between rows (text outside its cells) | Same reason form, X names what the table has |
| An element other than table, thead, tbody, tr, th and td | Same reason form, X names the element |
| Rows of different lengths | No edit; reason "The rows do not all have the same number of cells. Nothing was changed." |

### Scenario S14 (refusal): Several header rows

- GIVEN a {list-table} (or an HTML table) with :header-rows: 2
- WHEN Pipe table is run
- THEN no edit is produced and the reason is "A pipe table has one header row; this table has 2. Nothing was changed."

### Scenario S15 (refusal): Pipe table whose row has text after its closing pipe

- GIVEN a pipe table with a token after the closing pipe of a row, such as "| alpha | 1 | ^row-a"
- WHEN it is converted to a list-table (the HTML table action of SwRS-MDOKFSTUDIO-TABLE-117 gives no edit and no reason)
- THEN no edit is produced and the reason is "A row has text after its closing pipe that would be lost. Nothing was changed."

### Scenario S16 (refusal): Table already in the target form

- GIVEN a pipe table converted to a pipe table, and a list-table converted to a list-table (directly through the conversion function)
- WHEN the conversion is requested
- THEN the result is a refusal with the sentence "This is already a pipe table." or "This is already a list-table."

### Scenario S17 (boundary): Text that is no table

| Input | Outcome |
| --- | --- |
| A paragraph of text | The result is neither a conversion nor a reason (undefined) |
| An empty string | The result is neither a conversion nor a reason (undefined) |

### Scenario S18 (nominal): Tables that convert

| Input | Outcome |
| --- | --- |
| A {list-table} of equal rows, with or without :header-rows: and a :widths: option | The conversion to a pipe table succeeds |
| A simple HTML table whose cells carry only align="left", "center" or "right" | The conversion succeeds |
| The same list-table with :header-rows: 1 | The conversion to a pipe table succeeds |
| A list-table converted to a pipe table (the other form) | The conversion is done |

### Scenario S19 (nominal): Pipe table to list-table

| Input | Outcome |
| --- | --- |
| A pipe table with a header and one body row | The result opens with a three-backtick {list-table} fence, carries :header-rows: 1 and has one "* -" row per row, each further cell on a "  -" line, closed by the same fence |
| A cell containing a run of three backticks | The fence has four backticks (longer than any backtick run in a cell) |

### Scenario S20 (nominal): Escaped pipes

- GIVEN a pipe table cell containing x\|y, and a list-table cell containing a|b
- WHEN the first is converted to a list-table and the second to a pipe table
- THEN the list-table item holds x|y, and the pipe table cell is written a\|b

### Scenario S21 (boundary): Alignment

| Input | Outcome |
| --- | --- |
| A pipe table with a left, a centre and a right aligned column, converted to a list-table | The list-table carries no alignment: the colons are dropped |
| A pipe table with plain --- delimiters, converted to a list-table | The conversion succeeds in the same way and the result carries no alignment |
| An HTML table with align="left", "center" and "right" cells in its first row, converted to a pipe table | The delimiter row is ":---", ":---:" and "---:" |
| A column without an align attribute, converted to a pipe table | Its delimiter cell is "---" |

### Scenario S22 (nominal): List-table read in every fence style

| Input | Outcome |
| --- | --- |
| List-tables fenced with backticks, tildes and colons, with :widths: and :header-rows: 1, converted to pipe tables | Each gives the same pipe table and the :widths: option is dropped |
| A list-table without :header-rows: | The pipe table has an empty header row followed by all the rows |

### Scenario S23 (nominal): Canonical round trip

- GIVEN the canonical pipe tables of the lossless test ("| a | b |" with "---" delimiters, no alignment colons), with escaped pipes and empty cells
- WHEN each is converted to a list-table and back
- THEN the result equals the original text

### Scenario S24 (boundary): Other styles lose their style

- GIVEN a table that is padded, indented, written with long dashes or with alignment colons
- WHEN the round trip is made
- THEN the result is the canonical table: padding, indentation, delimiter width and colons are lost

### Related requirements

- SwRS-MDOKFSTUDIO-TABLE-091: the pasted line break that becomes a space
- SwRS-MDOKFSTUDIO-TABLE-094: editing one cell, and how a row is split into cells (edge pipes, escaped pipes)
- SwRS-MDOKFSTUDIO-TABLE-117: the HTML table action that converts or inserts an HTML table
- SwRS-MDOKFSTUDIO-TABLE-121: a table inside a quote or an admonition
- SwRS-MDOKFSTUDIO-BLOCK-058: the one final save is one undo step

### Verification notes

- Method: test/page/runtimeTableCellEditor.test.ts, unit tests CR038: the table toolbar converts the pipe table to a list-table in one final save ("Convert after typing") and CR038: the conversion button is off for a table inside a captioned figure ("Table in a captioned figure").
- Method: test/page/fmtableReqTable.requirements.test.ts, unit tests a cell change after a refused conversion drops the prepared list-table and saves the pipe table ("A cell change drops a conversion that was not saved") and the List table button converts the table after a line break was pasted into the cell ("Line break pasted into the cell").
- Method: test/page/modules/editActions.test.ts, unit tests CR038: listTable converts the pipe table under the caret in place, CR038: the conversion round-trips and keeps the neighbouring tables and lines and CR038: a simple HTML table converts to either form ("Pipe table", "HTML table"); CR038: availability follows the form of the table at the caret, CR038: no edit and no table: the buttons are not available outside a table and CR038: the conversion actions without table tools never throw ("Caret in a pipe table", "Caret elsewhere"). 
- Method: test/page/modules/editPalette.test.ts, unit tests CR038: List table shows with the caret in a pipe table, Pipe table with it in a list-table and CR038: the slash menu offers the conversion only inside a table of the other form ("Caret in a pipe table", "Caret elsewhere").
- Method: test/page/modules/editActions.test.ts, unit tests CR038: pipeTable converts the list-table under the caret from any line of it and CR038: a simple HTML table converts to either form ("List-table from any line", "HTML table"); CR038: availability follows the form of the table at the caret, CR038: no edit and no table: the buttons are not available outside a table and CR038: the conversion actions without table tools never throw ("Caret in a list-table", "Caret elsewhere"). 
- Method: test/page/modules/editPalette.test.ts, unit tests CR038: List table shows with the caret in a pipe table, Pipe table with it in a list-table and CR038: the slash menu offers the conversion only inside a table of the other form ("Caret in a list-table", "Caret elsewhere").
- Method: test/page/modules/listTable.test.ts, unit tests a list-table that would lose content is refused with a reason and nothing is produced ("List-table that would lose content", "Tables that convert"), an HTML table with spans, markup or no body cells in a row is refused ("HTML table that would lose content", first group and the reason form), a table already in the target form is refused and text that is no table is not recognised ("Table already in the target form", the paragraph case of "Text that is no table"). The empty-text boundary is asserted in the same test (an empty string gives undefined).
- Method: test/page/modules/editActions.test.ts, unit test CR038: a conversion that would lose content changes nothing and says why ("List-table that would lose content"). The display of the reason belongs to the palette-slash scope.
- Method: test/page/modules/fmtableReqTable.requirements.test.ts, unit test a list-table with several header rows is refused as a pipe table with the header-row count ("Several header rows").
- Method: test/page/modules/markdownTable.test.ts (converting a pipe table whose row has a tail is refused with the reason).
- Method: test/page/modules/listTable.test.ts, unit tests a pipe table becomes a list-table with one header row and the fence is longer than any backtick run in a cell ("Pipe table to list-table"), an escaped pipe is a plain pipe in the list item and escaped again in the pipe table and a list-table cell with a pipe is escaped in the pipe table ("Escaped pipes"), column alignment colons are dropped going to a list-table and a simple HTML table converts to a pipe table keeping alignment, and to a list-table ("Alignment"; the no-attribute boundary is the plain column of that test), a list-table with several fence styles and options is read, a list-table without header rows gets an empty header in the pipe table and a list-table becomes a canonical pipe table ("List-table read in every fence style"), and pipe -> list-table -> pipe is lossless for simple tables plus the HTML round trip of the table written by toHtmlTable ("Canonical round trip", canonical sources only). "Other styles lose their style" is tested by `a table in another style comes back from the round trip as the canonical table` (padded, indented, long dashes and alignment colons).
- Criteria: The edit range equals the table range and the text equals the converted text; the available flag per table form, the form being named by detectTable (pipe, list-table, html); a single final message with the list-table text from the table bar; the exact converted text for the simple table and the fence length for the code cell; the cell text in each direction; no colon or alignment in the list-table result and the delimiter row of the pipe table result; string equality after the round trip for canonical tables; a refusal reason with the suffix "Nothing was changed." for each lossy form (the palette does not offer the actions for the already-in-form case); an undefined result for text that is no table.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TABLE-013](../../strs/table-editing/StRS-MDOKFSTUDIO-TABLE-013.md): A writer converts a table between pipe, list-table and HTML forms
- Depends on:
  - [SwRS-MDOKFSTUDIO-BLOCK-058](../block-editing/SwRS-MDOKFSTUDIO-BLOCK-058.md): Every host source edit is one undo step, renders once and reports a failed apply
- Supersedes:
  - [SwRS-MDOKFSTUDIO-TABLE-070](SwRS-MDOKFSTUDIO-TABLE-070.md): The List table button converts the edited table in one final save
  - [SwRS-MDOKFSTUDIO-TABLE-073](SwRS-MDOKFSTUDIO-TABLE-073.md): List table converts the table at the caret to a list-table in one edit
  - [SwRS-MDOKFSTUDIO-TABLE-074](SwRS-MDOKFSTUDIO-TABLE-074.md): Pipe table converts the table at the caret to a pipe table in one edit
  - [SwRS-MDOKFSTUDIO-TABLE-076](SwRS-MDOKFSTUDIO-TABLE-076.md): A conversion that would lose content is refused with a reason
  - [SwRS-MDOKFSTUDIO-TABLE-080](SwRS-MDOKFSTUDIO-TABLE-080.md): A conversion keeps cells, escapes and alignment across forms
<!-- okf:links:end -->
