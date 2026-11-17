---
type: StRS
id: StRS-MDOKFSTUDIO-TABLE-014
uuid: 6577b070-a697-4be3-996f-fdc986e32512
title: A table edit changes only the lines it touches
description: When a writer saves a table edit, the Studio SHALL change only the
  lines the edit touched and keep the table's padding, alignment, escaping,
  indentation and line endings.
project: markdown-okf-schema-studio
scope: table-editing
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-234
user_need: As a reviewer, I see a one-line diff for a one-cell edit, and the
  table's layout in the source is the one the author wrote.
derived_by:
- SwRS-MDOKFSTUDIO-TABLE-094
supersedes:
- StRS-MDOKFSTUDIO-TABLE-011
default_owner_email: gaetan@xeberon.net
---

## A table edit changes only the lines it touches

### Normative behavior

When a writer saves a table edit, the Studio SHALL change only the lines the edit touched and keep the table's padding, alignment, escaping, indentation and line endings.

### Preserved stakeholder intent

## User Need

As a reviewer, I see a one-line diff for a one-cell edit, and the table's layout in the source is the one the author wrote.

### Rationale and constraints

- Saving an unchanged table gives back the original text byte for byte for compact, padded, no-spaces, aligned, no-outer-pipes, escaped, indented, CRLF and wider-than-padding tables.
- A column button keeps the padding, the indentation and the outer pipes of every line, and a pipe inside a code span splits a cell in the editor as it does in the preview.

### Main paths

#### Path 1: Save a cell edit

1. A cell editor is open in a pipe table
   - SwRS-MDOKFSTUDIO-TABLE-094: the writer edits one cell and only the line of that cell changes in the source
   - Option SwRS-MDOKFSTUDIO-TABLE-094 (nominal): an unchanged table gives back the original text
   - Option SwRS-MDOKFSTUDIO-BLOCK-234 (boundary): the line endings of the document are kept
2. Only the line of the cell is changed

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-TABLE-094](../../swrs/table-editing/SwRS-MDOKFSTUDIO-TABLE-094.md): Editing one cell changes exactly one line of the source
- Depends on:
  - [SwRS-MDOKFSTUDIO-BLOCK-234](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-234.md): Preview edits keep the line endings of the document
- Supersedes:
  - [StRS-MDOKFSTUDIO-TABLE-011](StRS-MDOKFSTUDIO-TABLE-011.md): A table converts between forms and a cell edit is a one-line change
<!-- okf:links:end -->
