---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-084
uuid: 6e602578-4123-40c8-9634-3dccee99d5e7
title: Closing the banner dismisses it for that document
description: When the reader closes the banner, the extension SHALL remove it at
  once without moving anything, send the warning set key and remember it per
  document until VS Code restarts, handing it back on reload.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-014
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Closing the banner dismisses it for that document

### Normative behavior

When the reader closes the banner, the extension SHALL remove it at once without moving anything, send the warning set key and remember it per document until VS Code restarts, handing it back on reload.

### Scenario: Nominal

- GIVEN the close button
- WHEN it is activated
- THEN the banner is removed and the key is sent

### Scenario: Boundary or refusal

- GIVEN a reload
- WHEN the preview reloads
- THEN the banner stays closed

### Verification notes

- Method: test
- Criteria: A second preview of the file shares the dismissal.
