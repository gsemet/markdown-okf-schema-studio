---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-037
uuid: 23357e44-eb5e-4755-bfdc-47258ef711b5
title: Alerts end at the first unquoted line
description: When the lines after an alert marker stop being quoted, the
  extension SHALL end the admonition at the first unquoted line.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-002
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Alerts end at the first unquoted line

### Normative behavior

When the lines after an alert marker stop being quoted, the extension SHALL end the admonition at the first unquoted line.

### Scenario: Alert ends at unquoted line

- GIVEN an alert followed directly by an unquoted paragraph
- WHEN the preview is rendered
- THEN the paragraph is outside the admonition

### Scenario: Blank line after alert

- GIVEN an alert followed by a blank line and a paragraph
- WHEN the preview is rendered
- THEN the paragraph is outside the admonition and later source line numbers are unchanged

### Verification notes

- Method: Unit test on the render pipeline output.
- Criteria: The admonition body contains only quoted lines.
