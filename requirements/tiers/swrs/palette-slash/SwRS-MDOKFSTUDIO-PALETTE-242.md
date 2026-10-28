---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-242
uuid: c0e63326-8524-457a-9c14-ba1b1a816056
title: Keys and clicks drive the slash menu and run the lit command
description: When the slash menu is open, the extension SHALL take ArrowDown,
  ArrowUp, Enter, Tab, Escape, Backspace, a click and a hover for the menu,
  running the lit command in one edit and leaving every other key and the text
  to the text box.
project: markdown-okf-schema-studio
scope: palette-slash
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-015
- StRS-MDOKFSTUDIO-PALETTE-001
depends_on:
- SwRS-MDOKFSTUDIO-PALETTE-031
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/editPalette.ts
- src/page/modules/slashMenu.ts
tested_in_files:
- test/integration/realInput/markers.ts
- test/page/modules/slashMenu.test.ts
default_owner_email: gaetan@xeberon.net
---

## Keys and clicks drive the slash menu and run the lit command

### Normative behavior

When the slash menu is open, the extension SHALL take ArrowDown, ArrowUp, Enter, Tab, Escape, Backspace, a click and a hover for the menu, running the lit command in one edit and leaving every other key and the text to the text box.

### Scenario (nominal): The arrows move the highlight and wrap
| Given | When | Then |
| --- | --- | --- |
| an open menu with the first entry lit | the writer presses ArrowUp | the last entry is lit |
| the last entry lit | the writer presses ArrowDown | the first entry is lit |

### Scenario (nominal): Enter or Tab runs the lit command in one edit
- GIVEN the text before /bold and a selection-free caret
- WHEN the writer presses Enter or Tab
- THEN the slash and the query are removed, Bold is applied as its button does and one undo restores /bold
- GIVEN the query typed in the middle of a text
- WHEN Enter is pressed
- THEN only the query is removed and the rest of the text stays

### Scenario (nominal): A click runs a command and a hover lights it
- GIVEN an open menu
- WHEN the writer clicks Bold
- THEN Bold runs and the query is removed
- GIVEN an open menu
- WHEN the pointer moves over the third command
- THEN the third command is lit and the text box keeps the focus

### Scenario (nominal): A command with a picker removes the query and then opens like its button
| Query | When the command is chosen | Outcome |
| --- | --- | --- |
| /link or /table | the writer chooses it | the query is removed, then the link panel or the size grid opens as the button opens it |
| /bold | the writer chooses it | the query is removed and Bold is applied in the same edit, as the Enter scenario states |
| the list entries | the writer chooses one | the list prefix is written as one edit |

### Scenario (boundary): Escape closes the menu and keeps the typed text
| Given | When | Outcome |
| --- | --- | --- |
| an open menu with the query /ta | the writer presses Escape | the menu closes, /ta stays and the editor is still open |
| the same state, menu closed | the writer presses Escape again | the editor is cancelled |

### Scenario (boundary): Backspace narrows the query or closes the menu
| Given | When | Outcome |
| --- | --- | --- |
| the menu open with the query ta | the writer presses Backspace | the query is t and the list is longer |
| the menu open with an empty query | the writer presses Backspace | the slash is removed and the menu closes |

### Scenario (refusal): Leaving the query closes the menu and keeps the text
| Given | When | Outcome |
| --- | --- | --- |
| an open menu | the caret is moved before the slash | the menu closes |
| an open menu | a selection appears | the menu closes and the text is as typed |
| an open menu | the text box loses the focus or the editor finishes | the menu closes and the text is unchanged |

### Scenario (refusal): Chords, compositions and other keys are not taken by the menu
| Given | When | Outcome |
| --- | --- | --- |
| an open menu | the writer presses Ctrl+B (or another chord with Cmd, Ctrl or Alt) | the menu closes and the key reaches the shortcut handler |
| an open menu | the writer types a letter | the menu stays open and narrows through the input event |
| an open menu | a key arrives during an IME composition | the menu does not take it |
| an open menu | the writer presses only a modifier key | nothing closes |
| the Alert shortcut's slash chord | the writer presses it | the menu never opens |

### Verification notes

- Method: test/page/modules/slashMenu.test.ts (scenarios "The arrows move the highlight and wrap", "Enter or Tab runs the lit command in one edit", "A click runs a command and a hover lights it", "A command with a picker removes the query and then opens like its button", "Escape closes the menu and keeps the typed text", "Backspace narrows the query or closes the menu", the caret-move row of "Leaving the query closes the menu and keeps the text", "Chords, compositions and other keys are not taken by the menu"); the blur and destroy rows are deduced from the code (the blur listener in src/page/features/blockSourceEditor.ts) and no page test checks them (untested)
- Method: test/integration/realInput/textEditing.ts (real-window scenario scenarioSlashMenu, markers in test/integration/realInput/markers.ts)
- Criteria: The arrow keys are consumed and the lit entry is scrolled into view. The edit of Enter is computed on the text without the query and written as one replacement of the original text. The menu cancels mousedown on itself. The first Escape is consumed by the menu. The menu closes when the caret is at or before the slash or the slash is gone. The menu is destroyed with the editor and replaced when the source editor is rebuilt. The popover, panel or dialog of a picker command is opened after the query is removed, from the button of the same action.
