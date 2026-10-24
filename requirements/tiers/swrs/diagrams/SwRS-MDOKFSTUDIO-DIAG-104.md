---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-104
uuid: 4c42a5f1-0415-4812-95ce-1ae13cd18835
title: The JAR pipeline starts one process per diagram
description: When a document has several PlantUML diagrams and useJar is true in
  a trusted workspace, the extension SHALL start one process per diagram, all at
  once.
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

## The JAR pipeline starts one process per diagram

### Normative behavior

When a document has several PlantUML diagrams and useJar is true in a trusted workspace, the extension SHALL start one process per diagram, all at once.

### Scenario: Three diagrams

- GIVEN three PlantUML diagrams
- WHEN the preview is rendered
- THEN three processes are started before any finishes

### Scenario: No diagram

- GIVEN a document without PlantUML diagrams
- WHEN the preview is rendered
- THEN no process starts and the result is empty

### Known issues

- Known issue: Many diagrams start many JVMs at once.
- Known issue: Untested.

### Verification notes

- Method: No test: all unit tests render a single diagram; to be added.
- Criteria: Process count equals diagram count.
