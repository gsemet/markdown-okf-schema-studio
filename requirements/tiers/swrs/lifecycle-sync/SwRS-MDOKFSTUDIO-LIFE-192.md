---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-192
uuid: a1b850c5-77f8-467f-a981-e8bbd8e07947
title: The line marker marks the table row of the line
description: When the line marker is requested on a line of a pipe table, the
  page SHALL mark the row of that line, the header row for the delimiter line,
  wherever the table sits (top level, quote, alert, admonition, list item or tab
  item), and SHALL mark the top of the enclosing block for a line of a
  list-table, a captioned table, a raw HTML table or a line past the last row.
project: markdown-okf-schema-studio
scope: lifecycle-sync
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-023
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/mystTables.ts
- src/page/features/lineMarkerPlacement.ts
tested_in_files:
- test/core/render/markerLines.test.ts
- test/page/runtimeLineMarkerPlacement.test.ts
- test/visual/lineMarkerScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## The line marker marks the table row of the line

### Normative behavior

When the line marker is requested on a line of a pipe table, the page SHALL mark the row of that line, the header row for the delimiter line, wherever the table sits (top level, quote, alert, admonition, list item or tab item), and SHALL mark the top of the enclosing block for a line of a list-table, a captioned table, a raw HTML table or a line past the last row.

### Scenario (nominal): A body row of a pipe table

- GIVEN a page with a pipe table whose second body row is on source line 43
- WHEN the page receives previewRevealLine for line 43
- THEN one arrow and band are drawn on that row (its top and its height), and no row or cell gets a click target of its own

### Scenario (boundary): Rows, containers and fallbacks

| Input | Outcome |
| --- | --- |
| the header line L, body row n at L + n + 1 | each marks its own row |
| the delimiter line (the line after the header) | the marker sits on the header row |
| a table in a quote, an alert, an admonition, a list item or a tab item | the row is marked |
| a line of a list-table, a captioned table or a raw HTML table | the marker sits at the top of the enclosing block |
| a line past the last row of a table | the marker sits at the top of the enclosing block |
| a row with wrapped cells | the marker covers the whole height of the row |

### Verification notes

- Method: test/core/render/markerLines.test.ts (each row carries its source line, in every container, LF and CRLF), test/page/runtimeLineMarkerPlacement.test.ts (the row, the header row for the delimiter line, the block top as a fallback) and the CR-457 visual scenarios (they run on Linux and macOS CI, not on Windows).
- Criteria: each outcome of the tables above holds.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-023](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-023.md): A reader sees the line of a jump marked in the side preview, opens Studio at a line, and gets the raw text on request
<!-- okf:links:end -->
