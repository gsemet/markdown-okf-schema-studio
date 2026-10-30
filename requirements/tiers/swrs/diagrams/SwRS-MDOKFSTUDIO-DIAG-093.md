---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-093
uuid: 13059409-69a4-44f6-9fa7-1e2154010d6b
title: "A missing Java is reported like a missing command"
description: "When useJar is true and jarPath is set but java cannot be started because
  it is not found, the extension SHALL show PlantUML executable \"java\" was not found
  on PATH. Set markdownOkfSchemaStudio.plantuml.jarPath to a valid JAR path. on the
  diagram with state unavailable."
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

## A missing Java is reported like a missing command

### Normative behavior

When useJar is true and jarPath is set but java cannot be started because it is not found, the extension SHALL show PlantUML executable "java" was not found on PATH. Set markdownOkfSchemaStudio.plantuml.jarPath to a valid JAR path. on the diagram with state unavailable.

### Scenario: Java absent

- GIVEN a valid JAR path and no java on the PATH
- WHEN the preview is rendered
- THEN the diagram shows that message with state unavailable

### Scenario: Other spawn error

- GIVEN java found but not executable
- WHEN the preview is rendered
- THEN the diagram shows the system error text with state error

### Known issues

- Known issue: The hint tells the user to set jarPath although it is already set; nothing names Java, and a missing Graphviz is neither checked nor reported.

### Verification notes

- Method: Unit test `a missing java is reported like a missing command; other spawn errors keep their text` in `test/core/render/diagReq.jar.requirements.test.ts`.
- Criteria: Only ENOENT gives the missing-executable wording.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-007](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-007.md): A writer renders PlantUML with an own JAR or command, safely bounded
- Superseded by:
  - [SwRS-MDOKFSTUDIO-DIAG-089](SwRS-MDOKFSTUDIO-DIAG-089.md): JAR failures are reported on the diagram and in the status line
<!-- okf:links:end -->
