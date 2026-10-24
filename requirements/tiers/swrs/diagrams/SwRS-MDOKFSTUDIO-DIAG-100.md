---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-100
uuid: 5d3ee2e7-6b07-4412-9417-2755e551d104
title: A JAR render stops after 30 seconds
description: When a PlantUML process runs for more than 30 seconds, the
  extension SHALL kill the whole process group and show PlantUML did not finish
  within 30 s. on the diagram with state error.
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

## A JAR render stops after 30 seconds

### Normative behavior

When a PlantUML process runs for more than 30 seconds, the extension SHALL kill the whole process group and show PlantUML did not finish within 30 s. on the diagram with state error.

### Scenario: Hung process

- GIVEN a process that never answers
- WHEN 30 seconds pass
- THEN the process is killed with its group and the diagram shows that message

### Scenario: Fast process

- GIVEN a process that answers in time
- WHEN it finishes
- THEN the timer is cleared and no timeout message appears

### Known issues

- Known issue: The test uses a shortened timeout; the 30 s constant itself is asserted separately.

### Verification notes

- Method: Unit test: kills a hung child at the timeout with a clear diagnostic (shortened timeout).
- Criteria: The timeout constant is 30000 ms.
