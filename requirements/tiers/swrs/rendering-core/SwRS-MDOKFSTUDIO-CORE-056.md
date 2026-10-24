---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-056
uuid: 6fb4fc89-fd9d-48e9-8368-0f7073a89859
title: Rebuild raw HTML tables from an allow-list
description: When a document holds a raw HTML table, the extension SHALL rebuild
  it from an allow-list of tags and attributes, keep complex cell spans and safe
  cell styles and drop `embed`, `form`, `iframe`, `object`, `script`, `style`
  and `svg` inside it.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-004
- StRS-MDOKFSTUDIO-MYST-013
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Rebuild raw HTML tables from an allow-list

### Normative behavior

When a document holds a raw HTML table, the extension SHALL rebuild it from an allow-list of tags and attributes, keep complex cell spans and safe cell styles and drop `embed`, `form`, `iframe`, `object`, `script`, `style` and `svg` inside it.

### Scenario: Nominal rebuild raw HTML tables from an allow-list

- GIVEN a table with a `colspan` cell
- WHEN it is rendered
- THEN the span is kept

### Scenario: Boundary or refusal of rebuild raw HTML tables from an allow-list

- GIVEN a table cell with a script element
- WHEN it is rendered
- THEN the script is dropped

### Verification notes

- Method: test
- Criteria: Only allow-listed tags and attributes remain.
