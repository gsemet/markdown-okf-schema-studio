---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-102
uuid: 964e3c0d-f870-4c57-82ce-aae4742d35d1
title: A process that ignores its input becomes a message
description: "When a PlantUML process exits before reading its input or its standard
  input reports an error, the extension SHALL report the failure on the diagram as
  a normal message without raising an uncaught exception in the extension host."
project: markdown-okf-schema-studio
scope: diagrams
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-007
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-097; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-DIAG-097
default_owner_email: gaetan@xeberon.net
---

## A process that ignores its input becomes a message

### Normative behavior

When a PlantUML process exits before reading its input or its standard input reports an error, the extension SHALL report the failure on the diagram as a normal message without raising an uncaught exception in the extension host.

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

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-007](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-007.md): A writer renders PlantUML with an own JAR or command, safely bounded
- Superseded by:
  - [SwRS-MDOKFSTUDIO-DIAG-097](SwRS-MDOKFSTUDIO-DIAG-097.md): A JAR render is bounded in input, output, time, process lifetime and concurrency
<!-- okf:links:end -->
