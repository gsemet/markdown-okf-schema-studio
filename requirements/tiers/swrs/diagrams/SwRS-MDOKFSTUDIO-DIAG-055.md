---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-055
uuid: 1a25ba6f-1792-41f3-9a68-e5515d5833e2
title: A forged relative from is refused
description: When an include request carries a from that is not an absolute
  path, the host SHALL refuse it with the reason PlantUML file followed by the
  name and could not be read.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-009
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-054; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-DIAG-054
default_owner_email: gaetan@xeberon.net
---

## A forged relative from is refused

### Normative behavior

When an include request carries a from that is not an absolute path, the host SHALL refuse it with the reason PlantUML file followed by the name and could not be read.

### Scenario: Relative from

- GIVEN an include request with from equal to a relative path
- WHEN the host resolves it
- THEN it is refused with that reason

### Scenario: Null from

- GIVEN an include request with from null
- WHEN the host resolves it
- THEN it is accepted and resolved next to the document

### Verification notes

- Method: Unit test of the include resolver.
- Criteria: Only null or absolute from values proceed.
