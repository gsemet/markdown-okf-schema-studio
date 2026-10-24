---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-102
uuid: 964e3c0d-f870-4c57-82ce-aae4742d35d1
title: A process that ignores its input becomes a message
description: When a PlantUML process exits before reading its input or its
  standard input reports an error, the extension SHALL report the failure on the
  diagram as a normal message and SHALL NOT raise an uncaught exception in the
  extension host.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-013
- StRS-MDOKFSTUDIO-DIAG-014
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A process that ignores its input becomes a message

### Normative behavior

When a PlantUML process exits before reading its input or its standard input reports an error, the extension SHALL report the failure on the diagram as a normal message and SHALL NOT raise an uncaught exception in the extension host.

### Scenario: Broken pipe

- GIVEN a process that exits before reading its input
- WHEN the diagram is rendered
- THEN the diagram shows a failure message and the host raises no uncaught exception

### Scenario: Stdin error

- GIVEN a standard input that emits an error
- WHEN the diagram is rendered
- THEN the render ends with a diagnostic

### Verification notes

- Method: Unit tests: a child that exits before reading stdin does not raise an uncaught exception; a stdin error settles the render with a diagnostic.
- Criteria: No uncaught exception and a diagnostic.
