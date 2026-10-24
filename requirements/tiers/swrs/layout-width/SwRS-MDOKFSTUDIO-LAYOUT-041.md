---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-041
uuid: 10e8f6a2-3034-4d1d-bb2f-4add6d5eb720
title: A width mode change measures the first-element clearance again
description: When the reader changes the width mode, the extension SHALL measure
  the first-element clearance again.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-006
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A width mode change measures the first-element clearance again

### Normative behavior

When the reader changes the width mode, the extension SHALL measure the first-element clearance again.

### Scenario: Mode change narrows the column

- GIVEN a page whose first element sits 40 px below the top, and a width mode change that makes the column narrower
- WHEN the Width button is clicked
- THEN the first-element clearance is measured again, so the first element keeps its 40 px gap below the toolbar at the new width

### Scenario: Mode change that moves nothing

- GIVEN a width mode change that leaves the column width and the toolbar position unchanged
- WHEN the Width button is clicked
- THEN the clearance is still measured again, because the change callback calls the update unconditionally, and the published values stay the same

### Known issues

- Known issue: The re-measure on a mode change has no test of its own.

### Verification notes

- Method: Inspection of the width mode change callback in the page runtime (`firstClearance.update(); keepReadingLine();`); no automated test.
- Criteria: The change callback calls the first-element clearance update.
