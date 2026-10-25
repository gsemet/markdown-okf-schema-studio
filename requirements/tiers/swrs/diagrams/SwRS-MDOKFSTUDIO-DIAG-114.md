---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-114
uuid: dfc7e81f-e4bc-4cd9-bc9b-106332780c72
title: A non-string from is sent as null
description: When an include request from the bundle has a from that is not a
  string, the page SHALL send from as null.
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

## A non-string from is sent as null

### Normative behavior

When an include request from the bundle has a from that is not a string, the page SHALL send from as null.

### Scenario: Numeric from

- GIVEN a request with a string path and from set to a number
- WHEN the page forwards it
- THEN the host message carries from null

### Scenario: String from

- GIVEN a request with from equal to an absolute path
- WHEN the page forwards it
- THEN the host message carries that path

### Verification notes

- Method: Unit test: a malformed request is left alone and a non-string from is sent as null.
- Criteria: from is a string or null.
