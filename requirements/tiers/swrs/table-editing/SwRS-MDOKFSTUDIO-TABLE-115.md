---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-115
uuid: 10d24a86-cfdc-4d8f-a0e7-d92489a80673
title: Table with caption wraps the table at the caret in a table directive
description: When the writer runs Table with caption, the extension SHALL wrap
  the pipe table at the caret in a :::{table} Caption directive, or insert a new
  captioned 2 x 2 table when the caret is outside a pipe table, and select the
  word Caption.
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
- src/page/modules/tableEditActions.ts
tested_in_files:
- test/page/modules/editActions.test.ts
---

## Table with caption wraps the table at the caret in a table directive

### Normative behavior

When the writer runs Table with caption, the extension SHALL wrap the pipe table at the caret in a :::{table} Caption directive, or insert a new captioned 2 x 2 table when the caret is outside a pipe table, and select the word Caption.

### Scenario (nominal): Wrap the pipe table at the caret
- GIVEN the caret in a pipe table
- WHEN Table with caption is run
- THEN the table is enclosed between :::{table} Caption and a closing fence and the word Caption is selected

### Scenario (refusal): Already captioned
- GIVEN the caret in a pipe table already inside a {table} directive
- WHEN the action is run
- THEN no edit is produced

### Scenario (nominal): Caret in a paragraph
- GIVEN the caret in a paragraph
- WHEN Table with caption is run
- THEN a :::{table} Caption directive holding a two-column table with one empty row is inserted on its own lines, after the selection, with the word Caption selected

### Scenario (boundary): Caret in another table form
- GIVEN the caret in a {list-table} or an HTML table
- WHEN the action is run
- THEN a new captioned table is inserted after the selection

### Known issues
- Known issue: Only a pipe table is wrapped: with the caret inside a {list-table} or an HTML table the action does not recognise it and inserts a new captioned table at the caret position, which can land in the middle of that table.

### Related requirements
- SwRS-MDOKFSTUDIO-TABLE-106: the palette modes in which Table with caption is offered (MyST mode).

### Verification notes
- Method: test/page/modules/editActions.test.ts (T30: tableCaption wraps the pipe table at the caret, or inserts a new one; wrap and paragraph scenarios; the "Already captioned" refusal and the other table forms are read from tableCaption in src/page/modules/tableEditActions.ts and are untested; the mode rule is checked by the test that ref, doc, cite, dropdown, tableCaption and roleKbd are myst-only without shortcut).
- Criteria: The wrapped or inserted text and the selection of the word Caption.
