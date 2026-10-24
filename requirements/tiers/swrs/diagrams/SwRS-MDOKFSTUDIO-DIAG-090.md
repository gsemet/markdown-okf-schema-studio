---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-090
uuid: e7f5acba-e658-4331-bbc3-131d6716f4ca
title: A jarPath that is a directory is reported
description: When the resolved JAR path exists but is not a file, the extension
  SHALL show The PlantUML JAR path is not a file followed by the path on every
  PlantUML diagram with state error, and SHALL start no process.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-013
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A jarPath that is a directory is reported

### Normative behavior

When the resolved JAR path exists but is not a file, the extension SHALL show The PlantUML JAR path is not a file followed by the path on every PlantUML diagram with state error, and SHALL start no process.

### Scenario: Directory

- GIVEN jarPath naming a directory
- WHEN the preview is rendered
- THEN every diagram shows the not-a-file message with state error and no process starts

### Scenario: File

- GIVEN jarPath naming a regular file
- WHEN the preview is rendered
- THEN the JAR is run

### Known issues

- Known issue: Untested branch of validateJarPath.

### Verification notes

- Method: No test of the not-a-file branch; to be added.
- Criteria: Directory paths are refused before spawning.
