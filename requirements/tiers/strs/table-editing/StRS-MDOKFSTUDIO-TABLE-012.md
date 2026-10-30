---
type: StRS
id: StRS-MDOKFSTUDIO-TABLE-012
uuid: 60db3987-1c5f-49dd-8dad-40bdd427cc58
title: Tables and cell text are formatted, inserted, aligned and captioned
description: When a writer applies bold, italic, a link, a colour or another
  inline format in a table cell editor, or chooses Table, HTML table, Column
  alignment or Table with caption in the palette or the slash menu, the Studio
  SHALL change only the cell text and keep the row intact, or insert or change
  the table at the caret.
project: markdown-okf-schema-studio
scope: table-editing
req_lifecycle: approved
status: stable
approved_by: gaetan@xeberon.net
approved_at: '2026-10-28T00:00:00Z'
verified:
  by: human:gaetan@xeberon.net
  at: '2026-10-28T00:00:00Z'
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I format text in a cell from the bar or with a shortcut
  and the table keeps its shape; I insert a table of the size I want, align a
  column, give the table a caption or turn it into an HTML table without typing
  the Markdown by hand.
derived_by:
- SwRS-MDOKFSTUDIO-PALETTE-031
- SwRS-MDOKFSTUDIO-TABLE-018
- SwRS-MDOKFSTUDIO-TABLE-085
- SwRS-MDOKFSTUDIO-TABLE-091
- SwRS-MDOKFSTUDIO-TABLE-106
- SwRS-MDOKFSTUDIO-TABLE-111
- SwRS-MDOKFSTUDIO-TABLE-115
- SwRS-MDOKFSTUDIO-TABLE-117
default_owner_email: gaetan@xeberon.net
---

## Tables and cell text are formatted, inserted, aligned and captioned

### Normative behavior

When a writer applies bold, italic, a link, a colour or another inline format in a table cell editor, or chooses Table, HTML table, Column alignment or Table with caption in the palette or the slash menu, the Studio SHALL change only the cell text and keep the row intact, or insert or change the table at the caret.

### Preserved stakeholder intent

Writers expect formatting a cell to be as simple as formatting a paragraph, and a new table to need no hand-written pipes.

As a writer, I format text in a cell from the bar or with a shortcut and the table keeps its shape; I insert a table of the size I want, align a column, give the table a caption or turn it into an HTML table without typing the Markdown by hand.

### Rationale and constraints

- The cell formatting group joins the table bar after a separator and offers only the actions that make sense in a cell (never block-only actions).
- A pipe typed in a cell is saved escaped; text inserted from the bar or pasted into the cell cannot split the row.
- Table inserts a pipe table of 1 to 9 rows and 1 to 9 columns (the header counts as a row) after the selection and on its own lines; with the caret inside a pipe table, a `{list-table}` or an HTML table, the new table (Table, HTML table, Table with caption) goes after that table and never splits it.
- Column alignment (GFM and MyST) rewrites only the delimiter cell of the caret's column; Table with caption (MyST) wraps the pipe table at the caret in a `{table}` directive.
- The size chooser popover and the palette buttons and slash entries themselves belong to the palette-slash scope.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-PALETTE-031](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-031.md): Palette popovers open in the frame, one at a time, and Escape or typing closes them
  - [SwRS-MDOKFSTUDIO-TABLE-018](../../swrs/table-editing/SwRS-MDOKFSTUDIO-TABLE-018.md): Enter, Done, leaving the cell or a click elsewhere commits the cell
  - [SwRS-MDOKFSTUDIO-TABLE-085](../../swrs/table-editing/SwRS-MDOKFSTUDIO-TABLE-085.md): The table bar's cell group formats the cell text
  - [SwRS-MDOKFSTUDIO-TABLE-091](../../swrs/table-editing/SwRS-MDOKFSTUDIO-TABLE-091.md): Pipes in cell text are escaped and line breaks become spaces
  - [SwRS-MDOKFSTUDIO-TABLE-106](../../swrs/table-editing/SwRS-MDOKFSTUDIO-TABLE-106.md): The Table action inserts a pipe table of the chosen size on its own lines
  - [SwRS-MDOKFSTUDIO-TABLE-111](../../swrs/table-editing/SwRS-MDOKFSTUDIO-TABLE-111.md): Column alignment sets the colons of the caret's column
  - [SwRS-MDOKFSTUDIO-TABLE-115](../../swrs/table-editing/SwRS-MDOKFSTUDIO-TABLE-115.md): Table with caption wraps the table at the caret in a table directive
  - [SwRS-MDOKFSTUDIO-TABLE-117](../../swrs/table-editing/SwRS-MDOKFSTUDIO-TABLE-117.md): HTML table converts or inserts an HTML table
<!-- okf:links:end -->
