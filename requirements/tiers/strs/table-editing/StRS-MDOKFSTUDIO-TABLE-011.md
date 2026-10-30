---
type: StRS
id: StRS-MDOKFSTUDIO-TABLE-011
uuid: 44a3d6be-0c92-4810-8fe2-2adc6fdaf449
title: A table converts between forms and a cell edit is a one-line change
description: When a writer asks to convert a table, the Studio SHALL write it in
  the other form without losing content, or change nothing and say why, and when
  a writer saves a table edit change only the lines the edit touched and keep
  the table's padding, alignment, escaping, indentation and line endings.
project: markdown-okf-schema-studio
scope: table-editing
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I convert a table between a Markdown pipe table, a MyST
  list-table and a simple HTML table, and I am told when a conversion is refused
  instead of silently losing content; as a reviewer, I see a one-line diff for a
  one-cell edit, and the table's layout in the source is the one the author
  wrote.
derived_by:
- SwRS-MDOKFSTUDIO-BLOCK-234
- SwRS-MDOKFSTUDIO-TABLE-070
- SwRS-MDOKFSTUDIO-TABLE-073
- SwRS-MDOKFSTUDIO-TABLE-074
- SwRS-MDOKFSTUDIO-TABLE-076
- SwRS-MDOKFSTUDIO-TABLE-080
- SwRS-MDOKFSTUDIO-TABLE-094
- SwRS-MDOKFSTUDIO-TABLE-102
default_owner_email: gaetan@xeberon.net
---

## A table converts between forms and a cell edit is a one-line change

### Normative behavior

When a writer asks to convert a table, the Studio SHALL write it in the other form without losing content, or change nothing and say why, and when a writer saves a table edit change only the lines the edit touched and keep the table's padding, alignment, escaping, indentation and line endings.

### Preserved stakeholder intent

Writers expect a table to change form without loss, and reviewers expect a small edit to be a small diff.

As a writer, I convert a table between a Markdown pipe table, a MyST list-table and a simple HTML table, and I am told when a conversion is refused instead of silently losing content; as a reviewer, I see a one-line diff for a one-cell edit, and the table's layout in the source is the one the author wrote.

### Rationale and constraints

- The conversion is available from the table bar (pipe table to list-table) and, in MyST mode, from the palette and the slash menu (List table and Pipe table); it is one edit, so one undo step.
- A conversion that would lose content is refused with a reason ending "Nothing was changed."; presentation (column alignment colons, `:widths:`) is dropped going to a list-table by design.
- The HTML table writer of the HTML table button belongs here as the third form.
- Saving an unchanged table gives back the original text byte for byte for compact, padded, no-spaces, aligned, no-outer-pipes, escaped, indented, CRLF and wider-than-padding tables.
- A column button keeps the padding, the indentation and the outer pipes of every line, and a pipe inside a code span splits a cell in the editor as it does in the preview.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-BLOCK-234](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-234.md): Preview edits keep the line endings of the document
  - [SwRS-MDOKFSTUDIO-TABLE-070](../../swrs/table-editing/SwRS-MDOKFSTUDIO-TABLE-070.md): The List table button converts the edited table in one final save
  - [SwRS-MDOKFSTUDIO-TABLE-073](../../swrs/table-editing/SwRS-MDOKFSTUDIO-TABLE-073.md): List table converts the table at the caret to a list-table in one edit
  - [SwRS-MDOKFSTUDIO-TABLE-074](../../swrs/table-editing/SwRS-MDOKFSTUDIO-TABLE-074.md): Pipe table converts the table at the caret to a pipe table in one edit
  - [SwRS-MDOKFSTUDIO-TABLE-076](../../swrs/table-editing/SwRS-MDOKFSTUDIO-TABLE-076.md): A conversion that would lose content is refused with a reason
  - [SwRS-MDOKFSTUDIO-TABLE-080](../../swrs/table-editing/SwRS-MDOKFSTUDIO-TABLE-080.md): A conversion keeps cells, escapes and alignment across forms
  - [SwRS-MDOKFSTUDIO-TABLE-094](../../swrs/table-editing/SwRS-MDOKFSTUDIO-TABLE-094.md): Editing one cell changes exactly one line of the source
  - [SwRS-MDOKFSTUDIO-TABLE-102](../../swrs/table-editing/SwRS-MDOKFSTUDIO-TABLE-102.md): Edge pipes are optional and only an escaped pipe stays in its cell
<!-- okf:links:end -->
