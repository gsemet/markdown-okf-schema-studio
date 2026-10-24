---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-058
uuid: de89efa6-d6e6-48e1-b385-4323d5a4041a
title: Toctree caption and hidden options
description: When a toctree has `:caption:` or `:hidden:`, the extension SHALL
  show the caption as a level-2 heading above the list or show nothing.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-012
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Toctree caption and hidden options

### Normative behavior

When a toctree has `:caption:` or `:hidden:`, the extension SHALL show the caption as a level-2 heading above the list or show nothing.

### Scenario: Nominal

- GIVEN `:caption: Guide`
- WHEN the preview renders
- THEN a level-2 heading Guide appears above the list

### Scenario: Boundary or refusal

- GIVEN `:hidden:`
- WHEN the preview renders
- THEN nothing is shown

### Verification notes

- Method: test
- Criteria: Options are independent.
