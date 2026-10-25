---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-021
uuid: d791c9b2-5a29-4335-ac46-9b0efcdc780f
title: A width mode choice is saved for the workspace
description: When the reader changes the width mode, the extension SHALL keep
  the choice in the webview state and send it to the host as a workspace
  preference.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-003
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-LIFE-169; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-LIFE-169
---

## A width mode choice is saved for the workspace

### Normative behavior

When the reader changes the width mode, the extension SHALL keep the choice in the webview state and send it to the host as a workspace preference.

### Scenario: Click saves the choice

- GIVEN a preview in Margin mode
- WHEN the Width button is clicked once
- THEN the webview state holds viewWidthMode auto and a previewViewPreferenceChanged message with preference widthMode and value auto is posted

### Scenario: Invalid value refused

- GIVEN a message with the width mode value wide
- WHEN the host validates it
- THEN the value is refused (only margin, auto and full are accepted) and the stored preference is unchanged

### Known issues

- Known issue: The preference message is accepted by read-only and untrusted previews because it edits no document.
- Known issue: A failure of the workspace persistence is only logged and has no test.

### Verification notes

- Method: Unit tests T10 the width button cycles margin, auto, full width and posts widthMode, and the protocol validator and view preference normaliser.
- Criteria: Accepted values are exactly margin, auto and full.
