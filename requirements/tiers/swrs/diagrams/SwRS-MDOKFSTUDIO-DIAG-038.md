---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-038
uuid: 39cc2f0a-cc40-48ed-85a5-1507bff3ca97
title: The built-in engine refuses a source over 1 MiB
description: When the text of a built-in diagram is longer than 1 MiB (1,048,576
  characters), the page SHALL show "The PlantUML source exceeds the 1 MiB
  preview limit." without running the engine and set data-render-state to
  unavailable.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-006
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-032; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-DIAG-032
default_owner_email: gaetan@xeberon.net
---

## The built-in engine refuses a source over 1 MiB

### Normative behavior

When the text of a built-in diagram is longer than 1 MiB (1,048,576 characters), the page SHALL show "The PlantUML source exceeds the 1 MiB preview limit." without running the engine and set data-render-state to unavailable.

### Scenario: Over the limit

- GIVEN a diagram source of 1,048,577 characters
- WHEN the page draws it
- THEN the message appears, the state is unavailable and the engine is not run

### Scenario: At the limit

- GIVEN a diagram source of exactly 1,048,576 characters
- WHEN the page draws it
- THEN the engine runs normally

### Known issues

- Known issue: The limit is counted in UTF-16 code units and is the same constant as the JAR pipeline's; docs/user/plantuml.md states 1 MiB only for includes.

### Verification notes

- Method: Unit test: a diagram source over 1 MiB is refused without running the engine.
- Criteria: The comparison is strictly greater than the limit.
