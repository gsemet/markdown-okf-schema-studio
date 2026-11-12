---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-173
uuid: 7a9e6957-22fb-4ff4-8946-1f8500d93eb5
title: Save key saves the previewed document
description: When the writer presses the VS Code save key binding with the focus
  in the side preview, the extension SHALL write the text typed in an open block
  or table-cell editor to the document and keep that editor open with its caret,
  write the value typed in an open frontmatter field of the properties table to
  the document and close that field, then save the document the preview shows.
project: markdown-okf-schema-studio
scope: lifecycle-sync
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-008
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/hostToPage.ts
- src/core/protocol/pageToHost.ts
- src/core/protocol/pageToHostMessages.ts
- src/host-vscode/activation.ts
- src/page/features/blockEditor.ts
- src/page/features/hostHandlers.ts
- src/session/features/blockEdits.ts
- src/session/previewManager.ts
tested_in_files:
- test/core/protocol/hostToPage.test.ts
- test/core/protocol/pageToHost.test.ts
- test/integration/saveKey.test.ts
- test/page/runtimeBlockEditor.test.ts
- test/page/runtimeSaveKey.test.ts
- test/security/package-contract.test.ts
- test/session/saveCommand.test.ts
default_owner_email: gaetan@xeberon.net
---

## Save key saves the previewed document

### Normative behavior

When the writer presses the VS Code save key binding with the focus in the side preview, the extension SHALL write the text typed in an open block or table-cell editor to the document and keep that editor open with its caret, write the value typed in an open frontmatter field of the properties table to the document and close that field, then save the document the preview shows.

### Scenario (nominal): The save key saves what the preview shows
| Input | Outcome |
| --- | --- |
| No editor open in the focused side preview, the writer presses Cmd+S (Ctrl+S off macOS) | The key reaches VS Code, its binding runs `markdown-okf-schema-studio.saveDocument`, the page posts a save request and the host saves the document the preview shows; the dirty mark goes |
| A block editor is open and the writer typed text less than the autosave delay ago | The page writes that text to the document first (an autosave, not a final save), then the host saves; the saved file holds the text, the editor stays open, its text box keeps the focus, its value, its selection and its undo history |
| A table-cell editor is open, same case | The typed cell text is written to the document first, then the document is saved; the cell editor stays open with its caret |
| A frontmatter field of the properties table is open with a typed value | The page writes the value to the document and closes the field, as a navigation does, then the host saves; the saved file holds the value |
| The writer rebinds or unbinds the command in Keyboard Shortcuts | The new key runs the command; the page does not take the key itself |

### Scenario (boundary): Where the key applies
| Input | Outcome |
| --- | --- |
| No preview has the focus | The `when` clause is false and VS Code handles the key as before; the command does nothing |
| The page is not ready, or does not answer | When the page cannot be asked, the host saves the document at once; when it does not answer, the host saves after `FLUSH_WAIT_MS` |
| The host still applies an autosave or a frontmatter save | The host waits, bounded by `FLUSH_WAIT_MS`, until the active block edit has no pending text and the tracked saves are done, then saves, so the saved file holds the typed text and the dirty mark does not come back |
| The document is untitled | `save` opens VS Code's Save As dialog; a cancelled dialog or a refused save is silent |
| Format on save or another save participant changes the text | They run as with any save; the preview shows their result as an external change |
| The command is looked for in the Command Palette | It is hidden (`"when": "false"`); the key binding is its only entry |
| The preview is the custom editor | Not claimed here: see the verification notes |

### Related requirements
- SwRS-MDOKFSTUDIO-BLOCK-003: the other keys of the text box, which reach VS Code the same way

### Verification notes
- Method: test/session/saveCommand.test.ts (command routing, wait for the autosave and the frontmatter save, edit still active, page that never answers), test/core/protocol/hostToPage.test.ts and test/core/protocol/pageToHost.test.ts (the two messages), test/page/runtimeBlockEditor.test.ts and test/page/runtimeSaveKey.test.ts (the table-cell editor and the frontmatter field: the flush before the request), test/security/package-contract.test.ts (command, key binding, `when` clause, absent from the palette)
- Method: test/integration/saveKey.test.ts (real-input scenario scenarioSaveKeySavesPreview, real keys through the VS Code key binding, and the check of the custom editor)
- Criteria: the document is clean after the key, its text holds the typed text, the block or cell text box is still focused with its value, the frontmatter field is closed; no `previewEditSave` with `final: true` is posted by the key; the custom editor clause is added to the binding only when its check shows the native save fails

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-008](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-008.md): A writer types and moves between blocks with text editor keys
<!-- okf:links:end -->
