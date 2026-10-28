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
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-001
annotation_exemption: true
exemption_reason: "The result comes from the whole renderer and stylesheet together,
  with no single implementation point. No implementation marker is possible."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-MYST-006
default_owner_email: gaetan@xeberon.net
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

- Method: Visual scenario `myst/v${20 + index}-myst-gallery-full-${theme}-900` in test/visual/scenarioDefinitions2.ts
- Criteria: One visual family, two themes.
