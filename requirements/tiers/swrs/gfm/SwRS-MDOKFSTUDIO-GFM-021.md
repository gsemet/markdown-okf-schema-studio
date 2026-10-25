---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-021
uuid: 316e3fc1-d2a8-43ab-9eaf-a67304f9bd1f
title: Clicking a checkbox toggles one source character
description: When a writer clicks a checkbox in reading or edit mode, the
  extension SHALL edit only the character between its brackets, without opening
  a block editor, and revert the checkbox and show the reason next to it for a
  few seconds (and as its tooltip) when the host refuses the toggle.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-003
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-065
- SwRS-MDOKFSTUDIO-TRUST-090
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-BLOCK-058
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/edits/sourceEdits.ts
- src/page/features/checkboxes.ts
- src/page/features/contentPatch.ts
- src/session/features/sourceEdits.ts
tested_in_files:
- test/core/edits/sourceEdits.test.ts
- test/page/runtimeContentPatch.test.ts
- test/page/runtimePageControls.test.ts
- test/visual/scenarioDefinitions2.ts
---

## Clicking a checkbox toggles one source character

### Normative behavior

When a writer clicks a checkbox in reading or edit mode, the extension SHALL edit only the character between its brackets, without opening a block editor, and revert the checkbox and show the reason next to it for a few seconds (and as its tooltip) when the host refuses the toggle.

### Scenario (nominal): Toggle in reading mode

- GIVEN a trusted preview with '- [ ] a'
- WHEN the checkbox is clicked
- THEN the source becomes '- [x] a' and no block editor opens

### Scenario (nominal): Toggle in a table cell in edit mode

- GIVEN edit mode and '[ ]' in a table cell
- WHEN the checkbox is clicked
- THEN only that character changes and no block editor opens

### Scenario (boundary): Uppercase marker rewritten

- GIVEN a checked '[X]' marker
- WHEN the checkbox is clicked to uncheck and clicked again to check
- THEN the marker is written back as lowercase '[x]'

### Scenario (refusal): Clicks that send no message

| Input | Outcome |
| --- | --- |
| a click while a toggle awaits the host result | only one toggle message was sent and the checkbox is aria-busy until the result arrives |
| a checkbox without valid line or column attributes | the click is prevented and no message is sent |

### Scenario (refusal): The host refuses the toggle

For the open editor, the stale render and the read-only preview, see SwRS-MDOKFSTUDIO-BLOCK-041, SwRS-MDOKFSTUDIO-TRUST-065 and SwRS-MDOKFSTUDIO-TRUST-005. The reasons of the toggle are:

| Input | Outcome |
| --- | --- |
| a toggle refused as out of date | the checkbox returns to its previous state, and the tooltip and a short status note next to the box read 'The preview is out of date. Try again once it has refreshed.' |
| a toggle for a marker removed from the source | refused with 'The checkbox is no longer in the source. Refresh the preview.' |
| a toggle while a Markdown edit is open | refused with 'Save or cancel the open Markdown edit before toggling a checkbox.' |
| VS Code fails to apply the edit | refused with 'VS Code could not apply the checkbox edit.' or the edit error |
| a toggle message the validator rejects (see SwRS-MDOKFSTUDIO-GFM-027) | refused with 'The checkbox request was not understood. Refresh the preview.' |
| a toggle in a preview of a file outside every workspace folder | refused with "Editing needs the file's folder opened as a workspace folder in VS Code." (in an untrusted workspace: 'Editing requires a trusted workspace.') |

The reason appears in a status note right after the box and disappears after about six seconds; a second refusal of the same box replaces the note.

### Scenario (boundary): Content patches clear pending toggles

| Input | Outcome |
| --- | --- |
| a pending toggle of old content, then an in-place patch and the old result | the new content checkbox is unchanged |
| no pending toggle, then a patch | patching succeeds without effect on checkboxes |

### Related requirements

- SwRS-MDOKFSTUDIO-GFM-027: the host validates the checkbox toggle message this click sends

### Verification notes

- Method: test/core/edits/sourceEdits.test.ts (toggle in reading mode, table cell, uppercase marker: unit tests of the one-character edit).
- Method: test/page/runtimePageControls.test.ts (toggle with no block editor, busy checkbox, missing position attributes, unit test "a rejected checkbox toggle reverts the box and explains why", which also checks the status note and its removal). test/session/checkboxRefusal.test.ts (read-only reasons). Untested: the host refusal paths (marker gone, open Markdown edit, apply failure). The visual scenario of the refusal note is in the visual suite.
- Method: test/page/runtimeContentPatch.test.ts (content patch scenario: page unit tests).
- Criteria: The edit replaces exactly one character; exactly one message per pending toggle; the box is reverted and the matching reason shown, beside the box and as a tooltip, for every refusal; new content is unaffected by stale results.
