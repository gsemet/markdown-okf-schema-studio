---
type: SwRS
id: SwRS-MDOKFSTUDIO-THEME-055
uuid: 8b825b1e-9215-4eee-9ddb-f122cdc28ea1
title: A zoom that cannot be saved still holds for the session
description: When the workspace storage rejects the write of the view
  preferences, the extension SHALL keep the chosen zoom for the session.
project: markdown-okf-schema-studio
scope: theme-zoom
lifecycle: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-THEME-011
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A zoom that cannot be saved still holds for the session

### Normative behavior

When the workspace storage rejects the write of the view preferences, the extension SHALL keep the chosen zoom for the session.

### Scenario: Rejected write

- GIVEN workspace storage whose update fails
- WHEN the host handles a zoom message
- THEN the next page of the session starts at that zoom, the error "Failed to persist the Markdown preview view preferences." is written to the log and the reader sees no message

### Scenario: No storage

- GIVEN choices whose storage is not loaded or was released at deactivation
- WHEN the host handles a zoom message
- THEN the zoom is held for the session, nothing is written and nothing is logged

### Verification notes

- Method: Untested: no test makes the storage fail or absent. Read from WorkspaceChoices.setViewPreference in src/session/workspaceChoices.ts, which is shared with the other view preferences of toolbar-navigation.
- Criteria: By code reading only; a unit test would use a failing KeyValueStore.
