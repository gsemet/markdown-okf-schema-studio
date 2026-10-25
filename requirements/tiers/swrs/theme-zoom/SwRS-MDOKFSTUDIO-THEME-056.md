---
type: SwRS
id: SwRS-MDOKFSTUDIO-THEME-056
uuid: 73971c32-a0e8-4646-89d7-4771e0e33338
title: The toolbar takes the forced mode colours
description: When a forced theme mode is shown, the extension SHALL draw the
  floating toolbar and its pressed button with the colours of that mode, not
  with the VS Code ones.
project: markdown-okf-schema-studio
scope: theme-zoom
lifecycle: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-THEME-002
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## The toolbar takes the forced mode colours

### Normative behavior

When a forced theme mode is shown, the extension SHALL draw the floating toolbar and its pressed button with the colours of that mode, not with the VS Code ones.

### Scenario: Duplicate

- GIVEN this requirement was created twice by mistake
- WHEN the scope is read
- THEN it is archived and SwRS-MDOKFSTUDIO-THEME-029 states the behaviour

### Scenario: Not to be used

- GIVEN a deprecated requirement
- WHEN coverage is computed
- THEN it carries no marker and no verification

### Verification notes

- Method: None; archived duplicate of SwRS-MDOKFSTUDIO-THEME-029.
- Criteria: Not applicable.
