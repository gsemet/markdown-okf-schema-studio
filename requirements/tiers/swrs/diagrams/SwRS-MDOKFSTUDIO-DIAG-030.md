---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-030
uuid: 7ad78843-64d9-465c-9f61-7d768906a4da
title: "Built-in diagrams follow the light or dark preview"
description: "When the preview background is dark, the page SHALL ask the built-in
  engine for the dark rendering, and otherwise for the light rendering."
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-006
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-023; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-DIAG-023
default_owner_email: gaetan@xeberon.net
---

## Built-in diagrams follow the light or dark preview

### Normative behavior

When the preview background is dark, the page SHALL ask the built-in engine for the dark rendering, and otherwise for the light rendering.

### Scenario: Dark background

- GIVEN a preview whose computed background has a luminance below 0.18
- WHEN the page decides the variant
- THEN the dark rendering is used

### Scenario: Transparent background

- GIVEN a preview whose computed background is fully transparent
- WHEN the page decides the variant
- THEN the light rendering is used

### Verification notes

- Method: Unit tests of the background decision and of the renderer; visual scenarios diagrams v10 and v11.
- Criteria: Luminance below 0.18 selects dark; the variant change redraws all diagrams.
