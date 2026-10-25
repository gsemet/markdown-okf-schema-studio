---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-059
uuid: 68e1de4f-ad2b-47c1-9453-f4e1ce5e746e
title: "An include file over 5 MiB is refused"
description: "When an include file is larger than 5 MiB, the host SHALL refuse it
  with the reason that the file is larger than the 5 MiB preview limit."
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
superseded_by: SwRS-MDOKFSTUDIO-DIAG-054
---

## An include file over 5 MiB is refused

### Normative behavior

When an include file is larger than 5 MiB, the host SHALL refuse it with the reason that the file is larger than the 5 MiB preview limit.

### Scenario: Large file

- GIVEN an include file larger than 5 MiB
- WHEN the host resolves it
- THEN it is refused with that reason

### Scenario: Small file

- GIVEN an include file of a few kilobytes
- WHEN the host resolves it
- THEN it is served

### Verification notes

- Method: Unit test: a missing file is refused and watched, a too large file and a symlink escape are refused (test/core/render/plantUmlIncludes.test.ts).
- Criteria: The size limit applies to every include.
