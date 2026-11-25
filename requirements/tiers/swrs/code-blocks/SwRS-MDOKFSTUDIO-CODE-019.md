---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-019
uuid: 77c7ef91-774e-43c6-95d4-c03409e937bb
title: The copy button copies the raw code and confirms it
description: When the reader clicks the copy button, the extension SHALL put the
  block's code only on the clipboard, without file name or line numbers, lines
  joined with newlines and a trailing newline, label the button Copied with a
  check mark for 1.5 s only after the host confirms the copy, show the host's
  reason instead when it refuses, and keep the focus and the editors untouched;
  the host SHALL refuse a copy request whose text is not a string, is longer
  than 1 000 000 characters or does not follow a click of the user, without
  writing the clipboard, and answer every copy request it handles.
project: markdown-okf-schema-studio
scope: code-blocks
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-004
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-065
scenarios:
- id: S1
  title: The clipboard holds the code lines only
- id: S2
  title: A diff block keeps its markers
- id: S3
  title: The button confirms with Copied for 1.5 seconds
- id: S4
  title: The button never claims a copy that did not happen
- id: S5
  title: A second click restarts the confirmation
- id: S6
  title: An open block editor keeps the focus
- id: S7
  title: Edit mode opens and commits no editor
- id: S8
  title: A copy request of 1 000 000 characters is written
- id: S9
  title: An oversized or non-string request is refused
- id: S10
  title: Accepted shape of the copy request
- id: S11
  title: A copy request without a click of the user is refused
- id: S12
  title: Every handled request is answered
- id: S13
  title: A stale page or a preview with restricted reads
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/pageToHost.ts
- src/page/modules/codeCopy.ts
- src/session/features/hostRequests.ts
tested_in_files:
- test/core/protocol/pageToHost.test.ts
- test/page/modules/codeCopy.test.ts
- test/session/renderReq.codeCopy.requirements.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-CODE-020
- SwRS-MDOKFSTUDIO-CODE-021
- SwRS-MDOKFSTUDIO-CODE-026
---

## The copy button copies the raw code and confirms it

### Normative behavior

When the reader clicks the copy button, the extension SHALL put the block's code only on the clipboard, without file name or line numbers, lines joined with newlines and a trailing newline, label the button Copied with a check mark for 1.5 s only after the host confirms the copy, show the host's reason instead when it refuses, and keep the focus and the editors untouched; the host SHALL refuse a copy request whose text is not a string, is longer than 1 000 000 characters or does not follow a click of the user, without writing the clipboard, and answer every copy request it handles.

### Scenario S1 (nominal): The clipboard holds the code lines only

- GIVEN a numbered, emphasized block with a file name
- WHEN the reader clicks Copy code
- THEN the clipboard holds the code lines only, joined by newlines with a trailing newline (the page sends the text in a `previewCopyText` request, which the host writes to the clipboard)

### Scenario S2 (boundary): A diff block keeps its markers

- GIVEN a diff block
- WHEN the reader clicks Copy code
- THEN the clipboard holds the lines with their `+` and `-` markers and nothing else

### Scenario S3 (nominal): The button confirms with Copied for 1.5 seconds

- GIVEN the reader has clicked Copy code
- WHEN 1.5 s pass
- THEN the button was labelled Copied with a check mark from the host's confirmation and returns to Copy code without the check mark

### Scenario S4 (refusal): The button never claims a copy that did not happen

- GIVEN the host answers a copy request with a refusal and a reason (for example "Too large to copy.")
- WHEN the answer arrives
- THEN the button shows a cross and the reason as its label and title for 3 s instead of Copied, then returns to Copy code; before any answer, and for an answer to an older click, it keeps the label Copy code

### Scenario S5 (boundary): A second click restarts the confirmation

- GIVEN the reader clicks the button twice within 1.5 s
- WHEN the host confirms the second click
- THEN the Copied state lasts 1.5 s from that confirmation

### Scenario S6 (nominal): An open block editor keeps the focus

- GIVEN a block editor is open elsewhere
- WHEN the reader presses the copy button
- THEN the editor keeps the focus

### Scenario S7 (refusal): Edit mode opens and commits no editor

- GIVEN edit mode is on
- WHEN the reader clicks the copy button of a block
- THEN the code is copied and no editor opens or commits, and the click does not reach the block's own click handling

### Scenario S8 (boundary): A copy request of 1 000 000 characters is written

- GIVEN a `previewCopyText` request with 1 000 000 characters
- WHEN the host receives it
- THEN the text is written to the clipboard

### Scenario S9 (refusal): An oversized or non-string request is refused

- GIVEN a `previewCopyText` request with 1 000 001 characters or a numeric text
- WHEN the host receives it
- THEN the clipboard is unchanged; a text of 1 000 001 to 20 000 000 characters is answered `ok: false` with "Too large to copy."; anything else that fails the shape check is dropped without an answer, and the page shows its "did not answer" refusal after 6 s

### Scenario S10 (refusal): Accepted shape of the copy request

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

A request is answered by `editId` (see SwRS-MDOKFSTUDIO-TRUST-090). The shape check accepts a string of up to 20 000 000 characters, so that the host can answer the size limit; a non-string is dropped: nothing is written to the clipboard.

### Scenario S11 (refusal): A copy request without a click of the user is refused

- GIVEN a well-formed `previewCopyText` message whose `userGesture` is false (the page sets it true only when it sends the request from a click event the user made, `isTrusted`)
- WHEN the host receives it
- THEN it is answered `ok: false`, "Copy needs a click on the copy button.", and the clipboard is unchanged; a message without a boolean `userGesture` is rejected by the shape check

### Scenario S12 (nominal): Every handled request is answered

- GIVEN a copy request the host handles
- WHEN the clipboard write succeeds or fails
- THEN the host sends `previewCopyTextResult` with the request's `editId` and `ok: true`, or `ok: false` with "Could not copy."

### Scenario S13 (boundary): A stale page or a preview with restricted reads

- GIVEN a `previewCopyText` message that passes the shape check
- WHEN its document version or render request is stale, or the preview has restricted reads
- THEN a stale message is still copied and answered, because the copy is gated by the document only (see SwRS-MDOKFSTUDIO-TRUST-065), and a preview with restricted reads still writes the text and edits nothing (see SwRS-MDOKFSTUDIO-TRUST-005)

### Related requirements

- SwRS-MDOKFSTUDIO-CODE-017: shows the copy button on a hovered code block

### Verification notes

- Method: test/page/modules/codeCopy.test.ts (posted text, diff markers, Copied label and icon after the host answer, refusal reason, answer of an older click ignored, fake timers, second click ("a second click within 1.5 s restarts the Copied confirmation from its own answer"), mousedown default-prevented and click not propagated, focus kept, edit mode opens no editor)
- Method: test/core/protocol/pageToHost.test.ts (the accepted shape of the copy request, oversized and non-string text)
- Method: test/session/renderReq.codeCopy.requirements.test.ts (host clipboard write of the posted text and its answer, gestureless request refused, stale page and restricted reads, size refusal, failing clipboard)
- Criteria: clipboard text equals the source code plus one trailing newline; label and icon change when the host answers (ok: Copied; refused: its reason) and reset 1500 ms (3000 ms for a refusal) later; nothing changes before the answer; mousedown is default-prevented; click does not propagate; 1 000 000 copied, 1 000 001 accepted by the shape check and answered "Too large to copy.", 20 000 001 and non-strings rejected; a preview with restricted reads writes the requested code and processes no edit request

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CODE-004](../../strs/code-blocks/StRS-MDOKFSTUDIO-CODE-004.md): A reader copies the exact code of a block
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-005](../trust-security/SwRS-MDOKFSTUDIO-TRUST-005.md): The host handles the page messages of every preview, whatever the trust
  - [SwRS-MDOKFSTUDIO-TRUST-052](../trust-security/SwRS-MDOKFSTUDIO-TRUST-052.md): Every page message has a registered type and a valid envelope before any handler runs
  - [SwRS-MDOKFSTUDIO-TRUST-065](../trust-security/SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
- Supersedes:
  - [SwRS-MDOKFSTUDIO-CODE-020](SwRS-MDOKFSTUDIO-CODE-020.md): Confirm a copy with a Copied state for 1.5 seconds
  - [SwRS-MDOKFSTUDIO-CODE-021](SwRS-MDOKFSTUDIO-CODE-021.md): Keep focus and editors untouched by the copy button
  - [SwRS-MDOKFSTUDIO-CODE-026](SwRS-MDOKFSTUDIO-CODE-026.md): An invalid or oversized copy request is refused
<!-- okf:links:end -->
