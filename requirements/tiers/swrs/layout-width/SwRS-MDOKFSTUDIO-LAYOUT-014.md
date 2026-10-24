---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-014
uuid: 2b69d5ae-72cc-4984-9336-2425b28257d2
title: A first-block editor gives up the width the toolbar covers
description: When the floating toolbar overlaps an open first-block editor and
  at least 320 px would remain, the extension SHALL shorten the frame by the
  width the toolbar covers through an inline-end inset, keeping the 40 px gap.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-005
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A first-block editor gives up the width the toolbar covers

### Normative behavior

When the floating toolbar overlaps an open first-block editor and at least 320 px would remain, the extension SHALL shorten the frame by the width the toolbar covers through an inline-end inset, keeping the 40 px gap.

### Scenario: Wide pane

- GIVEN a column from 0 to 900 px with a content box from 16 to 884 px, a toolbar from 600 to 850 px and an open first-block editor
- WHEN the clearance is measured
- THEN the inset is 292 px (884 minus 600 plus 8), the clearance is 0 and the inset is published as --sphinx-preview-first-inset

### Scenario: Start writing replaced by the editor

- GIVEN a hidden Start writing button because the editor replaced it, in the same wide pane
- WHEN the clearance is measured
- THEN it counts as an open first-block editor: clearance 0 and inset 292 px

### Known issues

- Known issue: Older documents (archive 004 T8, CHANGELOG 0.2.1) describe a 56 px first-block margin and a 24 px Start writing margin; the uniform 40 px with an inset replaces them. Visual scenarios v07 to v09 keep the older assertion of at least 20 px.

### Verification notes

- Method: Unit tests P3 an open first-block editor keeps its 40px gap and gives up the width the toolbar covers, and P3 a hidden Start writing button counts as an open first-block editor; visual first-element gap checks at 900 and 1600 px.
- Criteria: Inset equals the content right edge minus the toolbar left edge plus 8, and the clearance stays 0.
