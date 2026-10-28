---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-025
uuid: dfabd244-e18b-4bd2-a6f7-0afd42efd44f
title: Auto measures a wide table uncapped and rounds up
description: When the width mode is Auto, the extension SHALL measure a wide
  table without the column cap and round its width up to the next pixel so that
  no cell wraps in the broken-out table.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-003
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-LAYOUT-023; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-LAYOUT-023
default_owner_email: gaetan@xeberon.net
---

## Auto measures a wide table uncapped and rounds up

### Normative behavior

When the width mode is Auto, the extension SHALL measure a wide table without the column cap and round its width up to the next pixel so that no cell wraps in the broken-out table.

### Scenario: Fractional box

- GIVEN a table whose scroll width is 900 and whose box is 900.4 px wide, in a 700 px column
- WHEN the width mode is set to Auto
- THEN the breakout is 201 px, not 200 px

### Scenario: Cap lifted while measuring

- GIVEN a wide table in Auto
- WHEN the elements are measured
- THEN the table carries data-sphinx-preview-measuring during the measurement, which lifts its max-width, and the attribute is removed afterwards

### Verification notes

- Method: Unit test T10b a wide table gets its fractional max-content width rounded up, so no cell wraps; visual scenario v84.
- Criteria: Breakout is the ceiling of the largest of scroll width, declared width, intrinsic width and box width, minus the column.
