---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-084
uuid: 777fec0c-2d08-4697-abf5-7cef2c87162e
title: "A configured JAR is run with java"
description: "When useJar is true in a trusted workspace and jarPath is not empty,
  the extension SHALL render each PlantUML diagram by running java with the arguments
  -jar, the resolved JAR path, -pipe and -tsvg."
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

## A configured JAR is run with java

### Normative behavior

When useJar is true in a trusted workspace and jarPath is not empty, the extension SHALL render each PlantUML diagram by running java with the arguments -jar, the resolved JAR path, -pipe and -tsvg.

### Scenario: JAR configured

- GIVEN useJar true, a trusted workspace and an existing JAR path
- WHEN a preview with a PlantUML diagram is rendered
- THEN the process started is java with the arguments -jar, the JAR path, -pipe, -tsvg

### Scenario: Blank path

- GIVEN a jarPath holding only spaces
- WHEN a preview is rendered
- THEN the setting reads as empty and the plantuml command is used instead

### Known issues

- Known issue: The JAR and PATH pipeline asks for no dark variant, so its picture is the same in the light and dark preview.

### Verification notes

- Method: Unit test: renders PlantUML through the configured external JAR and injects an image.
- Criteria: The spawned command and arguments match.
