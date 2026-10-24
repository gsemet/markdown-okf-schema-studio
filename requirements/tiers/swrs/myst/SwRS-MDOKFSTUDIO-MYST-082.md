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
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-014
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
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

- Method: test
- Criteria: Visual-only checks.
