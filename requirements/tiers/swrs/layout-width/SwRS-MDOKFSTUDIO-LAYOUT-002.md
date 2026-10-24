---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-002
uuid: 48f423ae-3b6d-4ef8-b0e1-4f50c3011df8
title: The text column is capped and centred
description: When the preview is shown at 100 percent zoom in a pane wider than
  the configured maximum content width, the extension SHALL show a text column
  exactly that wide, centred in the pane.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## The text column is capped and centred

### Normative behavior

When the preview is shown at 100 percent zoom in a pane wider than the configured maximum content width, the extension SHALL show a text column exactly that wide, centred in the pane.

### Scenario: Default cap in a wide pane

- GIVEN the setting maxContentWidth at its default 960, Margin width mode, 100 percent zoom and a 1600 px pane
- WHEN the preview is rendered
- THEN the content column is 960 px wide and the free space is split equally left and right

### Scenario: Configured cap above the default

- GIVEN maxContentWidth set to 1400 and a 2000 px pane (visual scenario v85)
- WHEN the preview is rendered
- THEN the content column is exactly 1400 px wide and centred; in a pane narrower than the cap the column takes the pane width instead

### Known issues

- Known issue: The titles of visual scenarios v05 and v06 say full width but they assert only the 960 px column.

### Verification notes

- Method: Visual scenarios v05 and v06 (960 px column in a 1600 px pane) and v85 (1400 px column in a 2000 px pane), plus a unit test of the column rule.
- Criteria: The column box measures the cap in a wider pane and never exceeds the pane.
