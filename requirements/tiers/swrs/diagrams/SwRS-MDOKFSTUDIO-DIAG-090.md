---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-090
uuid: e7f5acba-e658-4331-bbc3-131d6716f4ca
title: A jarPath that is a directory is reported
description: "When the resolved JAR path exists but is not a file, the extension SHALL
  show The PlantUML JAR path is not a file followed by the path on every PlantUML
  diagram with state error, without starting a process."
project: markdown-okf-schema-studio
scope: diagrams
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-007
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-089; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-DIAG-089
default_owner_email: gaetan@xeberon.net
---

## A jarPath that is a directory is reported

### Normative behavior

When the resolved JAR path exists but is not a file, the extension SHALL show The PlantUML JAR path is not a file followed by the path on every PlantUML diagram with state error, without starting a process.

### Scenario: Directory

- GIVEN jarPath naming a directory
- WHEN the preview is rendered
- THEN every diagram shows the not-a-file message with state error and no process starts

### Scenario: File

- GIVEN jarPath naming a regular file
- WHEN the preview is rendered
- THEN the JAR is run

### Verification notes

- Method: Unit test `a jarPath naming a directory is refused on every diagram before any process starts` in `test/core/render/diagReq.jar.requirements.test.ts`.
- Criteria: Directory paths are refused before spawning.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-007](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-007.md): A writer renders PlantUML with an own JAR or command, safely bounded
- Superseded by:
  - [SwRS-MDOKFSTUDIO-DIAG-089](SwRS-MDOKFSTUDIO-DIAG-089.md): JAR failures are reported on the diagram and in the status line
<!-- okf:links:end -->
