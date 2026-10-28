---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-026
uuid: 731ca59b-a813-4518-b654-9d4593bd48b0
title: Cancelling after an autosave asks the host to restore the original table
description: When the writer cancels a cell edit after an autosave has reached
  the document, the extension SHALL post previewEditCancel so that the host
  restores the original table, and SHALL post nothing when no autosave happened.
project: markdown-okf-schema-studio
scope: table-editing
lifecycle: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TABLE-001
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
---

## Cancelling after an autosave asks the host to restore the original table

### Normative behavior

When the writer cancels a cell edit after an autosave has reached the document, the extension SHALL post previewEditCancel so that the host restores the original table, and SHALL post nothing when no autosave happened.

### Scenario: Autosave then Escape

- GIVEN a cell edited, the 400 ms autosave posted and Escape pressed
- WHEN the cancel is handled
- THEN a previewEditCancel with the edit id is posted and no final save

### Scenario: Escape before any autosave

- GIVEN a cell edited and Escape pressed before the autosave
- WHEN the cancel is handled
- THEN no previewEditCancel and no previewEditSave are posted

### Verification notes

- Method: Unit test Escape in a table cell after an autosave restores the table with previewEditCancel in test/page/runtimeTableCellEditor.test.ts.
- Criteria: The cancel message appears only in the first scenario. The host restoring the text is specified in the block-editing scope.
