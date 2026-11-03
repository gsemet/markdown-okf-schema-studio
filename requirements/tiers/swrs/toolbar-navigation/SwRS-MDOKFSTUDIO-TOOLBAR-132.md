---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-132
uuid: e6ed37be-4fe5-43fa-a527-7cb67c727a19
title: The find and replace fields keep their native editing shortcuts
description: When the reader types a native text-editing shortcut in the find or
  replace field of the find bar (select all, copy, cut, paste, undo, redo, caret
  and word moves, Home, End, Shift with the arrows, delete a word), the
  extension SHALL apply it to the field alone, without handing the key to the
  page or to VS Code.
project: markdown-okf-schema-studio
scope: toolbar-navigation
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/findBar.ts
tested_in_files:
- test/page/modules/findBar.test.ts
default_owner_email: gaetan@xeberon.net
---

## The find and replace fields keep their native editing shortcuts

### Normative behavior

When the reader types a native text-editing shortcut in the find or replace field of the find bar (select all, copy, cut, paste, undo, redo, caret and word moves, Home, End, Shift with the arrows, delete a word), the extension SHALL apply it to the field alone, without handing the key to the page or to VS Code.

### Scenario (nominal): Select all in the find field
- GIVEN the find bar is open with a query in its field
- WHEN the reader presses Cmd+A on macOS or Ctrl+A elsewhere in the field
- THEN the key is stopped inside the bar, so no page listener and no VS Code key forwarding sees it, and its default action is not prevented: the browser selects the text of the field

### Scenario (boundary): Other keys
| Input | Outcome |
| --- | --- |
| Cmd/Ctrl+C, +X, +V, +Z, +Shift+Z, +Y in the find or replace field | Stopped inside the bar, default action kept: the field copies, cuts, pastes, undoes or redoes, never a block selection or the workbench history |
| Arrows, Home, End, Backspace, Delete, with or without Shift, Alt or Cmd/Ctrl (caret, word and line moves, delete a word) | Stopped inside the bar, default action kept |
| The same keys during an input method composition | Not taken by the bar |
| Escape, Enter, Shift+Enter, Cmd/Ctrl+Alt+Enter, Cmd/Ctrl+F, Alt+C, Alt+W, Alt+R | Keep the actions of the bar |
| Another chord (Cmd/Ctrl+S, Cmd/Ctrl+P) | Left to VS Code |

### Verification notes

- Method: test/page/modules/findBar.test.ts (the key stops at the bar and is not prevented, from the find and the replace field; the bar's own keys keep their action; the same key outside the bar is not taken).
- Criteria: the event is stopped and not prevented for each native editing key in a field of the bar.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-003](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-003.md): The reader finds and replaces text in the preview
<!-- okf:links:end -->
