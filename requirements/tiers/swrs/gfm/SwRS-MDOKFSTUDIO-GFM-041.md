---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-041
uuid: 04541057-743e-453b-b3ad-f858450a47a9
title: Choosing an option moves the (x)
description: When a writer clicks or presses Space or Enter on an unselected
  option of a radio group, the extension SHALL write '(x)' on that option and '(
  )' on the previously selected one as one undo step, and restore the previous
  selection with the reason next to the option when the host refuses the choice.
project: markdown-okf-schema-studio
scope: gfm
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-005
depends_on:
- SwRS-MDOKFSTUDIO-GFM-021
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-065
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-BLOCK-058
scenarios:
- id: S1
  title: A click moves the selection in the source
- id: S2
  title: Clicks and keys that write nothing or normalise
- id: S3
  title: An open editor and refused choices
annotation_exemption: false
exemption_reason:
derived_by: []
supersedes:
- SwRS-MDOKFSTUDIO-GFM-039
implemented_in_files:
- src/core/edits/sourceEdits.ts
- src/core/protocol/pageToHost.ts
- src/core/render/radioMarkers.ts
- src/page/features/checkboxes.ts
- src/page/features/contentPatch.ts
- src/session/features/sourceEdits.ts
tested_in_files:
- test/core/edits/radioSelect.test.ts
- test/host-vscode/documents.test.ts
- test/integration/radioChoice.test.ts
- test/page/runtimeRadioGroups.test.ts
- test/session/radioChoice.test.ts
default_owner_email: gaetan@xeberon.net
---

## Choosing an option moves the (x)

### Normative behavior

When a writer clicks or presses Space or Enter on an unselected option of a radio group, the extension SHALL write '(x)' on that option and '( )' on the previously selected one as one undo step, and restore the previous selection with the reason next to the option when the host refuses the choice.

### Scenario S1 (nominal): A click moves the selection in the source

- GIVEN a trusted preview of '- (x) A', '- ( ) B', '- ( ) C'
- WHEN the writer clicks the control of C, in reading or edit mode
- THEN the preview shows C selected at once, the source becomes '- ( ) A', '- ( ) B', '- (x) C' (one character on each of two lines), one undo in the text editor restores the source, and no block editor opens

### Scenario S2 (boundary): Clicks and keys that write nothing or normalise

| Input | Outcome |
| --- | --- |
| a click on the only selected option | no message, no write |
| two '(x)' in the source, then a click on one option | one write that leaves '(x)' on the clicked option only |
| ArrowDown or ArrowRight, ArrowUp or ArrowLeft, Home, End on a focused option | the focus moves to the next, previous (wrapping), first or last option of the group, which becomes its tab stop; nothing is written or selected |
| Space or Enter on a focused option | selects it and writes, as a click does; the key neither scrolls the page nor reaches the block keys; after the choice, once the content patch is applied, the focus is on the option of the same source line and column (also after a click), without scrolling |
| a content patch (an external rewrite) while no option has the focus | no option takes the focus |
| a click while a choice of the group waits for the host | prevented, no second message |
| an option without a valid line or column, or a group of fewer than two options | prevented, no message |

### Scenario S3 (refusal): An open editor and refused choices

The choice takes the path of the checkbox toggle (SwRS-MDOKFSTUDIO-GFM-021): the same message type with the group's options, the same gates (SwRS-MDOKFSTUDIO-TRUST-005, SwRS-MDOKFSTUDIO-TRUST-065, SwRS-MDOKFSTUDIO-BLOCK-041), the same answer and the same refusal note.

| Input | Outcome |
| --- | --- |
| a click while a block or frontmatter editor is open | the guard runs on the press (mousedown, capture phase), before the editor's blur: the press is prevented, so the focus and the caret stay in the editor, nothing is committed and the editor stays open; the click that follows sends no message; the editor status reads 'Save or cancel this edit before choosing an option.' |
| a choice that reaches the host while a Markdown edit is open | refused with 'Save or cancel the open Markdown edit before choosing an option.' |
| a group whose lines no longer start with a radio marker at their columns | refused with 'The choice is no longer in the source. Refresh the preview.' |
| a group whose positions are not one run of consecutive radio items of one list in the current source (lines out of order, items of different indentation or list markers, or a blank line, another item, a heading, a thematic break or a code fence between two options) | refused with 'The choice is no longer in the source. Refresh the preview.', and no marker of another group changes |
| a file VS Code keeps read-only (files.readonlyInclude, or read-only in the session) | the apply resolves and changes nothing: refused with 'This file is read-only in VS Code.' |
| a radio group in the message that is not 2 to 256 distinct positions including the clicked one, or a choice with checked false (see SwRS-MDOKFSTUDIO-GFM-021) | refused with 'The checkbox request was not understood. Refresh the preview.' |
| any refusal | the previous selection and tab stop come back, and the reason shows next to the clicked option for about six seconds and as its tooltip |

### Related requirements

- SwRS-MDOKFSTUDIO-GFM-040: renders the radio group this choice acts on
- SwRS-MDOKFSTUDIO-GFM-021: the checkbox toggle whose message and gates the choice reuses

### Verification notes

- Method: test/core/edits/radioSelect.test.ts (marker detection and the host edit: two lines, normalisation, no-op, refusals, forged groups).
- Method: test/page/runtimeRadioGroups.test.ts (page clicks, keys, guards, the press guard with an open editor, the focus kept after the content patch and not taken without a focused option, refusal note); test/session/radioChoice.test.ts (one apply per choice, host refusals, a forged two-group choice, message validation, a choice of a preview with restricted reads reaches the handler, an apply that changes nothing on a read-only file).
- Method: test/integration/radioChoice.test.ts (real VS Code window, real mouse and keys through CDP, run by the heavy integration job: click writes two lines, one undo reverts, the selected option writes nothing, one Tab from the label lands on the selected option, the arrows only move the focus, Space and Enter select, the chosen option keeps the focus after the re-render; with a block editor open, a real click on an option reached by a wheel scroll writes nothing and keeps the editor open; on a file in files.readonlyInclude a click is refused, the source's selection comes back and the reason shows). test/host-vscode/documents.test.ts ("an own undo step without a visible editor, and a plain edit, go through a workspace edit": when no editor shows the document, the host applies the choice, one undo step of one or two edits, through workspace.applyEdit). Untested: on a read-only file that workspace.applyEdit call may resolve false, and the page then shows 'VS Code could not apply the checkbox edit.' instead of the read-only reason.
- Method: the screenshot scenarios gfm/v12-radio-tab-entry-cream-900 and gfm/v13-radio-tab-entry-dark-900 (test/visual/radioPlanScenarios.ts: a click on the label, then one Tab: the focus, with its ring, is on the selected option).
- Criteria: at most one character per option changes, in one undo step; no write for the selected option or the arrows; every refusal restores the shown selection and names its reason.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-GFM-005](../../strs/gfm/StRS-MDOKFSTUDIO-GFM-005.md): A writer or reviewer decides between the options of a plan with one click
- Depends on:
  - [SwRS-MDOKFSTUDIO-GFM-021](SwRS-MDOKFSTUDIO-GFM-021.md): Clicking a checkbox toggles one source character
  - [SwRS-MDOKFSTUDIO-TRUST-005](../trust-security/SwRS-MDOKFSTUDIO-TRUST-005.md): The host handles the page messages of every preview, whatever the trust
  - [SwRS-MDOKFSTUDIO-TRUST-065](../trust-security/SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
  - [SwRS-MDOKFSTUDIO-BLOCK-041](../block-editing/SwRS-MDOKFSTUDIO-BLOCK-041.md): One edit at a time: an open editor blocks other edits, opens and refreshes
  - [SwRS-MDOKFSTUDIO-BLOCK-058](../block-editing/SwRS-MDOKFSTUDIO-BLOCK-058.md): Every host source edit is one undo step, renders once and reports a failed apply
- Supersedes:
  - [SwRS-MDOKFSTUDIO-GFM-039](SwRS-MDOKFSTUDIO-GFM-039.md): Radio choice lists render as a radio group and a click moves the selection in the source
<!-- okf:links:end -->
