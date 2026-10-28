---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-073
uuid: 8fd0a683-139f-41d2-b8e9-0562f242101c
title: List table converts the table at the caret to a list-table in one edit
description: When the caret is on any line of a pipe table or a simple HTML
  table in MyST mode, the extension SHALL offer the List table action, which
  replaces that table with its {list-table} form in one edit and puts the caret
  after it, and offer it nowhere else.
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
- src/page/modules/tableEditActions.ts
tested_in_files:
- test/page/modules/editActions.test.ts
- test/page/modules/editPalette.test.ts
default_owner_email: gaetan@xeberon.net
---

## List table converts the table at the caret to a list-table in one edit

### Normative behavior

When the caret is on any line of a pipe table or a simple HTML table in MyST mode, the extension SHALL offer the List table action, which replaces that table with its {list-table} form in one edit and puts the caret after it, and offer it nowhere else.

### Scenario (nominal): Pipe table
- GIVEN the caret on the delimiter line of a pipe table with a paragraph before and a table after it
- WHEN List table is run
- THEN only the table is replaced by a {list-table} directive in one edit, the neighbouring lines and the other table are kept, and the caret is after the new text

### Scenario (nominal): HTML table
- GIVEN the caret in a simple HTML table written by the HTML table action
- WHEN List table is run
- THEN the table is replaced by the {list-table} form

### Scenario (nominal): Caret in a pipe table
- GIVEN the caret in a pipe table in MyST mode
- WHEN the availability of List table is read
- THEN List table is available and the slash menu lists it

### Scenario (refusal): Caret elsewhere
- GIVEN the caret in a paragraph, in a {list-table}, or no table tools
- WHEN the availability is read
- THEN List table is not available and running it never throws

### Related requirements
- SwRS-MDOKFSTUDIO-TABLE-074: the Pipe table action, the counterpart of this one.
- SwRS-MDOKFSTUDIO-TABLE-076: the refusal of a conversion that would lose content.
- SwRS-MDOKFSTUDIO-TABLE-080: the text written for the list-table.

### Verification notes
- Method: test/page/modules/editActions.test.ts, unit tests CR038: listTable converts the pipe table under the caret in place, CR038: the conversion round-trips and keeps the neighbouring tables and lines and CR038: a simple HTML table converts to either form ("Pipe table", "HTML table"); CR038: availability follows the form of the table at the caret, CR038: no edit and no table: the buttons are not available outside a table and CR038: the conversion actions without table tools never throw ("Caret in a pipe table", "Caret elsewhere"). The markers of these tests are in test/page/modules/editActions.test.ts.
- Method: test/page/modules/editPalette.test.ts, unit tests CR038: List table shows with the caret in a pipe table, Pipe table with it in a list-table and CR038: the slash menu offers the conversion only inside a table of the other form ("Caret in a pipe table", "Caret elsewhere").
- Criteria: The edit range equals the table range and the text equals the converted text; the available flag per table form, the form being named by detectTable (pipe, list-table, html).
