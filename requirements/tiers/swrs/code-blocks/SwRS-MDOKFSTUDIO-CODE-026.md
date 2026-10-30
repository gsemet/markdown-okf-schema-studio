---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-026
uuid: b46b8fda-3e08-4680-8bda-f5e5b760ac40
title: An invalid or oversized copy request is refused
description: When a copy request carries text that is not a string or is longer
  than 1 000 000 characters, the extension SHALL refuse it without writing the
  clipboard, and answer every copy request it handles with whether the text was
  copied.
project: markdown-okf-schema-studio
scope: code-blocks
req_lifecycle: proposed
status: stable
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
- src/session/features/hostRequests.ts
tested_in_files:
- test/core/protocol/pageToHost.test.ts
- test/page/modules/codeCopy.test.ts
- test/session/renderReq.codeCopy.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## An invalid, oversized or gestureless copy request is refused

### Normative behavior

When a copy request carries text that is not a string or is longer than 1 000 000 characters, or does not follow a click of the user on the copy button, the extension SHALL refuse it without writing the clipboard, and answer every copy request it handles with whether the text was copied.

### Scenario (nominal): A copy request of 1 000 000 characters is written

- GIVEN a `previewCopyText` request with 1 000 000 characters
- WHEN the host receives it
- THEN the text is written to the clipboard

### Scenario (refusal): An oversized or non-string request is refused

- GIVEN a `previewCopyText` request with 1 000 001 characters or a numeric text
- WHEN the host receives it
- THEN the clipboard is unchanged; a text of 1 000 001 to 20 000 000 characters is answered `ok: false` with "Too large to copy."; anything else that fails the shape check is dropped without an answer, and the page shows its "did not answer" refusal after 6 s

### Scenario (boundary): Accepted shape of the copy request

A `previewCopyText` message has the identity fields of every page message (see SwRS-MDOKFSTUDIO-TRUST-052) an `editId` (non-empty) a boolean `userGesture` and one field `text`:

| `text` | Outcome |
| --- | --- |
| `"code"` | accepted |
| `""` (empty string) | accepted |
| a string of 1 000 000 characters | accepted |
| a string of 1 000 001 to 20 000 000 characters | accepted, then answered ok false "Too large to copy." |
| a string of 20 000 001 characters | rejected |
| `5` (a number) | rejected |
| `undefined` (absent) | rejected |

`userGesture` is true only when the page sent the request from a click event the user made (`isTrusted`). A message without a boolean `userGesture` is rejected by the shape check. A well-formed message with `userGesture` false is answered `ok: false`, "Copy needs a click on the copy button.", and the clipboard is unchanged.

A request is answered by `editId` (see SwRS-MDOKFSTUDIO-TRUST-090). The shape check accepts a string of up to 20 000 000 characters, so that the host can answer the size limit; a text of 1 000 001 characters or more is answered `ok: false`, "Too large to copy.", and a non-string is dropped: nothing is written to the clipboard.

### Scenario (nominal): Every handled request is answered

- GIVEN a copy request the host handles
- WHEN the clipboard write succeeds or fails
- THEN the host sends `previewCopyTextResult` with the request's `editId` and `ok: true`, or `ok: false` with "Could not copy."

### Scenario (boundary): A stale or read-only page

- GIVEN a `previewCopyText` message that passes the shape check
- WHEN its document version or render request is stale, or the preview is read-only
- THEN a stale message is still copied and answered, because the copy is gated by the document only (see SwRS-MDOKFSTUDIO-TRUST-065), and a read-only preview still writes the text and edits nothing (see SwRS-MDOKFSTUDIO-TRUST-006)

### Related requirements

- SwRS-MDOKFSTUDIO-CODE-019: sends the copy request when the reader clicks the copy button

### Verification notes

- Method: test/core/protocol/pageToHost.test.ts (nominal, refusal and the shape table)
- Method: test/session/renderReq.codeCopy.requirements.test.ts (gestureless request refused, stale and read-only page, size refusal, failing clipboard, answers)
- Criteria: 1 000 000 copied, 1 000 001 accepted by the shape check and answered "Too large to copy.", 20 000 001 and non-strings rejected; a stale message leaves the clipboard unchanged; a read-only preview writes the requested code and processes no edit request

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CODE-004](../../strs/code-blocks/StRS-MDOKFSTUDIO-CODE-004.md): A reader copies the exact code of a block
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-052](../trust-security/SwRS-MDOKFSTUDIO-TRUST-052.md): Every page message has a registered type and a valid envelope before any handler runs
  - [SwRS-MDOKFSTUDIO-TRUST-065](../trust-security/SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
  - [SwRS-MDOKFSTUDIO-TRUST-006](../trust-security/SwRS-MDOKFSTUDIO-TRUST-006.md): A read-only preview keeps every viewing action
<!-- okf:links:end -->
