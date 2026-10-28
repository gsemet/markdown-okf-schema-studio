---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-027
uuid: 9c11132f-ef86-458b-bce2-7fdf25cf5948
title: jarPath is ignored until useJar is on
description: While useJar is not true, the extension SHALL ignore
  markdownOkfSchemaStudio.plantuml.jarPath and keep its value for later use.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-007
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-024; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-DIAG-024
default_owner_email: gaetan@xeberon.net
---

## jarPath is ignored until useJar is on

### Normative behavior

While useJar is not true, the extension SHALL ignore markdownOkfSchemaStudio.plantuml.jarPath and keep its value for later use.

### Scenario: Path set, option off

- GIVEN jarPath holding a JAR path and useJar off
- WHEN a preview with PlantUML diagrams is rendered
- THEN the built-in engine draws the diagrams and the JAR is neither checked nor started

### Scenario: Option switched on

- GIVEN the same jarPath after useJar is turned on
- WHEN the preview is rendered again
- THEN the JAR pipeline uses that path without it being entered again

### Verification notes

- Method: Unit test of the render pipeline with a jarPath and the built-in engine.
- Criteria: The path takes effect only when useJar becomes true.
