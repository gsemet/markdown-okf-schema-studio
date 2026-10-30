---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-003
uuid: 967ff673-5ba8-49de-a413-c89aed87da48
title: Edit-mode text box follows VS Code undo, redo, select-all and delete-line
  key bindings
description: When a writer presses the VS Code key binding of undo, redo, select
  all or delete line in an open block or table-cell text box of the focused
  preview, the page SHALL apply that command to the text box through a command
  the extension contributes, so the key binding the writer set in VS Code
  applies.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-008
- StRS-MDOKFSTUDIO-BLOCK-025
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/hostToPage.ts
- src/host-vscode/activation.ts
- src/host-vscode/vscodeHost.ts
- src/page/features/hostHandlers.ts
- src/page/features/textControls.ts
- src/page/modules/editCommandKey.ts
- src/page/modules/textEditing.ts
- src/session/previewManager.ts
tested_in_files:
- test/core/protocol/hostToPage.test.ts
- test/integration/editKeys.test.ts
- test/page/modules/editCommandKey.test.ts
- test/page/modules/selectAllKey.test.ts
- test/page/modules/textEditing.test.ts
- test/page/runtimeBlockEditor.test.ts
- test/security/package-contract.test.ts
- test/session/editCommands.test.ts
default_owner_email: gaetan@xeberon.net
---

## Edit-mode text box follows VS Code undo, redo, select-all and delete-line key bindings

### Normative behavior

When a writer presses the VS Code key binding of undo, redo, select all or delete line in an open block or table-cell text box of the focused preview, the page SHALL apply that command to the text box through a command the extension contributes, so the key binding the writer set in VS Code applies.

### Scenario (nominal): The key bindings run the editing commands on the text box
| Input | Outcome |
| --- | --- |
| A block or table-cell editor open in the focused preview, the writer presses Cmd+Z (Ctrl+Z off macOS) | The page cancels the native action, the key reaches VS Code, its binding runs `markdown-okf-schema-studio.editUndo` and the last change of the text box is undone once; the editor stays open and the autosave follows the text |
| The same, Cmd+Shift+Z (Ctrl+Shift+Z or Ctrl+Y off macOS) | `editRedo` restores the undone change |
| The same, Cmd+A (Ctrl+A off macOS) | `editSelectAll` selects the whole text of the text box and nothing else of the page |
| The same, Cmd+Shift+K (Ctrl+Shift+K off macOS) | `editDeleteLine` removes every line the selection touches with one line break, as one undoable step, keeps the column on the next line (the previous line when the last line goes) and autosaves |
| The writer rebinds or unbinds one of the four commands in VS Code | The new key runs the command; the page does not run it from its own default key |

### Scenario (boundary): Where the commands apply
| Input | Outcome |
| --- | --- |
| No editor open in the preview, or the preview does not have the focus | The context `markdownOkfSchemaStudio.previewEditing` is off, the bindings do not apply and VS Code handles the key as before |
| An editor opens, closes or the preview gains or loses the focus | The extension sets the context at once, and only when its value changes |
| An editing command with no text box focused in the page | Nothing changes |
| The text is empty, Cmd+Shift+K | Nothing changes |
| Cmd+K alone (the start of a VS Code chord) | The page does not take it; delete line is Cmd+Shift+K as in VS Code |
| A frontmatter field editor | The keys keep their earlier behaviour: undo, redo and select-all stay in the field |

### Related requirements
- SwRS-MDOKFSTUDIO-BLOCK-069: the other keys of the text box, and the undo and select-all of the field editors

### Verification notes
- Method: test/page/modules/editCommandKey.test.ts (key to command, platform primary key), test/page/modules/textEditing.test.ts (delete line), test/page/runtimeBlockEditor.test.ts (keys cancel the native action and reach VS Code; the command applies to the focused text box), test/page/modules/selectAllKey.test.ts, test/core/protocol/hostToPage.test.ts (the message and its payload check), test/session/editCommands.test.ts (context and routing), test/security/package-contract.test.ts (commands, key bindings and `when` clause)
- Method: test/integration/editKeys.test.ts (real-input scenario scenarioEditKeysFollowVscode, real keys through VS Code key bindings)
- Criteria: preventDefault is called and stopPropagation is not for the four default keys in a block or cell text box; the textarea value after delete line equals the text without the touched lines; setPreviewEditing is called only on a change; the commands are absent from the command palette

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-008](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-008.md): A writer types and moves between blocks with text editor keys
  - [StRS-MDOKFSTUDIO-BLOCK-025](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-025.md): Preview edits land exactly, in one undo step, keep line endings, or are refused with a reason
<!-- okf:links:end -->
