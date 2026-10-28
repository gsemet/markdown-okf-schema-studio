---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-042
uuid: 82dc1826-d5f3-41a5-9548-90367f3bc735
title: The built-in engine draws one diagram at a time
description: When several built-in diagrams need drawing, the page SHALL run the
  engine for one diagram at a time in the order requested.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-006
- StRS-MDOKFSTUDIO-DIAG-009
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-039; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-DIAG-039
default_owner_email: gaetan@xeberon.net
---

## The built-in engine draws one diagram at a time

### Normative behavior

When several built-in diagrams need drawing, the page SHALL run the engine for one diagram at a time in the order requested.

### Scenario: Two diagrams with includes

- GIVEN two diagrams that each include a file
- WHEN both are drawn
- THEN each include request belongs to the diagram that is drawing, and the second starts after the first finished

### Scenario: Waiting on the host

- GIVEN a diagram waiting for the host's answer
- WHEN a second diagram is requested
- THEN the second waits and does not read the first one's includes

### Verification notes

- Method: Unit test: diagrams render one at a time, so each include request belongs to the diagram that is drawing.
- Criteria: Engine runs never overlap.
