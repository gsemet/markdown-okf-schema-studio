---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-001
uuid: b5c9a484-7ed7-4aa6-83d5-80215338d6d6
title: A click on a pipe table cell opens a cell editor in place
description: When edit mode is on and the writer clicks a cell of a rendered
  pipe table, the extension SHALL open a region named "Markdown table cell
  editor" inside that cell, ask the host for the line range of the table block,
  and fill the cell text box with the raw Markdown of the cell or, when the
  block is not an editable pipe table, open the whole block in the raw Markdown
  editor.
project: markdown-okf-schema-studio
scope: table-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TABLE-001
- StRS-MDOKFSTUDIO-TABLE-008
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-014
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/blockEditor.ts
- src/page/features/blockSourceEditor.ts
- src/page/features/editMode.ts
- src/page/features/tableCellEditor.ts
- src/page/modules/markdownTable.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/page/fmtableReqTable.requirements.test.ts
- test/page/modules/markdownTable.test.ts
- test/page/runtimeTableCellEditor.test.ts
---

## A click on a pipe table cell opens a cell editor in place

### Normative behavior

When edit mode is on and the writer clicks a cell of a rendered pipe table, the extension SHALL open a region named "Markdown table cell editor" inside that cell, ask the host for the line range of the table block, and fill the cell text box with the raw Markdown of the cell or, when the block is not an editable pipe table, open the whole block in the raw Markdown editor.

### Scenario (nominal): Click on a body cell
- GIVEN edit mode on and a rendered pipe table with a header row and two body rows
- WHEN the writer clicks the second cell of the first body row
- THEN a region named "Markdown table cell editor" is placed inside that cell and the page posts one previewEditOpen request with the line and end line of the table block

### Scenario (refusal): Edit mode off
- GIVEN edit mode off and a rendered pipe table
- WHEN the reader clicks a cell
- THEN no cell editor opens and no previewEditOpen is posted

### Scenario (nominal): Loading status until the host sends the table source
- GIVEN a cell editor opened by a click and no previewEditSource answer yet
- WHEN the cell editor region is read
- THEN its only content is a status paragraph reading "Loading Markdown table source…", with no text box yet
- WHEN the page receives the answer with the table text
- THEN the status is replaced by the text box and the table bar, and the status now shows the position of the cell

### Scenario (nominal): The clicked cell is selected and its rendered content keeps its width
- GIVEN a cell editor open in a 900 px pane
- WHEN the page is inspected
- THEN the cell carries the attribute data-sphinx-preview-table-cell-selected and an outline, and its rendered content is wrapped in an aria-hidden element of height 0 that is invisible but still takes its width, so the column widths do not change
- WHEN the editor of that cell is closed by Escape
- THEN the selected mark is removed and the rendered content is back in the cell

### Scenario (nominal): The text box holds the raw Markdown of the clicked cell
- GIVEN the table "| a | **y** |" over a delimiter row and a body row "| c | d |"
- WHEN the writer clicks the header cell "**y**" and, in another session, the body cell "d"
- THEN the text box holds "**y**" (not the rendered bold text) for the header cell, which is the first model row, and "d" for the body cell, because the delimiter row is skipped when the rendered row is mapped to the model
- GIVEN a cell written "|   padded   |"
- WHEN the cell is opened
- THEN the text box holds "padded": only the text between the delimiting pipes, trimmed

### Scenario (nominal): A click opens the cell with the focus in the text box and the caret at the end
- GIVEN a cell containing "alpha"
- WHEN the writer clicks the cell
- THEN the text box has the focus and the caret sits after the last character
- GIVEN an empty cell
- WHEN the writer clicks it
- THEN the text box has the focus with the caret at position 0, which is also its end

### Scenario (nominal): The cell editor region shows no status hint
- GIVEN a cell editor open
- WHEN the cell editor region and the table bar are read
- THEN the region holds the text box and the buttons only, and the status paragraph is inside the table bar
- GIVEN the editor moved to another cell
- WHEN the regions are read again
- THEN the region still holds no status and the bar status shows the new position

### Scenario (boundary): Only a well-formed pipe table opens a cell editor
A table is editable when it has a header row, a delimiter row whose cells are at least three dashes with optional colons (the delimiter rule is /^:?-{3,}:?$/ on each delimiter cell with spaces removed), and the same number of cells in every row.

| Input | Outcome |
| --- | --- |
| "\| a \| b \|\n\|---\|---\|\n\| c \| d \|" | parses into rows of two cells and opens a cell editor |
| the same with colons (":---", "---:", ":---:") | parses into rows of two cells and opens a cell editor |
| a table with no outer pipes | parses into rows of two cells and opens a cell editor |
| a single line | parse returns no table, no cell editor is built |
| a delimiter cell of two dashes ("--") | parse returns no table, no cell editor is built |
| a body row with three cells under a two-cell header | parse returns no table, no cell editor is built |

### Scenario (refusal): A block that is no editable pipe table opens in the raw Markdown editor
| Input | Outcome |
| --- | --- |
| a cell of a rendered MyST list-table, a raw HTML table or a table inside a {table} directive, in edit mode, after the host sends the block source | the cell shows its rendered content again, the region is renamed "Raw Markdown editor" and a text box labelled "Raw Markdown block" holds the whole block source |
| a pipe table whose rendered row has more cells than the parsed header, a cell beyond the parsed width clicked | the same fallback applies |

### Related requirements
- SwRS-MDOKFSTUDIO-BLOCK-014: a click in the frontmatter properties table never opens a block editor.

### Verification notes
- Method: test/page/runtimeTableCellEditor.test.ts (click and one previewEditOpen, selected mark and hidden-content wrapper, raw Markdown of the header and body cells via "table editing switches cells without losing changes and finalizes before leaving the table" and "table cell editing exposes row and column operations and saves the edited table", opening caret via "arrow keys move the table cell editor cell to cell in every direction", no status hint via "the table cell editor has Done and Cancel but no status hint").
- Method: test/page/fmtableReqTable.requirements.test.ts (loading status and its replacement; fallback to the raw Markdown editor for a source that is no pipe table or has no cell at the clicked position).
- Method: test/core/preview/previewStyles.test.ts (hidden content that keeps its width, and the 2 px focus-border outline of the selected cell in edit mode).
- Method: test/page/modules/markdownTable.test.ts (well-formed and malformed tables, "non-table blocks and malformed separator rows cannot be edited as pipe tables"; parse and splitRow for the trimmed text).
- Method: visual scenarios table-editing/v02 to v05 (click, selected cell, caret at the end in step open; v05 only repeats the assertions of v02 to v04) and table-editing/v01 to v05 (no status hint).
- Criteria: The region exists in the cell with the label "Markdown table cell editor" and exactly one previewEditOpen is posted for the click. The wrapper element carries data-sphinx-table-cell-content and aria-hidden, and the style makes it display block, height 0 and visibility hidden. The text box value equals the model cell, with rendered row 0 mapped to model row 0 and rendered row n to model row n+1. document.activeElement is the text box and selectionStart equals selectionEnd equals the text length. No element with the status attribute is a descendant of the cell editor region once the text box is rendered. parse returns a model for the well-formed inputs and undefined for the malformed ones. After the fallback answer the cell has no selected mark and the region holds a text box with the label "Raw Markdown block". The edit-mode-off refusal is read from the click handler in src/page/features/pageInput.ts and has no dedicated test; the empty-cell caret boundary has no dedicated test.
