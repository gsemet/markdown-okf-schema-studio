---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-107
uuid: e37ccdac-b930-4b50-a5fa-d41be82fe180
title: "Each JAR failure is also a status-line warning"
description: "When a JAR diagram fails or is blocked, the extension SHALL report a
  warning with the code plantuml-render and the document path, in addition to the
  message on the diagram."
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

## Each JAR failure is also a status-line warning

### Normative behavior

When a JAR diagram fails or is blocked, the extension SHALL report a warning with the code plantuml-render and the document path, in addition to the message on the diagram.

### Scenario: Each failure kind

- GIVEN a missing JAR, a disabled workspace, a missing command and a failing process, one per diagram
- WHEN the results are applied
- THEN the status line gets one warning with code plantuml-render per failing diagram

### Scenario: Success

- GIVEN all diagrams rendered
- WHEN the results are applied
- THEN no PlantUML warning is reported

### Verification notes

- Method: Unit test `each failing JAR diagram is also a plantuml-render warning with the document path` in `test/session/diagReq.plantuml.requirements.test.ts`.
- Criteria: One warning per failure.
