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
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TABLE-016
depends_on: []
scenarios:
- id: S1
  title: Caret on header, delimiter or last row
- id: S2
  title: Escaped text
- id: S3
  title: Alignment, empty cells and unicode
- id: S4
  title: No body rows
- id: S5
  title: Caret in a paragraph
- id: S6
  title: Caret in a list-table or an HTML table
- id: S7
  title: A row with text after its closing pipe
- id: S8
  title: No table tools
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/markdownTable.ts
- src/page/modules/tableEditActions.ts
tested_in_files:
- test/page/modules/editActions.test.ts
- test/page/modules/markdownTable.test.ts
- test/page/modules/tableInsertAfterTable.test.ts
- test/page/modules/tableRowTailActions.test.ts
default_owner_email: gaetan@xeberon.net
---

## HTML table converts or inserts an HTML table

### Normative behavior

When the writer runs HTML table, the extension SHALL replace the pipe table at the caret with an HTML table whose first row is in thead and whose other rows are in tbody, and, with the caret outside a pipe table, insert a new HTML table of two columns and one empty body row after the selection, set apart by blank lines, with Column 1 selected.

### Scenario S1 (nominal): Caret on header, delimiter or last row
- GIVEN the caret in the header, in the delimiter row and in the last row of a pipe table, in turn, or in a table that follows text
- WHEN HTML table is run
- THEN the whole pipe table is replaced each time

### Scenario S2 (boundary): Escaped text
- GIVEN cells containing &, < and >, and an escaped pipe
- WHEN the table is converted
- THEN &, < and > are escaped as entities, the escaped pipe becomes a pipe, and other text is kept as typed

### Scenario S3 (nominal): Alignment, empty cells and unicode
- GIVEN a table with :---, :---: and ---: columns, an empty cell and non-ASCII text
- WHEN it is written as HTML
- THEN the cells carry align left, center and right, the empty cell is an empty element and the text is unchanged

### Scenario S4 (boundary): No body rows
- GIVEN a header and its delimiter row only
- WHEN it is written as HTML
- THEN the result has thead only and no tbody, and no align attribute for a column without colons

### Scenario S5 (nominal): Caret in a paragraph
- GIVEN the caret in a paragraph
- WHEN HTML table is run
- THEN a table element with a header of Column 1 and Column 2 and one empty body row is inserted on its own lines, with Column 1 selected

### Scenario S6 (boundary): Caret in a list-table or an HTML table
- GIVEN the caret inside a {list-table} or an HTML table
- WHEN HTML table is run
- THEN the new table is inserted on its own lines after the last line of that table, which stays whole

### Scenario S7 (refusal): A row with text after its closing pipe
- GIVEN the caret in a pipe table with a token after the closing pipe of a row, such as "| alpha | 1 | ^row-a"
- WHEN HTML table is run
- THEN no edit is produced: the table is not converted and no new table is inserted, because the text would be lost

### Scenario S8 (boundary): No table tools
- GIVEN the page without table tools
- WHEN HTML table is run
- THEN the same new table is inserted

### Related requirements
- SwRS-MDOKFSTUDIO-TABLE-106: the palette modes in which HTML table is offered (GFM and MyST modes).

### Verification notes
- Method: test/page/modules/editActions.test.ts (T25: htmlTable converts the pipe table under the caret, text escaped, alignment kept; T25: htmlTable finds the table from its header, delimiter or last row, and from a table after text; T25: htmlTable outside a pipe table inserts a new 2 x 2 table set apart by blank lines; the list-table and HTML table rows are in test/page/modules/tableInsertAfterTable.test.ts; the no table tools row is read from htmlTable in src/page/modules/tableEditActions.ts and is untested).
- Method: test/page/modules/markdownTable.test.ts (T25: toHtmlTable writes thead and tbody with escaped text and alignment attributes; T25: toHtmlTable omits tbody without rows and alignment attributes without colons; T25: toHtmlTable keeps a model's unicode and empty cells).
- Method: test/page/modules/tableRowTailActions.test.ts (HTML table gives no edit on a pipe table whose row has a tail).
- Criteria: The replaced range, the exact HTML text for each case, and the inserted text with the selection of Column 1. The button itself belongs to the palette-slash scope.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TABLE-016](../../strs/table-editing/StRS-MDOKFSTUDIO-TABLE-016.md): A writer inserts and shapes a table from the palette
<!-- okf:links:end -->
