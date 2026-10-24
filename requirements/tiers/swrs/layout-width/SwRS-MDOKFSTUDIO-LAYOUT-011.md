---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-011
uuid: dcddba2d-ae63-4769-bb9e-2642cdeae799
title: No clearance is added where the toolbar does not cover the first element
description: When the floating toolbar sits beside the text column or ends above
  the 40 px gap, the extension SHALL publish a clearance of 0 and an inset of 0
  so that the first element keeps exactly 40 px.
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

## No clearance is added where the toolbar does not cover the first element

### Normative behavior

When the floating toolbar sits beside the text column or ends above the 40 px gap, the extension SHALL publish a clearance of 0 and an inset of 0 so that the first element keeps exactly 40 px.

### Scenario: Toolbar beside the column

- GIVEN a column from 100 to 700 px and a toolbar that starts at 800 px, with an open first-block editor
- WHEN the clearance is measured
- THEN the published first clearance and first inset are both 0 px

### Scenario: Toolbar ending above the gap

- GIVEN a 460 px column and a toolbar that overlaps it horizontally but ends at 20 px, above the 40 px gap
- WHEN the clearance is measured
- THEN the clearance and the inset are 0 px

### Verification notes

- Method: Unit tests nothing is pushed when the toolbar is beside the column, and a toolbar that ends above the 40px gap needs no clearance and no inset; visual checks at 900 and 1600 px.
- Criteria: The values written to the root style are --sphinx-preview-first-clearance: 0px and --sphinx-preview-first-inset: 0px.
