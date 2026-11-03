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

### Scenario (nominal): Tables that fit stay in the column
- GIVEN Auto mode and a column of 688 px
- WHEN a table is rendered with two columns (a code name and long prose), two prose columns, a short ID, a short status and prose, a task, owner, date and long notes, five columns of short numbers, or eight columns of numbers
- THEN no data-sphinx-preview-wide mark is set and the table is not wider than the column
- AND every cell of a token column (every body cell at most three words: inline code, a number, a date, an identifier) carries data-sphinx-preview-token, keeps its text on one line and has no minimum width of its own

### Scenario (nominal): Tables that do not fit break out
- GIVEN Auto mode, a column of 688 px and a pane of 1100 px
- WHEN a table is rendered with four prose columns, a long code path column, a long URL column, ten columns of tick marks, six mixed columns with code names, or identifiers in inline code longer than the column allows
- THEN the table is marked data-sphinx-preview-wide and takes its natural width, capped by the available area, and the page does not scroll sideways

### Scenario (nominal): Content that cannot shrink
- GIVEN Auto mode and a MyST list table inside a figure
- WHEN a cell holds a code block, an admonition with a code block, or a word longer than the column allows
- THEN the table breaks out, measured through the table inside its figure

### Scenario (boundary): Tables without a plain grid and other width modes
| Input | Outcome |
| --- | --- |
| A table with merged cells, a nested table or no rows | Keeps the natural width rule of SwRS-MDOKFSTUDIO-LAYOUT-023 |
| The width mode leaves Auto | Every data-sphinx-preview-token and data-sphinx-preview-wide mark is removed |
| Margin or Full width | The rule does not apply |

### Verification notes

- Method: test/page/tableBreakout.test.ts opens the real preview page in headless Chromium (light and dark), renders the twelve reviewed cases and the cells that cannot shrink, and reads the wide mark, the width and the column.
- Criteria: the verdicts above hold at a column of 688 px; the prose minimum is a constant of the runtime calibrated on the studio font.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LAYOUT-003](../../strs/layout-width/StRS-MDOKFSTUDIO-LAYOUT-003.md): A reader chooses how wide the text column is
<!-- okf:links:end -->
