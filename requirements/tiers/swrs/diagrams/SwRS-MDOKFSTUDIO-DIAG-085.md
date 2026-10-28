---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-085
uuid: 74b4718f-a894-48d4-9197-c8dfb170a017
title: Without a JAR the plantuml command is run
description: When useJar is true in a trusted workspace and jarPath is empty,
  the extension SHALL render each PlantUML diagram by running the plantuml
  command with the arguments -pipe and -tsvg.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-007
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-084; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-DIAG-084
default_owner_email: gaetan@xeberon.net
---

## Without a JAR the plantuml command is run

### Normative behavior

When useJar is true in a trusted workspace and jarPath is empty, the extension SHALL render each PlantUML diagram by running the plantuml command with the arguments -pipe and -tsvg.

### Scenario: PATH command

- GIVEN useJar true, a trusted workspace and an empty jarPath
- WHEN a preview with a PlantUML diagram is rendered
- THEN the process started is plantuml with the arguments -pipe and -tsvg

### Scenario: Command missing

- GIVEN no plantuml command on the PATH
- WHEN a preview is rendered
- THEN the diagram shows the executable-not-found message

### Known issues

- Known issue: The renderer has an executablePath option that no setting feeds; only visual fixtures pass it, so users cannot change the command name.

### Verification notes

- Method: Unit test: uses the PATH executable when no JAR is configured and reports missing commands.
- Criteria: The spawned command is plantuml.
