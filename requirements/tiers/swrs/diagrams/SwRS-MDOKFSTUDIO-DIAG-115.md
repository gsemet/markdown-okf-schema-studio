---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-115
uuid: bd6b8c7a-c661-42ca-a100-17134f1efabb
title: A theme switch between light and dark redraws built-in diagrams
description: When a theme change switches the preview between a light and a dark
  background, the page SHALL draw every built-in diagram again in the other
  variant.
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
superseded_by:
- SwRS-MDOKFSTUDIO-DIAG-023
default_owner_email: gaetan@xeberon.net
---

## A theme switch between light and dark redraws built-in diagrams

### Normative behavior

When a theme change switches the preview between a light and a dark background, the page SHALL draw every built-in diagram again in the other variant.

### Scenario: Dark then light

- GIVEN a dark preview with drawn diagrams
- WHEN the theme changes to a light preview
- THEN every diagram is drawn again with the light rendering

### Scenario: Same variant

- GIVEN a theme change that keeps the background dark
- WHEN the observer fires
- THEN no diagram is drawn again

### Known issues

- Known issue: The theme observer in plantumlPreview.ts has no unit test.

### Verification notes

- Method: Visual scenarios diagrams v10 and v11; no unit test of the theme observer.
- Criteria: The variant change redraws all diagrams.
