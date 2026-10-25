---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-091
uuid: 2edf16f4-a8f9-409f-b4d5-8bf4f88f8d3f
title: Pipes in cell text are escaped and line breaks become spaces
description: When the writer types text into a table cell or inserts text into a
  cell from the table bar, the extension SHALL write the pipes of that text as
  \| so that the edited row keeps its cell count, and replace every line break
  of text inserted from the bar with a space.
project: markdown-okf-schema-studio
scope: table-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TABLE-012
depends_on:
- SwRS-MDOKFSTUDIO-TABLE-102
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/tableCellEditor.ts
- src/page/modules/markdownTable.ts
- src/page/modules/textEditing.ts
tested_in_files:
- test/page/fmtableReqTable.requirements.test.ts
- test/page/modules/markdownTablePreservation.test.ts
- test/page/runtimePaletteActions.test.ts
---

## Pipes in cell text are escaped and line breaks become spaces

### Normative behavior

When the writer types text into a table cell or inserts text into a cell from the table bar, the extension SHALL write the pipes of that text as \| so that the edited row keeps its cell count, and replace every line break of text inserted from the bar with a space.

### Scenario (nominal): Typed pipe
- GIVEN the value a|b typed in a cell
- WHEN the table is saved
- THEN the source holds a\|b and the table parses back to the same number of cells

### Scenario (boundary): Pipe in a code span typed in a cell
- GIVEN the value `a|b` typed
- WHEN the table is saved
- THEN the pipe is left as typed (see the code-span rule of the cell splitting in SwRS-MDOKFSTUDIO-TABLE-102)

### Scenario (nominal): Link text and URL inserted from the bar
- GIVEN a link text and a URL that contain a pipe, inserted from the Link panel, a text with a pipe inside a code span, and a link text containing a line break
- WHEN the text is inserted
- THEN every unescaped pipe is written \|, also the one inside the code span, each line break is a space, and the row keeps its cell count and stays one line

### Scenario (boundary): Escaped pipes and line break pairs in text inserted from the bar
| Inserted text | Outcome |
| --- | --- |
| a pipe that is already escaped (\|) | left as it is |
| a pipe preceded by an odd number of backslashes in the cell | left as it is |
| a pipe preceded by an even number of backslashes (or none) | written \| |
| a CRLF pair | one space |
| a lone line feed or a lone carriage return | one space |
| the colour inserted from the bar | no test of its own for this rule (untested) |

### Scenario (boundary): Line break pasted into the cell text box
- GIVEN the clipboard holds "a\nb" and the cell text box is focused
- WHEN the writer pastes
- THEN the text box holds both lines, the autosave writes the line break into the table row and the source row is split in two lines

### Known issues
- Known issue: The cell text box has no paste handler and the table writer does not remove line breaks, so a pasted line break splits the row in the source and the table no longer renders as one row. Only text inserted from the bar is made cell-safe. While the line break is in the cell and makes the rows uneven, the List table button of the bar does nothing and shows no message, because the table text no longer parses.

### Related requirements
- SwRS-MDOKFSTUDIO-TABLE-102: the cell splitting that leaves a pipe in a code span or after a backslash inside its cell.
- SwRS-MDOKFSTUDIO-TABLE-070: the List table button that does nothing while the rows are uneven.

### Verification notes
- Method: test/page/modules/markdownTablePreservation.test.ts (typed pipe and pipe in a code span: every single-cell edit reparses and changes at most one line, value a|b).
- Method: test/page/runtimePaletteActions.test.ts (T35: link text and URL with a pipe are escaped and newlines become spaces in a cell; scenarios "Link text and URL inserted from the bar"; the rows of the boundary table are read from cellSafeEdit in src/page/modules/textEditing.ts and are untested).
- Method: test/page/fmtableReqTable.requirements.test.ts (a line break pasted into the cell text box is kept and written into the source row).
- Criteria: The saved line and the reparsed rows, the inserted text in the cell with the unchanged cell count, and a raw line break inside the saved row for the paste case.
