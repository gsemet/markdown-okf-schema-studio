---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-053
uuid: 322f38d0-f7ae-4431-a072-78b159ecad16
title: Cancel and Escape restore the saved text, or close the editor during a
  final save
description: When a writer presses Cancel or Escape in a block editor, the page
  SHALL close the editor, posting previewEditCancel only when an autosave
  already reached the document, after which the host writes the original text of
  the block back in one edit; during a final save it closes the editor with no
  previewEditCancel and the save completes.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-006
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-058
scenarios:
- id: S1
  title: Nothing autosaved
- id: S2
  title: After an autosave
- id: S3
  title: The host restores the original text
- id: S4
  title: Cancel during a final save closes the editor and the save completes
- id: S5
  title: The host ends a detached save with an answer
- id: S6
  title: Escape during an IME composition
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/blockEditor.ts
- src/page/features/blockSourceEditor.ts
- src/page/features/detachedSave.ts
- src/page/features/detachedSaveState.ts
- src/session/features/blockEdits.ts
tested_in_files:
- test/core/protocol/pageToHost.test.ts
- test/integration/previewEditing.test.ts
- test/page/blockReq.requirements.test.ts
- test/page/runtimeBlockEditor.test.ts
- test/page/runtimeDetachedSave.test.ts
- test/page/runtimeDetachedSaveEnds.test.ts
- test/page/runtimeDetachedSaveKinds.test.ts
- test/page/runtimeEditInFlight.test.ts
- test/page/runtimeSaveEnds.test.ts
- test/session/detachedSave.test.ts
default_owner_email: gaetan@xeberon.net
---

## Cancel and Escape restore the saved text, or close the editor during a final save

### Normative behavior

When a writer presses Cancel or Escape in a block editor, the page SHALL close the editor, posting previewEditCancel only when an autosave already reached the document, after which the host writes the original text of the block back in one edit. While the final save of the editor is in flight, the page SHALL close the editor with previewEditClosed and no previewEditCancel, and the save SHALL complete: the text the writer finished stays in the document.

### Scenario S1 (nominal): Nothing autosaved
- GIVEN an editor with typed text that no autosave has posted
- WHEN the writer presses Escape
- THEN the editor closes, no save and no cancel is posted and a later blur sends nothing

### Scenario S2 (nominal): After an autosave
- GIVEN an editor whose text was autosaved
- WHEN the writer presses Cancel
- THEN the editor closes and previewEditCancel is posted with the editor id and its lines

### Scenario S3 (nominal): The host restores the original text
| Input | Outcome |
| --- | --- |
| A matching previewEditCancel for a held block edit whose autosave changed the block | The block text in the document equals the original text and the host edit ends |
| A matching previewEditCancel for a held insertion whose autosave inserted a new block | The inserted text is removed again |

### Scenario S4 (nominal): Cancel during a final save closes the editor and the save completes
- GIVEN an editor that posted its final save and has not been answered
- WHEN the writer presses Cancel or Escape
- THEN the editor closes, previewEditClosed is posted with the editor id, no previewEditCancel and no second final save are posted, and the text finished stays in the document
- AND the pending navigation is dropped, and a block or field clicked afterwards opens once the save has ended
- GIVEN an editor that has not finished
- WHEN the writer presses Cancel
- THEN the editor cancels as usual

### Scenario S5 (nominal): The host ends a detached save with an answer
| Input | Outcome |
| --- | --- |
| A previewEditClosed with detached for the editor of a held edit whose final save is being written | The edit is marked detached, the page editor lock is cleared and the write goes on |
| The write of that save lands | previewEditSource with done and renderFollows is posted when a render follows, and with done alone when nothing renders |
| A detached edit with nothing being written | The edit completes at once and answers with done |

### Scenario S6 (boundary): Escape during an IME composition
| Input | Outcome |
| --- | --- |
| Escape while an input method composition is running in the text box | The editor stays open and no save or cancel is posted |
| Escape after the composition ended | The editor cancels |

### Related requirements
- SwRS-MDOKFSTUDIO-BLOCK-058: the restore is itself an ordinary host source edit.

### Verification notes
- Method: test/page/runtimeBlockEditor.test.ts (`Cancel cancels only what reached the document`, `Escape in a changed Markdown block editor cancels and never saves a final text`: nothing autosaved; `Escape after an autosave restores the block with previewEditCancel`: after an autosave; `Escape during IME composition neither cancels nor saves a block edit`: IME composition); real-input scenario scenarioEscapeCancels (screenshot block-editing/r05).
- Method: test/page/blockReq.requirements.test.ts (`Cancel and Escape close the editor while the final save is in flight`: cancel while saving and before saving), test/page/runtimeDetachedSave.test.ts and test/page/runtimeSaveEnds.test.ts (the detached record, the cell editor, the wait of a click).
- Method: test/session/detachedSave.test.ts (done and renderFollows, the idle edit, the lock kept by a ready report, a newer page editor kept) and the real-window step of test/integration/previewEditing.test.ts (a held write, a detached save, the edit ends).
- Method: test/integration/previewEditing.test.ts (cancel of an inserted block removes it; a cancel with a mismatched id is refused: host restore). The unit-level path of handleEditCancel has no test.
- Criteria: previewEditCancel is posted exactly when hasAutosavedChange is true; cancelBlockEdit closes the editor with previewEditClosed and no previewEditCancel when finishing is true; the Escape branch of the keydown listener requires isComposing to be false; pendingText is set to the original text and drained as one edit.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-006](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-006.md): Typed text is saved, survives updates and is never lost on leaving
- Depends on:
  - [SwRS-MDOKFSTUDIO-BLOCK-058](SwRS-MDOKFSTUDIO-BLOCK-058.md): Every host source edit is one undo step, renders once and reports a failed apply
<!-- okf:links:end -->
