---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-040
uuid: f1dab1d3-1b74-45b8-9f89-2e7c5589db12
title: A width mode change keeps the reading line
description: When the reader changes the width mode, the extension SHALL keep
  the line at the reading position of the page.
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

## A width mode change keeps the reading line

### Normative behavior

When the reader changes the width mode, the extension SHALL keep the line at the reading position of the page.

### Scenario: Scrolled document

- GIVEN a long document scrolled to a position and a width mode change
- WHEN the Width button is clicked
- THEN the line at the reading position is taken as the anchor and the page is stabilised, so the same line stays at the reading position after the layout change

### Scenario: No anchor yet

- GIVEN a page without an anchor
- WHEN the Width button is clicked
- THEN the anchor is taken from the line at the current scroll position, when that line is known

### Known issues

- Known issue: The reading-line preservation on a mode change has no test.

### Verification notes

- Method: Inspection of keepReadingLine and the width mode change callback in the page runtime; no automated test.
- Criteria: The change callback calls keepReadingLine. The clearance re-measure of the same callback is SwRS-MDOKFSTUDIO-LAYOUT-041.
