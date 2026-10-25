---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-082
uuid: 87a37ee1-cc89-4c7c-9eaa-da62cdcd8f6d
title: The banner takes no layout room
description: When the banner shows, the extension SHALL place it in the 40 px
  gap left of the floating toolbar without covering it, move no content or
  scroll anchor, scroll it away with the page top, keep one line with ellipsis,
  stay readable in every theme and add no sideways scroll.
project: markdown-okf-schema-studio
scope: myst
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-007
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-081; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-MYST-081
---

## The banner takes no layout room

### Normative behavior

When the banner shows, the extension SHALL place it in the 40 px gap left of the floating toolbar without covering it, move no content or scroll anchor, scroll it away with the page top, keep one line with ellipsis, stay readable in every theme and add no sideways scroll.

### Scenario: Nominal

- GIVEN the banner appears or closes
- WHEN the page is observed
- THEN no content or scroll anchor moves

### Scenario: Boundary or refusal

- GIVEN a very narrow pane
- WHEN the banner renders
- THEN it stays on one line with an ellipsis

### Verification notes

- Method: Visual scenario `myst/v${number}-conf-warning-banner-${mode ?? theme}-900` in test/visual/scenarioDefinitions2.ts
- Criteria: Visual-only checks.
