---
type: StRS
id: StRS-MDOKFSTUDIO-TABLE-002
uuid: 5cb21c3e-3400-4504-af28-31691e903327
title: A table row or column moves by its handle in edit mode
description: While a writer edits a document, the Studio SHALL show a handle
  beside each body row and above each column of a table, and moving a row or a
  column by dragging its handle or with the keyboard SHALL reorder the rows or
  the columns as one undoable edit.
project: markdown-okf-schema-studio
scope: table-editing
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I reorder the rows and the columns of a table by
  dragging a handle, or with the keyboard, without cutting and pasting lines or
  cells, and one undo puts them back.
derived_by:
- SwRS-MDOKFSTUDIO-TABLE-002
- SwRS-MDOKFSTUDIO-TABLE-007
---

## A table row or column moves by its handle in edit mode

### Normative behavior

While a writer edits a document, the Studio SHALL show a handle beside each body row and above each column of a table, and moving a row or a column by dragging its handle or with the keyboard SHALL reorder the rows or the columns as one undoable edit.

### Preserved stakeholder intent

Writers expect to reorder the rows and the columns of a table the way they reorder the items of a list: grab a handle and drop the row or the column where it belongs.

As a writer, I reorder the rows and the columns of a table by dragging a handle, or with the keyboard, without cutting and pasting lines or cells, and one undo puts them back.

### Rationale and constraints

- Only the body rows of a pipe table or a `{list-table}` move; the header rows stay in place. An HTML table and a captioned `{table}` show no handle.
- The handle is the same mark as the one of the frontmatter list editor; it sits just left of the table, outside it, centred on its row, and shows in edit mode only.
- The handle of a column is the same mark, turned; it sits just above the table, outside its cells, centred on its column. Only a pipe table and a `{list-table}` show them.
- A move is one edit of the document, so one undo reverts it.
