---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-004
uuid: a40e34f0-ca1a-471a-b0ad-66dbf0c1ea58
title: Leave unknown-language code as plain text
description: When a code block's language is unknown or absent, the extension
  SHALL leave the block as plain monospace text without token spans.
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
default_owner_email: gaetan@xeberon.net
---

## Leave unknown-language code as plain text

### Normative behavior

When a code block's language is unknown or absent, the extension SHALL leave the block as plain monospace text without token spans.

### Scenario: nominal behavior

- GIVEN a block fenced as `wobblescript`
- WHEN the preview renders it
- THEN the block contains no token spans and its text is unchanged

### Scenario: boundary or refusal behavior

- GIVEN a block with no language label
- WHEN the preview renders it
- THEN the block is unchanged

### Verification notes

- Method: Unit test and the unknown-language visual scenario.
- Criteria: Output equals the input block; no `hljs` class is added.
