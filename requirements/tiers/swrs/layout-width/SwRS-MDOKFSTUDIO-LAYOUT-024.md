---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-024
uuid: d403fd5e-71d1-4225-bdfa-26408b4443c7
title: Auto width excludes the open table-of-contents column
description: When the table-of-contents column is open in Auto width mode, the
  extension SHALL exclude its 256 px from the available area, from the centre of
  the breakout and from the cap.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-007
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Auto width excludes the open table-of-contents column

### Normative behavior

When the table-of-contents column is open in Auto width mode, the extension SHALL exclude its 256 px from the available area, from the centre of the breakout and from the cap.

### Scenario: TOC open

- GIVEN Auto mode, TOC reserve 256 px, a pane of 1000 px, a column of 400 px starting at 100 px and a table needing 1600 px
- WHEN the elements are measured
- THEN the available area is 712 px, the breakout is 312 px and the shift is 72 px

### Scenario: TOC closed or hidden

- GIVEN the TOC reserve is 0 (closed, or pane under 760 px)
- WHEN the elements are measured
- THEN the available area is the pane minus the 32 px gutters

### Known issues

- Known issue: No visual scenario combines the open table-of-contents column and Auto; the TOC column itself belongs to the toolbar requirements.

### Verification notes

- Method: Unit test T10b with the TOC open the available area, its centre and the cap exclude the TOC column; the reserve is published by the CSS for panes of 760 px and more.
- Criteria: Breakout 312 px and shift 72 px in the tested layout.
