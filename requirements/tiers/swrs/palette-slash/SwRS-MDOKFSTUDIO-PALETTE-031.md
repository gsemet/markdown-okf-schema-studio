---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-031
uuid: 9fd17067-099a-4605-b0a4-1c2db4bf635e
title: Palette popovers open in the frame, one at a time, and Escape or typing
  closes them
description: When the writer opens, leaves or dismisses a popover of the
  palette, the extension SHALL open it inside the editor frame under its button
  (under the caret for the alert list), keep at most one open, and close it on
  Escape or on typing or pressing in the text box, giving the focus back to the
  text box and keeping the editor open.
project: markdown-okf-schema-studio
scope: palette-slash
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-005
- StRS-MDOKFSTUDIO-PALETTE-007
- StRS-MDOKFSTUDIO-TABLE-012
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/blockSourceEditor.ts
- src/page/modules/editPalette.ts
- src/page/modules/editPalettePopovers.ts
- src/page/modules/figurePanel.ts
- src/page/modules/linkPanel.ts
tested_in_files:
- test/integration/realInput/markers.ts
- test/page/modules/editPalette.test.ts
- test/page/modules/paletteReq.requirements.test.ts
- test/page/runtimeEditPalette.test.ts
- test/page/runtimePaletteActions.test.ts
- test/visual/capture_edit_checks.py
default_owner_email: gaetan@xeberon.net
---

## Palette popovers open in the frame, one at a time, and Escape or typing closes them

### Normative behavior

When the writer opens, leaves or dismisses a popover of the palette, the extension SHALL open it inside the editor frame under its button (under the caret for the alert list), keep at most one open, and close it on Escape or on typing or pressing in the text box, giving the focus back to the text box and keeping the editor open.

### Scenario (nominal): Every popover opens inside the frame

- GIVEN an editor at 900 px with the heading list, the table grid, the emoji picker, the alert list and the colour picker opened one after the other
- WHEN each popover is inspected
- THEN each lies inside the editor frame, under its button (under the caret for the alert list), pulled left so that it stays inside the width of the bar or the frame

| Pane | Popovers opened | Outcome |
| --- | --- | --- |
| 900 px | heading list, table grid, emoji picker, alert list, colour picker | each lies inside the editor frame |
| 360 px | grid, emoji and heading popovers | each stays inside the pane |
| 460 px (emoji picker of the cell formatting group) | emoji picker | its left edge is not left of the viewport and its right edge is not beyond it |
| 900 px (emoji picker of the cell formatting group) | emoji picker | the picker is inside the viewport |

### Scenario (nominal): One popover at a time and a toggling button

- GIVEN the heading list open
- WHEN the writer presses the Emoji button
- THEN the heading list is gone and the emoji picker is open
- WHEN the writer presses the Emoji button again
- THEN the picker closes and no new popover opens

A button whose action has a popover has aria-haspopup menu and an aria-expanded that is true exactly while its popover is open; at most one element with the class sphinx-preview-edit-palette-menu exists, and the button of a closed popover has aria-expanded false.

### Scenario (nominal): Escape or typing closes only the popover

- GIVEN a popover open
- WHEN the writer presses Escape, or types in the text box, or presses the mouse in it
- THEN the popover closes, the text box keeps or regains the focus and the editor stays open (no save and no cancel is posted)

| Popover | Escape | Typing or mouse press in the text box |
| --- | --- | --- |
| Heading list | the list closes and the editor stays open | the popover closes; the editor stays usable |
| Emoji picker (filter or an emoji) | the picker closes, the text box has the focus and the editor is still open | a mouse press closes the picker and the editor stays usable |
| Size grid | the grid closes and the editor stays open | typing a character closes the grid and the editor stays open |
| Colour picker (colour code field) | the picker closes, the focus returns to the text box and the editor stays open | the popover closes |
| Link panel (also Cancel) | the panel closes, the text box has the focus with its selection restored, no change is made and the editor stays open | the panel closes without restoring the old selection: a later press of a stale Insert cannot corrupt the text, and a mouse press keeps the selection chosen by the press |
| Figure form (also Cancel) | the form closes, the text box has the focus and the editor stays open (Cancel writes nothing) | typing closes the form; a mouse press closes the form |
| Emoji picker of the cell formatting group | the picker closes and the cell editor stays open | not stated |

### Scenario (boundary): Escape with no popover, second Escape, insertion from the popover

| Input | Outcome |
| --- | --- |
| Escape with no popover open | the editor is cancelled as usual (a cell is cancelled, see SwRS-MDOKFSTUDIO-TABLE-025) |
| Escape a second time after the popover closed (colour picker, emoji picker) | the editor is cancelled |
| first Escape with a popover open | the popover closes and no cancel is posted |
| emoji clicked with Shift held, emoji picker open | the emoji is inserted and the picker stays open (an insertion made by the popover itself does not close it) |
| emoji chosen without Shift | the emoji is inserted and the focus returns to the text box |

### Scenario (nominal): A popover closed while it holds the focus gives the focus back

- GIVEN the emoji filter has the focus
- WHEN the popover is closed
- THEN the text box has the focus and no save is run (the closing is not read as leaving the editor)

| Closing | Outcome |
| --- | --- |
| popover closed while the emoji filter has the focus | the text box is the active element and the leave callback is not called |
| an emoji chosen while the filter has the focus | the emoji is inserted and the focus returns to the text box |

### Related requirements
- SwRS-MDOKFSTUDIO-TABLE-025: Escape cancels the cell edit when no popover is open.

### Verification notes
- Method: test/visual/capture_edit_checks.py (placement scenarios: visual scenarios palette-slash/v01-palette-popups-light-900, palette-slash/v15-palette-above-editor-dark-900, palette-slash/v16-palette-above-editor-cream-900, palette-slash/v17-palette-wraps-narrow-dark-360; check_cell_bar_formatting on scenarios table-editing/v02 to v05 for the 460 px and 900 px cell emoji picker, and for Escape after the cell picker)
- Method: test/page/modules/editPalette.test.ts (T25: the list opens at the caret, in the bar's coordinates; T24: Shift+click keeps the picker open; T24: Escape closes the grid and the popover never leaves the editor stuck; T24: closing the popover while the filter has the focus does not read as leaving; T24: Enter in the filter inserts the first match, Escape returns to the text box)
- Method: test/page/runtimeEditPalette.test.ts (T21: opening one popover closes the other and a second click closes it; T21: Escape closes an open popover first and only then cancels the editor; T24: a mouse press in the text box closes the picker; T24: typing closes the grid; T24: Escape in the filter closes the picker and keeps the editor; T24: choosing an emoji returns the focus; T22: Escape and Cancel in the link panel; T22: typing and mousedown close the link panel)
- Method: test/page/modules/paletteReq.requirements.test.ts (a button that owns a popover announces it with aria-haspopup and an aria-expanded that follows the popover; Escape in the colour code field closes the picker and gives the focus back)
- Method: test/page/runtimePaletteActions.test.ts (T32: Escape and Cancel in the figure form; typing in the text box closes the form)
- Method: test/integration/realInput/editorWidgets.ts (scenarioFigureEditor, via test/integration/realInput/markers.ts: Escape in the figure form)
- Criteria: The left offset of a popover is the smaller of the button offset and the room left in the bar (the frame width for the alert list), and never negative. After a mousedown or input event of the text box no popover element remains, unless the insertion flag of the popover is set; the link panel closes with restore false. The first Escape closes the popover and posts no cancel; the next one cancels the editor. After closing, the text box is the active element and the leave callback was not called. The mouse press and typing cases of the cell emoji picker, the colour picker and the heading list are not tested separately.
