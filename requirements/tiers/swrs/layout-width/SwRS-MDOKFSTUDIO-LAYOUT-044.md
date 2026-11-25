---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-044
uuid: 729a2d64-8e8c-4730-a97f-0cd0b84a8dbb
title: Auto keeps a table in the column when its minimum widths fit
description: When the width mode is Auto, the extension SHALL keep a table
  inside the text column when the sum of its column minimums fits the column,
  with a token column never wrapping at the width of its widest cell and a prose
  column keeping about 24 characters of the body font, and SHALL break the table
  out to its natural width, capped by the available area, when the minimums do
  not fit or a cell holds content that cannot shrink.
project: markdown-okf-schema-studio
scope: layout-width
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-003
scenarios:
- id: S1
  title: Tables that fit stay in the column
- id: S2
  title: Tables that do not fit break out
- id: S3
  title: Content that cannot shrink
- id: S4
  title: Tables without a plain grid and other width modes
- id: S5
  title: Table measured uncapped and rounded up
- id: S6
  title: Table with row handles in edit mode
- id: S7
  title: A cell editor keeps the breakout of its table
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/widthMode.ts
tested_in_files:
- test/page/tableBreakout.test.ts
default_owner_email: gaetan@xeberon.net
---

## Auto keeps a table in the column when its minimum widths fit

### Normative behavior

When the width mode is Auto, the extension SHALL keep a table inside the text column when the sum of its column minimums fits the column, with a token column never wrapping at the width of its widest cell and a prose column keeping about 24 characters of the body font, and SHALL break the table out to its natural width, capped by the available area, when the minimums do not fit or a cell holds content that cannot shrink.

### Scenario S1 (nominal): Tables that fit stay in the column
- GIVEN Auto mode and a column of 688 px
- WHEN a table is rendered with two columns (a code name and long prose), two prose columns, a short ID, a short status and prose, a task, owner, date and long notes, five columns of short numbers, or eight columns of numbers
- THEN no data-sphinx-preview-wide mark is set and the table is not wider than the column
- AND every cell of a token column (every body cell at most three words: inline code, a number, a date, an identifier) carries data-sphinx-preview-token, keeps its text on one line and has no minimum width of its own

### Scenario S2 (nominal): Tables that do not fit break out
- GIVEN Auto mode, a column of 688 px and a pane of 1100 px
- WHEN a table is rendered with four prose columns, a long code path column, a long URL column, ten columns of tick marks, six mixed columns with code names, or identifiers in inline code longer than the column allows
- THEN the table is marked data-sphinx-preview-wide and takes its natural width, capped by the available area, and the page does not scroll sideways

### Scenario S3 (nominal): Content that cannot shrink
- GIVEN Auto mode and a MyST list table inside a figure
- WHEN a cell holds a code block, an admonition with a code block, or a word longer than the column allows
- THEN the table breaks out, measured through the table inside its figure

### Scenario S4 (boundary): Tables without a plain grid and other width modes
| Input | Outcome |
| --- | --- |
| A table with merged cells, a nested table or no rows | Keeps the natural width rule of SwRS-MDOKFSTUDIO-LAYOUT-023 |
| The width mode leaves Auto | Every data-sphinx-preview-token and data-sphinx-preview-wide mark is removed |
| Margin or Full width | The rule does not apply |

### Scenario S5 (nominal): Table measured uncapped and rounded up
- GIVEN a table whose scroll width is 900 and whose box is 900.4 px wide, in a 700 px column
- WHEN the width mode is set to Auto
- THEN the breakout is 201 px, not 200 px, so that no cell wraps in the broken-out table
- AND during the measurement the table carries data-sphinx-preview-measuring, which lifts its max-width, and the attribute is removed afterwards

### Scenario S6 (nominal): Table with row handles in edit mode
- GIVEN Auto mode, edit mode, a column of 700 px, a pane of 1000 px and a table carrying data-okf-row-handles that needs 1600 px
- WHEN the elements are measured
- THEN the breakout is 232 px (1000 minus two 34 px handle gutters minus 700), so the table keeps room for its row handles on its left and never takes the row shift
- AND the measurement lifts the !important row-handle cap too, so the measured width, the breakout and the scroll position stay stable while the reader scrolls

### Scenario S7 (nominal): A cell editor keeps the breakout of its table

- GIVEN Auto mode and a wide table with an open cell editor (a textarea inside a table cell frame, the table stays rendered)
- WHEN the editor moves to another cell (Tab, arrows, click) or the page resizes
- THEN the table keeps the breakout it had when the editor opened, and is measured again with the editor in place after a real resize

| Input | Outcome |
| --- | --- |
| A wide table with an open cell editor (a textarea inside a table cell frame, the table stays rendered) in Auto mode | Marked wide; keeps the breakout it had when the editor opened, and the editor moving to another cell (Tab, arrows, click) changes nothing |
| A table that fits the column with a cell editor opened | Not marked wide; the minimum width of the edited cell (SwRS-MDOKFSTUDIO-TABLE-006) does not make it break out |
| A table with an open cell editor and a real resize (pane, table-of-contents column, toolbar, zoom: the column, pane, reserve or shift changes) | Measured again, with the editor in place |
| A table whose column minimums fit the column | Not marked wide, even when its natural width is larger |

### Verification notes

- Method: test/page/tableBreakout.test.ts opens the real preview page in headless Chromium (light and dark), renders the twelve reviewed cases and the cells that cannot shrink, and reads the wide mark, the width and the column.
- Method: test/page/tableBreakout.test.ts (cell editor versus source editor, real Chromium, light and dark, edit mode on, the cell editor frame built as blockEditor.ts builds it): `Auto keeps the breakout of a table while a cell is edited, in every cell it moves to` (the width stays equal in six cells), `Auto keeps a table that fits the column in the column while a cell is edited`, `Auto measures a table again on a real resize while a cell is edited`, `Auto gives the column width to a table edited as source, or holding another editor field`.
- Method: test/core/preview/previewStyles.test.ts (table with row handles): unit test `T10: the auto measure lifts every cap, the row-handle one included`.
- Method: test/page/runtimePageControls.test.ts (the table cases of the breakout): T10b a wide table gets its fractional max-content width rounded up, so no cell wraps; T10b a table with row handles keeps their room left of it when it breaks out; visual scenario v84 (table uncapped and rounded up)
- Known issue: A table first measured while its cell editor is already open (the page renders again with the editor restored) has no earlier verdict to keep, so it is measured with the minimum width of the edited cell (SwRS-MDOKFSTUDIO-TABLE-006). After a real resize, or when the width mode comes back to Auto while a cell editor is open, the table is measured again with the editor in place the same way, so it can then break out wider, or leave the column, because of that minimum.
- Criteria: the verdicts above hold at a column of 688 px; the prose minimum is a constant of the runtime calibrated on the studio font.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LAYOUT-003](../../strs/layout-width/StRS-MDOKFSTUDIO-LAYOUT-003.md): A reader chooses how wide the text column is
<!-- okf:links:end -->
