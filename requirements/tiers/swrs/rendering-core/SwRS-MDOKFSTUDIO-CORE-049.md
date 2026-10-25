---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-049
uuid: da82ffe3-6e0b-43e3-badd-47fce8bca4d7
title: Skip the glow when it would mislead
description: When a changed block is included, has an open editor, the range
  list is empty or invalid, or the update exceeds 40 blocks or 50 ranges, the
  extension SHALL glow nothing.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-LIFE-094; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-LIFE-094
---

## Skip the glow when it would mislead

### Normative behavior

When a changed block is included, has an open editor, the range list is empty or invalid, or the update exceeds 40 blocks or 50 ranges, the extension SHALL glow nothing.

### Scenario: Nominal skip the glow when it would mislead

- GIVEN an update of 41 blocks
- WHEN the page updates
- THEN nothing glows

### Scenario: Boundary or refusal of skip the glow when it would mislead

- GIVEN an included block
- WHEN it changes
- THEN it does not glow

### Verification notes

- Method: Unit test "CR 046: included blocks, open editors and the block being edited never glow" in test/page/modules/motion.test.ts
- Criteria: No glow is applied in the excluded cases.
