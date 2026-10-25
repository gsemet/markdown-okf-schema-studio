---
type: StRS
id: StRS-MDOKFSTUDIO-TABLE-002
uuid: 5cb21c3e-3400-4504-af28-31691e903327
title: A table row moves by its handle in edit mode
description: While a writer edits a document, the Studio SHALL show a handle
  beside each body row of a table, and moving a row by dragging its handle or
  with the keyboard SHALL reorder the rows as one undoable edit.
project: markdown-okf-schema-studio
scope: table-editing
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I reorder the rows of a table by dragging a handle, or
  with the keyboard, without cutting and pasting lines, and one undo puts the
  row back.
derived_by:
- SwRS-MDOKFSTUDIO-TABLE-002
---

## A table row moves by its handle in edit mode

### Normative behavior

While a writer edits a document, the Studio SHALL show a handle beside each body row of a table, and moving a row by dragging its handle or with the keyboard SHALL reorder the rows as one undoable edit.

### Preserved stakeholder intent

Writers expect to reorder the rows of a table the way they reorder the items of a list: grab a handle and drop the row where it belongs.

As a writer, I reorder the rows of a table by dragging a handle, or with the keyboard, without cutting and pasting lines, and one undo puts the row back.

### Rationale and constraints

- Only the body rows of a pipe table or a `{list-table}` move; the header rows stay in place. An HTML table and a captioned `{table}` show no handle.
- The handle is the same mark as the one of the frontmatter list editor, and it shows in edit mode only.
- A move is one edit of the document, so one undo reverts it.
