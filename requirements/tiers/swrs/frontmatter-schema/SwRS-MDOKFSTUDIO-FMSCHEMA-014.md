---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-014
uuid: 80935d1d-8b0e-4b9a-950e-ff8bfabc5bc4
title: The Description column can be collapsed and restored
description: When a writer presses the toggle in a column header of a schema
  table, the extension SHALL collapse or restore the Description column while
  keeping Name and Value readable.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-004
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## The Description column can be collapsed and restored

### Normative behavior

When a writer presses the toggle in a column header of a schema table, the extension SHALL collapse or restore the Description column while keeping Name and Value readable.

### Scenario: Collapse

- GIVEN a schema table with the Description column shown
- WHEN the writer presses the toggle labelled Collapse Description column
- THEN the column is hidden, the toggle label becomes Expand Description column and alert rows span two columns

### Scenario: Restore

- GIVEN the same table with the column collapsed
- WHEN the writer presses the toggle labelled Expand Description column
- THEN the column is shown again and alert rows span three columns

### Verification notes

- Method: Unit test of the table markup; integration and visual scenario v02.
- Criteria: aria-expanded, aria-label and title follow the state; the colspan of info rows is 3 with docs and 2 otherwise.
