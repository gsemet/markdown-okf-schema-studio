---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-081
uuid: e112a644-542e-4228-b072-22ce979fbbbb
title: "PlantUML pictures are contained in the content width"
description: "When a PlantUML picture is wider than the content column, the extension
  SHALL scale it down to the column width keeping its proportions."
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

### Known issues

- Known issue: Untested: only the Mermaid rules have a stylesheet test.

### Verification notes

- Method: No stylesheet test for the PlantUML rules; the visual scenarios exercise them indirectly.
- Criteria: max-width 100 percent, height auto, centred.
