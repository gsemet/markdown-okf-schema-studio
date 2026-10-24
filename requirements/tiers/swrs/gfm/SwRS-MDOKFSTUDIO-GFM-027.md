---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-027
uuid: 763dc36a-6b24-4e94-8be1-aa8a694bf20f
title: The host validates checkbox toggle messages
description: When the host receives a checkbox toggle message, the extension
  SHALL accept it only with a safe non-negative integer column, a boolean state
  and a single line.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## The host validates checkbox toggle messages

### Normative behavior

When the host receives a checkbox toggle message, the extension SHALL accept it only with a safe non-negative integer column, a boolean state and a single line.

Known issue: a message the validator rejects is dropped without a result, so the box that sent it stays busy (`aria-busy`) until the next render; the shipped page checks line and column before sending, so only a malformed message from another sender reaches this. Backlog: P3/checkbox-refusal-feedback.

### Scenario: Valid message

- GIVEN a message with line 3, endLine 3, column 4, checked true
- WHEN it is validated
- THEN it is accepted

### Scenario: Invalid shapes

- GIVEN messages with a negative or fractional column, a non-boolean state or line different from endLine
- WHEN they are validated
- THEN each is rejected and no edit is made

### Verification notes

- Method: Unit test on the validator.
- Criteria: Only well-formed messages are accepted.
