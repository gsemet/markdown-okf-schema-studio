---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-009
uuid: 63ea9113-6573-4237-b5db-f19daabb339b
title: Cmd/Ctrl+F opens a find bar over the preview
description: When the reader presses Cmd+F (macOS) or Ctrl+F (other systems)
  with the focus in the preview page, the extension SHALL open a find bar over
  the preview with its field focused, close it on Escape, and leave the key to
  VS Code when the focus is in the text editor or in a field of an open block
  editor.
project: markdown-okf-schema-studio
scope: toolbar-navigation
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/hostToPage.ts
- src/host-vscode/activation.ts
- src/page/features/hostHandlers.ts
- src/page/modules/findBar.ts
- src/session/previewManager.ts
tested_in_files:
- test/integration/findInPreview.test.ts
- test/page/modules/findBar.test.ts
- test/security/package-contract.test.ts
- test/session/editCommands.test.ts
- test/visual/capture_find_checks.py
default_owner_email: gaetan@xeberon.net
---

## Cmd/Ctrl+F opens a find bar over the preview

### Normative behavior

When the reader presses Cmd+F (macOS) or Ctrl+F (other systems) with the focus in the preview page, the extension SHALL open a find bar over the preview with its field focused, close it on Escape, and leave the key to VS Code when the focus is in the text editor or in a field of an open block editor.

### Scenario (nominal): Open and close
- GIVEN a preview page with the focus in its content
- WHEN the reader presses Cmd+F on macOS or Ctrl+F elsewhere
- THEN the key is taken before VS Code's webview find sees it, the find bar is shown under the toolbar with its field focused and the selected text of one line as the query, and Escape hides it and gives the focus back to where it was

### Scenario (boundary): The key stays with the editors
| Input | Outcome |
| --- | --- |
| Cmd/Ctrl+F while the focus is in the text editor | VS Code's own find opens; the preview is not involved |
| Cmd/Ctrl+F while the focus is in a field of an open block editor or the frontmatter editor | The key is left to the field; the bar does not open |
| Cmd/Ctrl+F while the bar is open | The field is focused again |
| Tab in the bar | The order is the toolbar, the bar controls, then the content |

### Verification notes

- Method: test/page/modules/findBar.test.ts (the key opens the bar with the field focused and prevents the default; a text area keeps the key; Escape closes the bar, clears the paint and restores the focus; F3 is free again once the bar is closed).
- Method: test/integration/findInPreview.test.ts, real VS Code window (the bar opens on the key, the native webview find widget stays closed, the cream and dark shots).
- Criteria: the bar is visible and its field has the focus; no webview find widget is shown.
