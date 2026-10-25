---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-031
uuid: fec6a2a2-0d3c-4ff9-be0c-d9f2cae4f809
title: Show fenced code text literally
description: When a fenced code block holds Markdown syntax, inner fences,
  tables or links, the extension SHALL show that text literally without
  rendering it.
project: markdown-okf-schema-studio
scope: code-blocks
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CODE-001; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-CODE-001
---

## Show fenced code text literally

### Normative behavior

When a fenced code block holds Markdown syntax, inner fences, tables or links, the extension SHALL show that text literally without rendering it.

### Scenario: nominal behavior

- GIVEN a `markdown` fence containing a table, a link and an inner fence under a longer outer fence
- WHEN the preview renders the document
- THEN the table, link and inner fence appear as literal text

### Scenario: boundary or refusal behavior

- GIVEN a fence whose content has a line of backticks shorter than the outer fence
- WHEN the preview renders the document
- THEN that line stays part of the code and does not close the block

### Verification notes

- Method: Unit test on the rendered HTML and the visual source-fragment scenarios.
- Criteria: Rendered code text equals the source text; no table or anchor element is created inside the block.
