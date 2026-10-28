---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-091
uuid: 14a9f585-dc49-423e-9b07-316333f06818
title: "Restricted Mode disables JAR rendering"
description: "When useJar is true in an untrusted workspace, the extension SHALL start
  no process and show PlantUML preview is disabled in an untrusted workspace. on every
  PlantUML diagram with state unavailable."
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

## Restricted Mode disables JAR rendering

### Normative behavior

When useJar is true in an untrusted workspace, the extension SHALL start no process and show PlantUML preview is disabled in an untrusted workspace. on every PlantUML diagram with state unavailable.

### Scenario: Untrusted workspace

- GIVEN an untrusted workspace, useJar true and two PlantUML diagrams
- WHEN the preview is rendered
- THEN both diagrams show the disabled message with state unavailable and no process starts

### Scenario: No diagram

- GIVEN a document without PlantUML diagrams
- WHEN the preview is rendered
- THEN no message and no warning appear

### Known issues

- Known issue: The visual campaign has no Restricted Mode PlantUML scenario.

### Verification notes

- Method: Unit tests: the uses-PATH test (untrusted case) and useJar keeps the external pipeline.
- Criteria: No spawn and one message per diagram; the built-in engine is not swapped in behind the user's back.
