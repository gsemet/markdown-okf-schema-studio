---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-048
uuid: b83120c7-273b-4174-9164-fa4ef0bf9fec
title: "A host refusal of an include reaches the diagram as its reason"
description: "When the host refuses an include, the page SHALL give the engine the
  host's reason exactly once."
project: markdown-okf-schema-studio
scope: diagrams
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-009
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-046; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-DIAG-046
default_owner_email: gaetan@xeberon.net
---

## A host refusal of an include reaches the diagram as its reason

### Normative behavior

When the host refuses an include, the page SHALL give the engine the host's reason exactly once.

### Scenario: Refusal

- GIVEN a host answer ok false with a reason
- WHEN it arrives
- THEN the engine receives that reason once

### Scenario: Repeated answer

- GIVEN a second answer for the same request
- WHEN it arrives
- THEN it is ignored and the engine still received the reason once

### Verification notes

- Method: Unit test: refusals, stale answers and timeouts reach the bundle as reasons, once.
- Criteria: Each request ends in one reason or one file.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-009](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-009.md): PlantUML diagrams use local include files and PUML files
- Superseded by:
  - [SwRS-MDOKFSTUDIO-DIAG-046](SwRS-MDOKFSTUDIO-DIAG-046.md): PlantUML includes are read through the extension and refusals reach the diagram
<!-- okf:links:end -->
