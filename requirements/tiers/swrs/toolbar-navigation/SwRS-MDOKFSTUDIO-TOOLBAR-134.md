---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-134
uuid: 31f1bec4-2ebf-4ddf-92cd-98281651fe07
title: Export to HTML is a command and a toolbar button that save one file
description: When the writer runs Export to HTML from the command palette or
  presses the Export button of the preview toolbar, the extension SHALL ask
  where to save the file, offering the folder and name of the page with an html
  extension, and write the page there, writing nothing when the dialog is
  cancelled and telling the writer when the file is written or cannot be.
project: markdown-okf-schema-studio
scope: toolbar-navigation
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-014
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/previewToolbar.ts
- src/core/protocol/hostToPage.ts
- src/core/protocol/pageToHost.ts
- src/host-vscode/activation.ts
- src/host-vscode/vscodeHost.ts
- src/page/features/hostHandlers.ts
- src/page/modules/exportSnapshot.ts
- src/page/runtime.ts
- src/session/features/htmlExport.ts
- src/session/previewManager.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/core/protocol/pageToHost.test.ts
- test/integration/exportHtml.test.ts
- test/page/modules/exportSnapshot.test.ts
- test/session/htmlExport.test.ts
- test/session/previewManager.test.ts
default_owner_email: gaetan@xeberon.net
---

## Export to HTML is a command and a toolbar button that save one file

### Normative behavior

When the writer runs Export to HTML from the command palette or presses the Export button of the preview toolbar, the extension SHALL ask where to save the file, offering the folder and name of the page with an html extension, and write the page there, writing nothing when the dialog is cancelled and telling the writer when the file is written or cannot be.

### Scenario (nominal): The Export button saves the page

- GIVEN a preview of `notes/page.md`
- WHEN the writer presses the Export button, the last button of the main toolbar row but one (Refresh, Edit, Export, collapse), and accepts the save dialog
- THEN the dialog offers `notes/page.html` with an HTML filter, one HTML file is written at the chosen path, and the extension shows an information message that names the file

### Scenario (nominal): The command exports the preview in use

- GIVEN a focused preview panel, or a Markdown file open in the editor with its preview
- WHEN the writer runs Export to HTML from the command palette
- THEN that preview exports its page; with no preview of the active file the extension tells the writer to open it first

### Scenario (boundary): Cancel, refusal and failure

| Input | Outcome |
| --- | --- |
| The save dialog is cancelled | Nothing is written and no message is shown |
| A request that no click and no command asked for | The host ignores it and shows no dialog |
| The write fails | An error message names the cause and no success message is shown |
| Restricted Mode | The export is available; images are read with the narrowed Restricted Mode reads |
| A page with no folder on disk | The dialog offers the first workspace folder |
| A page whose snapshot is over 50 million characters | The page shows "This page is too large to export." in its status region, sends nothing and the button works again |
| A snapshot the host cannot read (wrong shape) or that names another document | The host answers with a refusal and an error message, and the button works again |

### Verification notes

- Method: test/session/htmlExport.test.ts (the dialog default, the filter, Cancel, the write error, the refused request), test/page/modules/exportSnapshot.test.ts (the button click is the user gesture, the command sends none), test/core/protocol/pageToHost.test.ts and hostToPage.test.ts (the validators), test/core/preview/previewStyles.test.ts (the button in the main row), test/integration/exportHtml.test.ts (the command in the real host).
- Criteria: one file is written only after a save dialog is accepted; Cancel writes nothing; the toolbar has 16 buttons with Export in the main row.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-014](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-014.md): A writer shares one page as a self-contained HTML file
<!-- okf:links:end -->
