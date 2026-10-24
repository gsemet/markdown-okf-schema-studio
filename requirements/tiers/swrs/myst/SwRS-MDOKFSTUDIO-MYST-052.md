---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-052
uuid: 0a0107c7-ef6f-418b-be96-366bc96c7adc
title: The MyST gallery renders without sideways scroll
description: When the MyST gallery document renders in dark and light themes at
  900 px, the extension SHALL show a reference link, a closed dropdown, a
  definition list, sub and superscript, a kbd key, an abbreviation, a footnote
  and typeset inline math with no horizontal overflow.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## The MyST gallery renders without sideways scroll

### Normative behavior

When the MyST gallery document renders in dark and light themes at 900 px, the extension SHALL show a reference link, a closed dropdown, a definition list, sub and superscript, a kbd key, an abbreviation, a footnote and typeset inline math with no horizontal overflow.

### Scenario: Nominal

- GIVEN the gallery in dark theme at 900 px
- WHEN the preview renders
- THEN all listed constructs are present and the page does not overflow

### Scenario: Boundary or refusal

- GIVEN the gallery in light theme at 900 px
- WHEN the preview renders
- THEN the same assertions hold

### Verification notes

- Method: test
- Criteria: One visual family, two themes.
