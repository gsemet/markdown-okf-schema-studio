---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-121
uuid: 2907a1ce-d7fc-43af-897d-cc52c5ffe1ed
title: A pipe table inside a quote or an admonition is edited cell by cell, its
  container prefix kept
description: When the writer clicks a cell of a pipe table inside a blockquote,
  a GFM alert or a MyST admonition in edit mode, the extension SHALL open the
  cell editor and the table bar, write every table line back with its container
  prefix, leave the other lines of the container unchanged, and fall back to the
  raw block editor when the table cannot be located safely.
project: markdown-okf-schema-studio
scope: table-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TABLE-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/blockSourceEditor.ts
- src/page/features/editMode.ts
- src/page/features/tableCellEditor.ts
- src/page/features/tableRowMove.ts
- src/page/modules/tableInContainer.ts
tested_in_files:
- test/integration/realInput/tableInContainer.ts
- test/page/modules/tableInContainer.test.ts
- test/page/runtimeTableInContainer.test.ts
- test/page/runtimeTableRowMove.test.ts
- test/visual/capture_table_in_container.py
- test/visual/tableInContainerScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## A pipe table inside a quote or an admonition is edited cell by cell, its container prefix kept

### Normative behavior

When the writer clicks a cell of a pipe table inside a blockquote, a GFM alert or a MyST admonition in edit mode, the extension SHALL open the cell editor and the table bar, write every table line back with its container prefix, leave the other lines of the container unchanged, and fall back to the raw block editor when the table cannot be located safely.

### Scenario (nominal): A cell of a quoted table, a GitHub alert table or a MyST admonition table

- GIVEN edit mode and a pipe table whose lines carry a container prefix (`> | Q1 | Q2 |` in a blockquote, `> | N1 | N2 |` under `> [!NOTE]`), or sit in the body of a MyST admonition directive (a `{note}` fence with an option line, a `:::{note}` block)
- WHEN the writer clicks a cell of that table
- THEN the page opens the cell editor and the table bar, as for a top-level table, not the raw block editor; typing and Enter save one edit whose text is the table's source lines with only the edited cell changed and the container prefix on every line (unit tests test/page/runtimeTableInContainer.test.ts "a click on a cell of a table inside a quote opens the cell editor and the table bar, not the raw editor", "typing in a quoted table and Enter save one edit of the container: only the edited line changes", test/page/modules/tableInContainer.test.ts "the table of a quote is read without its prefix and written back with it", "the table of a GitHub alert keeps the marker line byte for byte", "the table of a MyST directive keeps the fence and the option lines byte for byte")

### Scenario (nominal): Tab in the last cell adds a prefixed row

- GIVEN the cell editor open in the last cell of a quoted table
- WHEN the writer presses Tab, or presses a row or column button of the bar
- THEN the table is saved with the new row or column line carrying the same prefix as the other lines, and once the page renders the saved text the editor reopens in the same table, in the cell the action selects (unit tests test/page/runtimeTableInContainer.test.ts "Tab in the last cell of a quoted table adds a prefixed row and the editor reopens in that table", "the second of two tables in a quote is edited by its rank and reopens by its rank"; real input test/integration/realInput/tableInContainer.ts)

### Scenario (boundary): Which table and which prefix

| Input | Outcome |
| --- | --- |
| A nested quote (`> > | A | B |`) | Every line keeps both markers |
| A quote marker without a space (`>| A | B |`) | Written back as it is, the new lines too |
| Two tables in one quote, the second clicked | The table is found by its rank among the rendered tables of the block and the pipe tables of its source; the other table and the text between them stay byte for byte |
| Windows line endings | Kept on every line, the closing line break kept or absent as in the source |
| No change to the table | The saved text equals the source byte for byte |
| The table's lines do not share one prefix (a lazy line without `>`, `>` mixed with `> `) | The raw block editor opens |
| The rendered tables of the block and the pipe tables of the source differ in number | The raw block editor opens |
| The table text without its prefix does not parse | The raw block editor opens |
| Convert to list-table | Disabled, its title says "Not available for a table inside a quote or an admonition" |
| Row and column drag handles | Offered and working as on a top-level table, the source holding exactly one pipe table (otherwise a move is refused and nothing is saved); a move saves the table lines with the container prefix on every line (test/page/runtimeTableRowMove.test.ts "a row of a table inside a quote moves with the quote prefix kept on every line", "a column of a table inside a quote moves with the quote prefix kept on every line") |

### Related requirements

- SwRS-MDOKFSTUDIO-TABLE-001: the cell editor of a top-level table
- SwRS-MDOKFSTUDIO-TABLE-035: Tab from cell to cell and the reopen after a save
- SwRS-MDOKFSTUDIO-TABLE-070: the conversion to a list-table
- SwRS-MDOKFSTUDIO-TABLE-002: the move of a body row with its handle

### Verification notes

- Method: test/page/modules/tableInContainer.test.ts (the pure location and write-back of the table lines), test/page/runtimeTableInContainer.test.ts (the page: open, save, Tab, the reopen by rank, the refusals, the disabled conversion), test/page/runtimeTableRowMove.test.ts (the move of a row of a quoted table), the table-editing visual scenarios `table-editing/v33-cell-editor-in-quote-light-900` and `table-editing/v34-cell-editor-in-note-dark-900` (a real browser), test/integration/realInput/tableInContainer.ts (real mouse and keys, run by CI only).
- Criteria: a quoted, alert or admonition table opens the cell editor and the bar; a save changes only the table lines of the container and keeps their prefix; a table that cannot be located safely opens the raw block editor.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TABLE-001](../../strs/table-editing/StRS-MDOKFSTUDIO-TABLE-001.md): A writer edits a table cell in place and never loses the text
<!-- okf:links:end -->
