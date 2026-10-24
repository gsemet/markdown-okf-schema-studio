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
- Known issue: Untested.

### Verification notes

- Method: No test: the ENOENT test covers the plantuml command only.
- Criteria: Only ENOENT gives the missing-executable wording.
