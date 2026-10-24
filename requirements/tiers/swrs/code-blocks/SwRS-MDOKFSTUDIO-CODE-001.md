---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-001
uuid: 04e0c14a-7c6b-46b8-ba68-bc39a96757d3
title: Colour the tokens of fenced code in a supported language
description: When a document contains a fenced code block in a supported
  language, the extension SHALL colour its keywords, strings, numbers and
  comments with distinct token colours.
project: markdown-okf-schema-studio
scope: code-blocks
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Colour the tokens of fenced code in a supported language

### Normative behavior

When a document contains a fenced code block in a supported language, the extension SHALL colour its keywords, strings, numbers and comments with distinct token colours.

### Scenario: nominal behavior

- GIVEN a document with a fenced `rust` block and a `python` block
- WHEN the preview renders the document
- THEN keywords, strings, numbers and comments of each block get distinct token colours

### Scenario: boundary or refusal behavior

- GIVEN a fenced `python` block with no content
- WHEN the preview renders the document
- THEN an empty highlighted block is shown without error

### Verification notes

- Method: Unit test of the highlighter plus the visual scenarios of the highlighting family.
- Criteria: Token spans exist for each token class of the supported grammars; an empty block yields an empty block.
