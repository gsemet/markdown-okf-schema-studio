---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-049
uuid: 2bebdc65-3d79-40fa-82c7-d45bfc3bf7c3
title: "Malformed include requests are ignored"
description: "When the bundle dispatches a file request without a respond function,
  a request object or a string path, the page SHALL ignore it."
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

## Malformed include requests are ignored

### Normative behavior

When the bundle dispatches a file request without a respond function, a request object or a string path, the page SHALL ignore it.

### Scenario: Missing path

- GIVEN a request whose path is not a string
- WHEN the page receives it
- THEN no host message is sent and the request is not marked accepted

### Scenario: No respond function

- GIVEN a request without a respond function
- WHEN the page receives it
- THEN it is ignored

### Verification notes

- Method: Unit test: a malformed request is left alone and a non-string from is sent as null.
- Criteria: Nothing malformed reaches the host.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-009](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-009.md): PlantUML diagrams use local include files and PUML files
- Superseded by:
  - [SwRS-MDOKFSTUDIO-DIAG-046](SwRS-MDOKFSTUDIO-DIAG-046.md): PlantUML includes are read through the extension and refusals reach the diagram
<!-- okf:links:end -->
