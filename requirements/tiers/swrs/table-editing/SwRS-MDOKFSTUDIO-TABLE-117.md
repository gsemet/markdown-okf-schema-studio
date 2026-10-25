---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-117
uuid: af94e509-3c3c-445d-885a-6189b6ab1833
title: HTML table converts or inserts an HTML table
description: When the writer runs HTML table, the extension SHALL replace the
  pipe table at the caret with an HTML table whose first row is in thead and
  whose other rows are in tbody, and, with the caret outside a pipe table,
  insert a new HTML table of two columns and one empty body row after the
  selection, set apart by blank lines, with Column 1 selected.
project: markdown-okf-schema-studio
scope: table-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TABLE-012
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/markdownTable.ts
- src/page/modules/tableEditActions.ts
tested_in_files:
- test/page/modules/editActions.test.ts
- test/page/modules/markdownTable.test.ts
---

## HTML table converts or inserts an HTML table

### Normative behavior

When the writer runs HTML table, the extension SHALL replace the pipe table at the caret with an HTML table whose first row is in thead and whose other rows are in tbody, and, with the caret outside a pipe table, insert a new HTML table of two columns and one empty body row after the selection, set apart by blank lines, with Column 1 selected.

### Scenario (nominal): Caret on header, delimiter or last row
- GIVEN the caret in the header, in the delimiter row and in the last row of a pipe table, in turn, or in a table that follows text
- WHEN HTML table is run
- THEN the whole pipe table is replaced each time

### Scenario (boundary): Escaped text
- GIVEN cells containing &, < and >, and an escaped pipe
- WHEN the table is converted
- THEN &, < and > are escaped as entities, the escaped pipe becomes a pipe, and other text is kept as typed

### Scenario (nominal): Alignment, empty cells and unicode
- GIVEN a table with :---, :---: and ---: columns, an empty cell and non-ASCII text
- WHEN it is written as HTML
- THEN the cells carry align left, center and right, the empty cell is an empty element and the text is unchanged

### Scenario (boundary): No body rows
- GIVEN a header and its delimiter row only
- WHEN it is written as HTML
- THEN the result has thead only and no tbody, and no align attribute for a column without colons

### Scenario (nominal): Caret in a paragraph
- GIVEN the caret in a paragraph
- WHEN HTML table is run
- THEN a table element with a header of Column 1 and Column 2 and one empty body row is inserted on its own lines, with Column 1 selected

### Scenario (boundary): No table tools
- GIVEN the page without table tools
- WHEN HTML table is run
- THEN the same new table is inserted

### Known issues
- Known issue: With the caret inside a {list-table} or inside an existing HTML table, no pipe table is found and the new table is inserted at the caret, which splits that table.

### Related requirements
- SwRS-MDOKFSTUDIO-TABLE-106: the palette modes in which HTML table is offered (GFM and MyST modes).

### Verification notes
- Method: test/page/modules/editActions.test.ts (T25: htmlTable converts the pipe table under the caret, text escaped, alignment kept; T25: htmlTable finds the table from its header, delimiter or last row, and from a table after text; T25: htmlTable outside a pipe table inserts a new 2 x 2 table set apart by blank lines; the no table tools row is read from htmlTable in src/page/modules/tableEditActions.ts and is untested).
- Method: test/page/modules/markdownTable.test.ts (T25: toHtmlTable writes thead and tbody with escaped text and alignment attributes; T25: toHtmlTable omits tbody without rows and alignment attributes without colons; T25: toHtmlTable keeps a model's unicode and empty cells).
- Criteria: The replaced range, the exact HTML text for each case, and the inserted text with the selection of Column 1. The button itself belongs to the palette-slash scope.
