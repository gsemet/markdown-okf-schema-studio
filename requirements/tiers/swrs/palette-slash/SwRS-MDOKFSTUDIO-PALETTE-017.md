---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-017
uuid: 49c16328-78a5-45be-82ba-0555b69ff850
title: Cmd/Ctrl+Shift+M reaches the mode select and Escape or Enter returns to
  the text
description: When the writer presses Cmd+Shift+M on macOS or Ctrl+Shift+M
  elsewhere in the block text box, the extension SHALL close any open picker and
  move the focus to the mode select, whose tooltip names that key, and give the
  focus back to the text box without changing the mode when the writer presses
  Escape or Enter, or clicks a second time, on the select.
project: markdown-okf-schema-studio
scope: palette-slash
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-002
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/blockSourceEditor.ts
- src/page/modules/editPalette.ts
tested_in_files:
- test/page/runtimeEditPalette.test.ts
default_owner_email: gaetan@xeberon.net
---

## Cmd/Ctrl+Shift+M reaches the mode select and Escape or Enter returns to the text

### Normative behavior

When the writer presses Cmd+Shift+M on macOS or Ctrl+Shift+M elsewhere in the block text box, the extension SHALL close any open picker and move the focus to the mode select, whose tooltip names that key, and give the focus back to the text box without changing the mode when the writer presses Escape or Enter, or clicks a second time, on the select.

### Scenario (nominal): Platform key

- GIVEN a block editor with the focus in the text box
- WHEN the writer presses the key combination of the platform
- THEN any open picker is closed, the focus is on the mode select and the editor stays open

### Scenario (nominal): Tooltip of the select

- GIVEN a block editor
- WHEN the writer hovers the select
- THEN the tooltip is the one of the table

| Platform | Tooltip |
| --- | --- |
| macOS | Palette buttons (Cmd+Shift+M) |
| Windows or Linux | Palette buttons (Ctrl+Shift+M) |

### Scenario (refusal): Wrong modifier

- GIVEN the same editor on macOS
- WHEN the writer presses Ctrl+Shift+M
- THEN nothing happens

### Scenario (nominal): Return to the text box

- GIVEN the focus on the select
- WHEN the writer presses the key or clicks as in the table
- THEN the focus is in the text box, the mode is unchanged and the editor stays open

| Input on the select | Outcome |
| --- | --- |
| Escape | the focus is in the text box, the mode is unchanged and the editor stays open |
| Enter | the focus is in the text box and the mode is unchanged |
| a second click (opening and dismissing the select without a change) | the focus is handed back to the text box |

### Scenario (boundary): Composition

- GIVEN an IME composition in progress
- WHEN a key is pressed on the select
- THEN the key is ignored

### Verification notes

- Method: test/page/runtimeEditPalette.test.ts (platform key, tooltip, wrong modifier: Ctrl+Shift+M focuses the select, Cmd+Shift+M on macOS and the tooltip shows it; return to the text box: opening and dismissing the select without a change hands the focus back, Escape on the select returns to the text box, Cmd/Ctrl+Enter finishes the edit)
- Method: the composition boundary is deduced from the code, not tested
- Criteria: After the key the active element is the select; with the other platform's modifier the active element is still the text box. The title attribute of the select equals the accessible name followed by the shortcut in parentheses for the platform of the page. The text box is the active element after Escape, Enter or the second click and no mode change was reported.
