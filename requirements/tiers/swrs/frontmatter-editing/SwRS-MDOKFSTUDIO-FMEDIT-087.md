---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-087
uuid: 1868217f-eebf-4261-912d-06928511461a
title: A tall properties table scrolls to both ends at 460 px and returns to
  line 1 on source sync
description: When the preview is 460 px wide in edit mode with a tall properties
  table, the extension SHALL keep the table scrollable to both ends and return
  the preview to line 1 on a source sync to line 1.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-001; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMEDIT-001
default_owner_email: gaetan@xeberon.net
---

## A tall properties table scrolls to both ends at 460 px and returns to line 1 on source sync

### Normative behavior

When the preview is 460 px wide in edit mode with a tall properties table, the extension SHALL keep the table scrollable to both ends and return the preview to line 1 on a source sync to line 1.

### Scenario: Nominal

- GIVEN edit mode on at 460 px with a tall properties table
- WHEN the writer scrolls the preview to the bottom and back to the top
- THEN both ends of the table are reached and the page has no horizontal scroll

### Scenario: Boundary or refusal

- GIVEN the preview scrolled down within the tall table
- WHEN the source editor syncs to line 1
- THEN the preview returns to the top, with line 1 visible

### Verification notes

- Method: Visual scenario frontmatter-editing/v06-okf-schema-narrow-scroll-stress-edit-dark-460.
- Criteria: Real browser at 460 px width; scroll positions are asserted at the bottom, at the top and after the source sync to line 1.
