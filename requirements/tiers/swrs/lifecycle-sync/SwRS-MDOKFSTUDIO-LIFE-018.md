---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-018
uuid: 38bfbca5-39ed-4c50-b961-83a49fb2da8e
title: The Open With editor shows its own Markdown file
description: When a reader opens a .md file with the optional Markdown
  OKF-Schema Studio editor through Open With, the extension SHALL resolve the
  editor at once and show that file in a tab that keeps showing it whatever
  editor becomes active, leave the other previews open, and show a page that
  names the refusal or the failure when the document is not a saved .md file or
  the preview cannot be created.
project: markdown-okf-schema-studio
scope: lifecycle-sync
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-001
- StRS-MDOKFSTUDIO-LIFE-007
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/host-vscode/activation.ts
tested_in_files:
- test/host/lifeReq.requirements.test.ts
- test/integration/stockCoexistence.test.ts
- test/security/package-contract.test.ts
default_owner_email: gaetan@xeberon.net
---

## The Open With editor shows its own Markdown file

### Normative behavior

When a reader opens a .md file with the optional Markdown OKF-Schema Studio editor through Open With, the extension SHALL resolve the editor at once and show that file in a tab that keeps showing it whatever editor becomes active, leave the other previews open, and show a page that names the refusal or the failure when the document is not a saved .md file or the preview cannot be created.

### Scenario (nominal): Declared editor

- GIVEN the package manifest
- WHEN the custom editors are read
- THEN one editor has the view type markdown-okf-schema-studio.editor, the display name Markdown OKF-Schema Studio, the selector *.md and the priority option
- AND a .md file opened with a double click opens in the text editor, never in the Studio (priority option; deduced from VS Code behaviour, not run)

### Scenario (nominal): The tab shows its own file

- GIVEN preview.md open in a text editor
- WHEN the reader runs Open With and chooses Markdown OKF-Schema Studio
- THEN the tab shows the rendered preview.md and its title is the bare file name preview.md (integration test test/integration/stockCoexistence.test.ts, the optional MyST Open With editor)
- AND when a text editor of preview-other.md becomes active, the Open With tab keeps showing preview.md

### Scenario (nominal): The editor opens before the render ends

| Input | Outcome |
| --- | --- |
| a first render delayed by two seconds, the file opened with the Studio Open With editor | the open call returns within one second with a pending status page (Preview pending), and the rendered view appears when the render ends (integration test test/integration/stockCoexistence.test.ts) |
| a render that ends at once | the pending page is replaced by the rendered page without any further action |

### Scenario (nominal): Other previews stay open

| Input | Outcome |
| --- | --- |
| a side preview and the stock Markdown preview open, the same file opened with the Studio Open With editor | the side preview is not disposed and the Open With tab is active (integration test test/integration/stockCoexistence.test.ts) |
| the Open With tab split to the right | the original tab stays, the side preview is not disposed and the active preview still shows the document |

### Scenario (refusal): A document that is not a saved Markdown file

| Input | Outcome |
| --- | --- |
| a document with a scheme other than file opened with the Studio Open With editor | its page shows Preview source missing and the message Markdown OKF-Schema Studio requires a Markdown file. |
| a saved .md file | the refusal page is not shown and the file renders |

### Scenario (refusal): A failure while opening

| Input | Outcome |
| --- | --- |
| the creation of the session throws, the editor is resolved | the page shows a status page Preview unavailable with the error message, in the status region |
| the session exists and its first render throws | the session status becomes error with the message, and no exception reaches VS Code |

### Related requirements

- SwRS-MDOKFSTUDIO-LIFE-003: the side preview that follows the active editor, which an Open With tab never is.

### Verification notes

- Method: test/security/package-contract.test.ts, unit test "contributes only opt-in Markdown OKF-Schema Studio commands" (Declared editor: compares customEditors with deepEqual).
- Method: test/integration/stockCoexistence.test.ts (Declared editor: opens a file with vscode.openWith and the editor view type; The tab shows its own file: checks the active session's document, the no-follow boundary is by reading createSession(..., followsActiveEditor false) in resolvePreviewEditor; The editor opens before the render ends: "Open With stayed loading while MyST was rendering" uses setRenderDelayForTests(2000) and asserts the pending page, then the delayed fixture view; Other previews stay open: asserts both, "opening the direct MyST editor disposed the existing side preview" and "splitting the MyST editor closed its original liveview tab").
- Method: test/host/lifeReq.requirements.test.ts, unit tests "the Open With editor explains that it needs a Markdown file" (A document that is not a saved Markdown file: reads resolvePreviewEditor) and "a failure while opening the Open With editor shows its message on the page" (A failure while opening: reads the catch block of resolvePreviewEditor).
- Criteria: customEditors equals the expected single entry; the session's followsActiveEditor is false and its title is the file name; the open command resolves in under 1000 ms and the status is pending until the render is ready; sidePreviewDisposed is false and the original tab is still in the tab list; the page holds the missing-source status with the message Markdown OKF-Schema Studio requires a Markdown file.; the status region holds the error status with the message.
