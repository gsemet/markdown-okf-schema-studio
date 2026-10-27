---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-001
uuid: 0445da8e-ead8-4bcd-9f89-9f7980efa080
title: "The Edit button turns edit mode on and off and tidies up on exit"
description: "When a writer clicks the Edit button of a writable preview, the page
  SHALL switch edit mode on or off and show the new state on the button as its pressed
  state and its tooltip, post the new state to the host before it applies it, keep
  the reading layout unchanged, and on exit save the open block editor, clear the
  block selection and the hover outline and close the label rename field."
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-001
- StRS-MDOKFSTUDIO-BLOCK-016
- StRS-MDOKFSTUDIO-BLOCK-003
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-001
- SwRS-MDOKFSTUDIO-LIFE-169
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/editMode.ts
tested_in_files:
- test/integration/realInput.markers.ts
- test/page/blockReq.requirements.test.ts
- test/page/runtimeBlockEditor.test.ts
- test/page/runtimeBlockSelection.test.ts
- test/page/runtimePageControls.test.ts
---

## The Edit button turns edit mode on and off and tidies up on exit

### Normative behavior

When a writer clicks the Edit button of a writable preview, the page SHALL switch edit mode on or off and show the new state on the button as its pressed state and its tooltip, post the new state to the host before it applies it, keep the reading layout unchanged, and on exit save the open block editor, clear the block selection and the hover outline and close the label rename field.

### Scenario (nominal): Edit mode turned on

- GIVEN a writable preview in reading mode
- WHEN the writer clicks the Edit button
- THEN the page posts previewEditModeChanged with editMode true for the shown document and then turns edit mode on: the page element carries data-sphinx-preview-edit-mode on, the button carries data-edit-mode on and aria-pressed true, and its tooltip reads "Exit edit mode"

### Scenario (nominal): Edit mode turned off again

- GIVEN a writable preview in edit mode
- WHEN the writer clicks the Edit button again
- THEN data-sphinx-preview-edit-mode and data-edit-mode are off, aria-pressed is false and the tooltip reads "Edit mode"

### Scenario (nominal): Leaving edit mode with an open block editor

- GIVEN edit mode on and a block editor whose source is loaded and whose text was changed
- WHEN the writer clicks the Edit button
- THEN previewEditModeChanged with editMode false is posted first, then one final previewEditSave with the typed text, so the block save stays the last message, and the editor closes when the next render arrives

### Scenario (boundary): Block editor still waiting for its source

- GIVEN edit mode on and a block editor that is still waiting for its source
- WHEN edit mode is turned off
- THEN the editor closes at once and no save and no cancel message is posted

### Scenario (nominal): Leaving edit mode removes the edit state

| Given edit mode on and | When edit mode is turned off | Then |
| --- | --- | --- |
| two blocks selected | the writer clicks the Edit button | no block carries data-sphinx-preview-block-selected and the selection announcer is empty |
| the pointer over a list item, so the whole list is outlined | the writer clicks the Edit button | the list no longer carries data-sphinx-preview-edit-hover |
| the rename field of an anchor icon open | the writer clicks the Edit button | the field is closed and no previewLabelRename message is posted |

### Scenario (boundary): Nothing to tidy up

| Input | Outcome |
| --- | --- |
| Edit mode turned off with nothing selected | nothing changes and no selection status element is created |
| Edit mode turned off with no rename field open | nothing else changes in the page |
| Edit mode off and the pointer moves over a block | no element receives the hover outline |

### Scenario (nominal): Edit mode on keeps the reading layout

- GIVEN a document with a wrapped paragraph in reading mode
- WHEN edit mode is turned on
- THEN the paragraph keeps its wrapping and hides the source line breaks; only the cursor, the hover outline and the insert points are added

### Scenario (boundary): Hover and click do not reflow

- GIVEN edit mode on
- WHEN the pointer hovers a paragraph and the writer clicks it
- THEN no rendered paragraph shows its source line breaks and only the clicked block is replaced by its editor

### Related requirements

- SwRS-MDOKFSTUDIO-TRUST-001: a read-only preview shows the Edit button greyed, with the reason
- SwRS-MDOKFSTUDIO-LIFE-169: the edit mode choice is stored for the workspace
- SwRS-MDOKFSTUDIO-BLOCK-236: the accepted shape of previewEditModeChanged
- SwRS-MDOKFSTUDIO-FMEDIT-019: closing of a frontmatter field editor
- SwRS-MDOKFSTUDIO-MYST-038: the label rename field itself

### Verification notes

- Method: test/page/runtimePageControls.test.ts (`T38: toggling edit mode posts previewEditModeChanged` clicks the button twice and asserts the two messages; scenarios edit mode turned on and off, the first message only). The tooltip and aria-pressed values are not asserted by a test. The order of previewEditModeChanged against the final save follows from the code order in bindButton (post, then applyEditMode) and is not asserted by a test.
- Method: test/integration/realInput.test.ts (scenarioEscapeCancels keeps the typed text when edit mode is turned off: leaving edit mode with an open block editor; scenarioEditModeNoReflow, screenshot block-editing/r14: both reflow scenarios). No unit test covers the editor that is still waiting for its source.
- Method: test/page/runtimeBlockSelection.test.ts (`T39: a content patch and leaving edit mode clear the selection`: selection row of the tidy-up table).
- Method: test/page/runtimeBlockEditor.test.ts (`edit mode hover marks the whole list that a click would edit` toggles edit mode with an outlined list and checks both modes: hover outline row and the reading mode row of the nothing-to-tidy table).
- Method: test/page/blockReq.requirements.test.ts (`turning edit mode off closes the label rename field and posts no rename`: rename field row).
- Method: visual scenarios block-editing/v04 and block-editing/v17 click the Edit button; block-editing/v04 also checks that rendered paragraphs hide their source line breaks.
- Criteria: The edit mode attributes and the button state follow every click; the tooltip text is the one set in applyEditMode; the message carries documentId, revision, requestId and a boolean editMode and precedes any block save caused by leaving edit mode; a loaded editor produces exactly one final save and an editor without a loaded source produces no message; the selection model is inactive, no element is marked selected, data-sphinx-preview-edit-hover is absent and applyEditMode calls labelRename.close() before it applies the new state; the line count of a rendered paragraph is the same in both modes.
