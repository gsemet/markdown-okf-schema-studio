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
req_lifecycle: superseded
status: deprecated
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

### Verification notes

- Method: Unit test `an output over 8 MiB stops the process; an output of exactly 8 MiB is accepted` in `test/core/render/diagReq.jar.requirements.test.ts`.
- Criteria: Strictly greater than the limit stops the process.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-007](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-007.md): A writer renders PlantUML with an own JAR or command, safely bounded
- Superseded by:
  - [SwRS-MDOKFSTUDIO-DIAG-097](SwRS-MDOKFSTUDIO-DIAG-097.md): A JAR render is bounded in input, output, time, process lifetime and concurrency
<!-- okf:links:end -->
