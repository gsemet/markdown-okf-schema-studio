---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-026
uuid: b46b8fda-3e08-4680-8bda-f5e5b760ac40
title: Refuse an invalid or oversized copy request
description: When a copy request carries text that is not a string or is longer
  than 1 000 000 characters, the extension SHALL refuse it without writing the
  clipboard and without a message.
project: markdown-okf-schema-studio
scope: code-blocks
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-004
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Refuse an invalid or oversized copy request

### Normative behavior

When a copy request carries text that is not a string or is longer than 1 000 000 characters, the extension SHALL refuse it without writing the clipboard and without a message.

Known issue: the copy button still shows Copied although the host refused the request, because the host sends no acknowledgement (backlog P2/copy-button-false-copied).

### Scenario: nominal behavior

- GIVEN a copy request with 1 000 000 characters
- WHEN the host receives it
- THEN the text is written to the clipboard

### Scenario: boundary or refusal behavior

- GIVEN a copy request with 1 000 001 characters or a numeric text
- WHEN the host receives it
- THEN the request is refused and the clipboard is unchanged

### Verification notes

- Method: Unit test of the message validator.
- Criteria: Boundary 1 000 000 accepted, 1 000 001 and non-strings rejected.
