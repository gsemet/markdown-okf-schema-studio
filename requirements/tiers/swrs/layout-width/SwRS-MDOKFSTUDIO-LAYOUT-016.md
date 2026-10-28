---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-016
uuid: fd5ba740-9fec-423f-ad75-8e091f5e508f
title: A leading properties table gives up the toolbar width for its Description
  toggle
description: When a right-aligned Description toggle of a leading properties
  table sits under the floating toolbar, the extension SHALL shorten the table
  by the width the toolbar covers.
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

## A leading properties table gives up the toolbar width for its Description toggle

### Normative behavior

When a right-aligned Description toggle of a leading properties table sits under the floating toolbar, the extension SHALL shorten the table by the width the toolbar covers.

### Scenario: Description toggle under the toolbar

- GIVEN a 900 px column, a toolbar from 600 to 850 px and a right-aligned Description toggle at 800 to 824 px
- WHEN the clearance is measured
- THEN the inset is 292 px and the clearance is 0

### Scenario: Table too narrow to be shortened

- GIVEN a 460 px column with the toolbar from 200 px over the right-aligned toggle, so that less than 320 px would remain
- WHEN the clearance is measured
- THEN the table is not shortened (inset 0 px) and is pushed down instead (clearance above 0)

### Known issues

- Known issue: The fallback for a table too narrow to be shortened has no unit test.

### Verification notes

- Method: Unit test P3 a Description toggle under the toolbar makes the table give up the toolbar's width; the narrow fallback is verified by inspection of firstClearance.ts.
- Criteria: Inset 292 px in the tested layout, and 0 with a positive clearance below 320 px of remaining width.
