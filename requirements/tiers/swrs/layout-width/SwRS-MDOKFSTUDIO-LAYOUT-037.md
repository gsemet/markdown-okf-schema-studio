---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-037
uuid: f64c6642-4e87-4ac3-8d07-132c4a30c04b
title: A leading properties table is pushed down for a control under the toolbar
description: When a left-aligned badge or link of a leading properties table
  sits under the floating toolbar, the extension SHALL push the table down just
  far enough to clear the toolbar.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-004
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-LAYOUT-011; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-LAYOUT-011
---

## A leading properties table is pushed down for a control under the toolbar

### Normative behavior

When a left-aligned badge or link of a leading properties table sits under the floating toolbar, the extension SHALL push the table down just far enough to clear the toolbar.

### Scenario: Left-aligned badge in a narrow pane

- GIVEN a 460 px column with a left-aligned badge at 250 to 310 px and a top of 45 px under a toolbar reaching 84 px
- WHEN the clearance is measured
- THEN the clearance is 47 px (toolbar bottom 84 plus 8 margin minus the badge top 45)

### Scenario: No control under the toolbar

- GIVEN a 900 px column whose controls are all clear of the toolbar
- WHEN the clearance is measured
- THEN the clearance and the inset are 0 and the table keeps its 40 px gap

### Verification notes

- Method: Unit tests P3 a left-aligned badge under the toolbar in a narrow pane is pushed below it, and P3 a properties table with no control under the toolbar keeps its 40px gap.
- Criteria: Clearance 47 px for the badge, 0 when no control is covered.
