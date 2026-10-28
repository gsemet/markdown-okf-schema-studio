---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-050
uuid: f81ead29-a3bf-4060-9fe8-9ec9acf6ec03
title: The host accepts only well-formed include requests
description: When the host receives a previewPlantUmlInclude message, it SHALL
  accept it only with a file name that is not blank and at most 4096 characters,
  a from that is null or a non-empty string of at most 4096 characters, and a
  non-empty bounded edit id.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-009
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-090
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/pageToHost.ts
tested_in_files:
- test/core/protocol/pageToHost.test.ts
default_owner_email: gaetan@xeberon.net
---

## The host accepts only well-formed include requests

### Normative behavior

When the host receives a previewPlantUmlInclude message, it SHALL accept it only with a file name that is not blank and at most 4096 characters, a from that is null or a non-empty string of at most 4096 characters, and a non-empty bounded edit id.

### Scenario (nominal): A well-formed include request
- GIVEN a previewPlantUmlInclude message with a 4096-character name, from null and an edit id (see SwRS-MDOKFSTUDIO-TRUST-052 for the envelope)
- WHEN the host validates it
- THEN it is accepted
- AND the same message with from set to a non-empty file id is accepted

### Scenario (refusal): A malformed include request
- GIVEN a previewPlantUmlInclude message with a blank name, a 4097-character name, a name that is not a string, an empty from, a from that is missing or not a string, or a missing or empty edit id
- WHEN the host validates it
- THEN it is refused, ignored like any value that is not a registered page message, and nothing changes on screen

### Scenario (boundary): Bounds of the fields
| Input | Outcome |
| --- | --- |
| name of 4096 characters | accepted |
| name of 4097 characters | refused |
| name of two spaces | refused (blank) |
| name that is the number 3 | refused |
| from null | accepted (the including file is the document itself) |
| from a non-empty string of at most 4096 characters | accepted |
| from an empty string, undefined or the number 1 | refused |
| editId an empty string or missing | refused |
| editId a non-empty string of at most 100 characters | accepted; the host answers with previewPlantUmlIncludeResult carrying the same editId (see SwRS-MDOKFSTUDIO-TRUST-090) |

### Verification notes
- Method: test/core/protocol/pageToHost.test.ts `previewPlantUmlInclude carries a bounded file name, the including file id or null, and an edit id` (all scenarios; the 100-character bound of the edit id and a from of 4097 characters are not asserted there).
- Criteria: Boundaries 4096 and 4097 behave as stated.
