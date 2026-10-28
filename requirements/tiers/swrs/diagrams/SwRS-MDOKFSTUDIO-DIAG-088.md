---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-088
uuid: 34859616-680b-4f58-b4e6-95ad75ca225d
title: A relative jarPath is resolved from the workspace folder
description: "When jarPath is a relative path, the extension SHALL resolve it from
  the workspace folder and use an absolute path as it is."
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-007
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-084; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-DIAG-084
default_owner_email: gaetan@xeberon.net
---

## A relative jarPath is resolved from the workspace folder

### Normative behavior

When jarPath is a relative path, the extension SHALL resolve it from the workspace folder and use an absolute path as it is.

### Scenario: Relative

- GIVEN a jarPath tools/plantuml.jar and a workspace folder
- WHEN a diagram is rendered
- THEN java is given the JAR path inside the workspace folder

### Scenario: Absolute

- GIVEN an absolute jarPath
- WHEN a diagram is rendered
- THEN java is given that path unchanged

### Verification notes

- Method: Unit test: renders PlantUML through the configured external JAR (relative path).
- Criteria: Resolved path equals the workspace folder joined with the setting.
