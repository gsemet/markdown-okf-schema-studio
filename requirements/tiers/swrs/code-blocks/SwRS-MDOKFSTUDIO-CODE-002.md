---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-002
uuid: 5c5b8c1b-e114-48eb-b755-0647ac170608
title: Resolve common fence labels to a supported grammar
description: When a fence label is a common alias such as `py`, `js`, `sh`, `rs`
  or `patch`, the extension SHALL highlight the block with the grammar the alias
  names.
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

## Resolve common fence labels to a supported grammar

### Normative behavior

When a fence label is a common alias such as `py`, `js`, `sh`, `rs` or `patch`, the extension SHALL highlight the block with the grammar the alias names.

### Scenario: nominal behavior

- GIVEN a block fenced as `py`
- WHEN the preview renders it
- THEN it is coloured with the Python grammar

### Scenario: boundary or refusal behavior

- GIVEN a block fenced with an unlisted label such as `wobble`
- WHEN the preview renders it
- THEN it stays plain text

### Verification notes

- Method: Unit test over the alias table.
- Criteria: Every listed alias yields the highlighted output of its target grammar; an unlisted label yields none.
