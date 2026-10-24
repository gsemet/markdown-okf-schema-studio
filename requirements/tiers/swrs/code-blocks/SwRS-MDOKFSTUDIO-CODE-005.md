---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-005
uuid: e456ca49-8e8f-4f76-9600-dcd3a09c0a1a
title: Wrap numbered, emphasized and diff blocks into lines in any language
description: When a numbered, emphasized or diff block has an unknown language,
  the extension SHALL still wrap it into lines, without the highlight class.
project: markdown-okf-schema-studio
scope: code-blocks
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-001
- StRS-MDOKFSTUDIO-CODE-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Wrap numbered, emphasized and diff blocks into lines in any language

### Normative behavior

When a numbered, emphasized or diff block has an unknown language, the extension SHALL still wrap it into lines, without the highlight class.

### Scenario: nominal behavior

- GIVEN a numbered block in an unknown language
- WHEN the preview renders it
- THEN each line is wrapped in its own line element and the block has no `hljs` class

### Scenario: boundary or refusal behavior

- GIVEN a diff block with no language other than diff
- WHEN the preview renders it
- THEN lines are wrapped and classified without a highlight class

### Verification notes

- Method: Unit test.
- Criteria: Line wrappers present; no highlight class for unknown languages.
