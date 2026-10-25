---
type: SwRS
id: SwRS-MDOKFSTUDIO-THEME-016
uuid: 807e6e0c-2ade-456b-8e1f-1275a37bac74
title: "Current mode follows the VS Code theme and redraws on change"
description: "When the Current theme mode is shown or the active VS Code colour theme
  changes, the extension SHALL keep the preview in the colours of the VS Code theme:
  it colours the page, the toolbar and its pressed button with the VS Code theme variables
  for every host theme kind, high contrast included, tells every open preview that
  has a render the new theme kind, and draws a Markdown document again once no block
  editor is open."
project: markdown-okf-schema-studio
scope: theme-zoom
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-THEME-002
- StRS-MDOKFSTUDIO-THEME-004
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-TRUST-059
- SwRS-MDOKFSTUDIO-THEME-013
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/pageLiveState.ts
- src/core/preview/themeTokens.ts
- src/page/features/themeMode.ts
- src/session/features/scrollSync.ts
- src/session/features/viewState.ts
- src/session/hostEvents.ts
tested_in_files:
- test/core/state/editLock.test.ts
- test/integration/lifecycle.test.ts
- test/integration/realInput.markers.ts
- test/page/runtimePageControls.test.ts
---

## Current mode follows the VS Code theme and redraws on change

### Normative behavior

When the Current theme mode is shown or the active VS Code colour theme changes, the extension SHALL keep the preview in the colours of the VS Code theme: it colours the page, the toolbar and its pressed button with the VS Code theme variables for every host theme kind, high contrast included, tells every open preview that has a render the new theme kind, and draws a Markdown document again once no block editor is open.

### Scenario (nominal): Current mode on a dark and a light VS Code theme

- GIVEN the preview in Current mode on a dark VS Code theme (real-input capture theme-zoom/r02) and on a light VS Code theme (capture theme-zoom/r06)
- WHEN the page is rendered
- THEN the body background equals --vscode-editor-background, the toolbar background equals --vscode-editorWidget-background, the toolbar text equals --vscode-icon-foreground and the pressed button background equals --vscode-button-background, with the values of the variables of each host theme

### Scenario (boundary): High-contrast host

- GIVEN the Current mode on a high-contrast VS Code theme (theme kind 3 or 4)
- WHEN the page is rendered
- THEN the same four colours come from the high-contrast theme's variables; no rule of the page palette overrides them

### Scenario (nominal): The page root records the theme kind

- GIVEN a page and a themeChanged message with a theme kind, or a boot context without one
- WHEN the page starts or handles the message
- THEN the attribute data-sphinx-preview-theme of the html element reads the kind number, or default when there is none, as in the table

| Input | data-sphinx-preview-theme |
| --- | --- |
| themeChanged with theme kind 2 (dark) | 2 |
| themeChanged with theme kind 1 (light) | 1 |
| themeChanged with theme kind 3 (high contrast), then 4 (high contrast light) | 3, then 4 |
| Boot context without a theme kind | default |

### Scenario (nominal): The host tells every open preview

- GIVEN two open previews with a render and a switch of the VS Code theme from dark to light
- WHEN VS Code reports the change
- THEN each preview receives one themeChanged message with the new kind and the identity of its render (the page accepts it under SwRS-MDOKFSTUDIO-TRUST-059)

### Scenario (boundary): Preview without a render

- GIVEN an open preview that has not rendered yet
- WHEN VS Code reports the change
- THEN no themeChanged message is posted to it

### Scenario (nominal): A Markdown document is drawn again

- GIVEN an open preview of a .md file and a switch of the VS Code theme
- WHEN VS Code reports the change
- THEN one bounded render follows, with a request number higher than the previous one, and no second render follows after 300 ms

### Scenario (boundary): Redraw by document and editor state

- GIVEN a theme change reported by VS Code
- WHEN the preview document or the editor state is as in the table
- THEN the outcome is the one in the table

| Input | Outcome |
| --- | --- |
| A preview whose document has no .md path | The page receives its themeChanged message but the document is not drawn again |
| A block editor open in edit mode | The page changes its theme marker at once, the document is not drawn again, and the redraw runs after the editor closes (see SwRS-MDOKFSTUDIO-BLOCK-041) |
| No editor open | The redraw starts at once |

### Scenario (nominal): A page that missed the theme message gets it with the ready answer

- GIVEN a page whose runtime started after the host's themeChanged message was delivered, and the host's answer to a ready report of render 11
- WHEN the page reports previewReady and the host answers
- THEN the page receives themeChanged with kind 2 and data-sphinx-preview-theme reads 2; the document, revision and request number of the answer are those of the report, so a page that has moved on ignores it

### Scenario (boundary): The page reports the theme mode it was given

- GIVEN a press of the Theme button (see SwRS-MDOKFSTUDIO-THEME-001)
- WHEN the page reports the new mode
- THEN it posts a previewThemeModeChanged message, whose accepted shape and the dropping of a malformed one are stated in SwRS-MDOKFSTUDIO-THEME-013

### Known issues

- Known issue: no style rule reads data-sphinx-preview-theme; its only consumer is the Mermaid theme observer (see SwRS-MDOKFSTUDIO-DIAG-005), which redraws a diagram only when its drawn colours differ.

### Related requirements

- SwRS-MDOKFSTUDIO-THEME-001: the Theme button that leaves Current mode.
- SwRS-MDOKFSTUDIO-THEME-025: the forced modes, which do not follow the VS Code theme.
- SwRS-MDOKFSTUDIO-THEME-034: the token map through which the page reads the VS Code variables.

### Verification notes

- Method: test/integration/realInput.markers.ts, check `38-toolbar-{host}-current` of test/integration/realInput.test.ts (captures theme-zoom/r02 and r06, which compare the four colours with the VS Code variables); the sticky heading band reads the same tokens (src/core/preview/styles/pageChromeStyles.ts) and is not asserted separately. The high-contrast case is untested: no test or visual scenario uses such a host, and the forced-colors media rules of the stylesheet cover the warning banner border, the diff lines, the focus outline and the slash menu only.
- Method: test/page/runtimePageControls.test.ts, unit test `a page whose pairing and theme messages were lost while it loaded gets both from the host's answer to its ready report` (the value 2 of the theme kind and the ready answer built with pageLiveStateMessages and dispatched); the values default, 1, 3 and 4 are untested. ScrollSyncController.postPageLiveState and the ready handler in src/session/features/rendering.ts are not covered by a session test. The pairing message of the same answer belongs to lifecycle-sync.
- Method: test/integration/lifecycle.test.ts switches the VS Code colour theme and waits for the render that follows (step `the theme-triggered bounded render`: the request number rises once and stays stable afterwards); the themeChanged message itself, the preview without a render and the non-Markdown case (read from isDocumentEligible in src/session/sessionDocuments.ts) are not asserted.
- Method: test/core/state/editLock.test.ts, unit tests of EditLock.shouldDeferReload, the condition deferWhileEditing uses (editor open and no editor); the CHANGELOG records the guarantee. Not asserted: the theme-render key and the order in ViewStateController.notifyTheme (src/session/features/viewState.ts). A test would hold the edit lock and count renders before and after it is released.
- Criteria: The four computed colours equal the probe colours of the four variables on both hosts. The attribute equals the String of the reported kind, or default. One message per rendered preview, none for a preview without a stage. The request number rises once after the change and stays stable afterwards. The answer to a ready report holds a themeChanged message with the live kind and the report's identity.
