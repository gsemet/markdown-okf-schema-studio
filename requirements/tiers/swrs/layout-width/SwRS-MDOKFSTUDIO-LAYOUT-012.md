---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-012
uuid: 5fad5c29-bb3e-4be7-b361-ad1cce77ceef
title: A first-block editor too narrow to be narrowed is pushed below the
  toolbar
description: When the floating toolbar covers an open first-block editor and
  giving up the toolbar width would leave the frame under 320 px, the extension
  SHALL push the frame down just far enough to clear the toolbar.
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

## A first-block editor too narrow to be narrowed is pushed below the toolbar

### Normative behavior

When the floating toolbar covers an open first-block editor and giving up the toolbar width would leave the frame under 320 px, the extension SHALL push the frame down just far enough to clear the toolbar.

### Scenario: Narrow pane

- GIVEN a 460 px column, a toolbar from 200 to 450 px reaching down to 84 px and an open first-block editor
- WHEN the clearance is measured
- THEN the clearance is 52 px (toolbar bottom 84 plus 8 margin minus 40 gap), the inset is 0 and the frame top is just below the toolbar

### Scenario: Plain text first element

- GIVEN the same pane with a plain paragraph as the first element
- WHEN the preview is rendered
- THEN the paragraph keeps its 40 px margin, because the clearance applies only to the first-block editor, the Start writing button and a leading properties table

### Known issues

- Known issue: The 480 px limit between wide and narrow is a rule of the visual tests only: the code decides by overlap with the toolbar and a 320 px minimum frame width, so a 481 px pane with a long toolbar could push content down as well.
- Known issue: A non-interactive first element, such as a paragraph or a table, is never pushed down: only the first-block editor, the Start writing button and a leading properties table take the clearance.

### Verification notes

- Method: Unit tests P3 first-block editor in a pane too narrow to be narrowed and the content top measured in document coordinates; visual first-element gap checks in panes of 480 px or less (down to 360 px).
- Criteria: Clearance equals toolbar bottom plus 8 minus content top minus 40, and never below 0.
