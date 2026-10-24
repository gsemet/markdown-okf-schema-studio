---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-096
uuid: 75549693-2c2a-4d45-a658-2df867defeb7
title: "A process that cannot be spawned is reported"
description: "When starting the PlantUML process throws, the extension SHALL report
  the failure on the diagram like any other failure, with the error text, and state
  error, or the missing-executable message when the error is a missing command."
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

## A process that cannot be spawned is reported

### Normative behavior

When starting the PlantUML process throws, the extension SHALL report the failure on the diagram like any other failure, with the error text, and state error, or the missing-executable message when the error is a missing command.

### Scenario: Spawn throws

- GIVEN a spawn call that throws an error with a message
- WHEN the diagram is rendered
- THEN the diagram shows that message with state error and a warning

### Scenario: Missing command thrown

- GIVEN a spawn call that throws a not-found error
- WHEN the diagram is rendered
- THEN the diagram shows the missing-executable message with state unavailable

### Known issues

- Known issue: The synchronous spawn throw branch is untested.

### Verification notes

- Method: No test of the synchronous throw branch.
- Criteria: Thrown errors take the same path as asynchronous ones.
