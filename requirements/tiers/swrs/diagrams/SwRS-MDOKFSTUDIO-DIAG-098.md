---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-098
uuid: bd97b895-61eb-41b2-a9bb-3f90989763b4
title: The JAR pipeline refuses a source over 1 MiB
description: When a PlantUML diagram text is longer than 1 MiB, the extension
  SHALL show PlantUML source exceeds the 1 MiB preview limit. on the diagram
  with state error, without starting a process.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-014
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## The JAR pipeline refuses a source over 1 MiB

### Normative behavior

When a PlantUML diagram text is longer than 1 MiB, the extension SHALL show PlantUML source exceeds the 1 MiB preview limit. on the diagram with state error, without starting a process.

### Scenario: Over the limit

- GIVEN a diagram text of 1,048,577 characters with useJar on
- WHEN the diagram is rendered
- THEN the diagram shows that message and no process starts

### Scenario: At the limit

- GIVEN a diagram text of exactly 1,048,576 characters
- WHEN the diagram is rendered
- THEN the process is started

### Known issues

- Known issue: Untested; the same constant as the built-in engine limit.

### Verification notes

- Method: No test feeds an oversized source; to be added.
- Criteria: The limit is strictly greater than 1 MiB.
