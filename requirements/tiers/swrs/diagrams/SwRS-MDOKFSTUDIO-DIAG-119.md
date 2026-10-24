---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-119
uuid: 33de26d7-be6b-4bc2-a870-80e792c8c2a7
title: PlantUML pictures are centred
description: When a PlantUML picture is shown, the extension SHALL centre it in
  the content column.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-006
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## PlantUML pictures are centred

### Normative behavior

When a PlantUML picture is shown, the extension SHALL centre it in the content column.

### Scenario: Narrow picture

- GIVEN a PlantUML picture narrower than the column
- WHEN the preview is shown
- THEN it is centred

### Scenario: Wide picture

- GIVEN a PlantUML picture as wide as the column
- WHEN the preview is shown
- THEN it fills the column

### Known issues

- Known issue: Untested: only the Mermaid rules have a stylesheet test.

### Verification notes

- Method: No stylesheet test for the PlantUML rules.
- Criteria: margin-inline auto on a block image.
