---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-021
uuid: 316e3fc1-d2a8-43ab-9eaf-a67304f9bd1f
title: Clicking a checkbox toggles one source character
description: When a writer clicks a checkbox in reading or edit mode, the
  extension SHALL edit only the character between its brackets, without opening
  a block editor, and revert the checkbox and show the reason next to it for a
  few seconds (and as its tooltip) when the host refuses the toggle; the host
  SHALL accept a previewCheckboxToggle message only with a safe non-negative
  integer column, a boolean checked state and a single line.
project: markdown-okf-schema-studio
scope: gfm
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-003
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-065
- SwRS-MDOKFSTUDIO-TRUST-090
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-BLOCK-058
scenarios:
- id: S1
  title: Toggle in reading mode
- id: S2
  title: Toggle in a table cell in edit mode
- id: S3
  title: Uppercase marker rewritten
- id: S4
  title: Clicks that send no message
- id: S5
  title: The host refuses the toggle
- id: S6
  title: Content patches clear pending toggles
- id: S7
  title: Invalid toggle messages
- id: S8
  title: A rejected message is answered
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/edits/sourceEdits.ts
- src/core/protocol/pageToHost.ts
- src/page/features/checkboxes.ts
- src/page/features/contentPatch.ts
- src/session/features/sourceEdits.ts
- src/session/pageMessages.ts
tested_in_files:
- test/core/edits/sourceEdits.test.ts
- test/core/protocol/pageStateMessages.test.ts
- test/host-vscode/documents.test.ts
- test/page/runtimeContentPatch.test.ts
- test/page/runtimePageControls.test.ts
- test/session/checkboxRefusal.test.ts
- test/session/radioChoice.test.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-GFM-023
- SwRS-MDOKFSTUDIO-GFM-024
- SwRS-MDOKFSTUDIO-GFM-027
- SwRS-MDOKFSTUDIO-GFM-028
---

## Clicking a checkbox toggles one source character

### Normative behavior

When a writer clicks a checkbox in reading or edit mode, the extension SHALL edit only the character between its brackets, without opening a block editor, and revert the checkbox and show the reason next to it for a few seconds (and as its tooltip) when the host refuses the toggle; the host SHALL accept a previewCheckboxToggle message only with a safe non-negative integer column, a boolean checked state and a single line.

### Scenario S1 (nominal): Toggle in reading mode

- GIVEN a trusted preview with '- [ ] a'
- WHEN the checkbox is clicked
- THEN the source becomes '- [x] a' and no block editor opens

### Scenario S2 (nominal): Toggle in a table cell in edit mode

- GIVEN edit mode and '[ ]' in a table cell
- WHEN the checkbox is clicked
- THEN only that character changes and no block editor opens

### Scenario S3 (boundary): Uppercase marker rewritten

- GIVEN a checked '[X]' marker
- WHEN the checkbox is clicked to uncheck and clicked again to check
- THEN the marker is written back as lowercase '[x]'

### Scenario S4 (refusal): Clicks that send no message

| Input | Outcome |
| --- | --- |
| a click while a toggle awaits the host result | only one toggle message was sent and the checkbox is aria-busy until the result arrives |
| a checkbox without valid line or column attributes | the click is prevented and no message is sent |

### Scenario S5 (refusal): The host refuses the toggle

For the open editor and the stale render, see SwRS-MDOKFSTUDIO-BLOCK-041, SwRS-MDOKFSTUDIO-TRUST-065 and SwRS-MDOKFSTUDIO-TRUST-005. The reasons of the toggle are:

| Input | Outcome |
| --- | --- |
| a toggle refused as out of date | the checkbox returns to its previous state, and the tooltip and a short status note next to the box read 'The preview is out of date. Try again once it has refreshed.' |
| a toggle for a marker removed from the source | refused with 'The checkbox is no longer in the source. Refresh the preview.' |
| a toggle while a Markdown edit is open | refused with 'Save or cancel the open Markdown edit before toggling a checkbox.' |
| VS Code fails to apply the edit | refused with 'VS Code could not apply the checkbox edit.' or the edit error |
| a file VS Code keeps read-only (files.readonlyInclude, or read-only in the session): the apply resolves and changes nothing | refused with 'This file is read-only in VS Code.' |
| a toggle message the validator rejects (scenario 'Invalid toggle messages') | refused with 'The checkbox request was not understood. Refresh the preview.' |

The reason appears in a status note right after the box and disappears after about six seconds; a second refusal of the same box replaces the note.

### Scenario S6 (boundary): Content patches clear pending toggles

| Input | Outcome |
| --- | --- |
| a pending toggle of old content, then an in-place patch and the old result | the new content checkbox is unchanged |
| no pending toggle, then a patch | patching succeeds without effect on checkboxes |

### Scenario S7 (refusal): Invalid toggle messages

A previewCheckboxToggle message with line 3, endLine 3, column 4, checked true is accepted. Column, checked and radioGroup are accepted on no other message type: a previewEditCancel message with column 4, or a previewScroll message with a radioGroup, is refused.

| Input | Outcome |
| --- | --- |
| a negative column | rejected, no edit is made |
| a fractional column | rejected, no edit is made |
| a checked state that is not a boolean | rejected, no edit is made |
| line different from endLine | rejected, no edit is made |
| a radioGroup (the options of a radio choice) that is not an array of 2 to 256 distinct line and column positions including the message's own, or that comes with checked false | rejected, no edit is made |

### Scenario S8 (refusal): A rejected message is answered

| Input | Outcome |
| --- | --- |
| a rejected toggle that names the shown document, a render and an edit id | the page is answered with the error 'The checkbox request was not understood. Refresh the preview.' and no edit is made, so the box does not stay busy |
| a rejected toggle without an edit id, or for another document | dropped without an answer |


### Verification notes

- Method: test/core/edits/sourceEdits.test.ts (toggle in reading mode, table cell, uppercase marker: unit tests of the one-character edit).
- Method: test/page/runtimePageControls.test.ts (toggle with no block editor, busy checkbox, missing position attributes, unit test "a rejected checkbox toggle reverts the box and explains why", which also checks the status note and its removal). test/session/checkboxRefusal.test.ts (a toggle of a standalone file or in Restricted Mode reaches the handler). test/session/radioChoice.test.ts (a plain toggle on a read-only file: the apply changes nothing and the answer is the read-only reason). test/session/radioChoice.test.ts ("the host refuses a checkbox toggle whose marker is gone, that races an open editor, or that VS Code cannot apply": the host refusal paths, marker gone, open Markdown edit, apply refused and apply failing). test/host-vscode/documents.test.ts ("an own undo step without a visible editor, and a plain edit, go through a workspace edit": when no editor shows the document, the host applies the toggle, one undo step of one or two edits, through workspace.applyEdit). Untested: on a read-only file that workspace.applyEdit call may resolve false, and the page then shows 'VS Code could not apply the checkbox edit.' instead of the read-only reason. The visual scenario of the refusal note is in the visual suite.
- Method: test/page/runtimeContentPatch.test.ts (content patch scenario: page unit tests).
- Method: test/core/protocol/pageStateMessages.test.ts (valid message, invalid shapes, column and checked on another type: unit tests on the validators). test/session/checkboxRefusal.test.ts (a malformed toggle is answered; one without a box or for another document is not). test/session/radioChoice.test.ts (malformed radio groups are answered; a radioGroup on another type is refused).
- Criteria: Only well-formed messages are accepted; a radioGroup also needs 2 to 256 distinct positions that include the toggled one, and checked set to true. The edit replaces exactly one character; exactly one message per pending toggle; the box is reverted and the matching reason shown, beside the box and as a tooltip, for every refusal; new content is unaffected by stale results.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-GFM-003](../../strs/gfm/StRS-MDOKFSTUDIO-GFM-003.md): A writer toggles task checkboxes from the preview
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-052](../trust-security/SwRS-MDOKFSTUDIO-TRUST-052.md): Every page message has a registered type and a valid envelope before any handler runs
  - [SwRS-MDOKFSTUDIO-TRUST-005](../trust-security/SwRS-MDOKFSTUDIO-TRUST-005.md): The host handles the page messages of every preview, whatever the trust
  - [SwRS-MDOKFSTUDIO-TRUST-065](../trust-security/SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
  - [SwRS-MDOKFSTUDIO-TRUST-090](../trust-security/SwRS-MDOKFSTUDIO-TRUST-090.md): Every page request is answered once by its id and result type, or ends with a readable error
  - [SwRS-MDOKFSTUDIO-BLOCK-041](../block-editing/SwRS-MDOKFSTUDIO-BLOCK-041.md): One edit at a time: an open editor blocks other edits, opens and refreshes
  - [SwRS-MDOKFSTUDIO-BLOCK-058](../block-editing/SwRS-MDOKFSTUDIO-BLOCK-058.md): Every host source edit is one undo step, renders once and reports a failed apply
- Supersedes:
  - [SwRS-MDOKFSTUDIO-GFM-023](SwRS-MDOKFSTUDIO-GFM-023.md): A pending toggle blocks further clicks
  - [SwRS-MDOKFSTUDIO-GFM-024](SwRS-MDOKFSTUDIO-GFM-024.md): A refused toggle reverts the checkbox with a reason
  - [SwRS-MDOKFSTUDIO-GFM-027](SwRS-MDOKFSTUDIO-GFM-027.md): The host validates checkbox toggle messages
  - [SwRS-MDOKFSTUDIO-GFM-028](SwRS-MDOKFSTUDIO-GFM-028.md): Content patches clear pending toggles
<!-- okf:links:end -->
