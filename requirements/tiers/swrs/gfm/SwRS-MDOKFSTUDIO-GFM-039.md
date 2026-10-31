---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-039
uuid: 77551f73-13ad-463b-8201-c07018fe93ea
title: Radio choice lists render as a radio group and a click moves the
  selection in the source
description: When a list holds at least two consecutive items that start with '(
  )', '(x)' or '(X)', the extension SHALL render them as one radio group, and
  when a writer clicks or presses Space or Enter on an unselected option, it
  SHALL write '(x)' on that option and '( )' on the previously selected one as
  one undo step.
project: markdown-okf-schema-studio
scope: gfm
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-003
depends_on:
- SwRS-MDOKFSTUDIO-GFM-021
- SwRS-MDOKFSTUDIO-GFM-027
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-065
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-BLOCK-058
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/edits/sourceEdits.ts
- src/core/protocol/pageToHost.ts
- src/core/render/checkboxMarkers.ts
- src/core/render/radioGroups.ts
- src/core/render/radioMarkers.ts
- src/page/features/checkboxes.ts
- src/session/features/sourceEdits.ts
tested_in_files:
- test/core/edits/radioSelect.test.ts
- test/core/render/radioGroups.test.ts
- test/integration/radioChoice.test.ts
- test/page/runtimeRadioGroups.test.ts
- test/session/radioChoice.test.ts
- test/visual/radioPlanScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## Radio choice lists render as a radio group and a click moves the selection in the source

### Normative behavior

When a list holds at least two consecutive items that start with '( )', '(x)' or '(X)', the extension SHALL render them as one radio group, and when a writer clicks or presses Space or Enter on an unselected option, it SHALL write '(x)' on that option and '( )' on the previously selected one as one undo step.

### Scenario (nominal): A radio group renders labelled, with one tab stop

- GIVEN the paragraph 'Fix direction:' followed by the list '- (x) A', '- ( ) B', '- ( ) C'
- WHEN the document renders, in any palette mode (Strict, GFM, MyST or Full: the mode changes only the palette buttons)
- THEN the list carries role="radiogroup" and aria-labelledby naming the paragraph, each item shows a round control with role="radio", aria-checked "true" for A and "false" for B and C, its source line and UTF-16 column, and the selected option (else the first) is the only one with tabindex 0; the controls replace the markers and the bullets

### Scenario (boundary): Which items form a group

| Input | Outcome |
| --- | --- |
| a single '( )' or '(x)' item in its run | stays plain text '( ) ...' |
| '(X)' | a selected option; it is left as written unless a click selects another option |
| '(x)' with no space or tab after it, '(y)', '(x)' in a paragraph or not at the start of the item | plain text |
| a blank line between two radio items | ends the group; each run of at least two items is a group of its own |
| a heading, a list with another bullet or ordered marker, or a non-radio item between two radio items | ends the group |
| a list that mixes '[ ]' and '( )' items | the '[ ]' items stay checkboxes; a run of at least two '( )' items is a radio group owned by an empty role="radiogroup" element (aria-owns), and only a group that starts the list is labelled by the paragraph above it |
| an ordered list of radio items ('1. ( )', '2. (x)') | one group; each item keeps its number and shows the control after it |
| no '(x)' in the group | every option renders unselected, the first is the tab stop |
| two '(x)' in the group | both render selected, as written |
| a nested list of radio items | forms its own group, labelled by its parent item's text |
| markers in code, in a block quote or after frontmatter, CRLF files | literal in code; elsewhere the line and column are those of the document |
| the sanitized webview HTML | keeps the roles, the states, the ids and the source attributes |

### Scenario (nominal): A click moves the selection in the source

- GIVEN a trusted preview of '- (x) A', '- ( ) B', '- ( ) C'
- WHEN the writer clicks the control of C, in reading or edit mode
- THEN the preview shows C selected at once, the source becomes '- ( ) A', '- ( ) B', '- (x) C' (one character on each of two lines), one undo in the text editor restores the source, and no block editor opens

### Scenario (boundary): Clicks and keys that write nothing or normalise

| Input | Outcome |
| --- | --- |
| a click on the only selected option | no message, no write |
| two '(x)' in the source, then a click on one option | one write that leaves '(x)' on the clicked option only |
| ArrowDown or ArrowRight, ArrowUp or ArrowLeft, Home, End on a focused option | the focus moves to the next, previous (wrapping), first or last option of the group, which becomes its tab stop; nothing is written or selected |
| Space or Enter on a focused option | selects it and writes, as a click does; the key neither scrolls the page nor reaches the block keys |
| a click while a choice of the group waits for the host | prevented, no second message |
| an option without a valid line or column, or a group of fewer than two options | prevented, no message |

### Scenario (refusal): Read-only previews, an open editor and refused choices

The choice takes the path of the checkbox toggle (SwRS-MDOKFSTUDIO-GFM-021): the same message type with the group's options, the same gates (SwRS-MDOKFSTUDIO-TRUST-005, SwRS-MDOKFSTUDIO-TRUST-065, SwRS-MDOKFSTUDIO-BLOCK-041), the same answer and the same refusal note.

| Input | Outcome |
| --- | --- |
| a read-only preview | the controls have aria-disabled="true" and the read-only reason as tooltip; a click or key writes nothing |
| a click while a block or frontmatter editor is open | no message; the editor status reads 'Save or cancel this edit before choosing an option.' |
| a choice that reaches the host while a Markdown edit is open | refused with 'Save or cancel the open Markdown edit before choosing an option.' |
| a group whose lines no longer start with a radio marker at their columns | refused with 'The choice is no longer in the source. Refresh the preview.' |
| a group whose positions are not one run of consecutive radio items of one list in the current source (lines out of order, items of different indentation or list markers, or a blank line, another item, a heading, a thematic break or a code fence between two options) | refused with 'The choice is no longer in the source. Refresh the preview.', and no marker of another group changes |
| a radio group in the message that is not 2 to 256 distinct positions including the clicked one, or a choice with checked false (see SwRS-MDOKFSTUDIO-GFM-027) | refused with 'The checkbox request was not understood. Refresh the preview.' |
| any refusal | the previous selection and tab stop come back, and the reason shows next to the clicked option for about six seconds and as its tooltip |

### Verification notes

- Method: test/core/render/radioGroups.test.ts (rendering, grouping rules, labels, roving tab stop, sanitizer); test/core/edits/radioSelect.test.ts (marker detection and the host edit: two lines, normalisation, no-op, refusals, forged groups).
- Method: test/page/runtimeRadioGroups.test.ts (page clicks, keys, guards, refusal note, palette modes); test/session/radioChoice.test.ts (one apply per choice, host refusals, a forged two-group choice, message validation, read-only gate).
- Method: test/integration/radioChoice.test.ts (real VS Code window, real mouse and keys through CDP, run by the heavy integration job: click writes two lines, one undo reverts, the selected option writes nothing, the arrows only move the focus, Space and Enter select).
- Method: the screenshot scenarios gfm/v10-radio-plan-cream-900 and gfm/v11-radio-plan-dark-900 (test/visual/radioPlanScenarios.ts: a plan with a bulleted and an ordered group and a task list; the named groups, the selected options with their drawn dot, one tab stop per group, round controls in place of the bullets while the ordered group keeps its numbers, in both themes).
- Criteria: at most one character per option changes, in one undo step; no write for the selected option or the arrows; every refusal restores the shown selection and names its reason.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-GFM-003](../../strs/gfm/StRS-MDOKFSTUDIO-GFM-003.md): A writer toggles task checkboxes from the preview
- Depends on:
  - [SwRS-MDOKFSTUDIO-GFM-021](SwRS-MDOKFSTUDIO-GFM-021.md): Clicking a checkbox toggles one source character
  - [SwRS-MDOKFSTUDIO-GFM-027](SwRS-MDOKFSTUDIO-GFM-027.md): The host validates checkbox toggle messages
  - [SwRS-MDOKFSTUDIO-TRUST-005](../trust-security/SwRS-MDOKFSTUDIO-TRUST-005.md): The host refuses every write request of a read-only preview with a reason
  - [SwRS-MDOKFSTUDIO-TRUST-065](../trust-security/SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
  - [SwRS-MDOKFSTUDIO-BLOCK-041](../block-editing/SwRS-MDOKFSTUDIO-BLOCK-041.md): One edit at a time: an open editor blocks other edits, opens and refreshes
  - [SwRS-MDOKFSTUDIO-BLOCK-058](../block-editing/SwRS-MDOKFSTUDIO-BLOCK-058.md): Every host source edit is one undo step, renders once and reports a failed apply
<!-- okf:links:end -->
