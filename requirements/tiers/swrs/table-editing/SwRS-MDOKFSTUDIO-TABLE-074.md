---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-074
uuid: 39f1da0d-61c8-407a-ad01-30abbf49220b
title: Pipe table converts the table at the caret to a pipe table in one edit
description: When the caret is on any line of a {list-table} or a simple HTML
  table in MyST mode, the extension SHALL offer the Pipe table action, which
  replaces that table with its pipe table form in one edit and puts the caret
  after it, and offer it nowhere else.
project: markdown-okf-schema-studio
scope: table-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TABLE-011
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/tableEditActions.ts
tested_in_files:
- test/page/modules/editActions.test.ts
- test/page/modules/editPalette.test.ts
default_owner_email: gaetan@xeberon.net
---

## Pipe table converts the table at the caret to a pipe table in one edit

### Normative behavior

When the caret is on any line of a {list-table} or a simple HTML table in MyST mode, the extension SHALL offer the Pipe table action, which replaces that table with its pipe table form in one edit and puts the caret after it, and offer it nowhere else.

### Scenario (nominal): List-table from any line
- GIVEN the caret on the opening fence, on a cell line and on the closing fence of a {list-table}, in turn
- WHEN Pipe table is run
- THEN each time the whole directive, fences included, is replaced by a pipe table

### Scenario (nominal): HTML table
- GIVEN the caret in a simple HTML table
- WHEN Pipe table is run
- THEN the table is replaced by a pipe table

### Scenario (nominal): Caret in a list-table
- GIVEN the caret in a {list-table} in MyST mode
- WHEN the availability of Pipe table is read
- THEN Pipe table is available and the slash menu lists it

### Scenario (refusal): Caret elsewhere
- GIVEN the caret in a pipe table, in a paragraph, or no table tools
- WHEN the availability is read
- THEN Pipe table is not available and running it never throws

### Related requirements
- SwRS-MDOKFSTUDIO-TABLE-073: the List table action, the counterpart of this one.
- SwRS-MDOKFSTUDIO-TABLE-076: the refusal of a conversion that would lose content.
- SwRS-MDOKFSTUDIO-TABLE-080: the text written for the pipe table.

### Verification notes
- Method: test/page/modules/editActions.test.ts, unit tests CR038: pipeTable converts the list-table under the caret from any line of it and CR038: a simple HTML table converts to either form ("List-table from any line", "HTML table"); CR038: availability follows the form of the table at the caret, CR038: no edit and no table: the buttons are not available outside a table and CR038: the conversion actions without table tools never throw ("Caret in a list-table", "Caret elsewhere"). The markers of these tests are in test/page/modules/editActions.test.ts.
- Method: test/page/modules/editPalette.test.ts, unit tests CR038: List table shows with the caret in a pipe table, Pipe table with it in a list-table and CR038: the slash menu offers the conversion only inside a table of the other form ("Caret in a list-table", "Caret elsewhere").
- Criteria: The replaced range covers the fences and the new text is a canonical pipe table; the available flag per table form, the form being named by detectTable (pipe, list-table, html).

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TABLE-011](../../strs/table-editing/StRS-MDOKFSTUDIO-TABLE-011.md): A table converts between forms and a cell edit is a one-line change
<!-- okf:links:end -->
