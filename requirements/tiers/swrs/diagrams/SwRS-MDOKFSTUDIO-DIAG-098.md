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
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-007
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-097; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-DIAG-097
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

### Verification notes

- Method: Unit test `a diagram text over 1 MiB is refused without a process, a text of exactly 1 MiB is rendered` in `test/core/render/diagReq.jar.requirements.test.ts`.
- Criteria: The limit is strictly greater than 1 MiB.
