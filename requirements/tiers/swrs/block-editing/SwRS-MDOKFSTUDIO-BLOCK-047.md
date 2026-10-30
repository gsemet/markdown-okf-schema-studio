---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-047
uuid: 5177a270-d725-4fc3-ae20-8ababe86e00d
title: Done, Cmd/Ctrl+Enter or leaving the text box commits the edit
description: When a writer presses Done, presses Enter with Ctrl or Cmd in the
  text box, or moves the focus from the text box to something outside the editor
  frame, the page SHALL post the final previewEditSave of the text of the open
  editor and close the editor without any message when its text equals the
  original and nothing was autosaved.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-006
- StRS-MDOKFSTUDIO-PALETTE-013
- StRS-MDOKFSTUDIO-PALETTE-005
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-058
- SwRS-MDOKFSTUDIO-PALETTE-036
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/blockEditor.ts
- src/page/features/blockSourceEditor.ts
- src/page/modules/hostRequests.ts
tested_in_files:
- test/integration/gridCardEditorBlur.test.ts
- test/integration/realInput/markers.ts
- test/page/blockReq.requirements.test.ts
- test/page/modules/hostRequests.test.ts
- test/page/runtimeBlockEditor.test.ts
- test/page/runtimeBlockMoves.test.ts
- test/page/runtimeEditPalette.test.ts
- test/page/runtimeFindFromBlockEditor.test.ts
- test/page/runtimeGridCardEditorBlur.test.ts
- test/page/runtimePaletteActions.test.ts
default_owner_email: gaetan@xeberon.net
---

## Done, Cmd/Ctrl+Enter or leaving the text box commits the edit

### Normative behavior

When a writer presses Done, presses Enter with Ctrl or Cmd in the text box, or moves the focus from the text box to something outside the editor frame, the page SHALL post the final previewEditSave of the text of the open editor and close the editor without any message when its text equals the original and nothing was autosaved.

### Scenario (nominal): Done with changes
- GIVEN an open editor whose text differs from the original
- WHEN the writer presses Done
- THEN one previewEditSave with final true and the typed text is posted, the status line reads "Saving Markdown…" and the editor waits for the render
- GIVEN an editor with typed text and an autosave timer still running
- WHEN the writer presses Done
- THEN the timer is cleared and the final save carries the latest text

### Scenario (refusal): The host refuses the final save
- GIVEN an editor that posted its final save
- WHEN the host refuses the save and its error arrives
- THEN the status line shows the error instead of "Saving Markdown…"

### Scenario (nominal): Cmd or Ctrl with Enter
| Input | Outcome |
| --- | --- |
| Ctrl+Enter in the text box with typed text | The default action is prevented and the final save is posted |
| Cmd+Enter in the same editor | The same final save is posted |
| Plain Enter | The editor is not finished |

### Scenario (nominal): Leaving the text box
| Input | Outcome |
| --- | --- |
| Click outside the frame, with typed text | One final save is posted and the autosave timer is cleared |
| The browser window loses the focus with no related target | The final save is posted as well |
| Cmd/Ctrl+F in the text box (the find field takes the focus, see SwRS-MDOKFSTUDIO-TOOLBAR-009) | The final save carries the text typed before the key; the keys typed afterwards go to the find query |

### Scenario (boundary): Moving the focus inside the editor or into a host dialog does not commit
| Input | Outcome |
| --- | --- |
| The focus moves from the text box to a palette button, the link panel or the figure form of the same editor | No final save is posted and the editor stays open |
| The text box blurs while a file picker opened by an image or document action is pending | No final save is posted until the dialog is answered |
| A request marked as a native dialog is pending | A dialog is reported as open, until the request is answered, times out or is cancelled |
| The dialog was answered, cancelled or timed out; or a list request is pending | No dialog is reported as open; a list request never carries the dialog mark |

### Scenario (boundary): An editor whose text is unchanged closes without a save
| Input | Outcome |
| --- | --- |
| Done, leaving the text box or Ctrl+Enter on an editor opened and not changed | The editor closes and no previewEditSave and no previewEditCancel is posted (a close report may follow, see SwRS-MDOKFSTUDIO-BLOCK-191) |
| Done on an insertion editor left empty | The editor closes and nothing is written |

### Scenario (boundary): A second final save is refused while the first is in flight

| Input | Outcome |
| --- | --- |
| Done, Ctrl+Enter or leaving the text box while the final save of the same editor is in flight | No second final save is posted; the editor waits for the render of the first |

### Rationale
- Owner decision (2026-10-29): when the whole window loses the focus (the writer switches to another application), the open editor commits and closes, by design. The row "The browser window loses the focus with no related target" is intended behavior, not a defect: the edit is saved, never lost, and the writer comes back to the rendered block.

### Related requirements
- SwRS-MDOKFSTUDIO-BLOCK-191: the host holds the open block edit and ends it when the block changes.

### Verification notes
- Method: test/page/runtimeBlockEditor.test.ts (`Done posts a final save and both buttons keep the textarea focused on press`: Done with changes; `Cmd+Enter and Ctrl+Enter finish the block editor like Done`: Cmd or Ctrl with Enter; `blur after typing posts one final save and clears the autosave timer`: leaving the text box; `Escape in an unchanged Markdown block editor closes it without a message`: unchanged editor, Escape only).
- Method: test/page/blockReq.requirements.test.ts (`the status line reads Saving Markdown… from the final save on, and shows an error that refuses it`: status line and refused save).
- Method: test/page/blockReq.requirements.test.ts (`Done, Ctrl+Enter and the blur post one final save while the first is in flight`: second final save refused).
- Method: test/page/runtimeBlockMoves.test.ts (`T28: Done on an untouched empty insertion closes without saving`: empty insertion). Done and Ctrl+Enter on an unchanged existing block are untested.
- Method: test/page/runtimeFindFromBlockEditor.test.ts (Cmd/Ctrl+F in the text box: the blur to the find field posts the final save of the text typed before the key; an unchanged editor closes on that blur without a save).
- Method: test/integration/realInput/markers.ts (scenarioCtrlEnterCommit, screenshot block-editing/r02; scenarioParagraphBlurCommit, screenshot block-editing/r01).
- Method: test/page/runtimePaletteActions.test.ts (`T30: the editor stays open while the host's file dialog has the focus, and the answer is inserted`: host dialog; `T31: Done saves while the file dialog is still open, so the editor is never stuck`: Done during a pending dialog); the moves into the palette and the panels have no test in this scope.
- Method: test/page/modules/hostRequests.test.ts (a dialog request keeps the editor's blur suspended until it is answered, even on a timeout; a list request never suspends the blur: dialog state).
- Criteria: Done calls postBlockEditSave(true); both modifiers finish the editor and a plain Enter does not; exactly one final save per blur; frameContains(edit, relatedTarget) or an open dialog stops the commit; isDialogOpen is true while at least one pending request carries the dialog mark; edit.status.textContent is set before the message is posted; no previewEditSave and no previewEditCancel is posted for an unchanged editor.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-006](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-006.md): Typed text is saved, survives updates and is never lost on leaving
  - [StRS-MDOKFSTUDIO-PALETTE-013](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-013.md): A writer picks labels, documents, citations and code languages from host lists, with feedback
  - [StRS-MDOKFSTUDIO-PALETTE-005](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-005.md): The palette stays in reach, appears softly and never closes the editor by accident
- Depends on:
  - [SwRS-MDOKFSTUDIO-BLOCK-058](SwRS-MDOKFSTUDIO-BLOCK-058.md): Every host source edit is one undo step, renders once and reports a failed apply
  - [SwRS-MDOKFSTUDIO-PALETTE-036](../palette-slash/SwRS-MDOKFSTUDIO-PALETTE-036.md): Leaving the frame from a palette control saves once and a press keeps the text box focus
<!-- okf:links:end -->
