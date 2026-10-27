---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-003
uuid: a24ed604-7b84-4f9a-b748-916128ecf78f
title: Open Preview to Side opens or reveals a side preview
description: When a reader runs Open Preview to Side on a saved Markdown file,
  the extension SHALL show that file in the side preview that follows the active
  editor, by creating that preview beside the active editor when none is open
  and otherwise revealing it, and offer the command only for a resource whose
  extension is .md.
project: markdown-okf-schema-studio
scope: lifecycle-sync
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-001
- StRS-MDOKFSTUDIO-LIFE-003
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/host-vscode/activation.ts
tested_in_files:
- test/host/lifeReq.requirements.test.ts
- test/integration/lifecycle.test.ts
- test/security/package-contract.test.ts
---

## Open Preview to Side opens or reveals a side preview

### Normative behavior

When a reader runs Open Preview to Side on a saved Markdown file, the extension SHALL show that file in the side preview that follows the active editor, by creating that preview beside the active editor when none is open and otherwise revealing it, and offer the command only for a resource whose extension is .md.

### Scenario (nominal): Entry points of the command

| Entry point | Declaration |
| --- | --- |
| Command | markdown-okf-schema-studio.openPreview, title Open Preview to Side, category Markdown OKF-Schema Studio, icon $(book), enablement resourceExtname == .md |
| Command Palette | Open Preview to Side and Refresh Preview, when resourceExtname == .md |
| Explorer context menu | Open Preview to Side, when resourceExtname == .md, group navigation |
| Editor title bar | the book button, when resourceExtname == .md && activeEditor == workbench.editors.files.textFileEditor, group navigation; it runs Open Preview to Side |
| Keybinding | Ctrl+K Shift+V (Cmd+K Shift+V on macOS), when editorTextFocus && resourceExtname == .md |

### Scenario (boundary): Resource that is not offered the command

| Input | Outcome |
| --- | --- |
| the active resource is a file whose extension is not .md | the command is disabled in the menus (deduced from the when clause, not run) |
| a .ts file in the active editor, the Command Palette opened | neither command is listed (deduced from the when clause, not run) |
| a .json file in the Explorer, right-click | the Explorer entry is absent (deduced from the when clause, not run) |
| a .md file shown in the Studio Open With editor, title bar drawn | the book button is absent, because the when clause requires the text file editor (deduced from the when clause, not run) |
| focus in the terminal or in a non-Markdown editor, the chord pressed | the Studio does not handle it (deduced from the when clause editorTextFocus && resourceExtname == .md, not run) |

### Scenario (nominal): First preview

- GIVEN a saved Markdown file in the active editor and no Studio preview open
- WHEN the reader runs Open Preview to Side
- THEN a preview panel opens beside the editor, titled Studio · preview.md, and renders the file (integration test test/integration/lifecycle.test.ts, first lifecycle render)
- AND with the active editor alone in the only editor group, the panel is requested with ViewColumn.Beside, so VS Code opens it in a new group to the side (deduced from the code, not run)

### Scenario (nominal): The shown document again

- GIVEN a side preview showing preview.md and preview.md in the active editor
- WHEN the reader runs Open Preview to Side again
- THEN no second panel opens; the existing panel is revealed and the document is rendered again

### Scenario (nominal): Another document

- GIVEN a side preview showing preview.md and preview-other.md in the active editor
- WHEN the reader runs Open Preview to Side
- THEN the existing panel is revealed and switches to preview-other.md, after the page saved its open editors (see SwRS-MDOKFSTUDIO-BLOCK-205)

### Scenario (refusal): No eligible file

- GIVEN the active editor holds no saved Markdown file
- WHEN the command runs
- THEN the side preview is left as it was and the refusal of SwRS-MDOKFSTUDIO-LIFE-010 applies

### Scenario (boundary): Previews that do not follow the active editor

| Input | Outcome |
| --- | --- |
| an Open With preview tab of a.md, no side preview, a.md chosen in the Explorer, the Explorer entry run | a new side preview panel is created beside the editor and the Open With tab stays |
| a panel restored by VS Code that is no longer the newest and has become a fixed preview, the command run from the Explorer | that panel is not reused |
| an Open With tab and a side preview of the same file, the command run | only the side preview that follows the active editor is reused |

### Scenario (boundary): Hidden preview

| Input | Outcome |
| --- | --- |
| a side preview with a scrolled page, hidden behind another tab of its group, the reader selects the preview tab again | the page is reloaded and restores its scroll position, edit state and comments panel from the saved webview state, because the panel is created without retainContextWhenHidden (deduced from the code, not run) |
| an Open With preview tab hidden behind another tab, selected again | its page is restored the same way, because the custom editor is registered without retainContextWhenHidden |

### Related requirements

- SwRS-MDOKFSTUDIO-LIFE-010: the refusal and the argument checks of the command.
- SwRS-MDOKFSTUDIO-BLOCK-205: open editors are saved before the preview switches.

### Verification notes

- Method: test/security/package-contract.test.ts, unit test "contributes only opt-in Markdown OKF-Schema Studio commands" (Entry points of the command and Resource that is not offered the command: compares the contributed command with deepEqual to the expected entry, menus.commandPalette to the two expected entries, menus["explorer/context"] and menus["editor/title"] to the expected entries, and the keybindings to the one entry with key ctrl+k shift+v and mac cmd+k shift+v; the key press itself is never exercised; the Explorer entry and the chord are not in the README).
- Method: test/host/lifeReq.requirements.test.ts and test/integration/lifecycle.test.ts also check No eligible file through SwRS-MDOKFSTUDIO-LIFE-010.
- Method: test/integration/lifecycle.test.ts (First preview: runs the command on preview.md and waits for a ready render and the title Studio · preview.md; Another document: runs the command with the URI of the second file while the preview follows the first and waits for the preview to show the second file).
- Method: test/host/lifeReq.requirements.test.ts, unit tests "Open Preview to Side on the shown document reveals the preview and renders it again" (The shown document again: reads openPreview, sidePreview.panel.reveal, then requestDocument when document.id equals sidePreview.documentUri), "Open Preview to Side ignores previews that do not follow the active editor" (Previews that do not follow the active editor: reads manager.latest(followsActiveEditor)) and "the side preview and the Open With editor do not retain their page while hidden" (Hidden preview: reads createWebviewPanel and registerCustomEditorProvider in src/host-vscode/activation.ts and asserts retainContextWhenHidden is not true).
- Criteria: One session exists and its requestId grows when the shown document is previewed again; the session's documentUri equals the active file after a switch; a panel exists with the view type markdown-okf-schema-studio.preview, the file's HTML and the title Studio · preview.md; latest() skips sessions whose followsActiveEditor is false; neither panel creation passes retainContextWhenHidden: true, so a hidden preview releases its webview process and restores from the saved state.
