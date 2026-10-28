---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-019
uuid: 17d07e62-0a0e-42df-b4f2-29e27b4e11b2
title: "A field editor saves a changed value and Escape cancels it"
description: "When a writer commits a field editor with Enter, with a checkbox change
  or by moving focus out of it, the extension SHALL post a save only when the value
  differs from the original, close the editor without a post on Escape, and show the
  progress and the outcome of the save in the editor."
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-001
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-BLOCK-058
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/editMode.ts
- src/page/features/frontmatterEditor.ts
- src/page/features/frontmatterValueEditor.ts
- src/page/features/textControls.ts
tested_in_files:
- test/page/fmtableReqFrontmatter.requirements.test.ts
- test/page/runtimeEditorFlush.test.ts
- test/page/runtimeFrontmatterEditor.test.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-FMEDIT-020
- SwRS-MDOKFSTUDIO-FMEDIT-021
- SwRS-MDOKFSTUDIO-FMEDIT-022
- SwRS-MDOKFSTUDIO-FMEDIT-023
- SwRS-MDOKFSTUDIO-FMEDIT-056
- SwRS-MDOKFSTUDIO-FMEDIT-082
---

## A field editor saves a changed value and Escape cancels it

### Normative behavior

When a writer commits a field editor with Enter, with a checkbox change or by moving focus out of it, the extension SHALL post a save only when the value differs from the original, close the editor without a post on Escape, and show the progress and the outcome of the save in the editor.

### Scenario (nominal): A changed value is saved when the writer leaves the editor

- GIVEN a text field editor whose value was changed
- WHEN the writer moves focus out of the editor
- THEN one previewFrontmatterSave is posted; focus moving to the editor's own field menu or to Set to null does not save

### Scenario (boundary): An unchanged value posts nothing

- GIVEN a field editor whose value is unchanged
- WHEN the writer presses Enter or leaves the editor
- THEN the editor closes and nothing is posted

### Scenario (nominal): Escape cancels a field editor

- GIVEN a field editor with typed text
- WHEN the writer presses Escape in the control, or in the field picker or a header cell of the properties section
- THEN the editor closes and nothing is posted

### Scenario (refusal): Escape that does not cancel

| Input | Outcome |
| --- | --- |
| Escape outside the properties section | The editor stays open |
| Escape while the save of the editor is in flight | The editor stays open |

### Scenario (boundary): Turning edit mode off closes a field editor without saving

- GIVEN a field editor with text typed and not saved
- WHEN the writer turns edit mode off
- THEN the editor closes (closeFrontmatterEditor is called), the cell shows the original value again and no save is posted; an open block editor with unsaved changes is saved instead, which is the difference with a field editor

### Scenario (nominal): A save in flight disables the editor and shows its status

| Input | Outcome |
| --- | --- |
| Field editor whose changed value was committed, host has not answered | The controls are disabled and the status reads "Saving frontmatter…" |
| Key editor save posted | The status reads "Saving frontmatter key…" |
| Add field posted | The status reads "Adding frontmatter field..." |
| Remove field posted | The status reads "Removing frontmatter field..." |
| Host answers with saved true | The status reads "Saved. Refreshing preview…", and the re-rendered table then replaces the editor |
| Result carrying another editId | It is ignored and the status is unchanged |

### Scenario (refusal): A refused field save stays visible in the editor

| Input | Outcome |
| --- | --- |
| Host answers the posted save with an error message | The message shows in the error state (red) in the editor, the controls are enabled and the editor stays open; Escape still closes it |
| Error result without text | The editor shows "The frontmatter edit could not be applied." |
| Result carrying another editId | It is ignored |

### Scenario (nominal): Undo and redo keys act on the field text

- GIVEN a value editor with typed text
- WHEN the writer presses Cmd or Ctrl+Z or Y
- THEN the key event stops at the control (keepUndoInControl calls stopPropagation) and the document is not undone; the same holds in a key editor, a list item and the custom key input

### Known issues

- Known issue: leaving edit mode discards a typed but unsaved field value, while block editors save theirs.
- Known issue: an editor left in an error state blocks every other field until it is cancelled.

### Related requirements

- SwRS-MDOKFSTUDIO-FMEDIT-016: the host checks that produce the refusal messages.
- SwRS-MDOKFSTUDIO-FMEDIT-054: the shape of the save message and of its result.
- SwRS-MDOKFSTUDIO-FMEDIT-067: the navigation flush that saves the open editor.

### Verification notes

- Method: test/page/runtimeFrontmatterEditor.test.ts (blur toward the field actions does not save; unchanged value; Escape cancels an unsaved value edit and Escape outside the properties section leaves it open; "Saving frontmatter…" status with disabled controls; "Saved. Refreshing preview…"; validation errors show an explicit error state and the other-editId result is ignored).
- Method: test/page/runtimeEditorFlush.test.ts (commit by Enter, change or leaving only when the value differs).
- Method: test/page/fmtableReqFrontmatter.requirements.test.ts (turning edit mode off closes a field editor without a save but saves a changed block editor; undo and redo keys stop at the control in the value and the key editor).
- Method: visual scenario frontmatter-editing/v02-edit-enum-value-dark-900 in test/visual/scenarioDefinitions2.ts (refused save shown in the editor).
- Criteria: closeFrontmatterEditor is called without a save on edit mode off while the block editor path posts a final save; keepUndoInControl calls stopPropagation for Z and Y with Cmd or Ctrl.
