---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-013
uuid: 56cc8642-2d35-4e49-927e-63fefa1b2ea0
title: Collapsing the toolbar measures the clearance again
description: When the toolbar is collapsed or expanded, the extension SHALL
  measure the first-element clearance again.
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

## Collapsing the toolbar measures the clearance again

### Normative behavior

When the toolbar is collapsed or expanded, the extension SHALL measure the first-element clearance again.

### Scenario: Collapse at 360 px

- GIVEN a 360 px pane in edit mode with the toolbar collapsed to its first row and a paragraph, then a table, as first element
- WHEN the page is rendered
- THEN the paragraph and the table start exactly 40 px (within 4 px) below the top

### Scenario: Toggling the chevron

- GIVEN a settled page and the collapse chevron
- WHEN the chevron is clicked
- THEN the toolbar-collapse callback measures the first-element clearance again

### Known issues

- Known issue: The same callback also refreshes the sticky heading position, the table-of-contents layout and the width update; those belong to other requirements.
- Known issue: The wiring of the callback has no unit test of its own; the collapse itself belongs to the toolbar requirements.

### Verification notes

- Method: Visual scenarios v55 and v56 (collapsed toolbar at 360 px); inspection of the callback wiring in the page runtime.
- Criteria: Measured top of the first element is 40 px within 4 px in the visual cases; the callback list is complete.
