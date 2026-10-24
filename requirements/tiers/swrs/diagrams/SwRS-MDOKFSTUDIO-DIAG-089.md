---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-089
uuid: c41362bf-7600-4e4d-a229-f6f435c41601
title: "A jarPath that does not exist is reported on every diagram"
description: "When the resolved JAR path does not exist, the extension SHALL show
  The PlantUML JAR could not be found followed by the path on every PlantUML diagram
  with state error, and SHALL start no process."
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

## A jarPath that does not exist is reported on every diagram

### Normative behavior

When the resolved JAR path does not exist, the extension SHALL show The PlantUML JAR could not be found followed by the path on every PlantUML diagram with state error, and SHALL start no process.

### Scenario: Missing JAR

- GIVEN jarPath naming missing.jar and two PlantUML diagrams
- WHEN the preview is rendered
- THEN both diagrams show the could-not-be-found message with the resolved path and state error and no process starts

### Scenario: No diagram

- GIVEN a document without PlantUML diagrams and the same jarPath
- WHEN the preview is rendered
- THEN nothing is reported

### Verification notes

- Method: Unit test: uses the PATH executable when no JAR is configured and reports missing commands (missing.jar).
- Criteria: Message, state and absence of a process.
