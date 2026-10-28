---
type: StRS
id: StRS-MDOKFSTUDIO-TABLE-008
uuid: b3ec55fb-0d3b-4731-989b-a33159382be4
title: A table bar locates the writer and edits rows and columns
description: While a writer edits a table cell, the Studio SHALL show a labelled
  bar of table actions directly above the table with the position of the
  selected cell, without covering any row, keep it in view for a tall table, and
  add or remove the row or column next to the selected cell when a row or column
  button is pressed, keeping the editor open on the new position.
project: markdown-okf-schema-studio
scope: table-editing
lifecycle: proposed
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I see the table actions with text labels above the table
  and I always know which header or row and which column I am in; I add or
  delete a row or a column with one button and keep typing where I was; and I
  scroll down a long table while editing with the row and column buttons within
  reach.
derived_by:
- SwRS-MDOKFSTUDIO-TABLE-001
- SwRS-MDOKFSTUDIO-TABLE-003
- SwRS-MDOKFSTUDIO-TABLE-004
- SwRS-MDOKFSTUDIO-TABLE-005
- SwRS-MDOKFSTUDIO-TABLE-048
- SwRS-MDOKFSTUDIO-TABLE-055
- SwRS-MDOKFSTUDIO-TABLE-064
- SwRS-MDOKFSTUDIO-TABLE-118
default_owner_email: gaetan@xeberon.net
---

## A table bar locates the writer and edits rows and columns

### Normative behavior

While a writer edits a table cell, the Studio SHALL show a labelled bar of table actions directly above the table with the position of the selected cell, without covering any row, keep it in view for a tall table, and add or remove the row or column next to the selected cell when a row or column button is pressed, keeping the editor open on the new position.

### Preserved stakeholder intent

Writers expect the actions on a table to be visible, named and close to the cell they are editing.

As a writer, I see the table actions with text labels above the table and I always know which header or row and which column I am in; I add or delete a row or a column with one button and keep typing where I was; and I scroll down a long table while editing with the row and column buttons within reach.

### Rationale and constraints

- The bar appears with the first cell editor of a table, stays while the writer moves between cells and is removed when the editor closes.
- It carries five labelled buttons (Row +, Row −, Col +, Col −, List table) in three groups, and a status such as "Header · column 1 of 2" or "Row 1 of 2 · column 2 of 2".
- The header row, the last body row and the last column cannot be deleted from the bar.
- A row operation changes the source by one line; a column operation rewrites the whole table in one fixed style, so the table's own padding and indentation are lost.
- The bar stays just under the sticky band or the preview controls, never past the end of the table; it moves without moving the table text, and a bar that is very tall compared with the pane stays where it is.
- A bar that appears hidden under the sticky headings or the preview controls is scrolled into view when that does not push the selected cell out of the pane.
- Known issue: the separator before the cell formatting group can stay at the end of a line when the group wraps in a narrow pane.
- Known issue: a column operation rewrites the whole table in one fixed style, so the table's own padding and indentation are lost.
