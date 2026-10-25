---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-002
uuid: 9ed73eee-c570-425c-a9de-10fa7124a37a
title: Table row handle reorders body rows in edit mode
description: When the writer drags the handle of a body row of a pipe table or a
  list-table in edit mode onto another row, or presses Alt+Up or Alt+Down on
  that handle, the extension SHALL move that row to the new position as one
  source edit and keep the header rows in place.
project: markdown-okf-schema-studio
scope: table-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TABLE-002
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/tableRowMove.ts
- src/page/modules/markdownTable.ts
tested_in_files:
- test/page/modules/listTableRowMove.test.ts
- test/page/modules/markdownTable.test.ts
- test/page/runtimeTableRowMove.test.ts
- test/visual/scenarioDefinitions2.ts
---

## Table row handle reorders body rows in edit mode

### Normative behavior

When the writer drags the handle of a body row of a pipe table or a list-table in edit mode onto another row, or presses Alt+Up or Alt+Down on that handle, the extension SHALL move that row to the new position as one source edit and keep the header rows in place.

### Scenario (nominal): Dragging the handle of a body row

| Input | Outcome |
| --- | --- |
| Edit mode on, a pipe table of a header and four body rows, the handle of the first body row dragged and dropped on the lower half of the third body row | The row sits after the third row; the document gets one text edit that only reorders the lines of the table, each line keeping its own spacing and indentation, and the document text outside the table is unchanged |
| The same drag dropped on the upper half of the third body row | The row sits before the third row |
| While the pointer is held over a row | The dragged row is dimmed and a line below or above the row under the pointer shows where the row would land, until the drop or the end of the drag |
| Dropped on the upper half of the row that follows it | The row keeps its place, nothing is requested from the host and the document is not edited |

### Scenario (nominal): Keyboard move with Alt+Up and Alt+Down

| Input | Outcome |
| --- | --- |
| Focus on the handle of the second body row, Alt+Down | The row swaps with the third body row as one edit, and after the render the focus is on the handle of the row at its new place |
| Alt+Up on the handle of the third body row | The row swaps with the second body row |
| Alt+Up on the handle of the first body row, or Alt+Down on that of the last | Nothing happens |
| Alt+Down repeated before the render of the previous move arrived | The repeat is ignored: the rows on the page are stale until the render arrives |

The chord is not also read as the move of the whole table block.

### Scenario (nominal): Moving a row of a `{list-table}`

| Input | Outcome |
| --- | --- |
| A `{list-table}` with `:header-rows: 1` and three body rows, the handle of the first body row dropped after the third | The first body item (the `* -` line and all its nested `-` cell lines, continuation lines, nested lists and the blank lines inside it) now follows the third; the directive line, the title, the options, the indentation, the fence and the blank lines between items stay where they were |
| `:header-rows: 2` (or 1, or 0 or absent: no header row) | The rows under the header count have a handle and move among themselves; the header rows have none and nothing is dropped into them |
| A list-table in a container (indented, or fenced with colons or backticks) | The move keeps the indentation, the fence style and the line endings of the source |
| A list-table written with an option block that is not readable (a non-numeric `:header-rows:`), or text between the options and the first item | The move is refused and the document is not edited |

### Scenario (nominal): The handle beside its row

| Input | Outcome |
| --- | --- |
| Edit mode on, a pipe table or a `{list-table}` with at least two body rows | Each body row shows the handle of the frontmatter list editor (named "Move table row") just left of the table, outside it and vertically centred on its row; the header rows show no handle |
| A table with less than a handle's width of room on its left (it fills the column in a narrow pane) | The table is pushed right by a handle's width, so every handle stays in the pane and is never clipped |
| A table wider than the pane, which scrolls sideways | The handles stay left of the table, outside its scrolling box, at the height of their row |
| A row that wraps onto several lines | Its handle is centred on the whole row |
| The page is resized or the zoom changes | The handles follow their rows |
| Edit mode switched off | The handles are gone and a pushed table returns to its place |
| A click on a handle | No cell editor opens |

### Scenario (refusal): Tables and states without a row move

| Input | Outcome |
| --- | --- |
| A table inside a figure that is not a `{list-table}` (a `{table}` with a caption), an HTML table, a table of an included file, and the properties table | No handle is shown |
| A pipe table with one body row | No handle is shown (nothing to reorder) |
| A drag or an Alt+Up or Alt+Down while a block editor, a cell editor or a frontmatter editor is open, or while a move waits for its render | The drag is cancelled or the key is ignored and nothing is requested |
| Edit mode off | No handle exists, so neither a drag nor a key moves a row |
| A drop on the header row, or a drag that ends outside the body rows | Nothing is requested from the host and the document is not edited |

### Scenario (refusal): The source of the table is refused or is not a pipe table or list-table

| Input | Outcome |
| --- | --- |
| The host answers the request for the table source with an error (a stale preview, another block being edited) | No edit is saved and the page tells the host the move is closed |
| The source the host returns is neither a pipe table nor a `{list-table}` that can be read as rows, or the move is refused by the table model (header row, index outside the body rows, same place) | No edit is saved and the page tells the host the move is closed |

### Scenario (boundary): One edit, one undo

- GIVEN a body row moved by drag or by key
- WHEN the move is saved
- THEN the page posts one `previewEditSave` of the whole table text (final) after one `previewEditOpen`, opens no cell editor, and the editor's undo restores the previous order in one step

### Known issues

- Known issue: A row handle only appears for a pipe table or a `{list-table}` written directly in the document. Rows of a captioned `{table}` and of an HTML table cannot be reordered with a handle.
- Known issue: A move needs every editor closed. A writer who holds a cell editor open has to leave it first, then drag; the drag is cancelled without a message.
- Known issue: A table that is pushed right in a narrow pane is a handle's width narrower in edit mode, so it may wrap its text earlier than in reading mode. The handles are placed for a left-to-right page.

### Related requirements

- SwRS-MDOKFSTUDIO-TABLE-055: the row and column buttons of the table bar, which work on the open cell editor.
- SwRS-MDOKFSTUDIO-TABLE-094: the serialization that keeps the unchanged lines of a table as written.

### Verification notes

- Method: test/page/modules/markdownTable.test.ts (moving a body row reorders the source lines and keeps each line as written; the table model refuses a move of the header, past the ends or onto the same place) for the row move on the source.
- Method: test/page/modules/listTableRowMove.test.ts (list-table items move whole with continuation lines, nested content and inner blank lines; `:header-rows:` 0, 1, 2 and 3; indented, colon-fenced, CRLF and unclosed directives; unreadable sources refused).
- Method: test/page/runtimeTableRowMove.test.ts (list-table handles under two header rows and a drag that saves the moved item; handles on body rows only; no handle on list-tables, captioned tables and one-row tables; drag with one save and no cell editor; drop in place requests nothing; drop on the header refused; Alt+Up and Alt+Down; refused or non-pipe source; click on a handle and drag while a cell editor is open).
- Method: visual scenarios table-editing/v06 to v08 (handles outside the tables, centred on their rows, and full-width table geometry in light, dark and cream), v15 to v20 (360 px pane: pushed tables) and v21 to v23 (a fourteen-column table scrolled sideways keeps its handles outside the scrolling box), v12 to v14 (list-table handles) and v09 to v11 (a real mouse drag held down: dimmed row, drop line, no editor).
- Criteria: the saved text equals the source with the lines reordered; the number of `previewEditSave` messages is one; the handle rectangle lies left of its table, inside the pane and centred on its row within 2 px; no cell breaks a word. A real VS Code window drag and the drop in the browser harness are not exercised (the visual harness has no host that answers a save).
