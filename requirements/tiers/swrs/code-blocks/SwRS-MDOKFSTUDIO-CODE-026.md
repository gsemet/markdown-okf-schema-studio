---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-026
uuid: b46b8fda-3e08-4680-8bda-f5e5b760ac40
title: An invalid or oversized copy request is refused
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
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-065
- SwRS-MDOKFSTUDIO-TRUST-006
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/pageToHost.ts
tested_in_files:
- test/core/protocol/pageToHost.test.ts
---

## An invalid or oversized copy request is refused

### Normative behavior

When a copy request carries text that is not a string or is longer than 1 000 000 characters, the extension SHALL refuse it without writing the clipboard and without a message.

### Scenario (nominal): A copy request of 1 000 000 characters is written

- GIVEN a `previewCopyText` request with 1 000 000 characters
- WHEN the host receives it
- THEN the text is written to the clipboard

### Scenario (refusal): An oversized or non-string request is refused

- GIVEN a `previewCopyText` request with 1 000 001 characters or a numeric text
- WHEN the host receives it
- THEN the request is refused and the clipboard is unchanged

### Scenario (boundary): Accepted shape of the copy request

A `previewCopyText` message has the identity fields of every page message (see SwRS-MDOKFSTUDIO-TRUST-052) and one field `text`:

| `text` | Outcome |
| --- | --- |
| `"code"` | accepted |
| `""` (empty string) | accepted |
| a string of 1 000 000 characters | accepted |
| a string of 1 000 001 characters | rejected |
| `5` (a number) | rejected |
| `undefined` (absent) | rejected |

A rejected message is dropped: nothing is written to the clipboard and no message is sent back.

### Scenario (boundary): A stale or read-only page

- GIVEN a `previewCopyText` message that passes the shape check
- WHEN its document version or render request is stale, or the preview is read-only
- THEN a stale message is dropped by the render gate (see SwRS-MDOKFSTUDIO-TRUST-065) and a read-only preview still writes the text and edits nothing (see SwRS-MDOKFSTUDIO-TRUST-006)

### Known issues

- Known issue: the copy button still shows Copied although the host refused the request, because the host sends no acknowledgement.

### Related requirements

- SwRS-MDOKFSTUDIO-CODE-019: sends the copy request when the reader clicks the copy button

### Verification notes

- Method: test/core/protocol/pageToHost.test.ts (nominal, refusal and the shape table)
- Method: test/session/renderReq.codeCopy.requirements.test.ts (stale and read-only page)
- Criteria: boundary 1 000 000 accepted, 1 000 001 and non-strings rejected; a stale message leaves the clipboard unchanged; a read-only preview writes the requested code and processes no edit request
