---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-042
uuid: 0ec23e96-1ce8-40c7-9cd4-8a2207ae803f
title: A first-block editor's palette keeps its place unless the frame is under
  the toolbar
description: When the floating toolbar overlaps an open first-block editor, the
  extension SHALL publish --sphinx-preview-first-bar-bottom as 0 px when the
  frame gave up the toolbar width and as the toolbar bottom edge plus 8 px
  otherwise.
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
superseded_by:
- SwRS-MDOKFSTUDIO-LAYOUT-011
default_owner_email: gaetan@xeberon.net
---

## A first-block editor's palette keeps its place unless the frame is under the toolbar

### Normative behavior

When the floating toolbar overlaps an open first-block editor, the extension SHALL publish --sphinx-preview-first-bar-bottom as 0 px when the frame gave up the toolbar width and as the toolbar bottom edge plus 8 px otherwise.

### Scenario: Frame narrowed beside the toolbar

- GIVEN a column from 0 to 900 px, a toolbar from 600 to 850 px reaching down to 84 px and an open first-block editor
- WHEN the clearance is measured
- THEN the frame gives up 292 px, --sphinx-preview-first-bar-bottom is 0px and its palette stays in the 40 px place, while --sphinx-preview-toolbar-bottom is 92px

### Scenario: Frame pushed down in a narrow pane

- GIVEN a 460 px column, a toolbar from 200 to 450 px reaching down to 84 px and an open first-block editor
- WHEN the clearance is measured
- THEN the inset is 0 and --sphinx-preview-first-bar-bottom is 92px, so the palette sticks below the toolbar

### Known issues

- Known issue: The variable is 0 whenever the inset is above 0, including a leading properties table that gave up the toolbar width; only the first-block editor palette reads it, falling back to --sphinx-preview-toolbar-bottom when it is unset.

### Verification notes

- Method: Unit tests P3 an open first-block editor keeps its 40px gap and gives up the width the toolbar covers, and P3 a first-block editor in a pane too narrow to be narrowed is pushed below the toolbar (test/page/modules/firstClearance.test.ts).
- Criteria: The variable is 0px when the inset is above 0, otherwise it equals the toolbar bottom edge plus 8 px (92px for a toolbar ending at 84 px).
