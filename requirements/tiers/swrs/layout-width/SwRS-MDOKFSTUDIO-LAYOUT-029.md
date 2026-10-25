---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-029
uuid: f1c9652b-e14d-49ca-a940-d1c48c9c0629
title: Narrow tables and figures are centred in every width mode
description: When a table or figure is narrower than the text column, the
  extension SHALL centre it at its own width in every width mode and keep code
  blocks left.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-003
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-LAYOUT-022; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-LAYOUT-022
---

## Narrow tables and figures are centred in every width mode

### Normative behavior

When a table or figure is narrower than the text column, the extension SHALL centre it at its own width in every width mode and keep code blocks left.

### Scenario: Narrow table

- GIVEN a table 300 px wide in a 700 px column, in Margin, Auto and Full width
- WHEN the preview is rendered
- THEN the table is centred through automatic inline margins in all three modes

### Scenario: Narrow figure and code block

- GIVEN a paragraph holding only an image and its caption, and a code block narrower than the column
- WHEN the preview is rendered
- THEN the figure and its caption are centred under the picture, and the code block stays left with its own width

### Known issues

- Known issue: The centring rules are only visual checks; no unit test reads them.

### Verification notes

- Method: Visual width-mode checks (narrow table and figure) and inspection of the content layout rules; no unit test of the centring rule.
- Criteria: Left and right free space of the table and figure are equal; the code block starts at the column edge.
