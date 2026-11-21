---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-003
uuid: a24ed604-7b84-4f9a-b748-916128ecf78f
title: Open Preview to Side opens or reveals a side preview
description: "When a reader runs Open Preview to Side on a saved Markdown file, the
  extension SHALL show that file in the side preview that follows the active editor,
  by creating that preview beside the active editor when none is open and otherwise
  revealing it, and offer the command only for a resource whose extension is .md;
  the extension SHALL preview only a saved file with the extension .md, taken from
  the active editor (a text editor, a text diff, or the Studio Open With tab) or from
  a file URI the command receives, ignore an argument that is not a URI of the file
  scheme, and otherwise show the message Open a Markdown file to use Markdown OKF-Schema
  Studio. or the error Cannot open {path}: {reason} and open no preview."
project: markdown-okf-schema-studio
scope: lifecycle-sync
req_lifecycle: proposed
status: stable
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
- test/host/diffPreview.requirements.test.ts
- test/host/lifeReq.requirements.test.ts
- test/integration/diffPreview.test.ts
- test/integration/lifecycle.test.ts
- test/security/package-contract.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-LIFE-010
---

## Open Preview to Side opens or reveals a side preview

### Normative behavior

When a reader runs Open Preview to Side on a saved Markdown file, the extension SHALL show that file in the side preview that follows the active editor, by creating that preview beside the active editor when none is open and otherwise revealing it, and offer the command only for a resource whose extension is .md; the extension SHALL preview only a saved file with the extension .md, taken from the active editor (a text editor, a text diff, or the Studio Open With tab) or from a file URI the command receives, ignore an argument that is not a URI of the file scheme, and otherwise show the message Open a Markdown file to use Markdown OKF-Schema Studio. or the error Cannot open {path}: {reason} and open no preview.

### Scenario (nominal): Entry points of the command

| Entry point | Declaration |
| --- | --- |
| Command | markdown-okf-schema-studio.openPreview, title Open Preview to Side, category Markdown OKF-Schema Studio, icon $(book), enablement resourceExtname == .md |
| Command Palette | Open Preview to Side and Refresh Preview, when resourceExtname == .md |
| Explorer context menu | Open Preview to Side, when resourceExtname == .md, group navigation |
| Editor title bar | the book button, when resourceExtname == .md && (activeEditor == workbench.editors.files.textFileEditor || activeEditor == workbench.editors.textDiffEditor), group navigation; it runs Open Preview to Side |
| Keybinding | Ctrl+K Shift+V (Cmd+K Shift+V on macOS), when editorTextFocus && resourceExtname == .md |

### Scenario (boundary): Resource that is not offered the command

| Input | Outcome |
| --- | --- |
| the active resource is a file whose extension is not .md | the command is disabled in the menus (deduced from the when clause, not run) |
| a .ts file in the active editor, the Command Palette opened | neither command is listed (deduced from the when clause, not run) |
| a .json file in the Explorer, right-click | the Explorer entry is absent (deduced from the when clause, not run) |
| a .md file shown in the Studio Open With editor, title bar drawn | the book button is absent, because the when clause requires the text file editor or the text diff editor (deduced from the when clause, not run) |
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
- THEN the side preview is left as it was and the file checks of the scenarios below apply

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

### Scenario (refusal): Not a saved Markdown file

- GIVEN a TypeScript file in the active editor
- WHEN the command runs from the Command Palette
- THEN the information message Open a Markdown file to use Markdown OKF-Schema Studio. shows and no preview opens

### Scenario (nominal): Studio Open With tab active

- GIVEN a Studio Open With tab of a saved .md file is the active tab, so no text editor is active
- WHEN the command runs from the Command Palette
- THEN the file of that tab opens in the side preview and no refusal message shows (the keybinding and the editor-title button are not offered while a custom editor has the focus)

### Scenario (nominal): Text diff active

- GIVEN a text diff is the active tab (a git diff, a two-file compare or the search and replace preview) and one side is a saved .md file of the file scheme, whichever side holds the cursor
- WHEN the command runs from the Command Palette, the editor-title button or the keybinding, with no argument or with the URI of one side
- THEN that file, the real file of the diff, shows in the side preview, no text editor opens and no refusal message shows
- AND with two .md files compared the side that holds the cursor is the real file (the modified side when none does)
- AND with no side of the file scheme (a staged diff) the working-tree file at the modified side's path stands in when it exists and is .md, and otherwise the refusal message shows

### Scenario (refusal): Another custom editor active

- GIVEN the active tab is a custom editor of another type, so no text editor is active
- WHEN the command runs from the Command Palette
- THEN the message Open a Markdown file to use Markdown OKF-Schema Studio. shows and no preview opens

### Scenario (boundary): Eligible and ineligible files

| Input | Outcome |
| --- | --- |
| a file with the scheme file and the extension .md | previewed |
| README.MD | accepted: the extension check is case-insensitive |
| notes.markdown | refused with the message above |
| an untitled document | refused with the message above |

### Scenario (nominal): File passed by a menu

- GIVEN a side preview in group two, preview.md active, and preview-other.md chosen in the Explorer
- WHEN the reader runs the Explorer entry Open Preview to Side on preview-other.md
- THEN preview-other.md opens as a permanent tab outside the preview's group, becomes the active editor and the side preview shows it (integration test test/integration/lifecycle.test.ts, the passed Uri is the active text editor)
- AND without a side preview the file opens in the active group (by reading openPreview)

### Scenario (boundary): Argument that is not the file to open

| Input | Outcome |
| --- | --- |
| the URI names the file of the active editor | the file is not opened again and the active editor is previewed |
| the URI names a side of the active diff | the real file of the diff is previewed and no editor opens |
| the URI names a file that is no side of the active diff | the file opens as a text editor and is previewed, as without a diff |
| the argument { not: "a uri" } with a side preview of preview-other.md | ignored; the preview still shows preview-other.md (integration test test/integration/lifecycle.test.ts) |
| a URI whose scheme is not file | ignored the same way, because only the file scheme passes the check (deduced from the code, not run) |

### Scenario (refusal): A file that cannot be opened

| Input | Outcome |
| --- | --- |
| a file URI of a file deleted after the menu was drawn | an error message Cannot open {path}: {reason} names the path and the reason, and no preview opens or changes |
| the failure is not an Error object | the reason is the failure converted to a string |

### Related requirements

- SwRS-MDOKFSTUDIO-BLOCK-205: open editors are saved before the preview switches.

### Verification notes

- Method: test/security/package-contract.test.ts, unit test "contributes only opt-in Markdown OKF-Schema Studio commands" (Entry points of the command and Resource that is not offered the command: compares the contributed command with deepEqual to the expected entry, menus.commandPalette to the two expected entries, menus["explorer/context"] and menus["editor/title"] to the expected entries, and the keybindings to the one entry with key ctrl+k shift+v and mac cmd+k shift+v; the key press itself is never exercised; the Explorer entry and the chord are not in the README).
- Method: test/host/lifeReq.requirements.test.ts and test/integration/lifecycle.test.ts also check No eligible file and the file checks below.
- Method: test/integration/lifecycle.test.ts (First preview: runs the command on preview.md and waits for a ready render and the title Studio · preview.md; Another document: runs the command with the URI of the second file while the preview follows the first and waits for the preview to show the second file).
- Method: test/host/lifeReq.requirements.test.ts, unit tests "Open Preview to Side on the shown document reveals the preview and renders it again" (The shown document again: reads openPreview, sidePreview.panel.reveal, then requestDocument when document.id equals sidePreview.documentUri), "Open Preview to Side ignores previews that do not follow the active editor" (Previews that do not follow the active editor: reads manager.latest(followsActiveEditor)) and "the side preview and the Open With editor do not retain their page while hidden" (Hidden preview: reads createWebviewPanel and registerCustomEditorProvider in src/host-vscode/activation.ts and asserts retainContextWhenHidden is not true).
- Criteria: One session exists and its requestId grows when the shown document is previewed again; the session's documentUri equals the active file after a switch; a panel exists with the view type markdown-okf-schema-studio.preview, the file's HTML and the title Studio · preview.md; latest() skips sessions whose followsActiveEditor is false; neither panel creation passes retainContextWhenHidden: true, so a hidden preview releases its webview process and restores from the saved state.
- Method: test/host/lifeReq.requirements.test.ts, unit tests "Open Preview to Side refuses a file that is not a saved Markdown file" (Not a saved Markdown file, Eligible and ineligible files: reads isDocumentEligible, file scheme, .md extension, case-insensitive, and openPreview; the notes.markdown and untitled cases and the README.MD acceptance are by reading isDocumentEligible) and "Open Preview to Side reports a file it cannot open" (A file that cannot be opened: reads the catch block of openPreview).
- Method: test/host/diffPreview.requirements.test.ts (Text diff active: the real file rules, a git diff and the replace preview with the cursor in either side or none and each argument, a staged diff and its missing file, another file's URI), test/integration/diffPreview.test.ts (the same in the real window, and the title button's when clause).
- Method: test/host/lifeReq.requirements.test.ts, unit test "Open Preview to Side from a Studio Open With tab previews that tab's file" (Studio Open With tab active, Another custom editor active: the fake window reports a custom editor tab and no text editor).
- Method: test/integration/lifecycle.test.ts (File passed by a menu: runs the command with secondDocument.uri and asserts the preview document and that the passed Uri is the active text editor; Argument that is not the file to open: asserts the plain-object case; the other-scheme case is untested; the already-active case is by reading the code).
- Criteria: The information message reads Open a Markdown file to use Markdown OKF-Schema Studio. and no panel is created; preview.documentUri and the active text editor equal the passed URI; the preview document is unchanged after an ignored argument; the error message starts with Cannot open and the file path.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-001](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-001.md): A writer opens previews beside the editor or as tabs, beside the built-in preview
  - [StRS-MDOKFSTUDIO-LIFE-003](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-003.md): The side preview follows the active file and refreshes on demand
- Supersedes:
  - [SwRS-MDOKFSTUDIO-LIFE-010](SwRS-MDOKFSTUDIO-LIFE-010.md): Open Preview to Side checks the file it is given
<!-- okf:links:end -->
