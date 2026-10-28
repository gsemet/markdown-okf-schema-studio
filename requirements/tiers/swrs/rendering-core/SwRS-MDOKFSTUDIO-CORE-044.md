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
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-002
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-GFM-029; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-GFM-029
default_owner_email: gaetan@xeberon.net
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

- Method: Unit test "raw HTML outside the supported subset is dropped and a kbd element is kept" in test/core/render/renderReq.renderingCore.requirements.test.ts
- Criteria: Only the supported subset survives rendering.
