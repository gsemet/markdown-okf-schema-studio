---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-009
uuid: 63ea9113-6573-4237-b5db-f19daabb339b
title: Cmd/Ctrl+F opens a find bar over the preview
description: "When the reader presses Cmd+F (macOS) or Ctrl+F (other systems) with
  the focus in the preview page, including a field of an open block, table cell or
  frontmatter editor, the extension SHALL open a find bar over the preview at once
  with its field focused, so the keys typed next go to the query, close it on Escape,
  and leave the key to VS Code when the focus is in the text editor; and the find
  and replace fields keep their native text-editing shortcuts (select all, copy, cut,
  paste, undo, redo, caret and word moves, delete a word), applied to the field alone
  without handing the key to the page or to VS Code."
project: markdown-okf-schema-studio
scope: toolbar-navigation
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-003
depends_on: []
scenarios:
- id: S1
  title: Open and close
- id: S2
  title: Editors and an open bar
- id: S3
  title: Select all in the find field
- id: S4
  title: Other keys
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/hostToPage.ts
- src/host-vscode/activation.ts
- src/page/features/hostHandlers.ts
- src/page/modules/findBar.ts
- src/page/runtime.ts
- src/session/previewManager.ts
tested_in_files:
- test/integration/findInPreview.test.ts
- test/page/modules/findBar.test.ts
- test/page/runtimeFindFromBlockEditor.test.ts
- test/security/package-contract.test.ts
- test/session/editCommands.test.ts
- test/visual/capture_find_checks.py
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-TOOLBAR-132
---

## Cmd/Ctrl+F opens a find bar over the preview

### Normative behavior

When the reader presses Cmd+F (macOS) or Ctrl+F (other systems) with the focus in the preview page, including a field of an open block, table cell or frontmatter editor, the extension SHALL open a find bar over the preview at once with its field focused, so the keys typed next go to the query, close it on Escape, and leave the key to VS Code when the focus is in the text editor; and the find and replace fields keep their native text-editing shortcuts (select all, copy, cut, paste, undo, redo, caret and word moves, delete a word), applied to the field alone without handing the key to the page or to VS Code.

### Scenario S1 (nominal): Open and close
- GIVEN a preview page with the focus in its content
- WHEN the reader presses Cmd+F on macOS or Ctrl+F elsewhere
- THEN the key is taken before VS Code's webview find sees it, the find bar is shown under the toolbar with its field focused and the selected text of one line as the query, and Escape hides it and gives the focus back to where it was

### Scenario S2 (boundary): Editors and an open bar
| Input | Outcome |
| --- | --- |
| Cmd/Ctrl+F while the focus is in the text editor | VS Code's own find opens; the preview is not involved |
| Cmd/Ctrl+F while the focus is in a field of an open block editor, table cell editor or the frontmatter editor | The page takes the key and opens the bar at once with its field focused (the query starts with the text selected in that field, if any); the keys typed afterwards go to the query, not to the field; the editor commits on blur as usual, with what was typed before the key |
| Cmd/Ctrl+F while the focus is in another field of the page (a comment box, a control of the palette or of a panel) | The same: the bar opens at once; the field loses the focus as on a click elsewhere |
| Escape after the blur committed a block or table cell editor whose final save is still on its way | The bar closes and the focus is not given back to that editor's field (keys typed there would not be saved) |
| The host's find command (VS Code's key binding) while the focus is already in the bar | Nothing changes: no second bar, the query is kept and not selected again, the focus stays |
| Cmd/Ctrl+F while the bar is open and the focus is elsewhere | The field is focused again and its query selected |
| Cmd/Ctrl+F in the bar | The query is selected again |
| F3 while the focus is in a field of an open editor | The key is left to the field |
| Tab in the bar | The order is the toolbar, the bar controls, then the content |

### Scenario S3 (nominal): Select all in the find field
- GIVEN the find bar is open with a query in its field
- WHEN the reader presses Cmd+A on macOS or Ctrl+A elsewhere in the field
- THEN the key is stopped inside the bar, so no page listener and no VS Code key forwarding sees it, and its default action is not prevented: the browser selects the text of the field

### Scenario S4 (boundary): Other keys
| Input | Outcome |
| --- | --- |
| Cmd/Ctrl+C, +X, +V, +Z, +Shift+Z, +Y in the find or replace field | Stopped inside the bar, default action kept: the field copies, cuts, pastes, undoes or redoes, never a block selection or the workbench history |
| Arrows, Home, End, Backspace, Delete, with or without Shift, Alt or Cmd/Ctrl (caret, word and line moves, delete a word) | Stopped inside the bar, default action kept |
| The same keys during an input method composition | Not taken by the bar |
| Escape, Enter, Shift+Enter, Cmd/Ctrl+Alt+Enter, Cmd/Ctrl+F, Alt+C, Alt+W, Alt+R | Keep the actions of the bar |
| Another chord (Cmd/Ctrl+S, Cmd/Ctrl+P) | Left to VS Code |

### Verification notes

- Method: test/page/modules/findBar.test.ts (the key opens the bar with the field focused and prevents the default, also from an editor field, whose selected text starts the query; Escape does not give the focus back to a field the page refuses; Escape closes the bar, clears the paint and restores the focus; an open request while the focus is in the bar changes nothing; F3 is free again once the bar is closed).
- Method: test/page/runtimeFindFromBlockEditor.test.ts, page runtime (from a block editor text box, a table cell and a frontmatter field: the bar opens at once, the keys typed next end in the query, the Markdown saves hold only the edits made before the key, a later host find command changes nothing; unsaved multi-line edits made before the key are saved once, whole, by the blur, and Escape does not give the focus back to the committed text box).
- Method: test/integration/findInPreview.test.ts, real VS Code window (the bar opens on the key, the native webview find widget stays closed, the cream and dark shots; from the title's block editor, the query typed right after the key ends in the find field and the Markdown is unchanged). The same scenario is repeated by the `stress` CI job as `find-in-preview` (test/shared/stressPlan.ts), cream and dark, so a late focus change shows up as a stress failure.
- Criteria: the bar is visible and its field has the focus; no webview find widget is shown.
- Method: test/page/modules/findBar.test.ts (the key stops at the bar and is not prevented, from the find and the replace field; the bar's own keys keep their action; the same key outside the bar is not taken).
- Criteria: the event is stopped and not prevented for each native editing key in a field of the bar.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-003](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-003.md): The reader finds and replaces text in the preview
- Supersedes:
  - [SwRS-MDOKFSTUDIO-TOOLBAR-132](SwRS-MDOKFSTUDIO-TOOLBAR-132.md): The find and replace fields keep their native editing shortcuts
<!-- okf:links:end -->
