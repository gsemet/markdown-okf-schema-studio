---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-026
uuid: 03655758-7d6f-4584-bdc8-152c70cd699c
title: The built-in engine starts no process
description: When PlantUML diagrams are drawn by the built-in engine, the
  extension SHALL start no process and read no PlantUML executable or JAR,
  whether the workspace is trusted or not.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-006
- StRS-MDOKFSTUDIO-DIAG-007
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-024; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-DIAG-024
default_owner_email: gaetan@xeberon.net
---

## The built-in engine starts no process

### Normative behavior

When PlantUML diagrams are drawn by the built-in engine, the extension SHALL start no process and read no PlantUML executable or JAR, whether the workspace is trusted or not.

### Scenario: Trusted workspace

- GIVEN a trusted workspace, useJar off and a jarPath set
- WHEN a preview with PlantUML diagrams is rendered
- THEN no process is spawned and the host reports no PlantUML diagram result

### Scenario: Restricted Mode

- GIVEN an untrusted workspace and useJar off
- WHEN the same preview is rendered
- THEN no process is spawned and the diagrams are left to the page

### Known issues

- Known issue: When the renderer is called without an engine option it defaults to the JAR pipeline; only the VS Code session passes the built-in engine.

### Verification notes

- Method: Unit tests of the render pipeline; visual scenarios diagrams v10 and v11 (no network request, no Java).
- Criteria: No spawn call and an empty host result in both trust states.
