---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-013
uuid: aac03683-63ca-497b-a009-6543caf7176e
title: Stop include depth and cycles
description: When a chain of includes reaches the 8th level or an include
  repeats a file already being included, the extension SHALL leave that
  directive as an unresolved placeholder.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-002
- StRS-MDOKFSTUDIO-CORE-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Stop include depth and cycles

### Normative behavior

When a chain of includes reaches the 8th level or an include repeats a file already being included, the extension SHALL leave that directive as an unresolved placeholder.

### Scenario: Nominal

- GIVEN a chain of eight nested includes
- WHEN it is rendered
- THEN the first seven expand and the eighth stays a placeholder

### Scenario: Boundary or refusal

- GIVEN a file that includes itself
- WHEN it is rendered
- THEN the cyclic include stays a placeholder and the render ends

### Verification notes

- Method: test
- Criteria: Depth 8 and cycles leave the directive unexpanded.
