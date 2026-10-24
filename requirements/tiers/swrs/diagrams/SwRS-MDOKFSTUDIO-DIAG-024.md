---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-024
uuid: f3d430f9-7bab-4eff-8a0d-4b2449bd1792
title: The useJar setting chooses the PlantUML engine
description: When the setting markdownOkfSchemaStudio.plantuml.useJar is not
  exactly true, the extension SHALL draw PlantUML diagrams with the built-in
  engine, and when it is true in a trusted workspace SHALL select the JAR
  pipeline.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-007
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## The useJar setting chooses the PlantUML engine

### Normative behavior

When the setting markdownOkfSchemaStudio.plantuml.useJar is not exactly true, the extension SHALL draw PlantUML diagrams with the built-in engine, and when it is true in a trusted workspace SHALL select the JAR pipeline.

### Scenario: Default and true

- GIVEN the setting unset, then set to true in a trusted workspace
- WHEN a preview is rendered
- THEN the unset setting selects the built-in engine and true selects the JAR pipeline

### Scenario: Non-boolean value

- GIVEN the setting holding the text true or the number 1
- WHEN a preview is rendered
- THEN the built-in engine is selected and no process is started

### Known issues

- Known issue: PlantUmlController.engineFor has no host-level test.

### Verification notes

- Method: Unit tests of the setting reader, the engine resolver and the render pipeline.
- Criteria: Only the boolean true leaves the built-in engine.
