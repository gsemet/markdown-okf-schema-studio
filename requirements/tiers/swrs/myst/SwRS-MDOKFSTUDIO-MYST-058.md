---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-058
uuid: de89efa6-d6e6-48e1-b385-4323d5a4041a
title: Toctree caption and hidden options
description: When a toctree has `:caption:` or `:hidden:`, the extension SHALL
  show the caption as a level-2 heading above the list or show nothing.
project: markdown-okf-schema-studio
scope: myst
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-012
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-057; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-MYST-057
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

- Method: Unit test "a toctree lists links labelled by the target H1, the file name or an explicit title" in test/core/render/gridToctree.test.ts
- Criteria: Options are independent.
