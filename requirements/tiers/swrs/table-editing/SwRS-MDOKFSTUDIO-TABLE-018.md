---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-018
uuid: fe32aa4b-39fe-44d5-8937-615faf779961
title: Enter, Done, leaving the cell or a click elsewhere commits the cell
description: When the writer presses Enter in the cell text box, with or without
  Cmd, Ctrl or Shift, presses Done, leaves the cell editor or clicks elsewhere
  on the page, the extension SHALL insert no line break and commit the cell by
  posting the table as a final previewEditSave, and post no save when the table
  text equals the text the host sent and no autosave reached the document.
project: markdown-okf-schema-studio
scope: table-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TABLE-001
- StRS-MDOKFSTUDIO-TABLE-012
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-058
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/blockEditor.ts
- src/page/features/editMode.ts
- src/page/features/pageInput.ts
- src/page/features/tableCellEditor.ts
tested_in_files:
- test/integration/realInput/markers.ts
- test/page/fmtableReqTable.requirements.test.ts
- test/page/runtimePaletteActions.test.ts
- test/page/runtimeTableCellEditor.test.ts
---

## Enter, Done, leaving the cell or a click elsewhere commits the cell

### Normative behavior

When the writer presses Enter in the cell text box, with or without Cmd, Ctrl or Shift, presses Done, leaves the cell editor or clicks elsewhere on the page, the extension SHALL insert no line break and commit the cell by posting the table as a final previewEditSave, and post no save when the table text equals the text the host sent and no autosave reached the document.

### Scenario (nominal): Enter after typing
- GIVEN a cell edited from "a" to "ab"
- WHEN the writer presses Enter
- THEN a final previewEditSave with the edited table is posted, the status reads "Saving Markdown…" and the text box value holds no line break

### Scenario (boundary): Enter chords and the Done button
| Input | Outcome |
| --- | --- |
| Shift+Enter, Cmd+Enter or Ctrl+Enter in the edited cell | the same final save is posted |
| the pointer pressed on Done after typing, then the button clicked | a final previewEditSave is posted, and the focus stays in the text box until the click, so the loss-of-focus commit does not run first |

### Scenario (boundary): An unchanged cell closes without a save
| Input | Outcome |
| --- | --- |
| a cell opened and not changed, Enter pressed | the editor closes and no previewEditSave is posted |
| a cell editor with no change, Done clicked | no save is posted and the editor closes |
| a cell changed, autosaved, then typed back to the original text, Enter pressed | a final previewEditSave is posted, because the document no longer holds the original text |

### Scenario (nominal): Focus leaving the cell editor
| Input | Outcome |
| --- | --- |
| a cell edited and the focus moved to another element of the page, more than 500 ms after the last pointer press, when the zero-delay check after the blur runs | a final previewEditSave is posted and the editor closes |
| a cell edited and the focus moved to a button of the table bar or to Done | nothing is saved and the editor stays open |
| the whole window lost the focus (the check treats a document without focus as outside) | the cell is committed |

### Scenario (boundary): A pointer press in the last 500 ms
| Input | Outcome |
| --- | --- |
| a pointer pressed 100 ms ago on another cell and the cell text box blurred | no save is posted by the blur; the click handler of the other cell decides |
| the last pointer press 600 ms ago and the blur check runs with the focus outside | the cell is committed |

### Scenario (nominal): Focus leaving the cell formatting group
- GIVEN the emoji picker open from the cell bar and the focus moved inside the bar
- WHEN the focus then leaves to nowhere
- THEN the cell is committed with a final previewEditSave; while the focus was inside the bar nothing was saved
- GIVEN a host file dialog opened from the cell bar
- WHEN the focus leaves the page for the dialog
- THEN the cell is not committed by the group's leave handler

### Scenario (nominal): A click on a block outside the table
- GIVEN a cell edited and a paragraph outside the table clicked
- WHEN the click is handled
- THEN the final previewEditSave is posted first, the click target is remembered as a pending navigation and the paragraph opens after the re-render
- GIVEN an unchanged cell editor and a click on another block
- WHEN the click is handled
- THEN the cell editor closes without a save and the other block opens at once

### Scenario (nominal): A click outside any editable block or on a link
- GIVEN a cell edited and edit mode on
- WHEN the writer clicks an area of the page that belongs to no editable block, or a link
- THEN a final previewEditSave with the edited table is posted
- GIVEN a cell whose final save was already posted
- WHEN the writer clicks the empty area again
- THEN no second save is posted

### Related requirements
- SwRS-MDOKFSTUDIO-BLOCK-058: every host source edit is one undo step and renders once.

### Verification notes
- Method: test/page/runtimeTableCellEditor.test.ts ("Enter in a changed table cell saves the table"; "table cell editing exposes row and column operations and saves the edited table" for Done; "the table cell editor commits and closes when focus leaves without a click"; "the table cell editor commits on blur unless a pointer press is in progress"; "table editing switches cells without losing changes and finalizes before leaving the table" for the click on a block outside the table).
- Method: test/integration/realInput/blockKeys.ts, markers in test/integration/realInput/markers.ts (real-window scenario scenarioTableCellEnter, id table-editing/r01-cell-enter-saves: Enter after typing).
- Method: test/page/fmtableReqTable.requirements.test.ts ("an unchanged cell closes without a save; typed back after an autosave it saves a final text"; "a click outside any editable block saves the open cell once").
- Method: test/page/runtimePaletteActions.test.ts (T35 "a popover opened from the cell bar keeps the editor open, outside focus still commits" and T35 "the link panel opened from the cell keeps the editor open and clicking outside commits").
- Method: visual scenarios table-editing/v01 to v05 (Done under the field).
- Criteria: A final previewEditSave follows the key, the Done click, an outside blur, an outside leave of the formatting group and a click outside, and none follows a blur into the editor or the bar, an inside move, or a recent pointer press. The mousedown default is prevented on both buttons, read from createEditorButtons. The order of the messages is final previewEditSave before the open of the other block; with an unchanged cell no pending navigation remains. Untested: Shift+Enter and the other chords for cells (the keydown handler accepts any Enter), a blur because the whole window lost the focus, and the host-dialog branch (hostRequests.isDialogOpen in the onLeave handler of tableCellEditor.ts) for cells.
