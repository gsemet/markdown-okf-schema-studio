---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-044
uuid: 7cd32f35-54ac-406e-a198-d4953a899c97
title: Drop unsupported raw HTML
description: When a document holds a raw HTML block outside the supported subset
  (tables, details, kbd, colour spans, a lone img, context tags), the extension
  SHALL drop it from the rendered page.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-004
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Drop unsupported raw HTML

### Normative behavior

When a document holds a raw HTML block outside the supported subset (tables, details, kbd, colour spans, a lone img, context tags), the extension SHALL drop it from the rendered page.

### Scenario: Nominal drop unsupported raw HTML

- GIVEN a raw iframe block
- WHEN it is rendered
- THEN nothing of it appears

### Scenario: Boundary or refusal of drop unsupported raw HTML

- GIVEN a raw `<kbd>` element
- WHEN it is rendered
- THEN it is kept

### Verification notes

- Method: test
- Criteria: Only the supported subset survives rendering.
