---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-053
uuid: 40e3767d-9d10-4d5c-9570-9ed952eee6b9
title: Served and missing include files are remembered for watching
description: When the host serves an include file, or refuses one that does not
  exist inside the allowed folders, it SHALL remember the canonical path of that
  file for watching.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-009
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Served and missing include files are remembered for watching

### Normative behavior

When the host serves an include file, or refuses one that does not exist inside the allowed folders, it SHALL remember the canonical path of that file for watching.

### Scenario: Served file

- GIVEN an include request that the host serves
- WHEN the host answers
- THEN the canonical path of the file is in the include watch

### Scenario: Outside the folders

- GIVEN an include request for a path outside the allowed folders
- WHEN the host refuses it
- THEN nothing is remembered for it

### Known issues

- Known issue: Canonical-path remembering in the controller has no test.

### Verification notes

- Method: Unit test of the include watch and the resolver; the controller step is untested.
- Criteria: Only served and allowed-missing paths are watched.
