---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-118
uuid: 933e89f2-4b5a-4370-ba08-db8dfc0912d4
title: A cancelled JAR render reports the cancellation
description: When a render is cancelled, the extension SHALL report PlantUML
  rendering was canceled. on the diagram.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-014
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A cancelled JAR render reports the cancellation

### Normative behavior

When a render is cancelled, the extension SHALL report PlantUML rendering was canceled. on the diagram.

### Scenario: Cancel

- GIVEN a running PlantUML process
- WHEN the render is cancelled
- THEN the diagram reports PlantUML rendering was canceled.

### Scenario: Already cancelled

- GIVEN a render whose abort signal is already set
- WHEN the render starts
- THEN no process is started and the same message is reported

### Verification notes

- Method: Unit test: cancels an active PlantUML process.
- Criteria: Cancellation message and no spawn for a set signal.
