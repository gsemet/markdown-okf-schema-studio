---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-030
uuid: 4c6512ab-39c3-42e8-9865-28a053023bf1
title: Never highlight inline code
description: When inline code appears outside a preformatted block, the
  extension SHALL NOT apply syntax highlighting to it.
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
superseded_by:
- SwRS-MDOKFSTUDIO-CODE-001
default_owner_email: gaetan@xeberon.net
---

## Never highlight inline code

### Normative behavior

When inline code appears outside a preformatted block, the extension SHALL NOT apply syntax highlighting to it.

### Scenario: nominal behavior

- GIVEN a paragraph with inline `code`
- WHEN the preview renders it
- THEN the inline code has no token spans

### Scenario: boundary or refusal behavior

- GIVEN a one-line fenced block
- WHEN the preview renders it
- THEN only the fenced block is highlighted

### Verification notes

- Method: Unit test on the highlighter.
- Criteria: Only pre/code pairs are processed.
