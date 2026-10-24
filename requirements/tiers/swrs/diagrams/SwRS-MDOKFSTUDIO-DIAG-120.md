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
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-012
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
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
