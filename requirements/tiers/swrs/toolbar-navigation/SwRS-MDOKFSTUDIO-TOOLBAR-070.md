---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-070
uuid: b17fb22a-aeef-43fb-9ffd-f504184f377b
title: Back and Next save an open editor first
description: When the reader presses Back or Next while a block or properties
  editor is open, the extension SHALL post the final save of the editor and then
  the history move.
project: markdown-okf-schema-studio
scope: toolbar-navigation
lifecycle: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-009
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
---

## Back and Next save an open editor first

### Normative behavior

When the reader presses Back or Next while a block or properties editor is open, the extension SHALL post the final save of the editor and then the history move.

### Scenario: Typed text

- GIVEN an open block editor with text typed after the last autosave
- WHEN Back is pressed
- THEN the final save is posted first and previewHistoryGo after it

### Scenario: Untouched editor

- GIVEN an open editor with nothing typed
- WHEN Back is pressed
- THEN only previewHistoryGo is posted

### Verification notes

- Method: Unit tests CR 025: Back right after typing posts the final save before previewHistoryGo; Back with an untouched editor open posts only the navigation; Back right after a refused blur save posts the flush save before previewHistoryGo; integration previewHistory (Back while a block editor is open, the typed text is kept).
- Criteria: Save message index < history message index.
