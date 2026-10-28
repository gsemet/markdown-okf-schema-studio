---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-092
uuid: 4ce8ad56-ff56-4eb9-8232-e8c7b7745c97
title: "A missing plantuml command is reported"
description: "When the plantuml command is not found, the extension SHALL show PlantUML
  executable \"plantuml\" was not found on PATH. Set markdownOkfSchemaStudio.plantuml.jarPath
  to a valid JAR path. on the diagram with state unavailable, and keep the source."
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-007
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-089; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-DIAG-089
default_owner_email: gaetan@xeberon.net
---

## A missing plantuml command is reported

### Normative behavior

When the plantuml command is not found, the extension SHALL show PlantUML executable "plantuml" was not found on PATH. Set markdownOkfSchemaStudio.plantuml.jarPath to a valid JAR path. on the diagram with state unavailable, and keep the source.

### Scenario: Command not on the PATH

- GIVEN useJar true, an empty jarPath and no plantuml command
- WHEN the preview is rendered
- THEN the diagram shows that message, has state unavailable, shows no picture and keeps its source disclosure

### Scenario: Absolute executable path

- GIVEN the renderer called with an absolute executable path that does not exist
- WHEN the diagram is rendered
- THEN the message omits on PATH

### Known issues

- Known issue: The visual scenarios call renderPlantUmlDiagrams with an unlikely executablePath and not through useJar; the second scenario is reachable only that way.
- Known issue: The message asks the user to set jarPath but not to also turn useJar on.

### Verification notes

- Method: Unit test: uses the PATH executable when no JAR is configured and reports missing commands; visual scenarios diagrams v06 and v07.
- Criteria: Exact message and state.
