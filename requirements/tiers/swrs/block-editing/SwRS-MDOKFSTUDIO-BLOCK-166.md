---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-166
uuid: 3baac070-75ab-4fa4-9b05-7a34f32c0c9e
title: "Cmd/Ctrl+C copies the exact Markdown of the selected blocks"
description: "When a writer presses the platform copy chord with blocks selected in
  edit mode and no editor open, the page SHALL post previewBlocksCopy with the first
  and last source line of the selection and take the key from the browser, so that
  the host puts the exact Markdown of those lines on the clipboard."
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-016
- StRS-MDOKFSTUDIO-BLOCK-025
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-TRUST-090
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/mapping/blockRange.ts
- src/page/features/blockSelectionView.ts
- src/session/features/sourceEdits.ts
tested_in_files:
- test/core/edits/sourceEdits.test.ts
- test/core/mapping/blockRange.test.ts
- test/integration/blockClipboard.test.ts
- test/page/runtimeBlockSelection.test.ts
default_owner_email: gaetan@xeberon.net
---

## Cmd/Ctrl+C copies the exact Markdown of the selected blocks

### Normative behavior

When a writer presses the platform copy chord with blocks selected in edit mode and no editor open, the page SHALL post previewBlocksCopy with the first and last source line of the selection and take the key from the browser, so that the host puts the exact Markdown of those lines on the clipboard.

### Scenario (nominal): Ctrl+C or Cmd+C posts the source lines of the selection

- GIVEN two selected blocks at lines 5 to 6 and 8 to 10
- WHEN the writer presses Ctrl+C (Cmd+C on macOS)
- THEN previewBlocksCopy carries line 5 and endLine 10 and the default action is prevented

### Scenario (nominal): The host puts the exact Markdown on the clipboard

| Input | Outcome |
| --- | --- |
| Lines 7 to 10 holding a paragraph, a blank line and a two-item list | The clipboard holds those four lines joined by the document's line breaks, with no trailing line break, and the document is unchanged |
| A document with CR LF line breaks | The clipboard text keeps CR LF between its lines |

### Scenario (nominal): The page announces the answer

| Input | Outcome |
| --- | --- |
| A copy answered ok | The selection status reads "Copied as Markdown" and returns to the selection count after four seconds (4000 ms) |
| A cut answered ok | The selection is cleared instead of announcing a copy |

### Scenario (refusal): A refusal of the clipboard keys is shown for four seconds

| Input | Outcome |
| --- | --- |
| A copy, a cut or a paste answered ok false with a reason (for example a paste) | The status region shows the reason, keeps the selection and returns to the selection count after four seconds (4000 ms) |
| A copy answered ok | The copy message is shown instead |

### Scenario (refusal): The keys stay with the browser

| Input | Outcome |
| --- | --- |
| Copy, cut or paste chord in reading mode (edit mode off, a selection left over) | The page does nothing and the browser copies |
| Ctrl+V in a block text box with the focus | The text box pastes natively |
| The chord in a field, in the properties table or with an open editor | The page leaves the key to the browser |
| The chord with Shift or Alt | The page leaves the key to the browser |
| The chord with no selection or focused bar | The page leaves the key to the browser |
| Ctrl+C alone on macOS (the chord there is Cmd) | The key is ignored by the page |

### Scenario (refusal): A held key sends one request until the host answers

| Input | Outcome |
| --- | --- |
| A copy, cut or paste request is in flight and the key repeats | No second message is posted |
| The host never answers and five seconds pass | The page accepts the chord again |

### Related requirements

- SwRS-MDOKFSTUDIO-BLOCK-169: cut removes the selected blocks.
- SwRS-MDOKFSTUDIO-BLOCK-174: paste inserts the clipboard as new blocks.
- SwRS-MDOKFSTUDIO-BLOCK-241: previewBlocksCopy needs a line range.

### Verification notes

- Method: test/page/runtimeBlockSelection.test.ts, unit tests `T40: Ctrl+C and Ctrl+X on a selection post its source lines; the keys are ours` (copy chord); `T40: on macOS the chord is Cmd, and Ctrl alone is ignored` (Ctrl alone on macOS); `T40: a copy answer says so and a cut answer clears the selection` (announcement); `T40: a held key sends one request until the host answers; a refusal is announced` (refusal shown, held key; the five-second timer is not asserted); `T40: without a selection, in reading mode or with Shift/Alt the keys stay native` and `T40: the keys are ignored inside a text box, a field and the property table` (keys stay with the browser).
- Method: test/core/mapping/blockRange.test.ts, unit test `spanText returns the exact lines without the final line break` (host clipboard text, CR LF); test/core/edits/sourceEdits.test.ts, unit test `copy gives the exact Markdown of the blocks, cut also removes them with one separator` (host copy leaves the document unchanged).
- Method: test/integration/blockClipboard.test.ts (copy), and real-input scenario scenarioBlockSelection.
- Criteria: The posted lines are the first line of the first block and the last line of the last block. spanText returns the lines of the span. showSelectionNotice uses a 4000 ms timer. clipboardKey and ownsKeys return nothing for the inputs of the browser scenario. blocksFlight is cleared by the answer or by its timer.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-016](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-016.md): A writer selects blocks and copies, cuts and pastes them as Markdown
  - [StRS-MDOKFSTUDIO-BLOCK-025](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-025.md): Preview edits land exactly, in one undo step, keep line endings, or are refused with a reason
- Depends on:
  - [SwRS-MDOKFSTUDIO-BLOCK-041](SwRS-MDOKFSTUDIO-BLOCK-041.md): One edit at a time: an open editor blocks other edits, opens and refreshes
  - [SwRS-MDOKFSTUDIO-TRUST-090](../trust-security/SwRS-MDOKFSTUDIO-TRUST-090.md): Every page request is answered once by its id and result type, or ends with a readable error
<!-- okf:links:end -->
