---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-118
uuid: 933e89f2-4b5a-4370-ba08-db8dfc0912d4
title: A cancelled JAR render reports the cancellation
description: When a render is cancelled, the extension SHALL report PlantUML
  rendering was canceled. on the diagram.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-007
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-097; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-DIAG-097
default_owner_email: gaetan@xeberon.net
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
