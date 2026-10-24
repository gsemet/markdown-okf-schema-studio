---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-099
uuid: e3a5379e-cbd2-4399-ab5b-c04e62296fb6
title: The JAR pipeline stops an output over 8 MiB
description: When a PlantUML process writes more than 8 MiB to its standard
  output, the extension SHALL kill the process and show PlantUML SVG output
  exceeds the 8 MiB preview limit. on the diagram with state error.
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

## The JAR pipeline stops an output over 8 MiB

### Normative behavior

When a PlantUML process writes more than 8 MiB to its standard output, the extension SHALL kill the process and show PlantUML SVG output exceeds the 8 MiB preview limit. on the diagram with state error.

### Scenario: Huge output

- GIVEN a process that writes more than 8 MiB
- WHEN the output is read
- THEN the process is stopped and the diagram shows that message

### Scenario: Output at the limit

- GIVEN a process whose output is exactly 8 MiB
- WHEN the output is read
- THEN the output is accepted

### Known issues

- Known issue: Untested.

### Verification notes

- Method: No test feeds an oversized output; to be added.
- Criteria: Strictly greater than the limit stops the process.
