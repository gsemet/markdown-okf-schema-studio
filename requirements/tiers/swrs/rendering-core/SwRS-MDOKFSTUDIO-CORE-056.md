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
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-002
- StRS-MDOKFSTUDIO-MYST-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-GFM-031; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-GFM-031
default_owner_email: gaetan@xeberon.net
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

- Method: Unit test "raw HTML tables preserve complex cell spans without active content" in test/core/render/mystFeatures.test.ts
- Criteria: Only allow-listed tags and attributes remain.
