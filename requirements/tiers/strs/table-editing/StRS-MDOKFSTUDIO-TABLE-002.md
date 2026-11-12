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
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I reorder the rows and the columns of a table by
  dragging a handle, or with the keyboard, without cutting and pasting lines or
  cells, and one undo puts them back.
derived_by:
- SwRS-MDOKFSTUDIO-TABLE-002
- SwRS-MDOKFSTUDIO-TABLE-007
default_owner_email: gaetan@xeberon.net
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

### Main paths

#### Path 1: Move a row

1. A table is shown in edit mode with a handle beside each body row
   - SwRS-MDOKFSTUDIO-TABLE-002: the writer drags the handle onto another row, or presses Alt+Up or Alt+Down, and the row moves as one source edit with the header rows kept
   - Option SwRS-MDOKFSTUDIO-TABLE-002 (refusal): a table or state without a row move
2. The row is at its new position

#### Path 2: Move a column

1. A table is shown in edit mode with a handle above each column
   - SwRS-MDOKFSTUDIO-TABLE-007: the writer drags the handle onto another column, or presses Alt+Left or Alt+Right, and the column moves
   - Option SwRS-MDOKFSTUDIO-TABLE-007 (refusal): a table or state without a column move
2. The column is at its new position

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-TABLE-002](../../swrs/table-editing/SwRS-MDOKFSTUDIO-TABLE-002.md): Table row handle reorders body rows in edit mode
  - [SwRS-MDOKFSTUDIO-TABLE-007](../../swrs/table-editing/SwRS-MDOKFSTUDIO-TABLE-007.md): Table column handle reorders columns in edit mode
<!-- okf:links:end -->
