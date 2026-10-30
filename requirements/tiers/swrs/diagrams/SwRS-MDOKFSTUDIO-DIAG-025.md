---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-025
uuid: fd70f647-577f-4e95-ba98-214053648d23
title: useJar in an untrusted workspace keeps the JAR pipeline
description: "When useJar is true in an untrusted workspace, the extension SHALL still
  select the JAR pipeline, which refuses to start a process, and does not fall back
  to the built-in engine."
project: markdown-okf-schema-studio
scope: diagrams
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-007
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-024; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-DIAG-024
default_owner_email: gaetan@xeberon.net
---

## useJar in an untrusted workspace keeps the JAR pipeline

### Normative behavior

When useJar is true in an untrusted workspace, the extension SHALL still select the JAR pipeline, which refuses to start a process, and does not fall back to the built-in engine.

### Scenario: Restricted Mode

- GIVEN useJar true in an untrusted workspace
- WHEN a preview is rendered
- THEN the JAR pipeline is selected, no process starts and no diagram is drawn by the built-in engine

### Scenario: Option off

- GIVEN useJar false in the same untrusted workspace
- WHEN a preview is rendered
- THEN the built-in engine draws the diagrams

### Verification notes

- Method: Unit tests of the engine resolver and of the render pipeline.
- Criteria: jar-untrusted never becomes builtin.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-007](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-007.md): A writer renders PlantUML with an own JAR or command, safely bounded
- Superseded by:
  - [SwRS-MDOKFSTUDIO-DIAG-024](SwRS-MDOKFSTUDIO-DIAG-024.md): The useJar and jarPath settings choose the PlantUML engine
<!-- okf:links:end -->
