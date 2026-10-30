---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-034
uuid: e9a5bf83-a30b-46c5-8f0f-d47a93957a29
title: A host refusal is shown in the cell and keeps the typed text
description: When the host answers an open or a save of a cell editor with an
  error, the extension SHALL show the host's message in the status line of the
  editor, which is in the table bar once the text box exists, and on a refused
  save drop the pending navigation, leave the editor open and keep the typed
  text.
project: markdown-okf-schema-studio
scope: table-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TABLE-001
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-216
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/blockSourceEditor.ts
tested_in_files:
- test/page/fmtableReqTable.requirements.test.ts
- test/page/runtimeTableCellEditor.test.ts
default_owner_email: gaetan@xeberon.net
---

## A host refusal is shown in the cell and keeps the typed text

### Normative behavior

When the host answers an open or a save of a cell editor with an error, the extension SHALL show the host's message in the status line of the editor, which is in the table bar once the text box exists, and on a refused save drop the pending navigation, leave the editor open and keep the typed text.

### Scenario (refusal): Refused save
- GIVEN a cell edited and the host refusing the final save with a message
- WHEN the error answer arrives
- THEN the message shows in the table bar status

### Scenario (refusal): Refused open
- GIVEN a cell editor waiting for the table source and the host answering with an error
- WHEN the answer arrives
- THEN the message replaces the loading status in the cell editor region and no text box is built
- The region has a Close button; Escape, Close and a click on any cell or block leave it (see SwRS-MDOKFSTUDIO-BLOCK-216)

### Scenario (refusal): Refused save before leaving the table
- GIVEN a cell edited, a click on a block outside the table pending and the host refusing the final save
- WHEN the error answer arrives
- THEN the pending navigation is dropped, the editor is no longer finishing and a later click on a cell of the table switches to it with the typed text kept

### Scenario (nominal): Enter after the refusal
- GIVEN the same editor
- WHEN the writer presses Enter
- THEN a new final previewEditSave with the typed text is posted


### Related requirements
- SwRS-MDOKFSTUDIO-BLOCK-216: a refused open or save of a block editor keeps the typed text and says why.

### Verification notes
- Method: test/page/fmtableReqTable.requirements.test.ts ("a host refusal of a cell save shows in the table bar; a refused open replaces the loading status": refused save, refused open).
- Method: test/page/runtimeTableCellEditor.test.ts ("table editing switches cells without losing changes and finalizes before leaving the table": the cleared navigation, the switch to another cell, the kept text and the new final save: refused save before leaving the table, Enter after the refusal).
- Method: test/page/fmtableReqTable.requirements.test.ts (`a host refusal of a cell save shows in the table bar; a refused open replaces the loading status`, changed: the refused region now holds the reason and a Close button, which closes it).
- Criteria: The status text equals the host message. No pending navigation in the webview state after the error and the typed text in the next save.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TABLE-001](../../strs/table-editing/StRS-MDOKFSTUDIO-TABLE-001.md): A writer edits a table cell in place and never loses the text
- Depends on:
  - [SwRS-MDOKFSTUDIO-BLOCK-216](../block-editing/SwRS-MDOKFSTUDIO-BLOCK-216.md): A refused open or save keeps the typed text and says why
<!-- okf:links:end -->
