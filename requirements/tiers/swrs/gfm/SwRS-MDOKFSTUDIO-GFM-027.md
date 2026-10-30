---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-027
uuid: 763dc36a-6b24-4e94-8be1-aa8a694bf20f
title: The host validates checkbox toggle messages
description: When the host receives a previewCheckboxToggle message, the
  extension SHALL accept it only with a safe non-negative integer column, a
  boolean checked state and a single line, and accept column and checked on no
  other message type, and answer a rejected message that names its box with a
  refusal.
project: markdown-okf-schema-studio
scope: gfm
req_lifecycle: proposed
status: stable
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
- src/session/pageMessages.ts
tested_in_files:
- test/core/protocol/pageStateMessages.test.ts
- test/session/checkboxRefusal.test.ts
default_owner_email: gaetan@xeberon.net
---

## The host validates checkbox toggle messages

### Normative behavior

When the host receives a previewCheckboxToggle message, the extension SHALL accept it only with a safe non-negative integer column, a boolean checked state and a single line, and accept column and checked on no other message type. A rejected message that names its document, render and box is answered with a refusal, so the box does not stay busy.

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

### Scenario (refusal): A rejected message is answered

| Input | Outcome |
| --- | --- |
| a rejected toggle that names the shown document, a render and an edit id | the page is answered with the error 'The checkbox request was not understood. Refresh the preview.' and no edit is made |
| a rejected toggle without an edit id, or for another document | dropped without an answer |

### Related requirements

- SwRS-MDOKFSTUDIO-GFM-021: the click that sends this message and the reasons of its refusals

### Verification notes

- Method: test/session/checkboxRefusal.test.ts (a malformed toggle is answered; one without a box or for another document is not).
- Method: test/core/protocol/pageStateMessages.test.ts (valid message, invalid shapes, column and checked on another type: unit tests on the validators, which accept exactly what the frozen validator accepted).
- Criteria: Only well-formed messages are accepted; the toggle needs a non-negative integer column, a boolean state and one line, and column and checked are accepted only on previewCheckboxToggle.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-GFM-003](../../strs/gfm/StRS-MDOKFSTUDIO-GFM-003.md): A writer toggles task checkboxes from the preview
  - [StRS-MDOKFSTUDIO-TRUST-009](../../strs/trust-security/StRS-MDOKFSTUDIO-TRUST-009.md): What the page and the host exchange is checked and never applied to another version
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-052](../trust-security/SwRS-MDOKFSTUDIO-TRUST-052.md): Every page message has a registered type and a valid envelope before any handler runs
  - [SwRS-MDOKFSTUDIO-TRUST-005](../trust-security/SwRS-MDOKFSTUDIO-TRUST-005.md): The host refuses every write request of a read-only preview with a reason
  - [SwRS-MDOKFSTUDIO-TRUST-065](../trust-security/SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
  - [SwRS-MDOKFSTUDIO-TRUST-090](../trust-security/SwRS-MDOKFSTUDIO-TRUST-090.md): Every page request is answered once by its id and result type, or ends with a readable error
<!-- okf:links:end -->
