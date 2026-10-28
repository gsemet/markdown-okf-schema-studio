---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-039
uuid: 2e443794-68fb-4238-8f1b-15775f3d2684
title: A palette action edits in one undo step or leaves the text unchanged and
  says why
description: When a palette button, a slash command or a shortcut runs an
  action, the extension SHALL apply the edit that the action returns to the text
  box as one native editing step that autosaves the editor and leaves the
  selection that the action returned, and, when the action returns no edit,
  leave the text unchanged, put the focus back in the text box and show the
  reason in the status line when the action has one.
project: markdown-okf-schema-studio
scope: palette-slash
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-001
- StRS-MDOKFSTUDIO-PALETTE-015
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/textControls.ts
- src/page/modules/editActionHelpers.ts
- src/page/modules/editPalette.ts
tested_in_files:
- test/page/modules/editActions.test.ts
- test/page/modules/editPalette.test.ts
- test/page/runtimeEditPalette.test.ts
- test/page/runtimePaletteActions.test.ts
default_owner_email: gaetan@xeberon.net
---

## A palette action edits in one undo step or leaves the text unchanged and says why

### Normative behavior

When a palette button, a slash command or a shortcut runs an action, the extension SHALL apply the edit that the action returns to the text box as one native editing step that autosaves the editor and leaves the selection that the action returned, and, when the action returns no edit, leave the text unchanged, put the focus back in the text box and show the reason in the status line when the action has one.

### Scenario (nominal): Bold and undo

- GIVEN a text box with a selected word
- WHEN the writer presses Bold and then the undo key combination
- THEN the word is wrapped in one step, the editor stays open and one undo restores the text

### Scenario (boundary): No native editing command

- GIVEN a page where the native editing command is not available
- WHEN the writer presses Bold
- THEN the text is spliced by hand, the editor reacts as to an input event and the returned selection is set

### Scenario (refusal): An action that makes no edit

- GIVEN a text box and an action that refuses the selection (the Colour action on a selection that straddles a span boundary)
- WHEN the writer presses the button
- THEN the text is unchanged and the text box has the focus, and the same action on a valid selection applies the edit

### Scenario (refusal): A refusal that has a reason

- GIVEN an open editor and a command that makes no edit
- WHEN the writer runs it as in the table
- THEN the text is unchanged (apart from the removed query) and the status line is as in the table

| Started from | Case | Outcome |
| --- | --- | --- |
| the button List table in a MyST editor | a table conversion that would lose content | the text is unchanged and the status line gives the reason |
| the slash menu | the same refusal, or a conversion that would lose content chosen from the menu | the typed slash query is removed, the text is otherwise unchanged and the status line gives the reason |
| the slash menu | a command that refuses without a reason | the query is removed and the status line is unchanged |

### Scenario (boundary): Invalid selection

- GIVEN a text of 5 characters
- WHEN a line or block action is applied with the selection of the table
- THEN the outcome is the one of the table

| Selection | Outcome |
| --- | --- |
| ending at 9 (beyond the text) | no edit |
| negative | no edit |
| start after its end | no edit |
| inside the text | the edit is produced |

### Scenario (nominal): A matched shortcut is consumed

- GIVEN the block text box
- WHEN the writer presses a palette shortcut that matches, such as Ctrl+B
- THEN the default is prevented and the event is stopped, whether or not the action returns an edit

| Selection | Outcome |
| --- | --- |
| a selected word | the word is wrapped and the event is stopped |
| a selection the action refuses | the text is unchanged and the event is still stopped, so the side bar does not toggle |

### Verification notes

- Method: test/page/runtimeEditPalette.test.ts (Bold and undo: clicking Bold edits the text in one native step and keeps the editor open; Enter in the URL field inserts [text](url) as one undo step and returns to the text box); test/page/runtimePaletteActions.test.ts (Bold and undo: the picker edits the text box as one undo step and keeps the editor open; a matched shortcut: the bold shortcut works in a cell and stays out of the browser); test/page/modules/editPalette.test.ts (an action that makes no edit, a refusal that has a reason: a refused conversion changes nothing and tells why through notify, also from the slash menu where the query is removed); test/page/modules/editActions.test.ts (invalid selection: heading without a change or with an unknown level returns no edit)
- Method: the manual splice fallback is deduced from the code (applyTextEdit in src/page/features/textControls.ts), not tested; the actions compute on text that uses the line feed only and the editor strips and restores the trailing line ending of the block, and no palette test covers a carriage return inside a block; the guard itself (validSelection in src/page/modules/editActionHelpers.ts) is exercised only indirectly by the action tests; the no-edit case of a matched shortcut is deduced from the code (paletteShortcut in src/page/features/textControls.ts), not tested; the slash menu case without a reason is untested
- Criteria: One execCommand call per edit, the text equals the planned result, the selection equals the one the action returned, and an autosave follows. For a refusal the text and the selection are the same before and after, the active element is the text box, the notify hook receives the explain text of the action and the editor status shows it only while the editor is open and not finishing (the refusal reasons themselves are specified in SwRS-MDOKFSTUDIO-TABLE-076). Every action starts with the same selection check and returns undefined when it fails. paletteShortcut returns true for every matched action of the current scope (the cell scope is specified in SwRS-MDOKFSTUDIO-TABLE-085).
