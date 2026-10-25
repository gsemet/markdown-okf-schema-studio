---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-112
uuid: a2df27cf-c2f7-41b5-b751-5ed4164fbe57
title: A double click reveals the source line only when the double-click setting
  is on
description: When the reader double-clicks a rendered block that is not a link
  outside edit mode and doubleClickToSwitchToEditor is on, the extension SHALL
  reveal the source line of that block in the text editor.
project: markdown-okf-schema-studio
scope: lifecycle-sync
lifecycle: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-010
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A double click reveals the source line only when the double-click setting is on

### Normative behavior

When the reader double-clicks a rendered block that is not a link outside edit mode and doubleClickToSwitchToEditor is on, the extension SHALL reveal the source line of that block in the text editor.

### Scenario: Setting off

- GIVEN doubleClickToSwitchToEditor off and a text editor of the file
- WHEN a previewReveal with activation double-click reaches the host
- THEN the editor is not moved (integration test test/integration/sourceMapping.test.ts)

### Scenario: In edit mode

- GIVEN edit mode on and the setting on
- WHEN the reader double-clicks a block
- THEN no reveal is posted

### Verification notes

- Method: Integration test test/integration/sourceMapping.test.ts covers the host gate with the setting off; the gesture is untested.
- Criteria: lastRevealedSourceLine is unchanged by a double-click reveal with the setting off.

### Archived

Merged into SwRS-MDOKFSTUDIO-LIFE-099, which owns the double-click behaviour and its setting.
