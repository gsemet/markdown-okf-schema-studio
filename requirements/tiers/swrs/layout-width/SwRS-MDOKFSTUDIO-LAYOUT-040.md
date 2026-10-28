---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-040
uuid: f1dab1d3-1b74-45b8-9f89-2e7c5589db12
title: A width mode change keeps the reading line
description: When the reader changes the width mode, the extension SHALL keep
  the line at the reading position of the page.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-003
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-LAYOUT-020; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-LAYOUT-020
default_owner_email: gaetan@xeberon.net
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

### Verification notes

- Method: Unit test `a width mode change keeps the line at the reading position, with or without an anchor yet` in `test/page/diagReq.layout.requirements.test.ts`.
- Criteria: The change callback calls keepReadingLine. The clearance re-measure of the same callback is SwRS-MDOKFSTUDIO-LAYOUT-041.
