---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-120
uuid: 8c1850dd-0db5-4c9d-9be2-ee1b5286f6be
title: The JAR pipeline feeds the text on stdin in the workspace folder
description: When the JAR pipeline runs a process for a diagram, the extension
  SHALL write the diagram text to its standard input and run the process in the
  workspace folder.
project: markdown-okf-schema-studio
scope: diagrams
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-007
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-084; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-DIAG-084
default_owner_email: gaetan@xeberon.net
---

## The JAR pipeline feeds the text on stdin in the workspace folder

### Normative behavior

When the JAR pipeline runs a process for a diagram, the extension SHALL write the diagram text to its standard input and run the process in the workspace folder.

### Scenario: Text on standard input

- GIVEN a diagram with some text and the JAR pipeline
- WHEN the process is started
- THEN the process standard input receives exactly the diagram text

### Scenario: Workspace folder as working directory

- GIVEN a workspace folder open in the editor
- WHEN the process is started
- THEN its working directory is the workspace root

### Verification notes

- Method: Unit tests: renders PlantUML through the configured external JAR.
- Criteria: Input on stdin, cwd is the workspace folder.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-007](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-007.md): A writer renders PlantUML with an own JAR or command, safely bounded
- Superseded by:
  - [SwRS-MDOKFSTUDIO-DIAG-084](SwRS-MDOKFSTUDIO-DIAG-084.md): The JAR pipeline runs java or plantuml once per diagram on stdin
<!-- okf:links:end -->
