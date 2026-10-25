---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-036
uuid: 7c72ffb3-a497-4848-9038-e51d6417e232
title: Leaving the frame from a palette control saves once and a press keeps the
  text box focus
description: When the writer presses the mouse on a palette control or the focus
  leaves one, the extension SHALL cancel a press that is not on a text field so
  that the text box keeps the focus, and run the normal final save once only
  when the focus goes outside the editor frame.
project: markdown-okf-schema-studio
scope: palette-slash
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-002
- StRS-MDOKFSTUDIO-PALETTE-005
- StRS-MDOKFSTUDIO-PALETTE-007
depends_on:
- SwRS-MDOKFSTUDIO-PALETTE-031
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/editorChrome.ts
- src/page/modules/editPalette.ts
- src/page/modules/editPalettePopovers.ts
- src/page/modules/figurePanel.ts
- src/page/modules/linkPanel.ts
tested_in_files:
- test/page/modules/editPalette.test.ts
- test/page/modules/paletteReq.requirements.test.ts
- test/page/runtimeEditPalette.test.ts
- test/page/runtimePaletteActions.test.ts
---

## Leaving the frame from a palette control saves once and a press keeps the text box focus

### Normative behavior

When the writer presses the mouse on a palette control or the focus leaves one, the extension SHALL cancel a press that is not on a text field so that the text box keeps the focus, and run the normal final save once only when the focus goes outside the editor frame.

### Scenario (nominal): Leaving the frame from a palette control

One row per control. The same rule holds for each: a blur toward no target or a target outside the editor frame runs the final save once.

| Control holding the focus | Leaves toward | Outcome |
| --- | --- | --- |
| Mode select | A click outside the editor | One final save is run |
| Emoji filter | Outside the frame | One final save is run |
| Option of a popover (holds the focus after a key) | Outside the frame | One final save is run; Escape instead gives the focus back to the text box |
| Colour code (hex) field | Outside the frame | One final save is run |
| Field of the link panel | A click outside the editor | The final save is run once |
| Text box | A blur with no related target, or a target outside the frame | The final save is run |
| Control of the figure form | A click outside the editor, no file dialog open | The final save is run |

### Scenario (nominal): A press on a palette control keeps the focus

- GIVEN an open block editor
- WHEN the writer presses the mouse on a palette button, on the padding of the palette bar or on an item of a popover other than a text field
- THEN the mousedown default is prevented and the text box keeps the focus

The link panel follows the same rule: a press on its padding or on the Insert button is cancelled and the focus stays in Text.

### Scenario (boundary): A press on a text field is not cancelled

| Press on | Outcome |
| --- | --- |
| Emoji filter field | Not cancelled, so the field takes the focus |
| URL field of the link panel | Not cancelled, the URL field takes the focus (only a mousedown on an INPUT element is left alone) |

### Scenario (refusal): Moving inside the frame does not save

| Control holding the focus | Moves to | Outcome |
| --- | --- | --- |
| Mode select | The text box | No save is run |
| Emoji filter | The text box | No save is run |
| Colour code (hex) field | A control inside the frame | No save is run |
| Field of the link panel | Another field of the panel or the text box | No save is run |
| Control of the figure form | A control inside the editor frame | The editor stays open, no save is run |
| Control of the figure form | The Browse file dialog (a host dialog is open) | No save is posted: a blur while a host dialog is open is ignored |

### Scenario (refusal): Closing the link panel never produces a save

- GIVEN the link panel open
- WHEN the panel closes by Insert, Cancel, Escape or because the text box was used, whatever blur the browser fires
- THEN no final save is posted by the panel, a destroyed panel ignores its later blur events, and opening then closing the panel keeps the edited text in place

### Scenario (nominal): Cmd or Ctrl with Enter finishes the edit

| Focus in | Key | Outcome |
| --- | --- | --- |
| Mode select, changed text | Cmd+Enter or Ctrl+Enter | The editor is saved and closed, the final save is posted once |
| Mode select | Enter without a modifier | The focus returns to the text box and nothing is saved |
| Colour code field, changed text | Cmd+Enter or Ctrl+Enter | The picker closes (closePopover) and the editor is saved (onDone) |
| Colour code field holding a valid colour | Enter | The colour is applied and the editor stays open |

### Related requirements

- SwRS-MDOKFSTUDIO-PALETTE-031: popovers open inside the frame, one at a time, and Escape or typing closes them.
- SwRS-MDOKFSTUDIO-BLOCK-047: the rule that a move inside the frame does not commit the edit.

### Verification notes

- Method: test/page/modules/editPalette.test.ts (Leaving the frame from the emoji filter, an option and the hex field; Moving inside for the emoji filter, an option and the hex field; filter mousedown not cancelled while the rest of the popover cancels it)
- Method: test/page/runtimeEditPalette.test.ts (T23: leaving the frame from the select saves once, moving inside does not, Cmd/Ctrl+Enter finishes, plain Enter returns to the text box; T21: every palette control and the palette root cancel mousedown; T24: leaving the frame from the emoji filter saves once; T22: link panel padding and buttons cancel the press, fields do not; T22: leaving the link panel or the text box blur with no target or outside target saves once, moves between panel fields or to the text box do not save; T22: closing the panel never produces a blur save and keeps the edited text)
- Method: test/page/modules/paletteReq.requirements.test.ts (Cmd or Ctrl with Enter in the colour code field closes the picker and finishes the edit; plain Enter applies)
- Method: test/page/runtimePaletteActions.test.ts (T32: figure form moves inside the frame keep the editor open, leaving saves; file dialog open ignored)
- Method: visual scenario palette-slash/v01-palette-popups-light-900 (a click on the palette edge keeps the editor open)
- Criteria: The leave callback is called once for a target outside the frame and never for a target inside; the save counter is 1 after leaving and 0 after moving inside; the final save is posted once for the modified Enter key and not for plain Enter; every button, the root and the non-input popover items prevent the default of mousedown while the input fields do not; a blur with no target is a departure, a blur whose related target is inside the frame is not.
