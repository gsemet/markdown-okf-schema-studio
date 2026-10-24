---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-020
uuid: 1127cafd-2856-4bef-8f3a-9be3326baea8
title: The webview keeps checkbox inputs
description: When the rendered HTML is sanitized for the webview, the extension
  SHALL keep checkbox inputs and their source line, column and state attributes.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## The webview keeps checkbox inputs

### Normative behavior

When the rendered HTML is sanitized for the webview, the extension SHALL keep checkbox inputs and their source line, column and state attributes.

### Scenario: Checkbox survives sanitizing

- GIVEN rendered HTML with a checkbox input
- WHEN it is sanitized
- THEN the input and its source attributes remain

### Scenario: Checked state and position kept

- GIVEN a checked checkbox input with line and column attributes
- WHEN it is sanitized
- THEN the checked state, line and column attributes are all kept

### Verification notes

- Method: Unit test on the sanitizer output.
- Criteria: Checkbox inputs keep their state and source attributes.
