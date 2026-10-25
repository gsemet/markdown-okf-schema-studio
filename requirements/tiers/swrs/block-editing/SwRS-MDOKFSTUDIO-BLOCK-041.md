---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-041
uuid: edc026de-3167-46fe-a7b4-4e7ef3defa4b
title: "One edit at a time: an open editor blocks other edits, opens and refreshes"
description: "While a block editor or a field editor is open, the extension SHALL
  refuse every action that would compete with it (a second editor, a block move, a
  block selection, a copy, a cut or a paste, a label rename, a thread change, a checkbox
  toggle and a refresh) with the reason of its row in the table below and change nothing."
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-003
- StRS-MDOKFSTUDIO-BLOCK-014
- StRS-MDOKFSTUDIO-BLOCK-025
- StRS-MDOKFSTUDIO-BLOCK-016
- StRS-MDOKFSTUDIO-BLOCK-006
- StRS-MDOKFSTUDIO-FMEDIT-008
- StRS-MDOKFSTUDIO-FMEDIT-001
- StRS-MDOKFSTUDIO-GFM-003
- StRS-MDOKFSTUDIO-MYST-009
- StRS-MDOKFSTUDIO-REVIEW-008
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/blockEditor.ts
- src/page/features/blockMoves.ts
- src/page/features/blockSelectionView.ts
- src/page/features/checkboxes.ts
- src/page/features/editMode.ts
- src/page/features/editorChrome.ts
- src/page/features/frontmatterEditor.ts
- src/page/features/frontmatterValueEditor.ts
- src/page/features/insertPoints.ts
- src/page/features/pageInput.ts
- src/page/modules/inlineThread.ts
- src/page/modules/labelRename.ts
- src/session/features/blockEdits.ts
- src/session/features/sourceEdits.ts
- src/session/features/viewState.ts
tested_in_files:
- test/host/previewTiming.test.ts
- test/integration/realInput.markers.ts
- test/page/blockReq.requirements.test.ts
- test/page/fmtableReqFrontmatter.requirements.test.ts
- test/page/modules/inlineThread.test.ts
- test/page/modules/labelRename.test.ts
- test/page/runtimeBlockSelection.test.ts
- test/page/runtimeContentPatch.test.ts
- test/page/runtimePageControls.test.ts
- test/session/blockReq.requirements.test.ts
- test/session/renderReq.labelRename.requirements.test.ts
- test/session/reviewReqThreads.requirements.test.ts
---

## One edit at a time: an open editor blocks other edits, opens and refreshes

### Normative behavior

While a block editor or a field editor is open, the extension SHALL refuse every action that would compete with it (a second editor, a block move, a block selection, a copy, a cut or a paste, a label rename, a thread change, a checkbox toggle and a refresh) with the reason of its row in the table below and change nothing.

### Scenario (nominal): Every blocked action, with its exact reason

The page refuses with the open editor's status line unless the row says otherwise. The host holds an open block edit and answers the request with `ok false` and the reason (or the error of the answer).

| Blocked action | Open editor | Where it is refused | Outcome and exact reason |
| --- | --- | --- | --- |
| Open a second block editor (click, insert point or key) | block editor | page | The request is ignored and the first editor stays open; no message |
| Open a second block editor | block edit held by the host | host (`previewEditOpen`) | `previewEditSource` carries the error "Another Markdown block is already being edited." |
| Open a field editor, a key editor or a second value editor | field editor or block editor | page | No second field editor opens and the first stays open; no message |
| Edit figure button | field editor | page | No figure editor opens; no message |
| Enter shortcut of the empty-document Start writing insert point | field editor | page | No block editor opens; no message |
| Extend a block selection (Shift+click, Shift+Arrow) | field editor | page | No block is selected; the keys are also ignored inside a text box, a field and the property table |
| Block move shortcut | field editor | page | Nothing is moved |
| Block move (`previewBlockMove`) | block edit held by the host | host | Answer `ok false`, reason "Save or cancel the open Markdown edit before moving a block."; nothing changes |
| Copy, cut or paste of blocks (`previewBlocksCopy` and its cut and paste kin) | block edit held by the host | host | Answer `ok false`, reason "Save or cancel the open Markdown edit first."; nothing changes |
| Rename a label (anchor icon) | block editor or field (properties) editor | page | The rename field opens disabled with "Save or cancel the open edit before renaming a label." and nothing is posted |
| Rename a label (`previewLabelRename`) | block edit held by the host | host | Nothing changes; the answer carries the reason "Save or cancel the open Markdown edit before renaming a label." |
| Reply or Delete thread of an inline thread | block editor or field (frontmatter) editor | page | Nothing is sent; the message "Save or cancel the open edit before changing a thread." is shown and the typed reply text is kept |
| Reply or delete of an inline thread | block edit held by the host | host | The answer is "Save or cancel the open Markdown edit before changing a thread." and the document is unchanged; the host answers before it reads the document |
| Task-list checkbox click | block editor or field (frontmatter) editor | page | The toggle is cancelled, no `previewCheckboxToggle` is posted and the editor status shows "Save or cancel this edit before toggling a checkbox." |
| Task-list checkbox toggle (`previewCheckboxToggle`) | block edit held by the host | host | The checkbox answer carries the error "Save or cancel the open Markdown edit before toggling a checkbox." (untested) |
| Refresh requested from the page (`refreshPreview`) | block editor or field editor | page | No `previewRefresh` is posted; the editor status shows "Save or cancel this edit before refreshing." |
| Refresh button of the toolbar | block editor or field editor | page | The button is disabled while the editor is open and enabled again when it closes |

### Scenario (nominal): The same requests with no editor open

- GIVEN no open block editor, no open field editor and no block edit held by the host
- WHEN a click, an insert point or a key requests an editor, or `previewEditOpen` arrives, or `previewBlockMove` or `previewBlocksCopy` arrives, or a rename, a thread change or a checkbox click is requested, or a refresh is requested
- THEN the editor opens (the source of the block is sent), the move or the copy is planned, the request is sent (rename, thread change, `previewCheckboxToggle`, `previewRefresh`), the Refresh button is enabled and a delete of an inline thread is applied

### Scenario (boundary): Refresh Preview command over an open editor

- GIVEN an open editor and the Refresh Preview command of the writer
- WHEN the render finishes
- THEN the host delivers it to the page even though the editor is open, it replaces the page, the open editor closes without a cancel and `forceNextResult` is reset when the render is delivered

### Scenario (boundary): A further edit after the refresh

- GIVEN a further edit after the Refresh Preview command
- WHEN its render finishes
- THEN it waits for the editor again

### Scenario (boundary): A click on another block while changed text is held

- GIVEN a block editor that holds changed text
- WHEN the writer clicks another block
- THEN the first editor is saved through its blur and stays open until the render of its save arrives, and the second block opens once, when that render arrives, without a second click; the save in flight is not posted again; an editor with unchanged text closes at the blur and the same click opens the second editor

### Known issues

- Known issue: an editor left in an error state keeps blocking every other field until it is cancelled with Escape in that editor; clicking elsewhere does not close it.
- Known issue: the guard against a second editor works in one direction only: a block editor can still be opened by clicking a block or a plus insert point while a field editor is open.

### Related requirements

- SwRS-MDOKFSTUDIO-BLOCK-191: the host holds an open block edit and ends it when the block changes.
- SwRS-MDOKFSTUDIO-BLOCK-193: page updates wait while an inline editor is open.

### Verification notes

- Method: test/page/runtimeContentPatch.test.ts (`a click on another block while the first editor holds changes opens it once the save is rendered`: click while changed text is held).
- Method: test/integration/realInput.markers.ts (scenario scenarioParagraphBlurCommit: click on another block while changed text is held, asserts only that the first editor closed) and test/page/runtimeBlockEditor.test.ts and test/page/runtimeBlockMoves.test.ts (second block editor request ignored, editors of the empty document and of an insertion open one at a time; nominal and no-editor scenarios).
- Method: test/page/fmtableReqFrontmatter.requirements.test.ts (field editor blocks the key editor and a second value editor, a block editor blocks the field editor; refresh refused with a message while a field editor is open and works once it is closed; checkbox click refused while a field editor is open; Edit figure and the Start writing Enter shortcut ignore input; rows: field editor, refresh, checkbox).
- Method: test/page/runtimeBlockSelection.test.ts and test/page/runtimeBlockMoves.test.ts (selection and move input ignored while a field editor is open).
- Method: test/page/blockReq.requirements.test.ts (the Refresh button is disabled while a block editor is open and enabled again; a refresh asked from the page over an open block editor shows a message and posts no refresh).
- Method: test/session/blockReq.requirements.test.ts (a block move is refused while a block edit is held and planned otherwise; copy, cut and paste of blocks are refused while a block edit is held; a second open while the host holds an edit is refused).
- Method: test/host/previewTiming.test.ts (Refresh Preview brings the render to the page even over an open inline editor; the later edit waits; the message sent by the page toolbar button is not tested).
- Method: test/page/runtimePageControls.test.ts (checkbox click refused with an open block editor).
- Method: test/page/modules/labelRename.test.ts (an open block editor blocks the rename; the properties editor half is untested).
- Method: test/session/renderReq.labelRename.requirements.test.ts (a rename while a block edit is open changes nothing and answers the reason; the document is unchanged).
- Method: test/page/modules/inlineThread.test.ts (an open edit blocks the change with its reason and the text is kept; no editor sends the request).
- Method: test/session/reviewReqThreads.requirements.test.ts (an open Markdown edit on the host side refuses a thread change before the document is read; no open edit applies the delete).
- Criteria: openBlockEditor returns at once while state.activeBlockEdit is set; openFrontmatterValueEditor and openFrontmatterKeyEditor return when activeBlockEdit or activeFrontmatterEdit is set; blockSelectionView and blockMoves return when activeFrontmatterEdit is set; handleThreadChange answers before reading the document when edits.active is true; every reason text equals the one in the table; the Refresh button is disabled on open and enabled on close.
