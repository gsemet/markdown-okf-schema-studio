---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-017
uuid: 7e191c11-2ef8-4450-a4ec-b4de7d56214f
title: The toolbar bottom edge is published for the sticky palette
description: "When the floating toolbar shares horizontal space with the text column,
  the extension SHALL publish its bottom edge plus 8 px as --sphinx-preview-toolbar-bottom,
  and 0 otherwise."
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-004
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-LAYOUT-018; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-LAYOUT-018
---

## The toolbar bottom edge is published for the sticky palette

### Normative behavior

When the floating toolbar shares horizontal space with the text column, the extension SHALL publish its bottom edge plus 8 px as --sphinx-preview-toolbar-bottom, and 0 otherwise.

### Scenario: Toolbar over the column

- GIVEN a 460 px column and a toolbar from 200 to 450 px ending at 84 px
- WHEN the clearance is measured
- THEN --sphinx-preview-toolbar-bottom is 92px

### Scenario: Toolbar beside the column

- GIVEN a 600 px column from 100 px and a toolbar from 800 px
- WHEN the clearance is measured
- THEN the toolbar bottom is 0px

### Known issues

- Known issue: Part of the sticky edit bar behaviour belongs to the palette requirements; only the toolbar clearance input is specified here and the sticky behaviour has no layout-width visual scenario.

### Verification notes

- Method: Unit tests P4 the toolbar's bottom edge is published for the sticky palette only where it overlaps the column, and P3 an open first-block editor keeps its 40px gap and gives up the width the toolbar covers.
- Criteria: Published values equal the bottom edge plus 8 on overlap, 0 otherwise.
