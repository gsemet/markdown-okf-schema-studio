---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-038
uuid: b8acbbd8-bf71-48d5-a507-045f889ea1d1
title: The saved width mode is restored when the page starts
description: When the preview page starts, the extension SHALL apply the saved
  webview state first, then the stored workspace preference, then Margin.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-003
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-LIFE-170; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-LIFE-170
default_owner_email: gaetan@xeberon.net
---

## The saved width mode is restored when the page starts

### Normative behavior

When the preview page starts, the extension SHALL apply the saved webview state first, then the stored workspace preference, then Margin.

### Scenario: Priority

- GIVEN a saved webview state of full and a stored workspace preference of auto
- WHEN the page starts
- THEN the width mode is full

### Scenario: Invalid value

- GIVEN an invalid stored width mode and no saved webview state
- WHEN the page starts
- THEN the invalid value is ignored and the width mode is Margin

### Verification notes

- Method: Unit tests T10 the saved width mode applies at startup and an edited element keeps the column, and the view preference normaliser (invalid value gives margin).
- Criteria: The first valid value among the webview state, the workspace preference and Margin is applied.
