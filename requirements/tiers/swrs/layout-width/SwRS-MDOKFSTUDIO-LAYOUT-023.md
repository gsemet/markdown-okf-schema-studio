---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-023
uuid: fa4714cc-9f92-4a16-8606-54097bee0c8a
title: Auto width lets wide blocks break out of the column
description: When the width mode is Auto, the extension SHALL widen a table,
  figure, image, code block or Mermaid diagram that is wider than the text
  column to the width it needs, up to the available area, centred on that area.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-007
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Auto width lets wide blocks break out of the column

### Normative behavior

When the width mode is Auto, the extension SHALL widen a table, figure, image, code block or Mermaid diagram that is wider than the text column to the width it needs, up to the available area, centred on that area.

### Scenario: Wide table and oversized block

- GIVEN Auto mode, a column of 700 px, a pane of 1000 px, a table needing 900 px and a code block needing 1600 px
- WHEN the elements are measured
- THEN the table gets a breakout of 200 px; the code block is capped at the available area, a breakout of 268 px (1000 minus 32 gutters minus 700); an element not wider than the column is not marked

### Scenario: Column off the pane centre

- GIVEN the column starts 120 px from the pane edge so that it is 30 px off the pane centre
- WHEN the elements are measured
- THEN the breakout shift is 30 px, so the wide element is centred on the available area, and a narrow element keeps an empty shift

### Known issues

- Known issue: Only top-level blocks, or the paragraph holding only an image, break out.
- Known issue: No visual scenario combines the open table-of-contents column with Auto; the TOC case is a unit test only.

### Verification notes

- Method: Unit tests T10 only elements wider than the column are flagged, T10b a wide element is centred on the available area, and T10b a narrow element is not flagged; visual checks with a minimum margin of 15 px from the pane edge.
- Criteria: Breakout equals the needed width minus the column, capped at the pane minus the TOC reserve minus 32 px.
