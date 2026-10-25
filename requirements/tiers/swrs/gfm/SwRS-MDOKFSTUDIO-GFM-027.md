---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-027
uuid: 763dc36a-6b24-4e94-8be1-aa8a694bf20f
title: The host validates checkbox toggle messages
description: When the host receives a previewCheckboxToggle message, the
  extension SHALL accept it only with a safe non-negative integer column, a
  boolean checked state and a single line, and accept column and checked on no
  other message type.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-003
- StRS-MDOKFSTUDIO-TRUST-009
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-065
- SwRS-MDOKFSTUDIO-TRUST-090
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/pageToHost.ts
tested_in_files:
- test/core/protocol/pageStateMessages.test.ts
---

## The host validates checkbox toggle messages

### Normative behavior

When the host receives a previewCheckboxToggle message, the extension SHALL accept it only with a safe non-negative integer column, a boolean checked state and a single line, and accept column and checked on no other message type.

### Scenario (nominal): Valid message

- GIVEN a previewCheckboxToggle message with line 3, endLine 3, column 4, checked true
- WHEN it is validated
- THEN it is accepted

### Scenario (refusal): Invalid shapes

| Input | Outcome |
| --- | --- |
| a negative column | rejected, no edit is made |
| a fractional column | rejected, no edit is made |
| a checked state that is not a boolean | rejected, no edit is made |
| line different from endLine | rejected, no edit is made |

### Scenario (refusal): Column and checked on another type

- GIVEN a previewEditCancel message with column 4
- WHEN it is checked
- THEN it is refused

### Known issues

- Known issue: a message the validator rejects is dropped without a result, so the box that sent it stays busy (`aria-busy`) until the next render; the shipped page checks line and column before sending, so only a malformed message from another sender reaches this.

### Related requirements

- SwRS-MDOKFSTUDIO-GFM-021: the click that sends this message and the reasons of its refusals

### Verification notes

- Method: test/core/protocol/pageStateMessages.test.ts (valid message, invalid shapes, column and checked on another type: unit tests on the validators, which accept exactly what the frozen validator accepted).
- Criteria: Only well-formed messages are accepted; the toggle needs a non-negative integer column, a boolean state and one line, and column and checked are accepted only on previewCheckboxToggle.
