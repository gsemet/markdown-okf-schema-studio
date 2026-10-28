---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-119
uuid: 33de26d7-be6b-4bc2-a870-80e792c8c2a7
title: PlantUML pictures are centred
description: When a PlantUML picture is shown, the extension SHALL centre it in
  the content column.
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

### Verification notes

- Method: Unit test `a PlantUML picture is a block centred with automatic inline margins` in `test/core/preview/diagReq.styles.requirements.test.ts`.
- Criteria: margin-inline auto on a block image.
