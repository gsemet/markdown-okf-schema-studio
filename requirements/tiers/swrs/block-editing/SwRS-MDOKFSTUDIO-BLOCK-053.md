---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-053
uuid: 322f38d0-f7ae-4431-a072-78b159ecad16
title: Cancel and Escape restore the saved text
description: When a writer presses Cancel or Escape in a block editor, the page
  SHALL close the editor, posting previewEditCancel only when an autosave
  already reached the document, after which the host writes the original text of
  the block back in one edit.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-006
- StRS-MDOKFSTUDIO-BLOCK-025
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-058
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/blockEditor.ts
- src/page/features/blockSourceEditor.ts
- src/session/features/blockEdits.ts
tested_in_files:
- test/integration/previewEditing.test.ts
- test/page/blockReq.requirements.test.ts
- test/page/runtimeBlockEditor.test.ts
default_owner_email: gaetan@xeberon.net
---

## Cancel and Escape restore the saved text

### Normative behavior

When a writer presses Cancel or Escape in a block editor, the page SHALL close the editor, posting previewEditCancel only when an autosave already reached the document, after which the host writes the original text of the block back in one edit.

### Scenario (nominal): Nothing autosaved
- GIVEN an editor with typed text that no autosave has posted
- WHEN the writer presses Escape
- THEN the editor closes, no save and no cancel is posted and a later blur sends nothing

### Scenario (nominal): After an autosave
- GIVEN an editor whose text was autosaved
- WHEN the writer presses Cancel
- THEN the editor closes and previewEditCancel is posted with the editor id and its lines

### Scenario (nominal): The host restores the original text
| Input | Outcome |
| --- | --- |
| A matching previewEditCancel for a held block edit whose autosave changed the block | The block text in the document equals the original text and the host edit ends |
| A matching previewEditCancel for a held insertion whose autosave inserted a new block | The inserted text is removed again |

### Scenario (refusal): Cancel is ignored while the final save is in flight
- GIVEN an editor that posted its final save
- WHEN the writer presses Cancel or Escape
- THEN nothing happens and the save completes
- GIVEN an editor that has not finished
- WHEN the writer presses Cancel
- THEN the editor cancels as usual

### Scenario (boundary): Escape during an IME composition
| Input | Outcome |
| --- | --- |
| Escape while an input method composition is running in the text box | The editor stays open and no save or cancel is posted |
| Escape after the composition ended | The editor cancels |

### Related requirements
- SwRS-MDOKFSTUDIO-BLOCK-058: the restore is itself an ordinary host source edit.

### Verification notes
- Method: test/page/runtimeBlockEditor.test.ts (`Cancel cancels only what reached the document`, `Escape in a changed Markdown block editor cancels and never saves a final text`: nothing autosaved; `Escape after an autosave restores the block with previewEditCancel`: after an autosave; `Escape during IME composition neither cancels nor saves a block edit`: IME composition); real-input scenario scenarioEscapeCancels (screenshot block-editing/r05).
- Method: test/page/blockReq.requirements.test.ts (`Cancel and Escape are ignored while the final save is in flight`: cancel while saving and before saving).
- Method: test/integration/previewEditing.test.ts (cancel of an inserted block removes it; a cancel with a mismatched id is refused: host restore). The unit-level path of handleEditCancel has no test.
- Criteria: previewEditCancel is posted exactly when hasAutosavedChange is true; cancelBlockEdit returns without a message when finishing is true; the Escape branch of the keydown listener requires isComposing to be false; pendingText is set to the original text and drained as one edit.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-006](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-006.md): Typed text is saved, survives updates and is never lost on leaving
  - [StRS-MDOKFSTUDIO-BLOCK-025](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-025.md): Preview edits land exactly, in one undo step, keep line endings, or are refused with a reason
- Depends on:
  - [SwRS-MDOKFSTUDIO-BLOCK-058](SwRS-MDOKFSTUDIO-BLOCK-058.md): Every host source edit is one undo step, renders once and reports a failed apply
<!-- okf:links:end -->
