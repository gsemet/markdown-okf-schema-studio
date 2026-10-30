---
type: StRS
id: StRS-MDOKFSTUDIO-TABLE-001
uuid: 43391917-cb2b-4d07-9f6e-80fe7087472d
title: A writer edits a table cell in place and never loses the text
description: When a writer in edit mode clicks a cell of a pipe table, the
  Studio SHALL open an editor for the raw Markdown of that cell inside the cell,
  growing the cell to fit while the table keeps its layout, save the text
  shortly after typing stops, keep every change when the writer moves to another
  cell, commit on Enter, Done or leaving the cell, drop the text on Escape or
  Cancel, and save the typed text before the preview leaves the document.
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
user_need: As a writer, I click a table cell in edit mode and edit its Markdown
  right where it is, without the table moving or the other columns changing
  width; I move between cells without losing a change; I finish a cell with
  Enter, with Done or by clicking elsewhere; I press Escape or Cancel and the
  cell goes back to what it was; I follow a link, press Back or switch tab and
  my text is in the document; and I am told why when a cell could not be opened
  or saved.
derived_by:
- SwRS-MDOKFSTUDIO-BLOCK-205
- SwRS-MDOKFSTUDIO-BLOCK-228
- SwRS-MDOKFSTUDIO-TABLE-001
- SwRS-MDOKFSTUDIO-TABLE-006
- SwRS-MDOKFSTUDIO-TABLE-013
- SwRS-MDOKFSTUDIO-TABLE-018
- SwRS-MDOKFSTUDIO-TABLE-025
- SwRS-MDOKFSTUDIO-TABLE-026
- SwRS-MDOKFSTUDIO-TABLE-027
- SwRS-MDOKFSTUDIO-TABLE-030
- SwRS-MDOKFSTUDIO-TABLE-034
default_owner_email: gaetan@xeberon.net
---

## A writer edits a table cell in place and never loses the text

### Normative behavior

When a writer in edit mode clicks a cell of a pipe table, the Studio SHALL open an editor for the raw Markdown of that cell inside the cell, growing the cell to fit while the table keeps its layout, save the text shortly after typing stops, keep every change when the writer moves to another cell, commit on Enter, Done or leaving the cell, drop the text on Escape or Cancel, and save the typed text before the preview leaves the document.

### Preserved stakeholder intent

Writers expect a table to be edited where it is shown, one cell at a time, with the same safety as a block editor.

A cell I did not change leaves the document untouched, and the preview never silently does nothing when the host refuses.

As a writer, I click a table cell in edit mode and edit its Markdown right where it is, without the table moving or the other columns changing width; I move between cells without losing a change; I finish a cell with Enter, with Done or by clicking elsewhere; I press Escape or Cancel and the cell goes back to what it was; I follow a link, press Back or switch tab and my text is in the document; and I am told why when a cell could not be opened or saved.

### Rationale and constraints

- The editor shows the raw Markdown of the cell, for example `**y**`, not the rendered text.
- Only a well-formed pipe table opens a cell editor; any other table source (a `{list-table}`, an HTML table, a `{table}` directive block, a malformed delimiter row) opens the whole block in the raw Markdown editor instead.
- A bare `http://`, `https://` or `www.` URL typed in a table cell renders as a link in the read view; that rendering is specified by SwRS-MDOKFSTUDIO-GFM-001 and not restated here.
- Wide tables that scroll inside their own box are specified by the layout-width scope (SwRS-MDOKFSTUDIO-LAYOUT-032).
- Every save carries the whole table, not only the edited cell.
- The writer keeps one editing session for all the cells visited in one table, so the whole session is one undo step in the document (the host side belongs to the block-editing scope).
- After a save, the table is put back at the same place on screen.
- A cell editor never stays open without the focus: leaving the text box for anything outside the cell editor, its Done and Cancel buttons and the table bar commits the cell.
- A click on a block outside the table saves the cell first and opens the other block afterwards.
- A cell cannot contain a line break typed by keyboard: Enter always finishes the cell.
- Escape works wherever the focus is while a cell editor is open, but not during an input-method (IME) composition.
- Nothing is saved after a cancel, and a later loss of focus changes nothing.
- Restoring the table after an autosave is the same host behaviour as for block editors (see SwRS-MDOKFSTUDIO-BLOCK-053).
- The text is saved before the navigation; the host side belongs to the block-editing scope (see SwRS-MDOKFSTUDIO-BLOCK-205).
- Turning edit mode off while a cell is open saves the cell like Done.
- When the page is hidden or closed, typing that is still waiting to be saved is sent at once; the editor is not closed because the page is going away.
- The causes of a refusal (stale revision, changed text, read-only preview) are host-side and belong to the block-editing and trust-security scopes; in a read-only preview edit mode is unavailable, so no cell editor opens.
- The refusal message is shown in the status line of the editor: in the table bar once the cell text box exists, and in the cell editor while the source is loading; the navigation that waited for the save does not carry on.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-BLOCK-205](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-205.md): Open editors are saved before the page hides or leaves the document
  - [SwRS-MDOKFSTUDIO-BLOCK-228](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-228.md): Opening, saving and closing an editor keep the reading position
  - [SwRS-MDOKFSTUDIO-TABLE-001](../../swrs/table-editing/SwRS-MDOKFSTUDIO-TABLE-001.md): A click on a pipe table cell opens a cell editor in place
  - [SwRS-MDOKFSTUDIO-TABLE-006](../../swrs/table-editing/SwRS-MDOKFSTUDIO-TABLE-006.md): The cell text box wraps and fits its text in the block editor font
  - [SwRS-MDOKFSTUDIO-TABLE-013](../../swrs/table-editing/SwRS-MDOKFSTUDIO-TABLE-013.md): A cell edit saves the whole table and moves between cells without reopening
  - [SwRS-MDOKFSTUDIO-TABLE-018](../../swrs/table-editing/SwRS-MDOKFSTUDIO-TABLE-018.md): Enter, Done, leaving the cell or a click elsewhere commits the cell
  - [SwRS-MDOKFSTUDIO-TABLE-025](../../swrs/table-editing/SwRS-MDOKFSTUDIO-TABLE-025.md): Escape cancels the cell edit, except during a composition
  - [SwRS-MDOKFSTUDIO-TABLE-026](../../swrs/table-editing/SwRS-MDOKFSTUDIO-TABLE-026.md): Cancelling after an autosave asks the host to restore the original table
  - [SwRS-MDOKFSTUDIO-TABLE-027](../../swrs/table-editing/SwRS-MDOKFSTUDIO-TABLE-027.md): The Cancel button does what Escape does
  - [SwRS-MDOKFSTUDIO-TABLE-030](../../swrs/table-editing/SwRS-MDOKFSTUDIO-TABLE-030.md): Following a link or pressing Back or Next saves an open cell first
  - [SwRS-MDOKFSTUDIO-TABLE-034](../../swrs/table-editing/SwRS-MDOKFSTUDIO-TABLE-034.md): A host refusal is shown in the cell and keeps the typed text
<!-- okf:links:end -->
