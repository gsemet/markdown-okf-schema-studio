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
default_owner_email: gaetan@xeberon.net
---

## A zoom that cannot be saved still holds for the session

### Normative behavior

When the workspace storage rejects the write of the view preferences, the extension SHALL keep the chosen zoom for the session.

### Scenario: Rejected write

- GIVEN workspace storage whose update fails
- WHEN the host handles a zoom message
- THEN the next page of the session starts at that zoom, the error "Failed to persist the Markdown preview view preferences." is written to the log and the reader sees one warning, "The Markdown preview could not save your display choice; it holds until VS Code closes."

### Scenario: No storage

- GIVEN choices whose storage is not loaded or was released at deactivation
- WHEN the host handles a zoom message
- THEN the zoom is held for the session, nothing is written and nothing is logged

### Verification notes

- Method: Superseded by SwRS-MDOKFSTUDIO-LIFE-169, whose test (test/session/diagReq.viewState.requirements.test.ts) makes the storage fail and checks the log and the warning.
- Criteria: See SwRS-MDOKFSTUDIO-LIFE-169.
