---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-081
uuid: e112a644-542e-4228-b072-22ce979fbbbb
title: "PlantUML pictures are contained in the content width"
description: "When a PlantUML picture is wider than the content column, the extension
  SHALL scale it down to the column width keeping its proportions."
project: markdown-okf-schema-studio
scope: diagrams
req_lifecycle: superseded
status: deprecated
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

## PlantUML pictures are contained in the content width

### Normative behavior

When a PlantUML picture is wider than the content column, the extension SHALL scale it down to the column width keeping its proportions.

### Scenario: Wide picture

- GIVEN a PlantUML picture wider than the column
- WHEN the preview is shown
- THEN it is displayed at the column width with height auto

### Scenario: Narrow picture

- GIVEN a PlantUML picture narrower than the column
- WHEN the preview is shown
- THEN it keeps its natural size

### Verification notes

- Method: Unit test `a PlantUML picture is scaled down to the column and never set to a fixed width` in `test/core/preview/diagReq.styles.requirements.test.ts`.
- Criteria: max-width 100 percent, height auto, centred.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-006](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-006.md): A writer reads PlantUML diagrams without any setup
- Superseded by:
  - [SwRS-MDOKFSTUDIO-DIAG-023](SwRS-MDOKFSTUDIO-DIAG-023.md): PlantUML fences become centred inert pictures drawn by the built-in engine
<!-- okf:links:end -->
