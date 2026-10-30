---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-058
uuid: 61723f67-df7b-45b5-a403-80d1dfe74820
title: "Every host source edit is one undo step, renders once and reports a failed
  apply"
description: "When the host writes an edit of the source document for the preview,
  it SHALL make the edit one undo step, refresh the preview once for it, and answer
  an edit that VS Code does not apply or rejects with a reason that begins \"VS Code
  could not apply\" or with the text of the error."
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-006
- StRS-MDOKFSTUDIO-BLOCK-025
- StRS-MDOKFSTUDIO-BLOCK-014
- StRS-MDOKFSTUDIO-BLOCK-016
- StRS-MDOKFSTUDIO-FMEDIT-008
- StRS-MDOKFSTUDIO-FMEDIT-001
- StRS-MDOKFSTUDIO-GFM-003
- StRS-MDOKFSTUDIO-REVIEW-015
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-041
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/session/features/blockEdits.ts
- src/session/features/frontmatter.ts
- src/session/features/sourceEdits.ts
tested_in_files:
- test/host/fmtableReq.requirements.test.ts
- test/integration/blockClipboard.test.ts
- test/integration/blockMove.test.ts
- test/integration/checkboxToggle.test.ts
- test/integration/inlineThread.test.ts
- test/integration/previewEditing.test.ts
- test/integration/realInput/markers.ts
- test/session/blockReq.requirements.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-FMEDIT-053
- SwRS-MDOKFSTUDIO-FMEDIT-055
- SwRS-MDOKFSTUDIO-GFM-022
---

## Every host source edit is one undo step, renders once and reports a failed apply

### Normative behavior

When the host writes an edit of the source document for the preview, it SHALL make the edit one undo step, refresh the preview once for it, and answer an edit that VS Code does not apply or rejects with a reason that begins "VS Code could not apply" or with the text of the error.

### Scenario (nominal): One undo step per edit kind
| Edit kind | How it is written | One Undo restores |
| --- | --- | --- |
| Text of a block editor session (several autosaves and the final save) | Plain document edits without undo stops of their own, merged by VS Code | The block as it was before the session |
| Block move | Own undo stops in the text editor that shows the document | The previous order of the blocks |
| Block cut | Own undo stops in the text editor that shows the document | The blocks that were cut |
| Block paste | Own undo stops in the text editor that shows the document | The document before the paste |
| Checkbox toggle | Own undo stops in the text editor that shows the document | The original source |
| Reply to an inline thread | Own undo stops in the text editor that shows the document | The document as before the reply |
| Delete of an inline thread | Own undo stops in the text editor that shows the document | The thread is back |
| Frontmatter save (value save, add, rename, remove) | Exactly one text edit passed to the document | The document to its text before the save |
| Label rename | Own undo stops in the text editor that shows the document | The document before the rename |

### Scenario (nominal): Cancelled session
- GIVEN an autosaved block edit that was cancelled
- WHEN the host restores the original text
- THEN the restore is itself an ordinary edit

### Scenario (nominal): No visible text editor
- GIVEN a document shown only in the preview, with no text editor showing it
- WHEN a move, a cut, a paste or a checkbox toggle is applied
- THEN the edit is applied as a workspace edit, one undoable step, with no undo stops of its own

### Scenario (nominal): One render after the final save
- GIVEN a block edit whose autosave changed the document and a final save with the same text
- WHEN the final save completes
- THEN the preview is refreshed once, with the pin of the save

### Scenario (boundary): Nothing applied
- GIVEN a held edit for which no autosave changed the document
- WHEN its final save carries the original text
- THEN no render is started

### Scenario (refusal): An edit that VS Code does not apply or rejects
| Edit kind | VS Code does not apply the edit | VS Code rejects the edit or a clipboard access fails | Held edit |
| --- | --- | --- | --- |
| Block save (autosave or final save) | The editor shows "VS Code could not apply the Markdown edit." and the final request is reset | The editor shows the text of the error | Kept for a new save |
| Block move | Answer ok false with "VS Code could not apply the move." | Answer ok false with the text of the error | None |
| Block cut | Answer ok false with "VS Code could not apply the cut." | Answer ok false with the text of the error | None |
| Block paste | Answer ok false with "VS Code could not apply the paste." | Answer ok false with the text of the error | None |
| Block copy | Not applicable, nothing is written | A failing clipboard write answers ok false with the text of the error | None |
| Checkbox toggle | Answer with the error "VS Code could not apply the checkbox edit." | Answer with the text of the error | None |
| Label rename | Answer ok false with "VS Code could not apply the rename." | Answer ok false with the text of the error | None |
| Reply or delete of an inline thread | Answer ok false with "VS Code could not apply the change." | Answer ok false with the message of the error | None |
| Frontmatter save | Answer "VS Code could not apply the frontmatter edit." | Answer with the error message text | The document stays unchanged and the editor stays open with the message |

### Scenario (refusal): A block that changed under the host
- GIVEN an autosave to write and a block whose text was changed in the document meanwhile
- WHEN the host is about to write
- THEN the editor shows "The source block changed while it was being edited." and the lock is released while the editor stays open

### Scenario (boundary): A block that did not change
- GIVEN the block still equals the last written text
- WHEN the host writes
- THEN the replacement is applied

### Related requirements
- SwRS-MDOKFSTUDIO-BLOCK-041: the edit lock that is released when a block changed under the host
- SwRS-MDOKFSTUDIO-TRUST-005: a read-only preview is refused before any edit is written
- SwRS-MDOKFSTUDIO-TRUST-065: a stale write request is answered before any edit is written

### Verification notes
- Method: test/integration/realInput/textEditing.ts, scenario scenarioTypingUndoGrouping (screenshot block-editing/r06; checks the typed session row, one undo restored), run with the document shown in a text editor next to the preview; the single step relies on VS Code merging the successive plain edits, and no test covers a document with no visible text editor, such as the Open With editor
- Method: test/integration/previewEditing.test.ts (a save during an edit does not render until the edit ends; checks the autosaved-then-Done render once; the "Nothing applied" boundary is not asserted)
- Method: test/integration/blockMove.test.ts (move row: one swap, down then up, one undo) and test/integration/blockClipboard.test.ts (cut and paste rows: runUndo, one cut and one paste are one step each); both need an unlocked screen
- Method: test/integration/checkboxToggle.test.ts (checkbox row, one undo restores the source, real window; the no-editor path is untested)
- Method: test/integration/inlineThread.test.ts (reply and delete rows: runUndo, "one undo should remove the reply" and "one undo should restore the thread"; needs a focused window and is skipped on a locked screen; the failure answers of the finish handler are untested)
- Method: test/host/fmtableReq.requirements.test.ts (frontmatter row: a value save, an add, a rename and a remove are each one text edit; a frontmatter save that VS Code does not apply is answered with a message and a thrown error gives its text); the Undo step itself is untested, it needs a real VS Code window
- Method: test/session/blockReq.requirements.test.ts (failure table rows for block save, move, cut, paste and copy: `an edit that VS Code does not apply or rejects is reported and the final request is reset`, `a move that VS Code does not apply or rejects is answered with ok false`, `a cut or paste that VS Code does not apply, and a failing clipboard, are answered with ok false`; the block that changed under the host: `a block that changed in the document under the host is reported and the lock is released`)
- Method: the cancelled-session, checkbox failure, label rename failure and label rename undo cases are untested
- Criteria: applyEdits is called without ownUndoStep for block text edits and with ownUndoStep true for a move, a cut, a paste, a checkbox toggle, a label rename and a thread change (editor.edit with undo stops before and after); completeActiveBlockEdit refreshes only when hasAppliedEdit is true and the document revision differs from the stage; every failure branch posts the reason of the table, finalRequested is false after a failed block save and releaseHostEditKeepingEditor runs after the changed-under-host error

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-006](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-006.md): Typed text is saved, survives updates and is never lost on leaving
  - [StRS-MDOKFSTUDIO-BLOCK-025](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-025.md): Preview edits land exactly, in one undo step, keep line endings, or are refused with a reason
  - [StRS-MDOKFSTUDIO-BLOCK-014](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-014.md): A writer reorders blocks with arrows, keys and selections
  - [StRS-MDOKFSTUDIO-BLOCK-016](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-016.md): A writer selects blocks and copies, cuts and pastes them as Markdown
  - [StRS-MDOKFSTUDIO-FMEDIT-008](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-008.md): Metadata edits keep the source intact, follow the schema and never lose text
  - [StRS-MDOKFSTUDIO-FMEDIT-001](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-001.md): A writer edits metadata values in place with fitting controls
  - [StRS-MDOKFSTUDIO-GFM-003](../../strs/gfm/StRS-MDOKFSTUDIO-GFM-003.md): A writer toggles task checkboxes from the preview
  - [StRS-MDOKFSTUDIO-REVIEW-015](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-015.md): A writer keeps a discussion in the Markdown source and answers it from the preview
- Depends on:
  - [SwRS-MDOKFSTUDIO-BLOCK-041](SwRS-MDOKFSTUDIO-BLOCK-041.md): One edit at a time: an open editor blocks other edits, opens and refreshes
- Supersedes:
  - [SwRS-MDOKFSTUDIO-FMEDIT-053](../frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-053.md): A save VS Code rejects is reported
  - [SwRS-MDOKFSTUDIO-FMEDIT-055](../frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-055.md): Each frontmatter save is one document edit
  - [SwRS-MDOKFSTUDIO-GFM-022](../gfm/SwRS-MDOKFSTUDIO-GFM-022.md): A checkbox toggle is one undo step
<!-- okf:links:end -->
