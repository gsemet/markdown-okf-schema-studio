---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-049
uuid: 2bebdc65-3d79-40fa-82c7-d45bfc3bf7c3
title: "Malformed include requests are ignored"
description: "When the bundle dispatches a file request without a respond function,
  a request object or a string path, the page SHALL ignore it."
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-009
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-046; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-DIAG-046
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
