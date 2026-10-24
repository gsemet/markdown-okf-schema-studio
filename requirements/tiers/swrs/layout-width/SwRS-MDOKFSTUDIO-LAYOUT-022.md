---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-022
uuid: 0a5691b9-e9e5-4ad1-8462-25465807d1e1
title: Margin width mode keeps blocks inside the text column
description: When the width mode is Margin, the extension SHALL keep tables,
  code blocks and figures inside the text column and let them scroll or wrap
  instead of leaving it.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-008
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Margin width mode keeps blocks inside the text column

### Normative behavior

When the width mode is Margin, the extension SHALL keep tables, code blocks and figures inside the text column and let them scroll or wrap instead of leaving it.

### Scenario: Wide table in Margin

- GIVEN Margin width mode, a column of 700 px and a table 900 px wide
- WHEN the preview is rendered
- THEN no element is marked data-sphinx-preview-wide and the table scrolls inside the column

### Scenario: Mode left

- GIVEN an element marked wide in Auto mode
- WHEN the mode returns to Margin
- THEN the mark and the breakout values are cleared

### Verification notes

- Method: Unit test T10 only elements wider than the column are flagged, and only in Auto; visual checks of width-mode breaks.
- Criteria: No wide mark exists in Margin and the page has no sideways scroll.
