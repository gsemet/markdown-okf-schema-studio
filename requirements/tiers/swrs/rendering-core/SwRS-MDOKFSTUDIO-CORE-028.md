---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-028
uuid: 4c0f69e4-6354-4612-a9a5-f586c216bb35
title: Typeset body text
description: When the preview shows paragraphs, list items, table cells, quotes
  or captions, the extension SHALL use the preview font, the zoomed font size
  and the VS Code Markdown preview line height.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Typeset body text

### Normative behavior

When the preview shows paragraphs, list items, table cells, quotes or captions, the extension SHALL use the preview font, the zoomed font size and the VS Code Markdown preview line height.

### Scenario: Nominal typeset body text

- GIVEN a zoom of 120 percent
- WHEN a paragraph is shown
- THEN its font size is the zoomed size and its line height the Markdown preview value

### Scenario: Boundary or refusal of typeset body text

- GIVEN a table cell
- WHEN it is shown
- THEN it uses the same font and line height

### Verification notes

- Method: test
- Criteria: Computed styles of body text elements match the configured values.
