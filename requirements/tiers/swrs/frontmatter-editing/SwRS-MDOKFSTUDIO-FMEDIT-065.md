---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-065
uuid: aaa1c0b1-1f70-48db-b2b9-e94e85ac3096
title: "A field editor opens and closes on Escape in a 460 px preview without page
  overflow"
description: "When the preview is 460 px wide in edit mode, the extension SHALL open
  a field editor on click and close it on Escape without horizontal overflow of the
  page."
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
superseded_by:
- SwRS-MDOKFSTUDIO-FMEDIT-001
default_owner_email: gaetan@xeberon.net
---

## A field editor opens and closes on Escape in a 460 px preview without page overflow

### Normative behavior

When the preview is 460 px wide in edit mode, the extension SHALL open a field editor on click and close it on Escape without horizontal overflow of the page.

### Scenario: Nominal

- GIVEN edit mode on at 460 px with a tall properties table
- WHEN the writer clicks the value cell of the status field
- THEN a field editor opens in that cell and the page has no horizontal scroll

### Scenario: Boundary or refusal

- GIVEN the status editor open after typing a new value
- WHEN the writer presses Escape
- THEN the editor closes, the cell shows the original value, and the page has no horizontal scroll

### Verification notes

- Method: Visual scenario frontmatter-editing/v06-okf-schema-narrow-scroll-stress-edit-dark-460.
- Criteria: Real browser at 460 px width; the scroll part of that scenario is SwRS-MDOKFSTUDIO-FMEDIT-087.
