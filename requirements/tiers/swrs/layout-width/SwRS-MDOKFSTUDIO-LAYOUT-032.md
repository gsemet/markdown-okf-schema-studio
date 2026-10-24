---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-032
uuid: 6b7bd829-6114-45da-9702-814c9d39fdc2
title: A wide table scrolls inside its own box
description: When a table is wider than the pane outside Auto breakout, the
  extension SHALL let it scroll sideways inside its own box, limited to the
  column width, without widening the page.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-002
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A wide table scrolls inside its own box

### Normative behavior

When a table is wider than the pane outside Auto breakout, the extension SHALL let it scroll sideways inside its own box, limited to the column width, without widening the page.

### Scenario: Service-level table at 460 px

- GIVEN a service-level table in a 460 px pane in dark theme, Margin mode
- WHEN the table is scrolled to its end
- THEN the far-right column is reachable and the page has no sideways scroll

### Scenario: Sixteen-column table at 900 px

- GIVEN a table with sixteen columns in a 900 px pane in dark theme
- WHEN the table is scrolled to its end
- THEN the far-right column is reachable and the page has no sideways scroll

### Known issues

- Known issue: No unit test covers the scroll box rule itself beyond the overflow cue CSS. In Auto the table breaks out instead of scrolling.

### Verification notes

- Method: Visual scenarios v01 and v02 (no horizontal scroll and the far-right column scroll step); the table CSS is shared with unit-tested rules.
- Criteria: The page overflow is at most 1 px and the last column becomes visible.
