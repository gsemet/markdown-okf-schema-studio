---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-062
uuid: 73dc26ed-f85c-4c71-bdf4-8eef1506f261
title: Render details and kbd blocks
description: When a document holds a raw details block (with an optional open
  state and a summary) or kbd block, the extension SHALL render a dropdown or
  key element with its content parsed as Markdown.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-004
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Render details and kbd blocks

### Normative behavior

When a document holds a raw details block (with an optional open state and a summary) or kbd block, the extension SHALL render a dropdown or key element with its content parsed as Markdown.

### Scenario: Nominal render details and kbd blocks

- GIVEN an open details element with a summary
- WHEN it is rendered
- THEN an open dropdown with the summary shows

### Scenario: Boundary or refusal of render details and kbd blocks

- GIVEN a kbd block holding Ctrl
- WHEN it is rendered
- THEN a key element shows

### Verification notes

- Method: test
- Criteria: Both blocks are converted and their content parsed.
- Evidence: the details form is covered through the gfm and myst tests under `test/core/render/`; the kbd form has its own unit test.
