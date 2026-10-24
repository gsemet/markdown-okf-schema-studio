---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-021
uuid: 2f2259ba-c344-4458-a2e5-7aea08e07fe5
title: Diagrams can use the wider column in Auto width
description: When the width mode is Auto and a Mermaid diagram or a diagram
  figure is wider than the text column, the page SHALL mark it wide so it can
  use the available width, unless the diagram is being edited.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-007
- StRS-MDOKFSTUDIO-DIAG-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Diagrams can use the wider column in Auto width

### Normative behavior

When the width mode is Auto and a Mermaid diagram or a diagram figure is wider than the text column, the page SHALL mark it wide so it can use the available width, unless the diagram is being edited.

### Scenario: Wide diagram in Auto

- GIVEN the Auto width mode and a diagram figure wider than the text column
- WHEN the page measures the content
- THEN the figure is marked wide with a breakout size so it uses the wider column

### Scenario: Diagram under edit

- GIVEN a diagram whose block editor is open
- WHEN the page measures the content
- THEN the diagram keeps the column width

### Known issues

- Known issue: No diagram test covers the breakout; both diagram kinds qualify because their figure element is in the measured list.

### Verification notes

- Method: Unit test of the width mode; the width rules are owned by layout-width.
- Criteria: Wide figures are marked, edited ones are not.
